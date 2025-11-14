import React, { useState, useEffect, useRef } from 'react';
import { Flame, AlertTriangle, Camera, Activity, Bell, Settings, TrendingUp, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import fireDetectionService from '../services/fireDetectionService';

export default function FireDetectionPage() {
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
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // Load cameras on mount
  useEffect(() => {
    loadCameras();
    loadAlerts();
    generateMockChartData();
    
    // Auto-refresh every 5 seconds when detecting
    const interval = setInterval(() => {
      if (isDetecting) {
        loadAlerts();
        updateStats();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isDetecting]);

  const loadCameras = async () => {
    try {
      // Replace with your actual API call
      // const response = await fetch('/api/cameras');
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockCameras = [
        { id: 1, name: 'Main Entrance', ip: '192.168.31.89', port: '8080', status: 'active' },
        { id: 2, name: 'Warehouse', ip: '192.168.31.90', port: '8080', status: 'active' },
        { id: 3, name: 'Parking Area', ip: '192.168.31.91', port: '8080', status: 'inactive' }
      ];
      
      setCameras(mockCameras);
      if (mockCameras.length > 0) {
        setSelectedCamera(mockCameras[0]);
        setStreamUrl(`http://${mockCameras[0].ip}:${mockCameras[0].port}/video`);
      }
    } catch (error) {
      console.error('Failed to load cameras:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      // Replace with your actual API call
      // const response = await fetch('/api/fire-alerts');
      // const data = await response.json();
      
      // Mock recent alerts
      const mockAlerts = [
        {
          id: 1,
          camera: 'Main Entrance',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          confidence: 0.92,
          status: 'confirmed',
          resolved: true
        },
        {
          id: 2,
          camera: 'Warehouse',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          confidence: 0.85,
          status: 'active',
          resolved: false
        }
      ];
      
      setRecentAlerts(mockAlerts);
      
      // Update current alert if there's an active one
      const activeAlert = mockAlerts.find(a => !a.resolved);
      if (activeAlert && isDetecting) {
        setCurrentAlert(activeAlert);
        if (settings.alertSound) {
          playAlertSound();
        }
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const updateStats = () => {
    // Mock stats update - replace with actual API call
    setDetectionStats(prev => ({
      totalAlerts: prev.totalAlerts + Math.floor(Math.random() * 2),
      activeAlerts: Math.floor(Math.random() * 3),
      falsePositives: prev.falsePositives + Math.floor(Math.random() * 1),
      avgConfidence: 85 + Math.random() * 10
    }));
  };

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

  const startDetection = async () => {
    if (!selectedCamera) {
      alert('Please select a camera first');
      return;
    }

    setLoading(true);
    try {
      // Replace with your actual API call to start fire detection
      // const response = await fetch('/api/fire-detection/start', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     camera_id: selectedCamera.id,
      //     sensitivity: settings.sensitivity,
      //     min_confidence: settings.minConfidence
      //   })
      // });
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsDetecting(true);
      console.log('Fire detection started for camera:', selectedCamera.name);
    } catch (error) {
      console.error('Failed to start detection:', error);
      alert('Failed to start fire detection');
    } finally {
      setLoading(false);
    }
  };

  const stopDetection = async () => {
    setLoading(true);
    try {
      // Replace with your actual API call
      // await fetch(`/api/fire-detection/stop/${selectedCamera.id}`, { method: 'POST' });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsDetecting(false);
      setCurrentAlert(null);
      console.log('Fire detection stopped');
    } catch (error) {
      console.error('Failed to stop detection:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      // Replace with your actual API call
      // await fetch(`/api/fire-alerts/${alertId}/resolve`, { method: 'POST' });
      
      setRecentAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true, status: 'resolved' } : alert
        )
      );
      
      if (currentAlert?.id === alertId) {
        setCurrentAlert(null);
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const markFalsePositive = async (alertId) => {
    try {
      // Replace with your actual API call
      // await fetch(`/api/fire-alerts/${alertId}/false-positive`, { method: 'POST' });
      
      setRecentAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, status: 'false_positive', resolved: true } : alert
        )
      );
      
      setDetectionStats(prev => ({
        ...prev,
        falsePositives: prev.falsePositives + 1
      }));
      
      if (currentAlert?.id === alertId) {
        setCurrentAlert(null);
      }
    } catch (error) {
      console.error('Failed to mark as false positive:', error);
    }
  };

  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error('Audio play failed:', e));
    }
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
          )}
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
            <p className="text-sm text-gray-600">Real-time fire detection and monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 text-sm ${isDetecting ? 'text-green-600' : 'text-gray-600'}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              {isDetecting ? 'Detecting' : 'Idle'}
            </span>
            <button 
              onClick={loadAlerts}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Active Alert Banner */}
      {currentAlert && !currentAlert.resolved && (
        <div className="bg-red-600 text-white">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <div>
                  <p className="font-semibold">FIRE DETECTED!</p>
                  <p className="text-sm opacity-90">
                    {currentAlert.camera} • Confidence: {(currentAlert.confidence * 100).toFixed(0)}% • {new Date(currentAlert.timestamp).toLocaleTimeString()}
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={AlertTriangle}
            title="Total Alerts"
            value={detectionStats.totalAlerts}
            color="bg-red-600"
            subtitle="All time"
          />
          <StatCard
            icon={Flame}
            title="Active Alerts"
            value={detectionStats.activeAlerts}
            color="bg-orange-600"
            subtitle="Requires attention"
          />
          <StatCard
            icon={Activity}
            title="Avg Confidence"
            value={`${detectionStats.avgConfidence.toFixed(0)}%`}
            color="bg-blue-600"
            subtitle="Detection accuracy"
          />
          <StatCard
            icon={Camera}
            title="Active Cameras"
            value={cameras.filter(c => c.status === 'active').length}
            color="bg-green-600"
            subtitle={`${cameras.length} total`}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Camera Selection & Controls */}
          <section className="lg:col-span-1 space-y-6">
            {/* Camera Selection */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">
                Select Camera
              </h2>
              <div className="space-y-2">
                {cameras.map((camera) => (
                  <button
                    key={camera.id}
                    onClick={() => {
                      setSelectedCamera(camera);
                      setStreamUrl(`http://${camera.ip}:${camera.port}/video`);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedCamera?.id === camera.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{camera.name}</div>
                        <div className="text-xs text-gray-500">
                          {camera.ip}:{camera.port}
                        </div>
                      </div>
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        camera.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detection Controls */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">
                Detection Controls
              </h2>
              
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
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 flex items-center justify-between mb-2">
                    <span>Min Confidence</span>
                    <span className="font-medium">{settings.minConfidence}%</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={settings.minConfidence}
                    onChange={(e) => setSettings({ ...settings, minConfidence: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t">
                  <span className="text-sm text-gray-600">Alert Sound</span>
                  <button
                    onClick={() => setSettings({ ...settings, alertSound: !settings.alertSound })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      settings.alertSound ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.alertSound ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Email Alerts</span>
                  <button
                    onClick={() => setSettings({ ...settings, emailAlert: !settings.emailAlert })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      settings.emailAlert ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.emailAlert ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {!isDetecting ? (
                  <button
                    onClick={startDetection}
                    disabled={loading || !selectedCamera}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-60"
                  >
                    {loading ? 'Starting...' : 'Start Detection'}
                  </button>
                ) : (
                  <button
                    onClick={stopDetection}
                    disabled={loading}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    {loading ? 'Stopping...' : 'Stop Detection'}
                  </button>
                )}
              </div>
            </div>

            {/* Recent Alerts List */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">
                Recent Alerts
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentAlerts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No alerts yet</p>
                ) : (
                  recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${
                        alert.resolved ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.camera}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          alert.status === 'confirmed' ? 'bg-red-100 text-red-700' :
                          alert.status === 'false_positive' ? 'bg-gray-100 text-gray-700' :
                          alert.status === 'resolved' ? 'bg-green-100 text-green-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          Confidence: {(alert.confidence * 100).toFixed(0)}%
                        </span>
                        {!alert.resolved && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => markFalsePositive(alert.id)}
                              className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                              False
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Right Column - Live View & Analytics */}
          <section className="lg:col-span-2 space-y-6">
            {/* Live Camera Feed */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2 bg-gray-50">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                    Live Camera Feed
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedCamera ? selectedCamera.name : 'No camera selected'}
                  </p>
                </div>
                {isDetecting && (
                  <span className="flex items-center gap-2 text-xs text-green-600">
                    <Activity className="w-4 h-4 animate-pulse" />
                    Detecting
                  </span>
                )}
              </div>

              <div className="relative aspect-video w-full bg-black">
                {streamUrl && selectedCamera ? (
                  <img
                    ref={videoRef}
                    src={streamUrl}
                    alt="Live camera stream"
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Camera className="w-12 h-12 mx-auto mb-3" />
                      <p className="text-sm">Select a camera to start</p>
                    </div>
                  </div>
                )}

                {/* Detection Overlay */}
                {isDetecting && currentAlert && (
                  <div className="absolute top-4 left-4 right-4">
                    <div className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                      <Flame className="w-5 h-5" />
                      <span className="font-semibold">FIRE DETECTED - {(currentAlert.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Analytics Charts */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 gap-6">
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-4">
                    24-Hour Alert History
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={2} name="Fire Alerts" />
                      <Line type="monotone" dataKey="falseAlerts" stroke="#f59e0b" strokeWidth={2} name="False Positives" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Hidden audio element for alert sound */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGWi77OeFTQ" preload="auto" />
    </div>
  );
}