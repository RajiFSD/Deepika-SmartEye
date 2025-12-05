import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, AlertTriangle, Camera, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import fireDetectionService from '../services/fireDetectionService';
import LiveFireDetectionOverlay from '../components/LiveFireDetectionOverlay';


export default function FireDetectionPage() {
  // State
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    totalAlerts: 0,
    activeAlerts: 0,
    falsePositives: 0,
    avgConfidence: 0
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [streamUrl, setStreamUrl] = useState('');
  const [settings, setSettings] = useState({
    sensitivity: 60,
    minConfidence: 70,
    alertSound: true,
    emailAlert: false
  });
  const [loading, setLoading] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [error, setError] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const streamCheckInterval = useRef(null);
  const lastAlertIdRef = useRef(null);

  // User data
  const userId = localStorage.getItem('userId') || '1';
  const tenantId = localStorage.getItem('tenantId') || '1';
  const branchId = localStorage.getItem('branchId') || '1';

  // Build stream URL
  const buildStreamUrl = useCallback((camera) => {
    if (!camera) return '';
    const camId = camera.camera_id || camera.id;
    const apiUrl = 'http://localhost:3000/api';

    if (camera.stream_url?.startsWith('rtsp://')) {
      return `${apiUrl}/cameras/${camId}/stream/mjpeg`;
    }
    if (camera.stream_url?.startsWith('http')) {
      return camera.stream_url;
    }
    if (camera.ip_address) {
      const port = camera.port || '8080';
      return `http://${camera.ip_address}:${port}/video`;
    }
    return `${apiUrl}/cameras/${camId}/stream/mjpeg`;
  }, []);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    if (!settings.alertSound) return;
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {
        console.error('Audio play failed:', e);
        // Fallback to Web Audio API
        try {
          const context = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, context.currentTime);
          
          oscillator.start(context.currentTime);
          oscillator.stop(context.currentTime + 1);
        } catch (err) {
          console.error('Fallback audio failed:', err);
        }
      });
    }
  }, [settings.alertSound]);

  // Stop alert sound
  const stopAlertSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Load cameras
  const loadCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      const response = await fireDetectionService.getCameras_smoke({
        user_id: userId,
        is_active: true
      });

      let camerasData = [];
      if (response?.success && response?.data) {
        camerasData = Array.isArray(response.data.cameras) ? response.data.cameras : 
                      Array.isArray(response.data) ? response.data : [];
      }

      if (!camerasData.length) {
        setError('No cameras assigned to your account.');
        setCameras([]);
        return;
      }

      setCameras(camerasData);

      if (camerasData.length > 0 && !selectedCamera) {
        const firstCamera = camerasData[0];
        setSelectedCamera(firstCamera);
        setStreamUrl(buildStreamUrl(firstCamera));
        checkDetectionStatus(firstCamera.camera_id || firstCamera.id);
      }
    } catch (error) {
      console.error('Failed to load cameras:', error);
      setError(error.message || 'Failed to load cameras.');
      setCameras([]);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedCamera, buildStreamUrl]);

  // Load alerts
  const loadAlerts = useCallback(async () => {
    if (!selectedCamera) return;

    try {
      const cameraId = selectedCamera.camera_id || selectedCamera.id;
      
      const response = await fireDetectionService.getAlerts({
        limit: 10,
        camera_id: cameraId,
        user_id: userId,
        tenant_id: tenantId,
        branch_id: branchId,
        status: 'active'
      });

      if (response.success && Array.isArray(response.data)) {
        const alerts = response.data.map(alert => ({
          id: alert.firealert_id || alert.id,
          camera_id: alert.camera_id,
          camera_name: alert.camera?.camera_name || selectedCamera.camera_name || 'Unknown',
          timestamp: alert.alert_timestamp || alert.timestamp,
          confidence: parseFloat(alert.confidence) || 0,
          status: alert.status || 'active',
          resolved: alert.status === 'resolved' || alert.status === 'false_positive',
          bounding_boxes: alert.bounding_boxes || [],
          snapshot_path: alert.snapshot_path
        }));

        setRecentAlerts(alerts);

        // Handle active alert
        const activeAlert = alerts.find(a => a.status === 'active');
        
        if (activeAlert && isDetecting) {
          const isNewAlert = lastAlertIdRef.current !== activeAlert.id;
          
          if (isNewAlert) {
            console.log('🔊 New fire alert detected! Playing alarm...');
            setCurrentAlert(activeAlert);
            lastAlertIdRef.current = activeAlert.id;
            playAlertSound();
          }
        } else if (!activeAlert) {
          if (currentAlert) {
            stopAlertSound();
          }
          setCurrentAlert(null);
          lastAlertIdRef.current = null;
        }
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }, [selectedCamera, userId, tenantId, branchId, isDetecting, currentAlert, playAlertSound, stopAlertSound]);

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const response = await fireDetectionService.getStats();
      if (response.success && response.data) {
        setDetectionStats({
          totalAlerts: response.data.total_alerts || 0,
          activeAlerts: response.data.active_alerts || 0,
          falsePositives: response.data.false_positives || 0,
          avgConfidence: response.data.avg_confidence || 0
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // Load chart data
  const loadChartData = useCallback(async () => {
    try {
      const response = await fireDetectionService.getHourlyAnalytics();
      
      if (response.success && Array.isArray(response.data)) {
        const formattedData = response.data.map(item => ({
          time: item.hour || item.time,
          alerts: item.alerts || 0,
          falseAlerts: item.false_alerts || 0
        }));
        setChartData(formattedData);
      } else {
        generateMockChartData();
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
      generateMockChartData();
    }
  }, []);

  // Generate mock chart data
  const generateMockChartData = () => {
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(Date.now() - i * 3600000).getHours();
      data.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        alerts: Math.floor(Math.random() * 5),
        falseAlerts: Math.floor(Math.random() * 2)
      });
    }
    setChartData(data);
  };

  // Check detection status
  const checkDetectionStatus = useCallback(async (cameraId) => {
    if (!cameraId) return;
    try {
      const response = await fireDetectionService.getDetectionStatus(cameraId);
      if (response.success) {
        setIsDetecting(response.is_active || false);
      }
    } catch (error) {
      console.error('Failed to check detection status:', error);
    }
  }, []);

  // Start detection
  const startDetection = async () => {
    if (!selectedCamera) {
      alert('Please select a camera first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cameraId = selectedCamera.camera_id || selectedCamera.id;
      const response = await fireDetectionService.startDetection(
        cameraId,
        userId,
        tenantId,
        branchId,
        settings
      );
      
      if (response.success) {
        setIsDetecting(true);
        console.log('Fire detection started');
      } else {
        throw new Error(response.message || 'Failed to start detection');
      }
    } catch (error) {
      console.error('Failed to start detection:', error);
      setError('Failed to start fire detection: ' + error.message);
      alert('Failed to start fire detection: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Stop detection
  const stopDetection = async () => {
    if (!selectedCamera) return;

    setLoading(true);
    setError(null);

    try {
      const cameraId = selectedCamera.camera_id || selectedCamera.id;
      const response = await fireDetectionService.stopDetection(cameraId);
      
      if (response.success) {
        setIsDetecting(false);
        setCurrentAlert(null);
        lastAlertIdRef.current = null;
        stopAlertSound();
        console.log('Fire detection stopped');
      }
    } catch (error) {
      console.error('Failed to stop detection:', error);
      
      if (error.message.includes('No active detection')) {
        setIsDetecting(false);
        setCurrentAlert(null);
        lastAlertIdRef.current = null;
        stopAlertSound();
      } else {
        setError('Failed to stop detection: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId) => {
    try {
      const response = await fireDetectionService.resolveAlert(alertId);

      if (response.success) {
        setRecentAlerts(prev =>
          prev.map(alert =>
            alert.id === alertId ? { ...alert, resolved: true, status: 'resolved' } : alert
          )
        );

        if (currentAlert?.id === alertId) {
          setCurrentAlert(null);
          lastAlertIdRef.current = null;
          stopAlertSound();
        }

        loadStats();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      alert('Failed to resolve alert: ' + error.message);
    }
  };

  // Mark false positive
  const markFalsePositive = async (alertId) => {
    try {
      const response = await fireDetectionService.markFalsePositive(alertId);

      if (response.success) {
        setRecentAlerts(prev =>
          prev.map(alert =>
            alert.id === alertId ? { ...alert, status: 'false_positive', resolved: true } : alert
          )
        );

        if (currentAlert?.id === alertId) {
          setCurrentAlert(null);
          lastAlertIdRef.current = null;
          stopAlertSound();
        }

        loadStats();
      }
    } catch (error) {
      console.error('Failed to mark as false positive:', error);
      alert('Failed to mark as false positive: ' + error.message);
    }
  };

  // Handle camera selection
  const handleCameraSelect = (camera) => {
    setSelectedCamera(camera);
    setStreamUrl(buildStreamUrl(camera));
    
    const cameraId = camera.camera_id || camera.id;
    checkDetectionStatus(cameraId);
    
    if (isDetecting) {
      stopDetection();
    }
  };

  // Initial load
  useEffect(() => {
    loadCameras();
    loadStats();
    loadChartData();

    return () => {
      if (streamCheckInterval.current) {
        clearInterval(streamCheckInterval.current);
      }
      stopAlertSound();
    };
  }, []);

  // Polling when detecting
  useEffect(() => {
    if (isDetecting) {
      loadAlerts();
      
      streamCheckInterval.current = setInterval(() => {
        loadAlerts();
        loadStats();
      }, 5000);
    } else {
      if (streamCheckInterval.current) {
        clearInterval(streamCheckInterval.current);
        streamCheckInterval.current = null;
      }
    }

    return () => {
      if (streamCheckInterval.current) {
        clearInterval(streamCheckInterval.current);
      }
    };
  }, [isDetecting, loadAlerts, loadStats]);

  // Stat Card Component
  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <Flame className="w-6 h-6 text-red-600" />
              Fire Detection System
            </h1>
            <p className="text-sm text-gray-600">Real-time monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 text-sm ${isDetecting ? 'text-green-600' : 'text-gray-600'}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              {isDetecting ? 'Detecting' : 'Idle'}
            </span>
            <button
              onClick={() => {
                loadCameras();
                loadAlerts();
                loadStats();
                loadChartData();
              }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="mx-auto max-w-7xl px-4 py-2">
            <p className="text-sm text-yellow-800">{error}</p>
          </div>
        </div>
      )}

      {/* Active Alert Banner */}
      {currentAlert && !currentAlert.resolved && (
        <div className="bg-red-600 text-white animate-pulse">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
                <div>
                  <p className="font-semibold">🔥 FIRE DETECTED!</p>
                  <p className="text-sm opacity-90">
                    {currentAlert.camera_name} • {(currentAlert.confidence * 100).toFixed(0)}% • {new Date(currentAlert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => resolveAlert(currentAlert.id)}
                  className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 font-medium"
                >
                  Resolve
                </button>
                <button
                  onClick={() => markFalsePositive(currentAlert.id)}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
                >
                  False Alarm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">
        {loading && cameras.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Activity className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Loading cameras...</p>
            </div>
          </div>
        )}

        {!loading && cameras.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Cameras Available</h2>
            <p className="text-gray-600">{error || 'No cameras assigned to your account.'}</p>
          </div>
        )}

        {cameras.length > 0 && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard icon={AlertTriangle} title="Total Alerts" value={detectionStats.totalAlerts} color="bg-red-600" subtitle="All time" />
              <StatCard icon={Flame} title="Active Alerts" value={detectionStats.activeAlerts} color="bg-orange-600" subtitle="Requires attention" />
              <StatCard icon={Activity} title="Avg Confidence" value={`${detectionStats.avgConfidence.toFixed(0)}%`} color="bg-blue-600" subtitle="Detection accuracy" />
              <StatCard icon={Camera} title="Your Cameras" value={cameras.length} color="bg-green-600" subtitle={`${cameras.filter(c => c.is_active).length} active`} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Column */}
              <section className="lg:col-span-1 space-y-6">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">Select Camera</h2>
                  <div className="space-y-2">
                    {cameras.map((camera) => {
                      const cameraId = camera.camera_id || camera.id;
                      const isSelected = (selectedCamera?.camera_id || selectedCamera?.id) === cameraId;
                      
                      return (
                        <button
                          key={cameraId}
                          onClick={() => handleCameraSelect(camera)}
                          className={`w-full text-left p-3 rounded-lg border transition ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{camera.camera_name || camera.name}</div>
                              <div className="text-xs text-gray-500">{camera.ip_address || 'No IP'}:{camera.port || '8080'}</div>
                            </div>
                            <span className={`inline-block h-2 w-2 rounded-full ${camera.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">Controls</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600 flex items-center justify-between mb-2">
                        <span>Sensitivity</span>
                        <span className="font-medium">{settings.sensitivity}%</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.sensitivity}
                        onChange={(e) => setSettings({ ...settings, sensitivity: parseInt(e.target.value) })}
                        className="w-full"
                        disabled={isDetecting}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-t">
                      <span className="text-sm text-gray-600">🔊 Alert Sound</span>
                      <button
                        onClick={() => setSettings({ ...settings, alertSound: !settings.alertSound })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings.alertSound ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.alertSound ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    {!isDetecting ? (
                      <button
                        onClick={startDetection}
                        disabled={loading || !selectedCamera}
                        className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-60"
                      >
                        {loading ? 'Starting...' : 'Start Detection'}
                      </button>
                    ) : (
                      <button
                        onClick={stopDetection}
                        disabled={loading}
                        className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-500"
                      >
                        {loading ? 'Stopping...' : 'Stop Detection'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">Recent Alerts</h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentAlerts.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No alerts yet</p>
                    ) : (
                      recentAlerts.map((alert) => (
                        <div key={alert.id} className={`p-3 rounded-lg border ${alert.resolved ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{alert.camera_name}</p>
                              <p className="text-xs text-gray-600">{new Date(alert.timestamp).toLocaleString()}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${alert.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                              {alert.status}
                            </span>
                          </div>
                             <div className="relative aspect-video w-full bg-black">
                  <LiveFireDetectionOverlay
                    streamUrl={streamUrl}
                    cameraId={selectedCamera?.camera_id || selectedCamera?.id}
                    isDetecting={isDetecting}
                  />
                </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* Right Column */}
              <section className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b px-4 py-2 bg-gray-50">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Live Feed</h2>
                    {isDetecting && (
                      <span className="flex items-center gap-2 text-xs text-green-600">
                        <Activity className="w-4 h-4 animate-pulse" />
                        Detecting
                      </span>
                    )}
                  </div>
                  <div className="relative aspect-video w-full bg-black">
                    {streamUrl && selectedCamera ? (
                      <img ref={videoRef} src={streamUrl} alt="Live stream" className="h-full w-full object-contain" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <Camera className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                </div>

                {chartData.length > 0 && (
                  <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-4">24-Hour History</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={2} name="Alerts" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      {/* Audio Element */}
      <audio 
        ref={audioRef}
        loop
        preload="auto"
      >
        <source src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=" type="audio/wav" />
      </audio>
    </div>
  );
}