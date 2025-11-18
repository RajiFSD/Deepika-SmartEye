import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Play, Pause, RotateCcw, Users, User, Video, Activity, X, CheckCircle, AlertCircle } from 'lucide-react';
import cameraService from '../services/cameraService';

const PeopleCounter = () => {
  const [mode, setMode] = useState('camera'); // 'camera' or 'video'
  const [isRunning, setIsRunning] = useState(false);
  const [counts, setCounts] = useState({ male: 0, female: 0, total: 0 });
  const [detections, setDetections] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Camera selection
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [streamId, setStreamId] = useState(null);
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  const tenantId = localStorage.getItem('tenantId') || sessionStorage.getItem('tenantId');
  const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');

  console.log("User ID:", userId, "Branch ID:", branchId,"Tenant ID:", tenantId);
    
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionInterval = useRef(null);
  const API_BASE = 'http://localhost:3000/api'; // Your backend API

  // Load cameras on mount
  useEffect(() => {
    if (mode === 'camera') {
      loadCameras();
    }
    return () => {
      stopDetection();
    };
  }, [mode]);

  // Load cameras from API
  const loadCameras = async () => {
    setLoadingCameras(true);
    try {
      const user_id = userId;
      const response = await cameraService.getCamerasByuserId(user_id, {
        page: 1,
        limit: 100,
        is_active: true,       
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
      console.log('Loaded cameras:', camerasData);
      setCameras(Array.isArray(camerasData) ? camerasData : []);
    } catch (err) {
      console.error('Error loading cameras:', err);
      setError('Failed to load cameras');
    } finally {
      setLoadingCameras(false);
    }
  };

  // Start camera stream
  const startCameraStream = async () => {
    if (!selectedCamera) {
      setError('Please select a camera first');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Start stream via your API
      const response = await fetch(`${API_BASE}/camera/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_id: selectedCamera.camera_id })
      });

      const result = await response.json();

      if (result.success) {
        setStreamActive(true);
        setStreamId(result.streamId);
        
        // Set video source to MJPEG stream
        if (videoRef.current) {
          videoRef.current.src = `${API_BASE}${result.streamUrl}`;
        }

        setIsRunning(true);
        startDetectionLoop();
      } else {
        setError(result.message || 'Failed to start camera stream');
      }
    } catch (err) {
      console.error('Stream start error:', err);
      setError('Failed to start camera stream');
    } finally {
      setProcessing(false);
    }
  };

  // Stop camera stream
  const stopCameraStream = async () => {
    if (streamId) {
      try {
        await fetch(`${API_BASE}/camera/stop/${streamId}`, {
          method: 'POST'
        });
      } catch (err) {
        console.error('Error stopping stream:', err);
      }
    }
    
    setStreamActive(false);
    setStreamId(null);
    if (videoRef.current) {
      videoRef.current.src = '';
    }
  };

  // Upload and process video
  const uploadAndProcessVideo = async () => {
    if (!videoFile) {
      setError('Please select a video file first');
      return;
    }

    setProcessing(true);
    setError('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('detect_gender', 'true');

    try {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      });

      // Handle response
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          
          if (result.success) {
            processVideoResults(result);
          } else {
            setError(result.message || 'Processing failed');
          }
        } else {
          setError('Upload failed');
        }
        setProcessing(false);
      });

      xhr.addEventListener('error', () => {
        setError('Upload failed');
        setProcessing(false);
      });

      xhr.open('POST', `${API_BASE}/detection/process-video`);
      xhr.send(formData);

    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload video');
      setProcessing(false);
    }
  };

  // Process video results
  const processVideoResults = (result) => {
    const { detections, summary } = result;
    
    // Update counts
    setCounts({
      male: summary.male_count || 0,
      female: summary.female_count || 0,
      total: summary.total_count || 0
    });

    // Update detections list
    setDetections(detections.map(det => ({
      id: det.detection_id || Date.now() + Math.random(),
      gender: det.gender,
      confidence: det.confidence_score,
      timestamp: det.detection_time,
      bbox: det.metadata?.bbox
    })));

    // Load video for playback
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(videoFile);
    }
    
    setIsRunning(true);
  };

  // Detection loop for real-time
  const startDetectionLoop = () => {
    detectionInterval.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current && streamActive) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get frame as blob
        canvas.toBlob(async (blob) => {
          if (blob && streamActive) {
            await detectPeopleInFrame(blob);
          }
        }, 'image/jpeg', 0.8);
      }
    }, 2000); // Process every 2 seconds
  };

  // Detect people in single frame
  const detectPeopleInFrame = async (frameBlob) => {
    try {
      const formData = new FormData();
      formData.append('frame', frameBlob);
      formData.append('camera_id', selectedCamera?.camera_id);

      const response = await fetch(`${API_BASE}/detection/detect-frame`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && result.detections) {
        // Update counts
        const maleCount = result.detections.filter(d => d.gender === 'male').length;
        const femaleCount = result.detections.filter(d => d.gender === 'female').length;

        setCounts(prev => ({
          male: prev.male + maleCount,
          female: prev.female + femaleCount,
          total: prev.total + result.detections.length
        }));

        // Add to detections list
        const newDetections = result.detections.map(det => ({
          id: Date.now() + Math.random(),
          gender: det.gender,
          confidence: det.confidence_score,
          timestamp: new Date().toISOString(),
          bbox: det.bbox
        }));

        setDetections(prev => [...newDetections, ...prev].slice(0, 50));

        // Draw on canvas
        if (canvasRef.current) {
          drawDetections(canvasRef.current.getContext('2d'), result.detections);
        }
      }
    } catch (err) {
      console.error('Detection error:', err);
    }
  };

  // Draw bounding boxes
  const drawDetections = (ctx, detections) => {
    detections.forEach(det => {
      if (!det.bbox) return;
      
      const { x, y, width, height } = det.bbox;
      const color = det.gender === 'male' ? '#3B82F6' : '#EC4899';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 25, width, 25);
      
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.fillText(
        `${det.gender === 'male' ? 'Boy' : 'Girl'} ${(det.confidence_score * 100).toFixed(0)}%`,
        x + 5,
        y - 8
      );
    });
  };

  // Stop detection
  const stopDetection = () => {
    setIsRunning(false);
    
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
    
    if (streamActive) {
      stopCameraStream();
    }
    
    if (videoRef.current && mode === 'video') {
      videoRef.current.pause();
    }
  };

  // Reset counts
  const resetCounts = () => {
    setCounts({ male: 0, female: 0, total: 0 });
    setDetections([]);
    setUploadProgress(0);
  };

  // Handle mode switch
  const switchMode = (newMode) => {
    stopDetection();
    setMode(newMode);
    setVideoFile(null);
    setSelectedCamera(null);
    resetCounts();
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Users className="text-blue-600" size={32} />
            AI People Counter with Gender Detection
          </h1>
          <p className="text-gray-600">Real-time detection from cameras and uploaded videos</p>
        </div>

        {/* Mode Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => switchMode('camera')}
              className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'camera'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Camera size={20} />
              Live Camera Feed
            </button>
            <button
              onClick={() => switchMode('video')}
              className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'video'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload size={20} />
              Upload Video
            </button>
          </div>

          {/* Camera Mode */}
          {mode === 'camera' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Camera
                </label>
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
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={streamActive ? stopCameraStream : startCameraStream}
                disabled={!selectedCamera || processing}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                  streamActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400'
                }`}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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

          {/* Video Upload Mode */}
          {mode === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Video File
                </label>
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
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
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
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
            <button
              onClick={resetCounts}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              <RotateCcw size={20} />
              Reset Counts
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
              <button onClick={() => setError('')} className="ml-auto">
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Video Display & Counts */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {mode === 'camera' ? 'Live Feed' : 'Video Playback'}
            </h2>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              {mode === 'camera' ? (
                <img
                  ref={videoRef}
                  alt="Camera stream"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={videoRef}
                  controls
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
              {!isRunning && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                  {mode === 'camera' ? 'Select camera and start stream' : 'Upload and process video'}
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="space-y-4">
            {/* Total Count */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold">Total Count</span>
                <Users size={24} />
              </div>
              <div className="text-4xl font-bold">{counts.total}</div>
            </div>

            {/* Boys Count */}
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

            {/* Girls Count */}
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

            {/* Recent Detections */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">Recent Detections</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detections.slice(0, 10).map(det => (
                  <div
                    key={det.id}
                    className={`p-3 rounded-lg ${
                      det.gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">
                        {det.gender === 'male' ? '👦 Boy' : '👧 Girl'}
                      </span>
                      <span className="text-xs text-gray-600">
                        {(det.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(det.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
                {detections.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No detections yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleCounter;