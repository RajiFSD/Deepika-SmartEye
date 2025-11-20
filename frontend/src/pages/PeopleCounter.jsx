import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Users,
  User,
  Video,
  Activity,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import * as cameraConnectionService from '../services/camera_connection_service';
import cameraService from '../services/cameraService';

const PeopleCounter = () => {
  const [mode, setMode] = useState('camera');
  const [isRunning, setIsRunning] = useState(false);
  const [counts, setCounts] = useState({ male: 0, female: 0, total: 0 });
  const [detections, setDetections] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const streamActiveRef = useRef(false);
  const [streamError, setStreamError] = useState(false);
  const [streamId, setStreamId] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionInterval = useRef(null);
  const streamRetryTimeout = useRef(null);

  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId') || '1';
  const tenantId = localStorage.getItem('tenantId') || sessionStorage.getItem('tenantId') || '1';
  const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId') || '1';

  useEffect(() => {
    if (mode === 'camera') loadCameras();
    return () => {
      stopDetection();
      if (streamRetryTimeout.current) {
        clearTimeout(streamRetryTimeout.current);
      }
    };
  }, [mode]);

  const loadCameras = async () => {
    setLoadingCameras(true);
    try {
      const response = await cameraService.getCamerasByuserId(userId, {
        page: 1,
        limit: 100,
        is_active: true
      });
      
      let camerasData = [];
      if (response?.data?.data?.cameras) {
        camerasData = response.data.data.cameras;
      } else if (response?.data?.cameras) {
        camerasData = response.data.cameras;
      } else if (response?.cameras) {
        camerasData = response.cameras;
      } else if (Array.isArray(response?.data)) {
        camerasData = response.data;
      } else if (Array.isArray(response)) {
        camerasData = response;
      }
      
      console.log('✅ Loaded cameras:', camerasData);
      setCameras(Array.isArray(camerasData) ? camerasData : []);
    } catch (err) {
      console.error('❌ Error loading cameras:', err);
      setError('Failed to load cameras');
    } finally {
      setLoadingCameras(false);
    }
  };

  const startCameraStream = async () => {
    if (!selectedCamera) {
      setError('Please select a camera first');
      return;
    }

    setProcessing(true);
    setError('');
    setStreamError(false);
    console.log("🎥 Starting stream for camera:", selectedCamera);
    
    try {
      // ✅ Use camera_connection_service
      const cameraConfig = {
        camera_id: selectedCamera.camera_id,
        stream_url: selectedCamera.stream_url,
        ip_address: selectedCamera.ip_address,
        port: selectedCamera.port || '8080',
        protocol: selectedCamera.protocol || 'HTTP',
        username: selectedCamera.username,
        password: selectedCamera.password
      };

      console.log("📡 Starting stream with config:", cameraConfig);
      const result = await cameraConnectionService.startStream(cameraConfig);
      console.log("📡 Stream response:", result);

      if (result.success) {
        // Store stream ID for cleanup
        setStreamId(result.streamId);

        // ✅ PRIORITY: Use direct camera URL for best compatibility
        let streamUrl = '';
        
        if (result.cameraStreamUrl) {
          // Direct camera URL (best option)
          streamUrl = result.cameraStreamUrl;
          console.log("📹 Using DIRECT camera URL:", streamUrl);
        } else if (result.streamUrlAbsolute) {
          // Absolute stream URL from service
          streamUrl = result.streamUrlAbsolute;
          console.log("📹 Using absolute stream URL:", streamUrl);
        } else if (selectedCamera.stream_url) {
          // Fallback to camera's configured stream_url
          streamUrl = selectedCamera.stream_url;
          console.log("📹 Using camera stream_url:", streamUrl);
        } else if (selectedCamera.ip_address) {
          // Construct from IP and port
          const port = selectedCamera.port || '8080';
          streamUrl = `http://${selectedCamera.ip_address}:${port}/video`;
          console.log("📹 Constructed stream URL:", streamUrl);
        }
        
        console.log("🎬 Final stream URL:", streamUrl);

        if (videoRef.current && streamUrl) {
          // Add cache buster and setup proper handlers
          const cacheBuster = `?t=${Date.now()}`;
          videoRef.current.src = `${streamUrl}${cacheBuster}`;
          videoRef.current.crossOrigin = 'anonymous';
          
          setStreamError(false);
          
          const handleLoad = () => {
            console.log('✅ Stream loaded successfully');
            setProcessing(false);
            setStreamActive(true);
            streamActiveRef.current = true;
            setIsRunning(true);
            setStreamError(false);
          };
          
          const handleError = (e) => {
            console.error('❌ Stream error:', e);
            setStreamError(true);
            
            if (streamRetryTimeout.current) {
              clearTimeout(streamRetryTimeout.current);
            }
            
            streamRetryTimeout.current = setTimeout(() => {
              if (streamActiveRef.current) {
                console.log('🔄 Retrying stream connection...');
                const retryUrl = `${streamUrl}?t=${Date.now()}`;
                videoRef.current.src = retryUrl;
              }
            }, 3000);
          };
          
          videoRef.current.onload = handleLoad;
          videoRef.current.onerror = handleError;
        }

        setTimeout(() => {
          setProcessing(false);
          if (!streamError) {
            setStreamActive(true);
            streamActiveRef.current = true;
            setIsRunning(true);
          }
        }, 1000);

      } else {
        setError(result.message || 'Failed to start camera stream');
        setProcessing(false);
      }
    } catch (err) {
      console.error('❌ Stream start error:', err);
      setError('Failed to start camera stream: ' + err.message);
      setProcessing(false);
    }
  };

  const stopCameraStream = async () => {
    console.log('⏹️ Stopping camera stream');
    
    if (streamRetryTimeout.current) {
      clearTimeout(streamRetryTimeout.current);
    }
    
    try {
      // ✅ Use camera_connection_service to stop stream
      if (streamId) {
        await cameraConnectionService.stopStream(streamId);
        console.log('✅ Stream stopped via service');
      }
    } catch (err) {
      console.error('Error stopping stream:', err);
    }

    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.onload = null;
      videoRef.current.onerror = null;
    }

    setStreamActive(false);
    streamActiveRef.current = false;
    setIsRunning(false);
    setStreamError(false);
    setStreamId(null);

    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
  };

  const uploadAndProcessVideo = async () => {
    if (!videoFile) {
      setError('Please select a video file first');
      return;
    }

    setProcessing(true);
    setError('');
    setUploadProgress(0);

    try {
      // ✅ Use camera_connection_service
      console.log('📤 Uploading and processing video:', videoFile.name);
      const result = await cameraConnectionService.processVideo(
        videoFile,
        (progress) => setUploadProgress(progress)
      );
      console.log('✅ Video processed:', result);
      processVideoResults(result);
      setProcessing(false);
    } catch (err) {
      console.error('❌ Video processing error:', err);
      setError(err.message || 'Failed to process video');
      setProcessing(false);
    }
  };

  const processVideoResults = (result) => {
    const { detections, summary } = result;

    setCounts({
      male: summary.male_count || 0,
      female: summary.female_count || 0,
      total: summary.total_count || 0
    });

    setDetections(
      detections.map(det => ({
        id: det.detection_id || Date.now() + Math.random(),
        gender: det.gender,
        confidence: det.confidence_score,
        timestamp: det.detection_time,
        bbox: det.metadata?.bbox
      }))
    );

    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(videoFile);
    }

    setIsRunning(true);
  };

  const detectPeopleInFrame = async (frameBlob) => {
    try {
      // ✅ Use camera_connection_service
      const result = await cameraConnectionService.detectFrame(
        frameBlob, 
        selectedCamera?.camera_id
      );

      if (result.error === 'timeout') {
        // Silently handle timeouts - don't show errors
        return;
      }

      if (!result.success) {
        if (!error) {
          setError('Detection service unavailable. Showing live feed only.');
        }
        return;
      }

      // Clear error if detection succeeds
      if (error && error.includes('Detection service unavailable')) {
        setError('');
      }

      if (result.success && result.detections) {
        const maleCount = result.detections.filter(d => d.gender === 'male').length;
        const femaleCount = result.detections.filter(d => d.gender === 'female').length;

        setCounts(prev => ({
          male: prev.male + maleCount,
          female: prev.female + femaleCount,
          total: prev.total + result.detections.length
        }));

        const newDetections = result.detections.map(det => ({
          id: Date.now() + Math.random(),
          gender: det.gender,
          confidence: det.confidence_score,
          timestamp: new Date().toISOString(),
          bbox: det.bbox
        }));

        setDetections(prev => [...newDetections, ...prev].slice(0, 50));

        if (canvasRef.current) {
          drawDetections(canvasRef.current.getContext('2d'), result.detections);
        }
      }
    } catch (err) {
      // Silently handle errors - stream will still show
      console.warn('⚠️ Detection temporarily unavailable');
    }
  };

  const drawDetections = (ctx, detectionsList) => {
    if (!canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    detectionsList.forEach(det => {
      if (!det.bbox) return;
      const { x, y, width, height } = det.bbox;
      const color = det.gender === 'male' ? '#3B82F6' : '#EC4899';

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = color;
      ctx.fillRect(x, Math.max(0, y - 25), width, 25);

      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      const label = `${det.gender === 'male' ? 'Boy' : 'Girl'} ${Math.round((det.confidence_score || 0) * 100)}%`;
      ctx.fillText(label, x + 5, Math.max(12, y - 8));
    });
  };

  const startDetectionLoopInternal = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }

    console.log('🔄 Starting detection loop');

    detectionInterval.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !streamActiveRef.current) {
        return;
      }

      const videoEl = videoRef.current;
      const canvasEl = canvasRef.current;
      const ctx = canvasEl.getContext('2d');

      const width = videoEl.naturalWidth || videoEl.videoWidth || 640;
      const height = videoEl.naturalHeight || videoEl.videoHeight || 480;

      if (width === 0 || height === 0) {
        return;
      }

      if (canvasEl.width !== width || canvasEl.height !== height) {
        canvasEl.width = width;
        canvasEl.height = height;
      }

      try {
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      } catch (err) {
        return;
      }

      canvasEl.toBlob(async (blob) => {
        if (blob && streamActiveRef.current) {
          await detectPeopleInFrame(blob);
        }
      }, 'image/jpeg', 0.8);

    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
        detectionInterval.current = null;
      }
    };
  }, []);

  useEffect(() => {
    streamActiveRef.current = streamActive;

    if (streamActive && !streamError) {
      const el = videoRef.current;
      
      const startIfReady = () => {
        const w = el?.naturalWidth || el?.videoWidth || 0;
        const h = el?.naturalHeight || el?.videoHeight || 0;
        if (w > 0 && h > 0) {
          setTimeout(() => {
            startDetectionLoopInternal();
          }, 500);
          return true;
        }
        return false;
      };

      if (el && startIfReady()) {
        return;
      }

      if (el) {
        const onLoadHandler = () => {
          console.log('✅ Stream loaded, starting detection');
          startDetectionLoopInternal();
        };

        el.addEventListener('load', onLoadHandler);
        el.addEventListener('loadedmetadata', onLoadHandler);

        const fallback = setTimeout(() => {
          if (!detectionInterval.current && streamActiveRef.current) {
            console.log('⏰ Fallback: starting detection loop');
            startDetectionLoopInternal();
          }
        }, 2000);

        return () => {
          el.removeEventListener('load', onLoadHandler);
          el.removeEventListener('loadedmetadata', onLoadHandler);
          if (detectionInterval.current) {
            clearInterval(detectionInterval.current);
            detectionInterval.current = null;
          }
          clearTimeout(fallback);
        };
      }
    } else {
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
        detectionInterval.current = null;
      }
    }
  }, [streamActive, streamError]);

  const stopDetection = () => {
    setIsRunning(false);

    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }

    streamActiveRef.current = false;
    setStreamActive(false);

    if (videoRef.current) {
      videoRef.current.src = '';
    }
  };

  const resetCounts = () => {
    setCounts({ male: 0, female: 0, total: 0 });
    setDetections([]);
    setUploadProgress(0);
  };

  const switchMode = (newMode) => {
    stopDetection();
    setMode(newMode);
    setVideoFile(null);
    setSelectedCamera(null);
    resetCounts();
    setError('');
    setStreamError(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Users className="text-blue-600" size={32} />
            AI People Counter with Gender Detection
          </h1>
          <p className="text-gray-600">Real-time detection from cameras and uploaded videos</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => switchMode('camera')}
              className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'camera' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Camera size={20} />
              Live Camera Feed
            </button>
            <button
              onClick={() => switchMode('video')}
              className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload size={20} />
              Upload Video
            </button>
          </div>

          {mode === 'camera' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Camera</label>
                <select
                  value={selectedCamera?.camera_id || ''}
                  onChange={(e) => {
                    const camera = cameras.find(c => c.camera_id === parseInt(e.target.value));
                    setSelectedCamera(camera);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingCameras || streamActive}
                >
                  <option value="">Choose a camera...</option>
                  {cameras.map(camera => (
                    <option key={camera.camera_id} value={camera.camera_id}>
                      {camera.camera_name} - {camera.camera_code} ({camera.ip_address})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCamera && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Activity className="text-blue-600 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{selectedCamera.camera_name}</p>
                      <p className="text-sm text-gray-600">Location: {selectedCamera.location_description}</p>
                      <p className="text-sm text-gray-600">Resolution: {selectedCamera.resolution} @ {selectedCamera.fps} FPS</p>
                      <p className="text-sm text-gray-500 mt-1">Stream: {selectedCamera.stream_url || `${selectedCamera.ip_address}:${selectedCamera.port}`}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={streamActive ? stopCameraStream : startCameraStream}
                disabled={!selectedCamera || processing}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                  streamActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400'
                }`}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Connecting...
                  </>
                ) : streamActive ? (
                  <>
                    <Pause size={20} />
                    Stop Stream
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    Start Stream
                  </>
                )}
              </button>
            </div>
          )}

          {mode === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Video File</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files[0])}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500"
                  disabled={processing}
                />
                {videoFile && (
                  <div className="mt-2 flex items-center gap-2 text-green-600">
                    <CheckCircle size={16} />
                    <span className="text-sm">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              {processing && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Processing...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                onClick={uploadAndProcessVideo}
                disabled={!videoFile || processing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition disabled:bg-gray-400"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Processing Video...
                  </>
                ) : (
                  <>
                    <Video size={20} />
                    Process Video
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={resetCounts} className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition">
              <RotateCcw size={20} />
              Reset Counts
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-400 text-yellow-800 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                {error.includes('Detection service unavailable') && (
                  <p className="text-xs mt-1">
                    Live camera feed is working. Start the Python detection service to enable people counting.
                  </p>
                )}
              </div>
              <button onClick={() => setError('')} className="ml-auto">
                <X size={16} />
              </button>
            </div>
          )}

          {streamError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <div className="flex-1">
                <p className="font-medium">Camera Stream Connection Lost</p>
                <p className="text-xs mt-1">
                  Retrying connection... Check if camera at {selectedCamera?.ip_address}:{selectedCamera?.port} is accessible.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {mode === 'camera' ? 'Live Feed' : 'Video Playback'}
            </h2>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              {mode === 'camera' ? (
                <>
                  <img
                    ref={videoRef}
                    alt="Camera stream"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ 
                      imageRendering: 'auto',
                      display: streamError ? 'none' : 'block'
                    }}
                  />
                  {streamError && streamActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <Activity className="w-12 h-12 animate-spin mb-3" />
                      <p className="text-lg">Reconnecting to camera...</p>
                      <p className="text-sm text-gray-400 mt-2">Stream: {selectedCamera?.camera_name}</p>
                    </div>
                  )}
                </>
              ) : (
                <video ref={videoRef} controls className="absolute inset-0 w-full h-full object-contain" />
              )}

              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
              
              {!isRunning && !streamError && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-lg bg-black bg-opacity-50">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p>{mode === 'camera' ? 'Select camera and start stream' : 'Upload and process video'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold">Total Count</span>
                <Users size={24} />
              </div>
              <div className="text-4xl font-bold">{counts.total}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold">Boys</span>
                <User size={24} />
              </div>
              <div className="text-4xl font-bold">{counts.male}</div>
              <div className="text-sm opacity-90 mt-2">
                {counts.total > 0 ? `${((counts.male / counts.total) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold">Girls</span>
                <User size={24} />
              </div>
              <div className="text-4xl font-bold">{counts.female}</div>
              <div className="text-sm opacity-90 mt-2">
                {counts.total > 0 ? `${((counts.female / counts.total) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">Recent Detections</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detections.slice(0, 10).map(det => (
                  <div key={det.id} className={`p-3 rounded-lg ${det.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{det.gender === 'male' ? '👦 Boy' : '👧 Girl'}</span>
                      <span className="text-xs text-gray-600">{Math.round((det.confidence || 0) * 100)}%</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(det.timestamp).toLocaleTimeString()}</div>
                  </div>
                ))}
                {detections.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No detections yet</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleCounter;