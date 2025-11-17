import { useState, useEffect, useRef } from 'react';
import { Upload, FileVideo, Image, Play, CheckCircle, XCircle, AlertCircle, StopCircle, Pause, ArrowDownCircle, ArrowUpCircle, Video } from 'lucide-react';
import uploadAnalysisService from '../services/uploadAnalysisService';
import cameraService from '../services/cameraService';

const CAMERA_API_URL = import.meta.env.VITE_CAMERA_API_URL || 'http://localhost:5000';

function UploadAnalysisPage() {
  const [selectedFile, setSelectedFile] = useState(null);  
  const [cameraId, setCameraId] = useState('');
  const [cameras, setCameras] = useState([]);  
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [results, setResults] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  
  // Streaming states
  const [streamUrl, setStreamUrl] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveCounts, setLiveCounts] = useState({ entries: 0, exits: 0 });
  const [videoDuration, setVideoDuration] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  // Live stream display
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState(null);
  const [cameraApiConnected, setCameraApiConnected] = useState(false);
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  
  // Stream configuration
  const [streamConfig, setStreamConfig] = useState({
    ip: '',
    port: '8080',
    username: '',
    password: '',
    protocol: 'http',
    channel: '1'
  });
  
  const pollIntervalRef = useRef(null);
  const countsIntervalRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    checkBackendConnection();
    checkCameraApiConnection();
    loadRecentJobs();
    loadCameras();
    
    return () => {
      clearInterval(pollIntervalRef.current);
      clearInterval(countsIntervalRef.current);
      if (liveStreamId) {
        stopLiveStream();
      }
    };
  }, []);

  const checkBackendConnection = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      let response = await fetch(`${API_BASE_URL}/health`).catch(() => null);
      
      if (!response?.ok) {
        response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`).catch(() => null);
      }
      
      setBackendConnected(response?.ok || false);
      
      if (!response?.ok) {
        setError('⚠️ Backend server is not running. Please start the backend server on port 3000.');
      } else {
        setError(null);
      }
    } catch (err) {
      setBackendConnected(false);
      setError('⚠️ Cannot connect to backend server. Please ensure the backend is running.');
    }
  };

  const checkCameraApiConnection = async () => {
    try {
      const response = await fetch(`${CAMERA_API_URL}/api/health`);
      const data = await response.json();
      setCameraApiConnected(data.status === 'running');
    } catch (err) {
      console.error('Camera API not connected:', err);
      setCameraApiConnected(false);
    }
  };

  const loadCameras = async () => {
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
      
      setCameras(Array.isArray(camerasData) ? camerasData : []);
    } catch (err) {
      console.error('❌ Error loading cameras:', err);
      setCameras([]);
    }
  };

  const loadRecentJobs = async () => {
    try {
      const response = await uploadAnalysisService.getAllJobs({ limit: 5 });
      let jobsData = [];
      
      if (response?.data?.data?.jobs) {
        jobsData = response.data.data.jobs;
      } else if (response?.data?.jobs) {
        jobsData = response.data.jobs;
      } else if (response?.jobs) {
        jobsData = response.jobs;
      } else if (Array.isArray(response?.data)) {
        jobsData = response.data;
      } else if (Array.isArray(response)) {
        jobsData = response;
      }
      
      setRecentJobs(jobsData);
    } catch (err) {
      console.error('❌ Error loading jobs:', err);
      setRecentJobs([]);
    }
  };

  const updateLiveCounts = async (jobId) => {
    try {
      const jobData = await uploadAnalysisService.getJobResults(jobId);
      const jobInfo = jobData?.data || jobData;
      
      if (jobInfo?.results) {
        const parsedResults = parseResults(jobInfo.results);
        
        if (parsedResults) {
          const entries = parsedResults.entries || parsedResults.detectionsByDirection?.IN || 0;
          const exits = parsedResults.exits || parsedResults.detectionsByDirection?.OUT || 0;
          
          setLiveCounts({ entries, exits });
        }
      }
    } catch (err) {
      // Silent fail for live counts
    }
  };

  useEffect(() => {
    if (analyzing && currentJob && !isStreaming) {
      pollIntervalRef.current = setInterval(() => {
        checkJobStatus(currentJob.job_id);
      }, 2000);

      countsIntervalRef.current = setInterval(() => {
        updateLiveCounts(currentJob.job_id);
      }, 1000);

      return () => {
        clearInterval(pollIntervalRef.current);
        clearInterval(countsIntervalRef.current);
      };
    }
  }, [analyzing, currentJob, isStreaming]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResults(null);
      setError(null);
      setCurrentJob(null);
      setLiveCounts({ entries: 0, exits: 0 });
      
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          setVideoDuration(video.duration);
          window.URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect({ target: { files: [file] } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const startLiveStream = async () => {
    if (!streamConfig.ip) {
      setError('Please enter camera IP address');
      return;
    }

    try {
      setError(null);
      console.log('🎥 Starting live stream with config:', streamConfig);
      
      const response = await fetch(`${CAMERA_API_URL}/api/camera/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streamConfig)
      });

      const data = await response.json();
      
      if (data.success) {
        setLiveStreamId(data.streamId);
        setLiveStreamActive(true);
        setStreamUrl(`${CAMERA_API_URL}${data.streamUrl}`);
        console.log('✅ Live stream started:', data.streamUrl);
      } else {
        throw new Error(data.message || 'Failed to start stream');
      }
    } catch (err) {
      console.error('❌ Stream start error:', err);
      setError(`Failed to start live stream: ${err.message}`);
    }
  };

  const stopLiveStream = async () => {
    if (!liveStreamId) return;

    try {
      await fetch(`${CAMERA_API_URL}/api/camera/stop/${liveStreamId}`, {
        method: 'POST'
      });
      
      setLiveStreamActive(false);
      setLiveStreamId(null);
      setStreamUrl('');
      console.log('⏹️ Live stream stopped');
    } catch (err) {
      console.error('❌ Error stopping stream:', err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && !streamUrl) {
      setError('Please select a file or configure live stream');
      return;
    }

    if (!cameraId) {
      setError('Please select a camera');
      return;
    }

    try {
      setUploading(false);
      setError(null);
      setUploadProgress(0);
      setLiveCounts({ entries: 0, exits: 0 });

      let response;

      if (streamUrl && liveStreamActive) {
        // Start streaming analysis using the live stream
        response = await uploadAnalysisService.startStreamAnalysis({
          stream_url: streamUrl,
          camera_id: cameraId
        });
        setIsStreaming(true);
      } else {
        // Upload file
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('camera_id', cameraId);

        response = await uploadAnalysisService.uploadFile(formData, (progress) => {
          setUploadProgress(progress);
        });
      }

      setCurrentJob(response.data);
      setUploading(false);
      
      if (!streamUrl) {
        setTimeout(() => handleAnalyze(response.data.job_id), 500);
      } else {
        setAnalyzing(true);
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file');
      setUploading(false);
    }
  };

  const handleAnalyze = async (jobId) => {
    try {
      if (isStreaming) {
        setAnalyzing(true);
        setError(null);
        return;
      }

      setAnalyzing(true);
      setError(null);
      setAnalysisProgress(0);

      await uploadAnalysisService.startAnalysis(jobId);

      if (videoDuration) {
        const progressInterval = setInterval(() => {
          setAnalysisProgress((prev) => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + (100 / (videoDuration * 2));
          });
        }, 500);
      }

    } catch (err) {
      console.error('Analysis error:', err);
      if (!err.message.includes('already processing')) {
        setError(err.message || 'Failed to start analysis');
      }
      setAnalyzing(false);
    }
  };

  const handleStop = async () => {
    if (!currentJob) return;

    try {
      if (isStreaming) {
        await uploadAnalysisService.stopStreamAnalysis(currentJob.job_id);
        setIsStreaming(false);
      }
      
      setAnalyzing(false);
      setIsPaused(false);
      clearAllIntervals();
      
      await checkJobStatus(currentJob.job_id);
      
    } catch (err) {
      console.error('Stop error:', err);
      setError('Failed to stop analysis');
    }
  };

  const checkJobStatus = async (jobId) => {
    try {
      const data = await uploadAnalysisService.getJobResults(jobId);
      const jobData = data?.data || data;

      if (jobData.status === 'completed') {
        const parsedResults = parseResults(jobData.results);
        
        if (parsedResults) {
          parsedResults.processing_time_seconds = jobData.processing_time_seconds;
          
          setResults(parsedResults);
          setAnalyzing(false);
          setIsStreaming(false);
          setAnalysisProgress(100);
          
          const entries = parsedResults.entries || parsedResults.detectionsByDirection?.IN || 0;
          const exits = parsedResults.exits || parsedResults.detectionsByDirection?.OUT || 0;
          
          setLiveCounts({ entries, exits });
        }
        
        loadRecentJobs();
        clearAllIntervals();
      } else if (jobData.status === 'failed') {
        setError(jobData.error_message || 'Analysis failed');
        setAnalyzing(false);
        setIsStreaming(false);
        clearAllIntervals();
      } else {
        if (jobData.results) {
          const parsedResults = parseResults(jobData.results);
          if (parsedResults) {
            const entries = parsedResults.entries || parsedResults.detectionsByDirection?.IN || 0;
            const exits = parsedResults.exits || parsedResults.detectionsByDirection?.OUT || 0;
            setLiveCounts({ entries, exits });
          }
        }
      }
    } catch (err) {
      console.error('❌ Status check error:', err);
    }
  };

  const clearAllIntervals = () => {
    clearInterval(pollIntervalRef.current);
    clearInterval(countsIntervalRef.current);
    pollIntervalRef.current = null;
    countsIntervalRef.current = null;
  };

  const parseResults = (results) => {
    if (!results) return null;
    if (typeof results === 'object' && !Array.isArray(results)) {
      return results;
    }
    if (typeof results === 'string') {
      try {
        return JSON.parse(results);
      } catch (e) {
        console.error('Failed to parse results:', e);
        return null;
      }
    }
    return null;
  };

  const viewJobResults = async (jobId) => {
    try {
      const data = await uploadAnalysisService.getJobResults(jobId);
      const jobData = data?.data || data;

      if (jobData.status === 'completed') {
        const parsedResults = parseResults(jobData.results);
        
        if (!parsedResults) {
          setError('Failed to parse job results');
          return;
        }
        
        const entries = parsedResults.entries || parsedResults.detectionsByDirection?.IN || 0;
        const exits = parsedResults.exits || parsedResults.detectionsByDirection?.OUT || 0;
        
        parsedResults.processing_time_seconds = jobData.processing_time_seconds;
        
        setResults(parsedResults);
        setLiveCounts({ entries, exits });
        setSelectedFile(null);
        setStreamUrl('');
        setCurrentJob({ job_id: jobId });
      }
    } catch (err) {
      console.error('Error loading results:', err);
      setError('Failed to load results');
    }
  };

  const deleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      await uploadAnalysisService.deleteJob(jobId);
      loadRecentJobs();
      
      if (currentJob?.job_id === jobId) {
        setSelectedFile(null);
        setStreamUrl('');
        setResults(null);
        setCurrentJob(null);
        setLiveCounts({ entries: 0, exits: 0 });
      }
    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Failed to delete job');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      if (hours === 0) {
        const mins = Math.floor(diff / (1000 * 60));
        return mins === 0 ? 'Just now' : `${mins} min ago`;
      }
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload & Analyze</h1>
        <p className="text-gray-600">Upload videos/images or stream live from camera for AI-powered people counting</p>
      </div>

      {!backendConnected && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900">Backend Server Not Connected</p>
            <p className="text-sm text-yellow-700 mt-1">
              Please start the backend server: <code className="bg-yellow-100 px-2 py-0.5 rounded">cd backend && npm start</code>
            </p>
            <button 
              onClick={checkBackendConnection}
              className="mt-2 text-sm text-yellow-700 underline hover:text-yellow-900"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {!cameraApiConnected && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 flex items-start gap-3">
          <Video className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Camera API Not Connected</p>
            <p className="text-sm text-blue-700 mt-1">
              To use live streaming, start the camera API: <code className="bg-blue-100 px-2 py-0.5 rounded">python camera_api.py</code>
            </p>
          </div>
        </div>
      )}

      {error && backendConnected && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload File or Live Stream</h3>

            {/* Camera selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Camera *</label>
              <select
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                disabled={!backendConnected || analyzing}
              >
                <option value="">-- Choose a camera --</option>
                {cameras.map((c) => {
                  const id = c.camera_id ?? c.id;
                  const name = c.camera_name ?? c.name ?? `Camera ${id}`;
                  const branchName = c.branch?.branch_name ?? c.branch_name ?? '';
                  return (
                    <option key={id} value={id}>
                      {name}{branchName ? ` • ${branchName}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Live Count Boxes */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-1">Entries (IN)</p>
                    <p className="text-3xl font-bold text-green-900">{liveCounts.entries}</p>
                  </div>
                  <ArrowDownCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700 mb-1">Exits (OUT)</p>
                    <p className="text-3xl font-bold text-red-900">{liveCounts.exits}</p>
                  </div>
                  <ArrowUpCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>
            </div>

            {/* Live Stream Configuration */}
            {cameraApiConnected && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">📹 Live Stream Configuration</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Camera IP (e.g., 192.168.1.64)"
                    value={streamConfig.ip}
                    onChange={(e) => setStreamConfig({ ...streamConfig, ip: e.target.value })}
                    className="col-span-2 border rounded px-3 py-2 text-sm"
                    disabled={liveStreamActive}
                  />
                  <input
                    type="text"
                    placeholder="Port"
                    value={streamConfig.port}
                    onChange={(e) => setStreamConfig({ ...streamConfig, port: e.target.value })}
                    className="border rounded px-3 py-2 text-sm"
                    disabled={liveStreamActive}
                  />
                  <select
                    value={streamConfig.protocol}
                    onChange={(e) => setStreamConfig({ ...streamConfig, protocol: e.target.value })}
                    className="border rounded px-3 py-2 text-sm"
                    disabled={liveStreamActive}
                  >
                    <option value="http">HTTP/MJPEG</option>
                    <option value="rtsp">RTSP</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Username (optional)"
                    value={streamConfig.username}
                    onChange={(e) => setStreamConfig({ ...streamConfig, username: e.target.value })}
                    className="border rounded px-3 py-2 text-sm"
                    disabled={liveStreamActive}
                  />
                  <input
                    type="password"
                    placeholder="Password (optional)"
                    value={streamConfig.password}
                    onChange={(e) => setStreamConfig({ ...streamConfig, password: e.target.value })}
                    className="border rounded px-3 py-2 text-sm"
                    disabled={liveStreamActive}
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  {!liveStreamActive ? (
                    <button
                      onClick={startLiveStream}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Start Live View
                    </button>
                  ) : (
                    <button
                      onClick={stopLiveStream}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                    >
                      Stop Live View
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Live Stream Display */}
            {liveStreamActive && streamUrl && (
              <div className="mb-4 rounded-lg overflow-hidden border-2 border-blue-400">
                <div className="bg-blue-600 text-white px-3 py-2 text-sm font-medium">
                  🔴 LIVE STREAM
                </div>
                <img 
                  ref={videoRef}
                  src={streamUrl} 
                  alt="Live camera stream"
                  className="w-full h-auto bg-black"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* File Upload (only show if no live stream) */}
            {!liveStreamActive && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                  backendConnected && !analyzing
                    ? 'border-gray-300 hover:border-blue-400' 
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                }`}
                onClick={() => backendConnected && !analyzing && document.getElementById('file-input').click()}
              >
                <Upload className={`w-16 h-16 mx-auto mb-4 ${backendConnected ? 'text-gray-400' : 'text-gray-300'}`} />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {backendConnected ? 'Drop your file here or click to browse' : 'Backend server required'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {backendConnected 
                    ? 'Supports MP4, AVI, MOV (max 100MB) or JPG, PNG images'
                    : 'Please start the backend server to upload files'}
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept="video/*,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={!backendConnected || analyzing}
                />
              </div>
            )}

            {/* Selected File Display */}
            {selectedFile && backendConnected && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    {selectedFile.type.startsWith('video') ? (
                      <FileVideo className="w-6 h-6 text-white" />
                    ) : (
                      <Image className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type}
                      {videoDuration && ` • ${Math.round(videoDuration)}s`}
                    </p>
                  </div>
                  {!analyzing && (
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setVideoDuration(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {uploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Uploading...</span>
                      <span className="font-medium text-gray-900">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {analyzing && videoDuration && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Analyzing...</span>
                      <span className="font-medium text-gray-900">{Math.round(analysisProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${analysisProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {!uploading && !analyzing && !results && (selectedFile || liveStreamActive) && (
              <button
                onClick={handleUpload}
                disabled={!cameraId}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                {liveStreamActive ? 'Start Stream Analysis' : 'Upload & Analyze'}
              </button>
            )}

            {/* Control Buttons during Analysis */}
            {analyzing && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleStop}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <StopCircle className="w-4 h-4" />
                  Stop Analysis
                </button>
              </div>
            )}

            {/* Processing Indicator */}
            {analyzing && !isPaused && (
              <div className="mt-4 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                <p className="text-sm text-gray-600">
                  {isStreaming ? 'Analyzing live stream...' : 'Analyzing file with AI...'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isStreaming ? 'Streaming will continue until stopped' : 'Using Python AI for real people counting'}
                </p>
              </div>
            )}

            {/* Results Section */}
            {results && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">Analysis Complete</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Detections</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {results?.totalDetections || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Net Count</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {results?.netCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Confidence</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {results?.avgConfidence ? (results.avgConfidence * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Processing Time</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {results?.processing_time_seconds || 0}s
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setResults(null);
                    setSelectedFile(null);
                    setStreamUrl('');
                    setCurrentJob(null);
                    setLiveCounts({ entries: 0, exits: 0 });
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  New Analysis
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Status</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-700">
                  Backend: {backendConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${cameraApiConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-700">
                  Camera API: {cameraApiConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            {analyzing && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">Analysis Status</p>
                <p className="text-xs text-blue-700">
                  {isStreaming ? '🔴 Live Streaming' : '⚡ Processing with Python AI'}
                </p>
              </div>
            )}

            {liveStreamActive && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-1">Live Stream Active</p>
                <p className="text-xs text-green-700">
                  📹 {streamConfig.ip}:{streamConfig.port}
                </p>
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          {recentJobs.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Jobs</h3>
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div key={job.job_id} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {job.input_type === 'video' ? '🎥' : job.input_type === 'stream' ? '📹' : '📷'} Job
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        job.status === 'completed' ? 'bg-green-100 text-green-700' :
                        job.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(job.created_at)}</p>
                    <div className="flex gap-2 mt-2">
                      {job.status === 'completed' && (
                        <button
                          onClick={() => viewJobResults(job.job_id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Results
                        </button>
                      )}
                      <button
                        onClick={() => deleteJob(job.job_id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadAnalysisPage;