import React, { useState, useEffect, useRef } from 'react';
import ObjectCounterService from '../../services/ObjectCounterService';
import cameraService from '../../services/cameraService';
import { startStream, stopStream } from '../../services/camera_connection_service';

export default function ConveyorCounterPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  
  // NEW: Camera state
  const [cameras, setCameras] = useState([]);
  const [loadingCameras, setLoadingCameras] = useState(false);
  
  const [videoFile, setVideoFile] = useState(null);
  const fileInputRef = useRef(null);
  
  // Line configuration
  const [lineType, setLineType] = useState('horizontal');
  const [linePosition, setLinePosition] = useState(300);
  const [confidence, setConfidence] = useState(0.3);
  const [classId, setClassId] = useState(-1);
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId') || '1';
  const tenantId = localStorage.getItem('tenantId') || sessionStorage.getItem('tenantId') || '1';
  const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId') || '1';

  const [streamForm, setStreamForm] = useState({
    camera_id: '',
    duration: 60,
    model_type: 'line',
    capture_images: true,
    line_type: 'horizontal',
    line_position: 300,
    confidence: 0.3,
    class_id: -1,
    zone_id: '',
    branch_id: branchId
  });

  // Stream preview state
  const [streamPreview, setStreamPreview] = useState(null);
  const [testingStream, setTestingStream] = useState(false);
  const [streamTestResult, setStreamTestResult] = useState(null);
  const [liveStreamUrl, setLiveStreamUrl] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [activeStreamId, setActiveStreamId] = useState(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [activeProcessingJob, setActiveProcessingJob] = useState(null); // Track if processing is running
  const videoRef = useRef(null);

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

  const fetchJobs = async () => {
    try {
      const data = await ObjectCounterService.fetchJobs();
      if (data.success) {
        setJobs(data.jobs || data.data?.rows || []);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      // Don't set error state for fetch jobs to avoid blocking UI
      // setError(error.message);
    }
  };

  const fetchJob = async (jobId) => {
    try {
      const data = await ObjectCounterService.fetchJob(jobId);
      if (data.success) {
        return data.job || data.data;
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
    }
    return null;
  };

  const fetchJobImages = async (jobId) => {
    try {
      const data = await ObjectCounterService.fetchJobImages(jobId);
      if (data.success) {
        setImages(data.images || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      alert('Please select a video file');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await ObjectCounterService.uploadVideoConveyor(
        videoFile,
        { 
          model_type: 'line',
          capture_images: true,
          line_type: lineType,
          line_position: linePosition,
          confidence: confidence,
          class_id: classId
        },
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        alert('Video uploaded successfully! Processing started.');
        setVideoFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchJobs();
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

const handleStreamStart = async () => {
  if (!streamForm.camera_id) {
    alert('Camera ID is required');
    return;
  }

  // ✅ Verify stream is active before starting processing
  if (!isStreamActive) {
    setError('Please start the live stream first to verify camera connection');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const result = await ObjectCounterService.startStream(streamForm);
    
    if (result.success) {
      // ✅ Store the processing job ID
      const jobId = result.job?.id || result.jobId || result.data?.id;
      if (jobId) {
        setActiveProcessingJob(jobId);
        console.log('🎯 Started processing job:', jobId);
      }
      
      // ✅ Update stream test result to show processing status
      setStreamTestResult({
        success: true,
        processing: true,
        message: '🎯 Object counting in progress...',
        camera: streamTestResult?.camera,
        streamInfo: streamTestResult?.streamInfo
      });
      
      // ✅ Show success message
      alert(`Object counting started! Job ID: ${jobId}\n\nStream will continue running until processing completes or you stop it.`);
      
      await fetchJobs();
    } else {
      setError(result.message || 'Failed to start stream');
    }
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

  const testCameraConnection = async (camera) => {
  try {
    // Test if we can reach the camera
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(camera.stream_url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors' // Allow cross-origin for testing
    });
    
    clearTimeout(timeoutId);
    return { success: true, reachable: true };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        reachable: false,
        message: 'Camera connection timeout - camera may be offline'
      };
    }
    return { 
      success: false, 
      reachable: false,
      message: error.message 
    };
  }
};

const handleTestStream = async () => {
  if (!streamForm.camera_id) {
    alert('Please select a camera first');
    return;
  }

  setTestingStream(true);
  setStreamTestResult(null);
  setError(null);
  setLiveStreamUrl(null);

  try {
    const camera = cameras.find(c => c.camera_id === parseInt(streamForm.camera_id));
    if (!camera) {
      throw new Error('Camera not found');
    }

    console.log('📷 Testing camera connection:', camera);
    
    // ✅ TEST CONNECTION FIRST
    const connectionTest = await testCameraConnection(camera);
    if (!connectionTest.reachable) {
      throw new Error(connectionTest.message || 'Camera is not reachable on the network');
    }

    console.log('📷 Starting stream for camera:', camera);
    setSelectedCamera(camera);

    const streamResult = await startStream({
      camera_id: camera.camera_id,
      stream_url: camera.stream_url,
      ip_address: camera.ip_address,
      port: camera.port,
      protocol: camera.protocol,
      username: camera.username,
      password: camera.password
    });

    console.log('📡 Stream result:', streamResult);

    if (streamResult.success) {
      setStreamTestResult({
        success: true,
        message: 'Stream connected successfully',
        camera: {
          id: camera.camera_id,
          name: camera.camera_name,
          url: camera.stream_url
        },
        streamInfo: {
          streamId: streamResult.streamId,
          streamUrl: streamResult.streamUrl,
          cameraStreamUrl: camera.stream_url
        }
      });

      setActiveStreamId(streamResult.streamId);
      setIsStreamActive(true);
      
      // Add timestamp to prevent caching issues
      const previewUrl = camera.stream_url + (camera.stream_url.includes('?') ? '&' : '?') + 't=' + Date.now();
      console.log('🎥 Using camera URL:', previewUrl);
      setLiveStreamUrl(previewUrl);
      
    } else {
      throw new Error(streamResult.message || 'Failed to connect to camera stream');
    }
  } catch (error) {
    console.error('❌ Stream test error:', error);
    setStreamTestResult({
      success: false,
      message: error.message || 'Failed to test camera stream'
    });
    setError(error.message || 'Failed to test camera stream');
  } finally {
    setTestingStream(false);
  }
};

  const handleStopStream = async () => {
  if (!activeStreamId) {
    alert('No active stream to stop');
    return;
  }

  // ✅ Warn if processing is active
  if (activeProcessingJob) {
    const confirmStop = confirm(
      'Object counting is currently in progress. Stopping the stream will also cancel the counting job.\n\nDo you want to continue?'
    );
    if (!confirmStop) {
      return;
    }
  }

  try {
    setTestingStream(true);
    
    // ✅ Cancel processing job first if active
    if (activeProcessingJob) {
      console.log('🛑 Cancelling active processing job:', activeProcessingJob);
      await handleCancel(activeProcessingJob);
    }
    
    // ✅ Then stop the stream
    const result = await stopStream(activeStreamId);
    
    if (result.success) {
      setLiveStreamUrl(null);
      setStreamTestResult(null);
      setActiveStreamId(null);
      setIsStreamActive(false);
      setActiveProcessingJob(null);
      console.log('✅ Stream and processing stopped successfully');
    } else {
      setError('Failed to stop stream: ' + result.message);
    }
  } catch (error) {
    console.error('❌ Error stopping stream:', error);
    setError('Failed to stop stream: ' + error.message);
  } finally {
    setTestingStream(false);
  }
};

  const handleCancel = async (jobId) => {
    if (!jobId) {
      console.error('No job ID provided to cancel');
      return;
    }

    try {
      console.log('🛑 Cancelling job:', jobId);
      const result = await ObjectCounterService.cancelJob(jobId);
      
      if (result.success) {
        console.log('✅ Job cancelled successfully');
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
        }
        if (activeProcessingJob === jobId) {
          setActiveProcessingJob(null);
        }
        await fetchJobs();
      } else {
        setError(result.message || 'Failed to cancel job');
      }
    } catch (error) {
      console.error('❌ Cancel failed:', error);
      setError('Failed to cancel job: ' + error.message);
    }
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const result = await ObjectCounterService.deleteJob(jobId);
      if (result.success) {
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
          setImages([]);
        }
        await fetchJobs();
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setError(error.message);
    }
  };

  const handleDownload = async (jobId, format) => {
  if (!jobId) {
    console.error('No job ID provided for download');
    return;
  }

  try {
    // ✅ First check if job is actually completed
    const job = await fetchJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    
    if (job.status !== 'completed') {
      throw new Error(`Job is not completed yet (status: ${job.status})`);
    }
    
    // ✅ Check if output file exists in job results
    if (format === 'video' && !job.results?.output_video) {
      throw new Error('Output video not available. The processing may not have generated a video file.');
    }
    
    console.log('📥 Downloading job:', jobId, 'format:', format);
    await ObjectCounterService.downloadResults(jobId, format);
    console.log('✅ Download initiated');
    
  } catch (error) {
    console.error('❌ Download failed:', error);
    
    let errorMessage = 'Download failed: ';
    
    if (error.message.includes('404')) {
      errorMessage += 'Output file not found. The job may not have completed successfully, or the output file has been deleted.';
    } else if (error.message.includes('not completed')) {
      errorMessage += error.message;
    } else if (error.message.includes('not available')) {
      errorMessage += error.message + ' Try downloading JSON results instead.';
    } else {
      errorMessage += error.message;
    }
    
    setError(errorMessage);
  }
};

  const viewJob = async (job) => {
    const updatedJob = await fetchJob(job.id);
    setSelectedJob(updatedJob || job);
    
    if ((updatedJob || job)?.status === 'completed') {
      await fetchJobImages((updatedJob || job).id);
    }
  };

  useEffect(() => {
    //fetchJobs();
    loadCameras(); // Load cameras on mount
    
    const interval = setInterval(() => {
      fetchJobs();
      
      if (selectedJob && (selectedJob.status === 'processing' || selectedJob.status === 'queued')) {
        fetchJob(selectedJob.id).then(job => {
          if (job) setSelectedJob(job);
        });
      }
      
      // Check if active processing job is still running
      if (activeProcessingJob) {
        fetchJob(activeProcessingJob).then(job => {
          if (job && (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')) {
            console.log('🏁 Processing job finished:', job.status);
            setActiveProcessingJob(null);
          }
        });
      }
    }, 5000);

    // Cleanup: stop stream when component unmounts
    return () => {
      clearInterval(interval);
      if (activeStreamId) {
        stopStream(activeStreamId).catch(err => 
          console.error('Failed to stop stream on unmount:', err)
        );
      }
      if (activeProcessingJob) {
        handleCancel(activeProcessingJob).catch(err =>
          console.error('Failed to cancel job on unmount:', err)
        );
      }
    };
  }, [selectedJob, activeStreamId, activeProcessingJob]);

  // Setup video player for HLS streams
  useEffect(() => {
    if (liveStreamUrl && videoRef.current) {
      const video = videoRef.current;
      
      // Check if it's an HLS stream
      if (liveStreamUrl.includes('.m3u8') || liveStreamUrl.includes('hls')) {
        // Try to load HLS.js if available
        if (window.Hls && window.Hls.isSupported()) {
          const hls = new window.Hls();
          hls.loadSource(liveStreamUrl);
          hls.attachMedia(video);
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log('Autoplay prevented:', e));
          });
          
          return () => {
            hls.destroy();
          };
        }
        // Safari native HLS support
        else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = liveStreamUrl;
          video.play().catch(e => console.log('Autoplay prevented:', e));
        }
      } else {
        // Regular video source
        video.src = liveStreamUrl;
        video.play().catch(e => console.log('Autoplay prevented:', e));
      }
    }
  }, [liveStreamUrl]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'queued': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-2xl font-bold tracking-tight">Conveyor Belt Counter</h1>
          <p className="text-sm text-gray-600">AI-powered line-crossing detection for any orientation</p>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* // Add after your error display, before main content */}
{selectedCamera && !isStreamActive && (
  <div className="mx-auto max-w-7xl px-4 py-2">
    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
      <div className="font-semibold text-blue-900 mb-2">🔍 Camera Connection Info</div>
      <div className="space-y-1 text-blue-800 text-xs font-mono">
        <div>Camera: {selectedCamera.camera_name}</div>
        <div>IP: {selectedCamera.ip_address}:{selectedCamera.port}</div>
        <div>Stream URL: {selectedCamera.stream_url}</div>
      </div>
      <div className="mt-3 text-xs text-blue-700">
        <div className="font-semibold mb-1">Troubleshooting Steps:</div>
        <ol className="list-decimal list-inside space-y-1">
          <li>Ping camera: <code className="bg-blue-100 px-1">ping {selectedCamera.ip_address}</code></li>
          <li>Test in browser: Open {selectedCamera.stream_url} in a new tab</li>
          <li>Check if camera is on same network/VLAN</li>
          <li>Verify firewall allows port {selectedCamera.port}</li>
        </ol>
      </div>
    </div>
  </div>
)}

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'upload'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Upload Video
              </button>
              <button
                onClick={() => {
                  setActiveTab('stream');
                  if (cameras.length === 0) loadCameras(); // Load cameras when switching to stream tab
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'stream'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Camera Stream
              </button>
            </div>

            {activeTab === 'upload' && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Video File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                  />
                  {videoFile && (
                    <p className="mt-2 text-xs text-gray-600">
                      Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200">
                  <label className="block text-sm font-bold text-purple-900 mb-3">
                    🎯 Line Orientation (IMPORTANT!)
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => {
                        setLineType('horizontal');
                        setLinePosition(300);
                      }}
                      className={`p-3 rounded-lg border-2 transition ${
                        lineType === 'horizontal'
                          ? 'border-purple-600 bg-purple-100 text-purple-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1">Horizontal ─</div>
                      <div className="text-xs">For ⬆️⬇️ movement</div>
                    </button>
                    <button
                      onClick={() => {
                        setLineType('vertical');
                        setLinePosition(600);
                      }}
                      className={`p-3 rounded-lg border-2 transition ${
                        lineType === 'vertical'
                          ? 'border-purple-600 bg-purple-100 text-purple-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1">Vertical │</div>
                      <div className="text-xs">For ⬅️➡️ movement</div>
                    </button>
                  </div>
                  <p className="text-xs text-purple-700">
                    {lineType === 'horizontal' 
                      ? '✓ Use for objects moving UP/DOWN'
                      : '✓ Use for objects moving LEFT/RIGHT'}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    📏 Line Position ({lineType === 'horizontal' ? 'Y-axis' : 'X-axis'})
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="50"
                      max={lineType === 'horizontal' ? '1000' : '1800'}
                      value={linePosition}
                      onChange={(e) => setLinePosition(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      value={linePosition}
                      onChange={(e) => setLinePosition(parseInt(e.target.value) || 300)}
                      className="w-20 px-2 py-1 text-sm border rounded"
                      min="50"
                      max={lineType === 'horizontal' ? '1000' : '1800'}
                    />
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    {lineType === 'horizontal' 
                      ? 'Tip: For 720p use ~360, for 1080p use ~540'
                      : 'Tip: For 1280 width use ~640, for 1920 width use ~960'}
                  </p>
                </div>

                <details className="bg-gray-50 rounded-lg p-3">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    Advanced Settings
                  </summary>
                  <div className="mt-3 space-y-3">
                    <label className="text-xs">
                      <span className="block text-gray-700 mb-1">Confidence Threshold</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.05"
                          value={confidence}
                          onChange={(e) => setConfidence(parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs w-12">{confidence.toFixed(2)}</span>
                      </div>
                    </label>
                    
                    <label className="text-xs">
                      <span className="block text-gray-700 mb-1">Class ID (-1 = all objects)</span>
                      <input
                        type="number"
                        value={classId}
                        onChange={(e) => setClassId(parseInt(e.target.value))}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </label>
                  </div>
                </details>

                {uploadProgress > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!videoFile || loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Uploading...' : 'Upload & Process'}
                </button>
              </div>
            )}

            {activeTab === 'stream' && (
              <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                <label className="text-sm">
                  <span className="block text-gray-700 mb-1 font-medium">
                    Select Camera {loadingCameras && <span className="text-xs text-gray-500">(Loading...)</span>}
                  </span>
                  <select
                    value={streamForm.camera_id}
                    onChange={(e) => {
                      setStreamForm({ ...streamForm, camera_id: e.target.value });
                      setStreamPreview(null);
                      setStreamTestResult(null);
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    disabled={loadingCameras}
                  >
                    <option value="">-- Select a camera --</option>
                    {cameras.map((camera) => (
                      <option key={camera.camera_id} value={camera.camera_id}>
                        {camera.camera_name || `Camera ${camera.camera_id}`} ({camera.camera_id})
                      </option>
                    ))}
                  </select>
                  {cameras.length === 0 && !loadingCameras && (
                    <p className="mt-1 text-xs text-amber-600">
                      No active cameras found. <button onClick={loadCameras} className="underline">Refresh</button>
                    </p>
                  )}
                </label>

                {/* Test Stream Button */}
                {streamForm.camera_id && !isStreamActive && (
                  <button
                    onClick={handleTestStream}
                    disabled={testingStream}
                    className="w-full rounded-lg bg-purple-600 text-white px-4 py-2 text-sm font-medium hover:bg-purple-500 disabled:opacity-50 transition"
                  >
                    {testingStream ? 'Starting Stream...' : '🎥 Start Live Stream'}
                  </button>
                )}

            {/* Stop Stream Button */}
{streamForm.camera_id && isStreamActive && (
  <div className="space-y-2">
    <button
      onClick={handleStopStream}
      disabled={testingStream}
      className="w-full rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-50 transition"
    >
      {testingStream ? 'Stopping...' : '⏹️ Stop Live Stream'}
    </button>
    {activeProcessingJob && (
      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
        ⚠️ <strong>Warning:</strong> Object counting is currently active (Job: {activeProcessingJob}).
        <br />
        Stopping the stream will also stop the counting process.
      </div>
    )}
  </div>
)}

                {/* Stream Test Result */}
              
{streamTestResult && (
  <div className={`rounded-lg p-3 text-sm ${
    streamTestResult.success 
      ? streamTestResult.processing 
        ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
        : 'bg-green-50 border border-green-200 text-green-800'
      : 'bg-red-50 border border-red-200 text-red-800'
  }`}>
    <div className="font-medium mb-1">
      {streamTestResult.success 
        ? streamTestResult.processing 
          ? '🎯 Object Counting Active' 
          : '✅ Stream Connected' 
        : '❌ Stream Failed'}
    </div>
    <div className="text-xs">{streamTestResult.message}</div>
    {streamTestResult.streamInfo && (
      <div className="text-xs mt-1 space-y-1">
        {streamTestResult.streamInfo.streamId && (
          <div>Stream ID: {streamTestResult.streamInfo.streamId}</div>
        )}
        <div className="truncate">URL: {streamTestResult.streamInfo.cameraStreamUrl}</div>
      </div>
    )}
  </div>
)}

                {/* Live Stream Preview */}
                {liveStreamUrl && streamTestResult?.success && (
                  <div className="border-2 border-green-500 rounded-lg overflow-hidden bg-black">
    <div className={`p-2 text-xs text-white font-medium flex items-center justify-between ${
      activeProcessingJob 
        ? 'bg-gradient-to-r from-emerald-600 to-green-600'
        : 'bg-gradient-to-r from-green-600 to-emerald-600'
    }`}>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span>
          {activeProcessingJob ? '🎯 COUNTING' : '🔴 LIVE'} - {selectedCamera?.camera_name}
        </span>
      </div>
      <button
        onClick={handleStopStream}
        className="text-white hover:text-red-200 font-bold"
        title="Stop stream"
      >
        ✕
      </button>
                    </div>
                    <div className="relative bg-gray-900">
                      {/* For IP cameras with MJPEG - use img tag for direct stream */}
                     <img 
  src={liveStreamUrl} 
  alt="Live camera feed" 
  className="w-full h-auto object-contain"
  style={{ maxHeight: '300px' }}
  onLoad={() => {
    console.log('✅ Stream loaded successfully from:', liveStreamUrl);
  }}
  onError={(e) => {
    console.error('❌ Stream failed to load from:', liveStreamUrl);
    
    // Add timeout detection
    const errorType = e.type === 'error' ? 'Connection Error' : 'Load Error';
    
    const troubleshooting = [
      '1. Check if camera is powered on and online',
      '2. Verify camera IP: ' + (selectedCamera?.ip_address || '192.168.31.89'),
      '3. Test URL in browser: ' + liveStreamUrl,
      '4. Check network connection and firewall',
      '5. Verify camera credentials if required'
    ].join('\n');
    
    setError(`${errorType}: Camera stream unreachable\n\n${troubleshooting}`);
    setIsStreamActive(false);
    setLiveStreamUrl(null);
    setActiveStreamId(null); // Clear stream ID
    setStreamTestResult({
      success: false,
      message: 'Camera connection timeout - verify network and camera status'
    });
  }}
/> 
                      {/* Stream info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="text-xs text-white/90 space-y-1">
                          {streamTestResult?.streamInfo?.streamId && (
                            <div>Stream ID: {streamTestResult.streamInfo.streamId}</div>
                          )}
                          <div className="truncate text-white/60">
                            {liveStreamUrl}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stream controls */}
                    <div className="bg-gray-800 p-2 flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          // Refresh stream
                          const newUrl = liveStreamUrl.split('?')[0] + '?t=' + Date.now();
                          setLiveStreamUrl(newUrl);
                        }}
                        className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                      >
                        🔄 Refresh
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = liveStreamUrl;
                          link.target = '_blank';
                          link.click();
                        }}
                        className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                      >
                        🔗 Open in New Tab
                      </button>
                    </div>
                  </div>
                )}
                
                <label className="text-sm">
                  <span className="block text-gray-700 mb-1">Duration (seconds)</span>
                  <input
                    type="number"
                    value={streamForm.duration}
                    onChange={(e) => setStreamForm({ ...streamForm, duration: parseInt(e.target.value) })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-sm">
                  <span className="block text-gray-700 mb-1">Line Type</span>
                  <select
                    value={streamForm.line_type}
                    onChange={(e) => setStreamForm({ ...streamForm, line_type: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="horizontal">Horizontal (for ⬆️⬇️ movement)</option>
                    <option value="vertical">Vertical (for ⬅️➡️ movement)</option>
                  </select>
                </label>

                <label className="text-sm">
                  <span className="block text-gray-700 mb-1">Line Position</span>
                  <input
                    type="number"
                    value={streamForm.line_position}
                    onChange={(e) => setStreamForm({ ...streamForm, line_position: parseInt(e.target.value) })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>

                <details className="bg-gray-50 rounded-lg p-3">
                  <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                    Advanced Settings
                  </summary>
                  <div className="mt-3 space-y-3">
                    <label className="text-sm">
                      <span className="block text-gray-700 mb-1">Zone ID (optional)</span>
                      <input
                        type="number"
                        value={streamForm.zone_id}
                        onChange={(e) => setStreamForm({ ...streamForm, zone_id: e.target.value })}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        placeholder="Leave empty to use camera's zone"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="block text-gray-700 mb-1">Confidence Threshold</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.05"
                          value={streamForm.confidence}
                          onChange={(e) => setStreamForm({ ...streamForm, confidence: parseFloat(e.target.value) })}
                          className="flex-1"
                        />
                        <span className="text-xs w-12">{streamForm.confidence.toFixed(2)}</span>
                      </div>
                    </label>

                    <label className="text-sm">
                      <span className="block text-gray-700 mb-1">Class ID (-1 = all)</span>
                      <input
                        type="number"
                        value={streamForm.class_id}
                        onChange={(e) => setStreamForm({ ...streamForm, class_id: parseInt(e.target.value) })}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </details>

              <div className="space-y-2">
  <button
    onClick={handleStreamStart}
    disabled={loading || !streamForm.camera_id || !isStreamActive || activeProcessingJob}
    className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
  >
    {loading ? 'Starting...' : activeProcessingJob ? '⏳ Counting in Progress...' : '🎯 Start Object Counting'}
  </button>
  
  {!isStreamActive && streamForm.camera_id && (
    <p className="text-xs text-amber-600 text-center bg-amber-50 border border-amber-200 rounded p-2">
      ⚠️ Please start live stream first to verify camera connection
    </p>
  )}
  
  {activeProcessingJob && (
    <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
      ✅ Object counting is active (Job ID: {activeProcessingJob})
      <br />
      <span className="text-green-600">Stream will continue until processing completes or you stop it manually</span>
    </div>
  )}
</div>
                
              
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                Processing Jobs
              </h2>
              <button
                onClick={fetchJobs}
                className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50 transition"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {jobs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No jobs yet</p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition ${
                      selectedJob?.id === job.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div
                      onClick={() => viewJob(job)}
                      className="flex items-start justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {job.fileName || job.source || job.id}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(job.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`ml-2 text-xs px-2 py-1 rounded border ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    {job.status === 'processing' && (
                      <div className="mt-2 space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${job.progress || 0}%` }}
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(job.id);
                          }}
                          className="w-full text-xs px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition"
                        >
                          🛑 Cancel Job
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="lg:col-span-2">
          {selectedJob ? (
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b px-4 py-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Job Details</h2>
                    <p className="text-xs text-gray-600">ID: {selectedJob.id}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedJob.status === 'processing' && (
                      <button
                        onClick={() => handleCancel(selectedJob.id)}
                        className="text-xs rounded-lg border px-3 py-1.5 hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    )}
                    {selectedJob.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleDownload(selectedJob.id, 'json')}
                          className="text-xs rounded-lg bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-500 transition"
                        >
                          Download JSON
                        </button>
                        <button
                          onClick={() => handleDownload(selectedJob.id, 'video')}
                          className="text-xs rounded-lg bg-green-600 text-white px-3 py-1.5 hover:bg-green-500 transition"
                        >
                          Download Video
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(selectedJob.id)}
                      className="text-xs rounded-lg border border-red-300 text-red-600 px-3 py-1.5 hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <div className={`mt-1 inline-block text-xs px-2 py-1 rounded border ${getStatusColor(selectedJob.status)}`}>
                      {selectedJob.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Uploaded</div>
                    <div className="text-sm font-medium">{new Date(selectedJob.uploadedAt).toLocaleTimeString()}</div>
                  </div>
                  {selectedJob.totalCount !== undefined && (
                    <>
                      <div>
                        <div className="text-xs text-gray-500">Total Count</div>
                        <div className="text-2xl font-bold text-blue-600">{selectedJob.totalCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Images Captured</div>
                        <div className="text-sm font-medium">{selectedJob.imagesCaptured || 0}</div>
                      </div>
                    </>
                  )}
                </div>

                {selectedJob.status === 'processing' && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Processing...</span>
                      <span>{selectedJob.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${selectedJob.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {selectedJob.status === 'completed' && selectedJob.results && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Video Information</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Resolution: {selectedJob.results.video_info?.width} x {selectedJob.results.video_info?.height}</div>
                        <div>FPS: {selectedJob.results.video_info?.fps}</div>
                        <div>Total Frames: {selectedJob.results.video_info?.total_frames}</div>
                        <div>Processing Time: {selectedJob.results.processing_time?.toFixed(2)}s</div>
                        {selectedJob.results.line_type && (
                          <>
                            <div>Line Type: {selectedJob.results.line_type}</div>
                            <div>Line Position: {selectedJob.results.line_position}</div>
                          </>
                        )}
                      </div>
                    </div>

                    {images.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Captured Images ({images.length})</h3>
                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                          {images.map((img, idx) => (
                            <img
                              key={idx}
                              src={ObjectCounterService.getImageUrl(img.url)}
                              alt={img.filename}
                              className="w-full h-24 object-cover rounded border hover:scale-105 transition cursor-pointer"
                              onClick={() => window.open(ObjectCounterService.getImageUrl(img.url), '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedJob.status === 'failed' && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="text-sm font-medium text-red-800">Processing Failed</div>
                    <div className="text-xs text-red-600 mt-1">{selectedJob.errorMessage}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white shadow-sm p-12 text-center">
              <div className="text-gray-400">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div className="text-sm">Select a job to view details</div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}