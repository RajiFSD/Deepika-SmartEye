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
import * as cameraConnectionService from '../../services/camera_connection_service';
import cameraService from '../../services/cameraService';
import peopleCountService from '../../services/peopleCountService'; 

// API + WS base URLs
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const WS_BASE = API_BASE.replace(/\/api\/?$/, '');

const PeopleCounter = () => {
  const [mode, setMode] = useState('camera');
  const [isRunning, setIsRunning] = useState(false);

  // main count state (current inside counts)
  const [counts, setCounts] = useState({ male: 0, female: 0, total: 0 });

  // recent detections list (from Python objects or last_detection)
  const [detections, setDetections] = useState([]);

  // video upload
  const [videoFile, setVideoFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // errors
  const [error, setError] = useState('');
  const [streamError, setStreamError] = useState(false);

  // camera selection
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loadingCameras, setLoadingCameras] = useState(false);

  // streaming state
  const [streamActive, setStreamActive] = useState(false);
  const streamActiveRef = useRef(false);
  const [streamId, setStreamId] = useState(null);
  const [cameraStreamUrl, setCameraStreamUrl] = useState(null);
  const streamRetryTimeout = useRef(null);

  // live counting (Python)
  const [isCounting, setIsCounting] = useState(false);
  const [direction, setDirection] = useState('LEFT_RIGHT');
  const wsRef = useRef(null);

  // media refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // kept for future overlay, but not used for HTTP detect-frame anymore

  // user/tenant/branch
  const userId =
    localStorage.getItem('userId') ||
    sessionStorage.getItem('userId') ||
    '1';
  const tenantId =
    localStorage.getItem('tenantId') ||
    sessionStorage.getItem('tenantId') ||
    '1';
  const branchId =
    localStorage.getItem('branchId') ||
    sessionStorage.getItem('branchId') ||
    '1';

  // ======================================
  // INITIAL LOAD + CLEANUP
  // ======================================

  useEffect(() => {
    if (mode === 'camera') loadCameras();

    return () => {
      // cleanup on unmount / mode change
      stopCameraStream();
      if (streamRetryTimeout.current) {
        clearTimeout(streamRetryTimeout.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsCounting(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ======================================
  // CAMERA LOADING
  // ======================================

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

  // ======================================
  // START / STOP CAMERA STREAM
  // ======================================

  const startCameraStream = async () => {
    if (!selectedCamera) {
      setError('Please select a camera first');
      return;
    }

    setProcessing(true);
    setError('');
    setStreamError(false);

    try {
      const streamIdLocal = `camera_${selectedCamera.camera_id}`;
      setStreamId(streamIdLocal);

      console.log('🎬 Starting camera stream via service:', streamIdLocal);

      const result = await cameraConnectionService.startStream({
        camera_id: selectedCamera.camera_id,
        tenant_id: tenantId,
        branch_id: branchId
      });

      console.log('📊 Stream start result:', result);


  // setCameraStreamUrl(rawCameraUrl);
  // console.log('✅ Set camera stream URL for Python people counting', rawCameraUrl);
  // if (videoRef.current && mjpegUrl) {
  //   const cacheBuster = `?t=${Date.now()}`;
  //   videoRef.current.src = `${mjpegUrl}${cacheBuster}`;
  //   videoRef.current.crossOrigin = 'anonymous';
  //   console.log('✅ Video element src set to MJPEG URL');
  //   console.log('🔄 Waiting for stream to load...');

        if (result.success) {
  // centralised URL builder in camera_connection_service
  const { mjpegUrl, rawCameraUrl } = cameraConnectionService.buildStreamUrls({
    streamType: result.streamType,
    streamId: streamIdLocal,
    camera: selectedCamera
  });
     

         console.log('📹 Player stream URL (MJPEG):', mjpegUrl);
         console.log('📡 Raw camera URL (for Python):', rawCameraUrl);

        setCameraStreamUrl(rawCameraUrl);
        // console.log('✅ Set camera stream URL for Python people counting', cameraStreamUrl);

        if (videoRef.current && mjpegUrl) {
          const cacheBuster = `?t=${Date.now()}`;
          videoRef.current.src = `${mjpegUrl}${cacheBuster}`;
          videoRef.current.crossOrigin = 'anonymous';
          console.log('✅ Video element src set to MJPEG URL');

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
          console.log('🔄 Retrying stream connection.');
          const retryUrl = `${mjpegUrl}?t=${Date.now()}`;
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
}
 else {
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

    // stop live people counting if running
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsCounting(false);
    setCameraStreamUrl(null);

    try {
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
  };

  // ======================================
  // VIDEO UPLOAD + PROCESS
  // ======================================

  const uploadAndProcessVideo = async () => {
    if (!videoFile) {
      setError('Please select a video file first');
      return;
    }

    setProcessing(true);
    setError('');
    setUploadProgress(0);

    try {
      console.log('📤 Uploading and processing video:', videoFile.name);
      const directionValue = direction || 'LEFT_RIGHT';
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('tenant_id', tenantId);
      formData.append('branch_id', branchId);
      formData.append('user_id', userId);
      formData.append('Direction', directionValue);

      const data = await peopleCountService.startVideoUpload({
      videoFile,
      tenantId,
      branchId,
      userId,
      direction: directionValue
      });

      console.log('✅ Video processing result:', data);

      if (data?.summary) {
        const male = data.summary.male || 0;
        const female = data.summary.female || 0;
        const total = male + female;
        setCounts({ male, female, total });
      }

      if (Array.isArray(data?.detections)) {
        setDetections(data.detections);
      }

      setProcessing(false);
      setIsRunning(true);

      if (videoRef.current) {
        const url = URL.createObjectURL(videoFile);
        videoRef.current.src = url;
      }
    } catch (err) {
      console.error('❌ Video upload error:', err);
      setError('Failed to process video: ' + err.message);
      setProcessing(false);
    }
  };

  // ======================================
  // PYTHON LIVE PEOPLE COUNTER (WS + DB)
  // ======================================

  // ONLY the startLivePeopleCount function - replace in your existing file

const startLivePeopleCount = async () => {
  if (!streamActive || !cameraStreamUrl || !streamId) {
    setError('Start camera stream first before enabling people counting');
    return;
  }
  if (isCounting) return;

  try {
    setError('');

    console.log('🚀 Starting live people count...');
    console.log('📦 Request payload:', {
      stream_url: cameraStreamUrl,
      direction,
      streamId,
      camera_id: selectedCamera?.camera_id,
      tenant_id: tenantId,
      branch_id: branchId
    });

    // Tell backend to spawn people_count_continuous.py
    const res = await fetch(`${API_BASE}/people-count/live/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stream_url: cameraStreamUrl,
        direction,
        streamId,
        camera_id: selectedCamera?.camera_id || null,
        tenant_id: tenantId,
        branch_id: branchId
      })
    });

    const data = await res.json();
    console.log('📊 Start response:', data);

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to start live people counting');
    }

    // ✅ Connect WebSocket for this streamId
    const wsUrl = `${WS_BASE.replace(/^http/, 'ws')}/ws/people-count/${streamId}`;
    console.log('🌐 Connecting WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ People-count WebSocket connected');
      setIsCounting(true);
      setError('');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', payload);

        // Handle connection confirmation
        if (payload.type === 'connection') {
          console.log('✅ Connection confirmed:', payload.message);
          return;
        }

        // Handle people count updates
        if (payload.type === 'people_count') {
          const inside = payload.inside ?? 0;
          const entered = payload.entered ?? 0;
          const exited = payload.exited ?? 0;

          console.log('📊 Count update:', { inside, entered, exited });

          // Update counts
          setCounts({
            male: 0, // If you add gender detection later
            female: 0,
            total: inside
          });

          // Update detections from objects array
          if (Array.isArray(payload.objects) && payload.objects.length > 0) {
            const mapped = payload.objects.map((obj) => ({
              id: obj.id || obj.track_id || `obj_${Date.now()}`,
              gender: obj.gender || 'Unknown',
              direction: payload.direction || null,
              confidence: obj.confidence ?? null,
              timestamp: payload.timestamp
                ? new Date(payload.timestamp * 1000).toISOString()
                : new Date().toISOString()
            }));

            setDetections((prev) => {
              const all = [...mapped, ...prev];
              return all.slice(0, 20);
            });
          }
        }
      } catch (err) {
        console.error('❌ Error parsing WebSocket message:', err);
        console.error('Raw message:', event.data);
      }
    };

    ws.onerror = (e) => {
      console.error('❌ WebSocket error:', e);
      setError('Live people count WebSocket error - check console');
    };

    ws.onclose = (event) => {
      console.log('🔌 People-count WebSocket closed:', event.code, event.reason);
      wsRef.current = null;
      setIsCounting(false);
      
      if (event.code !== 1000) { // Not a normal closure
        setError('WebSocket connection lost. Try restarting people counting.');
      }
    };

  } catch (err) {
    console.error('❌ Error starting people count:', err);
    setError(err.message);
    setIsCounting(false);
  }
};

  const stopLivePeopleCount = async () => {
    try {
      await fetch(`${API_BASE}/people-count/live/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (err) {
      console.error('Error stopping live people count', err);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsCounting(false);
  };

  // ======================================
  // OTHER HELPERS
  // ======================================

  const resetCounts = () => {
    setCounts({ male: 0, female: 0, total: 0 });
    setDetections([]);
    setUploadProgress(0);
  };

  const switchMode = (newMode) => {
    // stop WS + camera mode stuff when switching
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsCounting(false);

    stopCameraStream();
    setMode(newMode);
    setVideoFile(null);
    setSelectedCamera(null);
    resetCounts();
    setError('');
    setStreamError(false);
    setCameraStreamUrl(null);
  };

  // ======================================
  // RENDER
  // ======================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Users className="text-blue-600" size={32} />
            AI People Counter with Gender Detection
          </h1>
          <p className="text-gray-600">
            Real-time detection from cameras and uploaded videos
          </p>
        </div>

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

          {mode === 'camera' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Camera
                </label>
                <select
                  value={selectedCamera?.camera_id || ''}
                  onChange={(e) => {
                    const camera = cameras.find(
                      (c) => c.camera_id === parseInt(e.target.value)
                    );
                    setSelectedCamera(camera || null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingCameras || streamActive}
                >
                  <option value="">Choose a camera…</option>
                  {cameras.map((camera) => (
                    <option key={camera.camera_id} value={camera.camera_id}>
                      {camera.camera_name} - {camera.camera_code} (
                      {camera.ip_address})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCamera && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Activity
                      className="text-blue-600 flex-shrink-0"
                      size={20}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {selectedCamera.camera_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Location: {selectedCamera.location_description}
                      </p>
                      <p className="text-sm text-gray-600">
                        Resolution: {selectedCamera.resolution} @{' '}
                        {selectedCamera.fps} FPS
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Stream:{' '}
                        {selectedCamera.stream_url ||
                          `${selectedCamera.ip_address}:${selectedCamera.port}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stream start/stop */}
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

              {/* Live People Counting controls */}
              <div className="mt-4 p-4 border border-dashed rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Live People Counting
                    </p>
                    <p className="text-xs text-gray-500">
                      Uses Python tracking &amp; gender detection over this
                      camera stream.
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      isCounting
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isCounting ? 'Running' : 'Stopped'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <label className="text-xs text-gray-600 w-24">
                    Direction
                  </label>
                  <select
                    className="flex-1 p-2 border rounded-md text-sm"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    disabled={isCounting}
                  >
                    <option value="LEFT_RIGHT">Left → Right (IN)</option>
                    <option value="RIGHT_LEFT">Right → Left (IN)</option>
                    <option value="UP_DOWN">Top → Bottom (IN)</option>
                    <option value="DOWN_UP">Bottom → Top (IN)</option>
                  </select>
                </div>

                <button
                  onClick={isCounting ? stopLivePeopleCount : startLivePeopleCount}
                  disabled={!streamActive || processing}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition ${
                    isCounting
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300'
                  }`}
                >
                  {isCounting ? (
                    <>
                      <Pause size={18} />
                      Stop People Count
                    </>
                  ) : (
                    <>
                      <Activity size={18} />
                      Start People Count
                    </>
                  )}
                </button>

                {!streamActive && (
                  <p className="mt-2 text-xs text-gray-500">
                    Start the camera stream first, then enable people counting.
                  </p>
                )}
              </div>
            </div>
          )}

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
                    <span className="text-sm">
                      {videoFile.name} (
                      {(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              {processing && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Processing…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
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
                    Processing Video…
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
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-400 text-yellow-800 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <div className="flex-1">
                <p className="font-medium">{error}</p>
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
                  Retrying connection... Check if camera at{' '}
                  {selectedCamera?.ip_address}:{selectedCamera?.port} is
                  accessible.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MAIN VIDEO + STATS */}
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
                      <p className="text-lg">Reconnecting to camera…</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Stream: {selectedCamera?.camera_name}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <video
                  ref={videoRef}
                  controls
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}

              {/* Canvas kept for future overlays; currently not used for HTTP /detect-frame */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />

              {!isRunning && !streamError && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-lg bg-black bg-opacity-50">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p>
                      {mode === 'camera'
                        ? 'Select camera and start stream'
                        : 'Upload and process video'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold">Total Inside</span>
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
                {counts.total > 0
                  ? `${((counts.male / counts.total) * 100).toFixed(1)}%`
                  : '0%'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold">Girls</span>
                <User size={24} />
              </div>
              <div className="text-4xl font-bold">{counts.female}</div>
              <div className="text-sm opacity-90 mt-2">
                {counts.total > 0
                  ? `${((counts.female / counts.total) * 100).toFixed(1)}%`
                  : '0%'}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">
                Recent Detections
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detections.slice(0, 10).map((det) => {
                  const gender =
                    (det.gender || '').toLowerCase() === 'male'
                      ? 'Male'
                      : (det.gender || '').toLowerCase() === 'female'
                      ? 'Female'
                      : 'Unknown';
                  const isMale = gender === 'Male';

                  return (
                    <div
                      key={det.id}
                      className={`p-3 rounded-lg ${
                        isMale ? 'bg-blue-100' : 'bg-pink-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">
                          {gender === 'Male'
                            ? 'Boy'
                            : gender === 'Female'
                            ? 'Girl'
                            : 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-600">
                          {det.timestamp
                            ? new Date(det.timestamp).toLocaleTimeString()
                            : ''}
                        </span>
                      </div>
                      {det.direction && (
                        <p className="text-xs text-gray-600 mt-1">
                          Direction: {det.direction}
                        </p>
                      )}
                      {det.confidence != null && (
                        <p className="text-xs text-gray-600 mt-1">
                          Confidence: {(det.confidence * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  );
                })}

                {detections.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No detections yet.
                  </p>
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