import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:5000/api';

export default function ObjectCounterPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'stream'
  
  // Upload form
  const [videoFile, setVideoFile] = useState(null);
  const fileInputRef = useRef(null);
  
  // Stream form
  const [streamForm, setStreamForm] = useState({
    ip: '192.168.43.100',
    port: '554',
    username: 'vtvtraders2024@gmail.com',
    password: 'admin234',
    channel: '1',
    duration: 60
  });

  // Fetch all jobs
  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_BASE}/object-counting/jobs`);
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  // Fetch single job
  const fetchJob = async (jobId) => {
    try {
      const response = await fetch(`${API_BASE}/object-counting/job/${jobId}`);
      const data = await response.json();
      if (data.success) {
        return data.job;
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
    }
    return null;
  };

  // Upload video
  const handleUpload = async () => {
    if (!videoFile) {
      alert('Please select a video file');
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);

    setLoading(true);
    setUploadProgress(0);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            alert('Video uploaded successfully! Processing started.');
            setVideoFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchJobs();
          }
        }
      });

      xhr.open('POST', `${API_BASE}/object-counting/upload`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Start stream processing
  const handleStreamStart = async () => {
    if (!streamForm.ip) {
      alert('IP address is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/object-counting/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(streamForm)
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Stream processing started!');
        fetchJobs();
      } else {
        alert('Failed to start stream: ' + data.message);
      }
    } catch (error) {
      console.error('Stream start failed:', error);
      alert('Failed to start stream: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel job
  const handleCancel = async (jobId) => {
    try {
      const response = await fetch(`${API_BASE}/object-counting/job/${jobId}/cancel`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        fetchJobs();
      }
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  };

  // Delete job
  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`${API_BASE}/object-counting/job/${jobId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
        }
        fetchJobs();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Download results
  const handleDownload = (jobId, format = 'json') => {
    const url = `${API_BASE}/object-counting/job/${jobId}/download?format=${format}`;
    window.open(url, '_blank');
  };

  // View job details
  const viewJob = async (job) => {
    const updatedJob = await fetchJob(job.id);
    setSelectedJob(updatedJob || job);
  };

  // Poll active jobs
  useEffect(() => {
    fetchJobs();
    
    const interval = setInterval(() => {
      fetchJobs();
      
      // Update selected job if it's active
      if (selectedJob && (selectedJob.status === 'processing' || selectedJob.status === 'queued')) {
        fetchJob(selectedJob.id).then(job => {
          if (job) setSelectedJob(job);
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedJob]);

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
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-2xl font-bold tracking-tight">Object Counting System</h1>
          <p className="text-sm text-gray-600">Track and count moving objects in videos and camera streams</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Input Section */}
        <section className="lg:col-span-1 space-y-6">
          {/* Tab Selector */}
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
                onClick={() => setActiveTab('stream')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'stream'
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Camera Stream
              </button>
            </div>

            {/* Upload Tab */}
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
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Uploading...' : 'Upload & Process'}
                </button>
              </div>
            )}

            {/* Stream Tab */}
            {activeTab === 'stream' && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="col-span-2 text-sm">
                    <span className="block text-gray-700 mb-1">IP Address</span>
                    <input
                      value={streamForm.ip}
                      onChange={(e) => setStreamForm({ ...streamForm, ip: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      placeholder="192.168.1.64"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-gray-700 mb-1">Port</span>
                    <input
                      value={streamForm.port}
                      onChange={(e) => setStreamForm({ ...streamForm, port: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-gray-700 mb-1">Channel</span>
                    <input
                      value={streamForm.channel}
                      onChange={(e) => setStreamForm({ ...streamForm, channel: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-gray-700 mb-1">Username</span>
                    <input
                      value={streamForm.username}
                      onChange={(e) => setStreamForm({ ...streamForm, username: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-gray-700 mb-1">Password</span>
                    <input
                      type="password"
                      value={streamForm.password}
                      onChange={(e) => setStreamForm({ ...streamForm, password: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="col-span-2 text-sm">
                    <span className="block text-gray-700 mb-1">Duration (seconds)</span>
                    <input
                      type="number"
                      value={streamForm.duration}
                      onChange={(e) => setStreamForm({ ...streamForm, duration: parseInt(e.target.value) })}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <button
                  onClick={handleStreamStart}
                  disabled={loading}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {loading ? 'Starting...' : 'Start Stream Processing'}
                </button>
              </div>
            )}
          </div>

          {/* Jobs List */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                Processing Jobs
              </h2>
              <button
                onClick={fetchJobs}
                className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
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
                    onClick={() => viewJob(job)}
                  >
                    <div className="flex items-start justify-between">
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
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${job.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right: Results Section */}
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
                        className="text-xs rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                    {selectedJob.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleDownload(selectedJob.id, 'json')}
                          className="text-xs rounded-lg bg-blue-600 text-white px-3 py-1.5 hover:bg-blue-500"
                        >
                          Download JSON
                        </button>
                        <button
                          onClick={() => handleDownload(selectedJob.id, 'video')}
                          className="text-xs rounded-lg bg-green-600 text-white px-3 py-1.5 hover:bg-green-500"
                        >
                          Download Video
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(selectedJob.id)}
                      className="text-xs rounded-lg border border-red-300 text-red-600 px-3 py-1.5 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Status */}
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
                  {selectedJob.results?.total_counted !== undefined && (
                    <>
                      <div>
                        <div className="text-xs text-gray-500">Total Count</div>
                        <div className="text-2xl font-bold text-blue-600">{selectedJob.results.total_counted}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Frames Processed</div>
                        <div className="text-sm font-medium">{selectedJob.results.frames_processed}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Progress */}
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

                {/* Results */}
                {selectedJob.status === 'completed' && selectedJob.results && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Video Information</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Resolution: {selectedJob.results.video_info?.width} x {selectedJob.results.video_info?.height}</div>
                        <div>FPS: {selectedJob.results.video_info?.fps}</div>
                        <div>Total Frames: {selectedJob.results.video_info?.total_frames}</div>
                        <div>Processing Time: {selectedJob.results.processing_time?.toFixed(2)}s</div>
                      </div>
                    </div>

                    {selectedJob.results.detections?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Detection Events ({selectedJob.results.detections.length})</h3>
                        <div className="max-h-64 overflow-y-auto border rounded-lg">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-2 py-1 text-left">ID</th>
                                <th className="px-2 py-1 text-left">Class</th>
                                <th className="px-2 py-1 text-left">Direction</th>
                                <th className="px-2 py-1 text-left">Time</th>
                                <th className="px-2 py-1 text-left">Confidence</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedJob.results.detections.map((det, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-2 py-1">{det.object_id}</td>
                                  <td className="px-2 py-1">{det.class}</td>
                                  <td className="px-2 py-1">
                                    <span className={`inline-block px-1.5 py-0.5 rounded ${
                                      det.direction === 'DOWN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {det.direction}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1">{det.timestamp}</td>
                                  <td className="px-2 py-1">{(det.confidence * 100).toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {selectedJob.status === 'failed' && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="text-sm font-medium text-red-800">Processing Failed</div>
                    <div className="text-xs text-red-600 mt-1">{selectedJob.error}</div>
                  </div>
                )}

                {/* Logs */}
                {selectedJob.logs && selectedJob.logs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Processing Logs</h3>
                    <div className="max-h-40 overflow-y-auto bg-gray-900 text-gray-100 p-3 rounded-lg text-xs font-mono">
                      {selectedJob.logs.map((log, idx) => (
                        <div key={idx}>{log}</div>
                      ))}
                    </div>
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