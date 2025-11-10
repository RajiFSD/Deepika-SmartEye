import { useState, useEffect, useRef } from 'react';
import { Upload, FileVideo, Image, Play, BarChart3, CheckCircle, XCircle, RefreshCw, Clock, AlertCircle, StopCircle, Pause, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import uploadAnalysisService from '../services/uploadAnalysisService';
import cameraService from '../services/cameraService';

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
  
  // New states for streaming and counts
  const [streamUrl, setStreamUrl] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveCounts, setLiveCounts] = useState({ entries: 0, exits: 0 });
  const [videoDuration, setVideoDuration] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  const pollIntervalRef = useRef(null);
  const countsIntervalRef = useRef(null);

  useEffect(() => {
    checkBackendConnection();    
    loadRecentJobs();
    loadCameras();
    
    return () => {
      clearInterval(pollIntervalRef.current);
      clearInterval(countsIntervalRef.current);
    };
  }, []);

  const checkBackendConnection = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      // Try /api/health first, then /health
      let response = await fetch(`${API_BASE_URL}/health`).catch(() => null);
      
      if (!response?.ok) {
        response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`).catch(() => null);
      }
      
      setBackendConnected(response?.ok || false);
      
      if (!response?.ok) {
        setError('⚠️ Backend server is not running. Please start the backend server on port 3000.');
      } else {
        setError(null); // Clear error if connection successful
      }
    } catch (err) {
      setBackendConnected(false);
      setError('⚠️ Cannot connect to backend server. Please ensure the backend is running.');
    }
  };

  const loadCameras = async () => {
    try {
      console.log('🔍 Loading cameras...');
      const response = await cameraService.getCameras();
           
      // Backend returns: { success: true, data: { cameras: [...], pagination: {...} } }
      let camerasData = [];
      
      if (response?.data?.data?.cameras) {
        // Axios response with nested data
        camerasData = response.data.data.cameras;
      } else if (response?.data?.cameras) {
        // Direct data.cameras
        camerasData = response.data.cameras;
      } else if (response?.cameras) {
        // Direct cameras
        camerasData = response.cameras;
      } else if (Array.isArray(response?.data)) {
        // Direct array in data
        camerasData = response.data;
      } else if (Array.isArray(response)) {
        // Direct array
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
      
      // Backend returns: { success: true, data: { jobs: [...], pagination: {...} } }
      let jobsData = [];
      
      if (response?.data?.data?.jobs) {
        // Axios response with nested data
        jobsData = response.data.data.jobs;
      } else if (response?.data?.jobs) {
        // Direct data.jobs
        jobsData = response.data.jobs;
      } else if (response?.jobs) {
        // Direct jobs
        jobsData = response.jobs;
      } else if (Array.isArray(response?.data)) {
        // Direct array in data
        jobsData = response.data;
      } else if (Array.isArray(response)) {
        // Direct array
        jobsData = response;
      }
      
      
           if (jobsData.length > 0 && jobsData[0].result_json) {
        try {
          const parsedResult = JSON.parse(jobsData[0].result_json);
          console.log("First job - Entries:", parsedResult.entries);
          console.log("First job - Exits:", parsedResult.exits);
          console.log("First job - Net Count:", parsedResult.netCount);
        } catch (e) {
          console.log("Could not parse result_json for first job");
        }
      }
      
      
      setRecentJobs(jobsData);
    } catch (err) {
      console.error('❌ Error loading jobs:', err);
      setRecentJobs([]);
    }
  };

  // Poll for job status and live counts
useEffect(() => {
  if (analyzing && currentJob && !isStreaming) {
    // For file uploads, set up auto-completion based on video duration
    let autoCompletionTimer = null;
    
    if (videoDuration) {
      // Set timeout to check completion when video should be done + buffer
      const expectedTime = (videoDuration + 30) * 1000;
      autoCompletionTimer = setTimeout(() => {
        console.log('⏰ Expected completion time reached, checking status...');
        checkJobStatus(currentJob.job_id);
      }, expectedTime);
    }

    // Regular polling
    pollIntervalRef.current = setInterval(() => {
      checkJobStatus(currentJob.job_id);
    }, 2000);

    // Live counts polling
    countsIntervalRef.current = setInterval(() => {
      updateLiveCounts(currentJob.job_id);
    }, 1000);

    return () => {
      clearInterval(pollIntervalRef.current);
      clearInterval(countsIntervalRef.current);
      if (autoCompletionTimer) clearTimeout(autoCompletionTimer);
    };
  }
}, [analyzing, currentJob, isStreaming, videoDuration]);

  // const updateLiveCounts = async (jobId) => {
  //   try {
  //     const data = await uploadAnalysisService.getLiveCounts(jobId);
  //     console.log('📊 Live counts update:', data);
      
  //     if (data?.success || data?.data) {
  //       const countsData = data?.data || data;
  //       setLiveCounts({
  //         entries: countsData?.entries || countsData?.IN || 0,
  //         exits: countsData?.exits || countsData?.OUT || 0
  //       });
  //     }
  //   } catch (err) {
  //     // Silently fail for live count updates - don't spam console
  //     console.debug('⚠️ Live count update skipped:', err.message);
  //   }
  // };

  const updateLiveCounts = async (jobId) => {
  try {
    // First try the dedicated live counts endpoint (for streaming)
    try {
      const data = await uploadAnalysisService.getLiveCounts(jobId);
      
      if (data?.success || data?.data) {
        const countsData = data?.data || data;
        const entries = countsData?.entries || countsData?.IN || 0;
        const exits = countsData?.exits || countsData?.OUT || 0;
        
        setLiveCounts({ entries, exits });
        return;
      }
    } catch (streamError) {
      if (streamError.response?.status !== 404) {
        console.debug('⚠️ Stream counts endpoint error:', streamError.message);
      }
    }

    // Fallback: Get counts from job results
    const jobData = await uploadAnalysisService.getJobResults(jobId);
    const jobInfo = jobData?.data || jobData;
    
    if (jobInfo?.results) {
      // 🔥 PARSE the results string
      const parsedResults = parseResults(jobInfo.results);
      
      if (parsedResults) {
        const entries = parsedResults.entries 
          || parsedResults.detectionsByDirection?.IN 
          || 0;
        
        const exits = parsedResults.exits 
          || parsedResults.detectionsByDirection?.OUT 
          || 0;
        
        setLiveCounts({ entries, exits });
      }
    }
  } catch (err) {
    if (!updateLiveCounts.lastErrorLog || Date.now() - updateLiveCounts.lastErrorLog > 60000) {
      console.debug('⚠️ Live count updates not available yet');
      updateLiveCounts.lastErrorLog = Date.now();
    }
  }
};


  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResults(null);
      setError(null);
      setCurrentJob(null);
      setLiveCounts({ entries: 0, exits: 0 });
      
      // Get video duration if it's a video file
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

  const handleUpload = async () => {
    if (!selectedFile && !streamUrl) {
      setError('Please select a file or enter a stream URL');
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

      if (streamUrl) {
        // Start streaming analysis
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
     //console.log('🚀 Job started:', response.data);    

      setUploading(false);
      
      // Start analysis
      if (!streamUrl) {
  setTimeout(() => handleAnalyze(response.data.job_id), 500);
} else {
  // For streams, set analyzing state immediately
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
    // For stream jobs, we don't need to call startAnalysis - they start automatically
    if (isStreaming) {
      console.log('📹 Stream analysis started automatically');
      setAnalyzing(true);
      setError(null);
      return;
    }

    // For file uploads, call startAnalysis
    setAnalyzing(true);
    setError(null);
    setAnalysisProgress(0);

    await uploadAnalysisService.startAnalysis(jobId);

    // Set up progress tracking based on video duration
    if (videoDuration) {
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          // More accurate progress based on expected completion time
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
    
    // Fetch final results
    await checkJobStatus(currentJob.job_id);
    
  } catch (err) {
    console.error('Stop error:', err);
    setError('Failed to stop analysis');
  }
};

const handlePause = () => {
  // Note: This only pauses UI updates, not backend processing
  // Backend continues processing, we just stop polling
  
  if (!isPaused) {
    // Pausing - stop polling
    console.log('⏸️ Pausing UI updates (backend still processing)');
    clearInterval(countsIntervalRef.current);
    setIsPaused(true);
  } else {
    // Resuming - restart polling
    console.log('▶️ Resuming UI updates');
    if (currentJob && analyzing) {
      countsIntervalRef.current = setInterval(() => {
        updateLiveCounts(currentJob.job_id);
      }, 1000);
    }
    setIsPaused(false);
  }
};

const checkJobStatus = async (jobId) => {
  try {
    console.log('🔍 Checking job status:', jobId);
    const data = await uploadAnalysisService.getJobResults(jobId);
    
    const jobData = data?.data || data;

    if (jobData.status === 'completed') {
      console.log('✅ Job completed!', jobData);
      
      // Parse the results string
      const parsedResults = parseResults(jobData.results);
      
      if (parsedResults) {
        // Add processing_time to results
        parsedResults.processing_time_seconds = jobData.processing_time_seconds;
        
        setResults(parsedResults);
        setAnalyzing(false);
        setIsStreaming(false);
        setAnalysisProgress(100);
        
        // Update final counts
        const entries = parsedResults.entries 
          || parsedResults.detectionsByDirection?.IN 
          || 0;
        
        const exits = parsedResults.exits 
          || parsedResults.detectionsByDirection?.OUT 
          || 0;
        
        console.log('✅ Final counts - Entries:', entries, 'Exits:', exits);
        setLiveCounts({ entries, exits });
      }
      
      loadRecentJobs();
      clearAllIntervals();
    } else if (jobData.status === 'failed') {
      console.error('❌ Job failed:', jobData.error_message);
      setError(jobData.error_message || 'Analysis failed');
      setAnalyzing(false);
      setIsStreaming(false);
      clearAllIntervals();
    } else {
      console.log('⏳ Job still processing:', jobData.status);
      
      // Update live counts during processing
      if (jobData.results) {
        const parsedResults = parseResults(jobData.results);
        if (parsedResults) {
          const entries = parsedResults.entries 
            || parsedResults.detectionsByDirection?.IN 
            || 0;
          
          const exits = parsedResults.exits 
            || parsedResults.detectionsByDirection?.OUT 
            || 0;
          
          setLiveCounts({ entries, exits });
        }
      }
    }
  } catch (err) {
    console.error('❌ Status check error:', err);
  }
};

// Add helper function to clear all intervals
const clearAllIntervals = () => {
  clearInterval(pollIntervalRef.current);
  clearInterval(countsIntervalRef.current);
  pollIntervalRef.current = null;
  countsIntervalRef.current = null;
};

  const viewJobResults = async (jobId) => {
  try {
    const data = await uploadAnalysisService.getJobResults(jobId);
    console.log('📊 View results response:', data);
    
    // Handle nested response structure
    const jobData = data?.data || data;
    console.log('📊 Job data:', jobData);

    if (jobData.status === 'completed') {
      // 🔥 PARSE the results string
      const parsedResults = parseResults(jobData.results);
      console.log('📊 Parsed results:', parsedResults);
      
      if (!parsedResults) {
        setError('Failed to parse job results');
        return;
      }
      
      // Extract counts
      const entries = parsedResults.entries 
        || parsedResults.detectionsByDirection?.IN 
        || 0;
      
      const exits = parsedResults.exits 
        || parsedResults.detectionsByDirection?.OUT 
        || 0;
      
      console.log('✅ Extracted counts - Entries:', entries, 'Exits:', exits);
      
      // Add processing_time to results
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

  const parseResults = (results) => {
  if (!results) return null;
  
  // If it's already an object, return it
  if (typeof results === 'object' && !Array.isArray(results)) {
    return results;
  }
  
  // If it's a string, parse it
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload & Analyze</h1>
        <p className="text-gray-600">Upload videos/images or stream from URL for AI-powered people counting</p>
      </div>

      {/* Backend Connection Warning */}
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

      {/* Error Alert */}
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
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload File or Stream</h3>

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

            {/* Stream URL Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Stream URL (Optional)</label>
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="rtsp://camera-ip:port/stream or http://example.com/video.mp4"
                className="w-full border rounded-lg px-3 py-2"
                disabled={!backendConnected || analyzing || !!selectedFile}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a streaming URL to analyze live video or leave empty to upload a file
              </p>
            </div>

            {/* Drop Zone - Only show if no stream URL */}
            {!streamUrl && (
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
            {!uploading && !analyzing && !results && (selectedFile || streamUrl) && (
              <button
                onClick={handleUpload}
                disabled={!cameraId}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                {streamUrl ? 'Start Stream Analysis' : 'Upload & Analyze'}
              </button>
            )}

            {/* Control Buttons during Analysis */}
            {analyzing && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handlePause}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleStop}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <StopCircle className="w-4 h-4" />
                  Stop
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
                  {isStreaming ? 'Streaming will continue until stopped' : 'Video will auto-stop when complete'}
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
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-700">
                Backend: {backendConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {analyzing && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">Analysis Status</p>
                <p className="text-xs text-blue-700">
                  {isStreaming ? '🔴 Live Streaming' : '⚡ Processing'}
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
                        {job.input_type === 'video' ? '🎥' : '📷'} Job
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