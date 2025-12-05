import React, { useState } from 'react';
import { Camera, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function TestCameraStream() {
  const [cameraId, setCameraId] = useState('4');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [showStream, setShowStream] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const testFFmpeg = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${apiUrl}/test-ffmpeg`);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const startStream = async () => {
    setLoading(true);
    setResult(null);
    setShowStream(false);
    try {
      const response = await fetch(`${apiUrl}/camera/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          camera_id: cameraId
        })
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        const url = `${apiUrl}${data.streamUrl}`;
        setStreamUrl(url);
        console.log('Stream URL:', url);
      }
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const viewStream = () => {
    setShowStream(true);
  };

  const stopStream = async () => {
    setLoading(true);
    try {
      const streamId = `camera_${cameraId}`;
      const response = await fetch(`${apiUrl}/camera/stop/${streamId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      const data = await response.json();
      setResult(data);
      setShowStream(false);
      setStreamUrl('');
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const checkActiveStreams = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${apiUrl}/camera/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Camera className="w-8 h-8 text-blue-600" />
            Camera Stream Testing Tool
          </h1>

          {/* Camera ID Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Camera ID
            </label>
            <input
              type="text"
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter camera ID (e.g., 4)"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={testFFmpeg}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
              Test FFmpeg
            </button>

            <button
              onClick={checkActiveStreams}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
              Check Active Streams
            </button>

            <button
              onClick={startStream}
              disabled={loading || !cameraId}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
              Start Stream
            </button>

            <button
              onClick={stopStream}
              disabled={loading || !cameraId}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
              Stop Stream
            </button>
          </div>

          {/* View Stream Button */}
          {streamUrl && !showStream && (
            <button
              onClick={viewStream}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-6"
            >
              View Stream
            </button>
          )}

          {/* Result Display */}
          {result && (
            <div className={`p-4 rounded-lg mb-6 ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {result.message || (result.success ? 'Success!' : 'Failed!')}
                  </p>
                  
                  {result.version && (
                    <p className="text-sm text-green-700 mt-1">{result.version}</p>
                  )}
                  
                  {result.streamUrl && (
                    <p className="text-sm text-green-700 mt-1">
                      Stream URL: {result.streamUrl}
                    </p>
                  )}
                  
                  {result.cameraStreamUrl && (
                    <p className="text-sm text-blue-700 mt-1">
                      Camera URL: {result.cameraStreamUrl}
                    </p>
                  )}
                  
                  {result.streamType && (
                    <p className="text-sm text-purple-700 mt-1">
                      Stream Type: {result.streamType}
                    </p>
                  )}
                  
                  {result.streams && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">
                        Active Streams: {result.count}
                      </p>
                      {result.streams.map((stream, idx) => (
                        <p key={idx} className="text-xs text-gray-600 mt-1">
                          {stream.streamId} {stream.camera ? `- ${stream.camera.camera_name}` : ''}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Show full response in debug mode */}
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer">
                      Show full response
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* Stream Display */}
          {showStream && streamUrl && (
            <div className="bg-black rounded-lg overflow-hidden mb-6">
              <div className="aspect-video relative bg-black">
                <img
                  key={streamUrl}
                  src={streamUrl}
                  alt="Camera Live Stream"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Stream load error:', e);
                    setResult({
                      success: false,
                      message: `Failed to load stream from: ${streamUrl}. Make sure the stream is started.`
                    });
                  }}
                  onLoad={() => {
                    console.log('Stream connected successfully');
                  }}
                />
                <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 pointer-events-none z-10">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  LIVE
                </div>
              </div>
              <div className="p-3 bg-gray-900 text-white text-sm">
                <p className="font-mono text-xs break-all">{streamUrl}</p>
                <p className="text-xs text-gray-400 mt-1">Stream is active and receiving frames</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Testing Steps:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>First, click "Test FFmpeg" to verify FFmpeg is installed</li>
              <li>Enter your Camera ID (from database)</li>
              <li>Click "Start Stream" to initialize the camera stream</li>
              <li>Click "View Stream" to display the video feed</li>
              <li>Click "Stop Stream" when done</li>
              <li>Use "Check Active Streams" to see all running streams</li>
            </ol>
          </div>

          {/* API Info */}
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <p className="font-medium text-gray-700 mb-1">API Configuration:</p>
            <p className="text-gray-600">Base URL: {apiUrl}</p>
            <p className="text-gray-600">Stream Endpoint: {apiUrl}/camera/stream</p>
            <p className="text-gray-600">Video Endpoint: {apiUrl}/camera/video/camera_X</p>
          </div>
        </div>
      </div>
    </div>
  );
}