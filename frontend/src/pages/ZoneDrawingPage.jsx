import { useState, useRef, useEffect } from 'react';
import { Camera, Save, RotateCcw, Upload, Check, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import cameraService from '../services/cameraService';
import authService from '../services/authService';
import zoneService from '../services/zoneService';

function ZoneDrawingPage() {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [directionPoints, setDirectionPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingDirection, setIsDrawingDirection] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [savedZones, setSavedZones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [entryDirection, setEntryDirection] = useState('UP');
  const [drawingMode, setDrawingMode] = useState('zone'); // 'zone' or 'direction'
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');

  const user = authService.getCurrentUser();

  // Load cameras on component mount
  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      setLoading(true);
      setError('');
      const user_id = userId;
      const response = await cameraService.getCamerasByuserId(user_id, {
        page: 1,
        limit: 100,
        is_active: true,       
      });
      
      console.log('📊 Camera response:', response);
      
      let camerasData = [];
      
      if (response.data) {
        if (response.data.cameras) {
          camerasData = response.data.cameras;
        } else if (response.data.rows) {
          camerasData = response.data.rows;
        } else if (Array.isArray(response.data)) {
          camerasData = response.data;
        }
      } else if (Array.isArray(response)) {
        camerasData = response;
      }
      
      if (!Array.isArray(camerasData)) {
        camerasData = [];
      }
      
    
      setCameras(camerasData);
      
      if (camerasData.length > 0) {
        setSelectedCamera(camerasData[0].camera_id.toString());
      }
    } catch (err) {
      console.error('❌ Error loading cameras:', err);
      setError('Failed to load cameras');
      setCameras([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [selectedCamera, backgroundImage, points, directionPoints]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background image if exists
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
      // Draw grid only if no background image
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Add text instructions
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('Click to draw entry/exit zone', canvas.width / 2, canvas.height / 2);
      ctx.fillText('(Click points to create polygon)', canvas.width / 2, canvas.height / 2 + 25);
    }

    // Draw zone polygon
    if (points.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      if (points.length > 2) {
        ctx.closePath();
        ctx.fill();
      }
      ctx.stroke();

      // Draw zone points
      points.forEach((point, index) => {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index + 1, point.x, point.y);
      });
    }

    // Draw direction line
    if (directionPoints.length > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Draw direction line
      if (directionPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(directionPoints[0].x, directionPoints[0].y);
        for (let i = 1; i < directionPoints.length; i++) {
          ctx.lineTo(directionPoints[i].x, directionPoints[i].y);
        }
        ctx.stroke();
      }

      // Draw direction points
      directionPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw direction arrow on last point
        if (index === directionPoints.length - 1 && directionPoints.length > 1) {
          drawArrow(ctx, directionPoints[directionPoints.length - 2], point);
        }
      });
    }

    setImageLoaded(true);
  };

  const drawArrow = (ctx, from, to) => {
    const headLength = 15;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const handleCanvasClick = (e) => {
    if (!imageLoaded || !selectedCamera) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawingMode === 'zone') {
      const newPoints = [...points, { x, y }];
      setPoints(newPoints);
    } else if (drawingMode === 'direction') {
      const newDirectionPoints = [...directionPoints, { x, y }];
      setDirectionPoints(newDirectionPoints);
    }
  };

  const handleReset = () => {
    setPoints([]);
    setDirectionPoints([]);
    setDrawingMode('zone');
  };

  const handleResetDirection = () => {
    setDirectionPoints([]);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
       
          // You can implement image saving to your backend here
          // saveImageToBackend(file);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const saveImageToBackend = async (file) => {
    // Implement this function to save the image to your backend
    // Example:
    /*
    const formData = new FormData();
    formData.append('image', file);
    formData.append('camera_id', selectedCamera);
    
    try {
      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error saving image:', error);
      throw error;
    }
    */
  };

  const handleSave = async () => {
    if (points.length < 3) {
      alert('Please draw at least 3 points to create a zone');
      return;
    }

    if (!selectedCamera) {
      alert('Please select a camera');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const selectedCameraData = cameras.find(c => c.camera_id.toString() === selectedCamera);
      
      if (!selectedCameraData) {
        throw new Error('Selected camera not found');
      }

      // Normalize coordinates to 0-1 range for backend
      const normalizedPoints = points.map(point => ({
        x: point.x / canvasRef.current.width,
        y: point.y / canvasRef.current.height
      }));

      const normalizedDirectionPoints = directionPoints.map(point => ({
        x: point.x / canvasRef.current.width,
        y: point.y / canvasRef.current.height
      }));

      // Validate polygon before sending to backend
      await zoneService.validateZonePolygon(normalizedPoints);

      // Prepare zone data for backend
      const zoneData = {
        camera_id: parseInt(selectedCamera),
        tenant_id: selectedCameraData.tenant_id || user?.tenant_id,
        zone_name: `${selectedCameraData.camera_name} - Zone ${savedZones.length + 1}`,
        polygon_json: normalizedPoints,
        direction_line_json: normalizedDirectionPoints.length >= 2 ? normalizedDirectionPoints : null,
        entry_direction: entryDirection,
        is_active: true,
        created_by: user?.user_id
      };
  

      // Call zone service to create zone in backend
      const createdZone = await zoneService.createZone(zoneData);

    
      // Create local zone object for UI
      const newZone = {
        id: createdZone.zone_id || Date.now(),
        camera_id: selectedCamera,
        camera: selectedCameraData,
        cameraName: selectedCameraData.camera_name,
        points: points,
        directionPoints: directionPoints,
        normalizedPoints: normalizedPoints,
        normalizedDirectionPoints: normalizedDirectionPoints,
        entryDirection: entryDirection,
        timestamp: new Date().toLocaleString(),
        backendId: createdZone.zone_id,
        zoneName: zoneData.zone_name
      };

      setSavedZones([...savedZones, newZone]);
      alert(`Zone "${zoneData.zone_name}" saved successfully!`);
      handleReset();
      
    } catch (err) {
      console.error('❌ Error saving zone:', err);
      setError(err.message || 'Failed to save zone');
      alert(`Error saving zone: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Load saved zones from backend
  useEffect(() => {
   // In ZoneDrawingPage.jsx, update the loadSavedZones function:

const loadSavedZones = async () => {
  if (cameras.length > 0) {
    try {
      setLoading(true);
      const response = await zoneService.getZones({ 
        limit: 100, 
        isActive: true 
      });
      
      console.log('✅ Loaded zones from backend:', response);
      
      if (response.data && Array.isArray(response.data.rows)) {
        const backendZones = response.data.rows.map(zone => {
          const camera = cameras.find(c => c.camera_id === zone.camera_id);
          
          // FIX: Handle polygon_json properly - it might be a string or array
          let polygonPoints = [];
          if (zone.polygon_json) {
            if (Array.isArray(zone.polygon_json)) {
              polygonPoints = zone.polygon_json;
            } else if (typeof zone.polygon_json === 'string') {
              // Parse if it's a JSON string
              try {
                polygonPoints = JSON.parse(zone.polygon_json);
              } catch (parseError) {
                console.error('Error parsing polygon_json:', parseError);
                polygonPoints = [];
              }
            }
          }

          // FIX: Handle direction_line_json properly
          let directionPoints = [];
          if (zone.direction_line_json) {
            if (Array.isArray(zone.direction_line_json)) {
              directionPoints = zone.direction_line_json;
            } else if (typeof zone.direction_line_json === 'string') {
              try {
                directionPoints = JSON.parse(zone.direction_line_json);
              } catch (parseError) {
                console.error('Error parsing direction_line_json:', parseError);
                directionPoints = [];
              }
            }
          }

          // Convert normalized coordinates back to canvas coordinates
          const canvasPoints = polygonPoints.map(p => ({
            x: p.x * 800,
            y: p.y * 450
          }));

          const canvasDirectionPoints = directionPoints.map(p => ({
            x: p.x * 800,
            y: p.y * 450
          }));

          return {
            id: zone.zone_id,
            camera_id: zone.camera_id.toString(),
            camera: camera,
            cameraName: camera?.camera_name || 'Unknown Camera',
            points: canvasPoints,
            directionPoints: canvasDirectionPoints,
            normalizedPoints: polygonPoints,
            normalizedDirectionPoints: directionPoints,
            entryDirection: zone.entry_direction || 'UP',
            timestamp: new Date(zone.created_at || zone.updated_at || Date.now()).toLocaleString(),
            backendId: zone.zone_id,
            zoneName: zone.zone_name || 'Unnamed Zone'
          };
        });
        
        setSavedZones(backendZones);
      }
    } catch (err) {
      console.error('❌ Error loading saved zones:', err);
      if (err.response?.status === 403) {
        // Token expired, redirect to login
        authService.logout();
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  }
};

    loadSavedZones();
  }, [cameras]);

  if (loading && cameras.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Zone Configuration</h1>
        <p className="text-gray-600">Draw entry/exit zones and direction lines for people counting</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* No Cameras Warning */}
      {cameras.length === 0 && !loading && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          No active cameras found. Please add and activate cameras first.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drawing Canvas */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Draw Zone & Direction</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  disabled={!selectedCamera || saveLoading}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset All
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={points.length < 3 || !selectedCamera || saveLoading}
                >
                  {saveLoading ? (
                    <>
                      <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Zone
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Camera Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Camera *
              </label>
              <select
                value={selectedCamera}
                onChange={(e) => {
                  setSelectedCamera(e.target.value);
                  handleReset();
                }}
                disabled={cameras.length === 0 || saveLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a camera</option>
                {cameras.map(camera => (
                  <option key={camera.camera_id} value={camera.camera_id}>
                    {camera.camera_name} ({camera.camera_code}) - {camera.branch?.branch_name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            {/* Drawing Mode Selection */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drawing Mode
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDrawingMode('zone')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      drawingMode === 'zone' 
                        ? 'bg-blue-100 border-blue-500 text-blue-700' 
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Zone Polygon
                  </button>
                  <button
                    onClick={() => setDrawingMode('direction')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      drawingMode === 'direction' 
                        ? 'bg-red-100 border-red-500 text-red-700' 
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Direction Line
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Direction
                </label>
                <select
                  value={entryDirection}
                  onChange={(e) => setEntryDirection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                   <option value="UP">↑ Up</option>
  <option value="DOWN">↓ Down</option>
  <option value="LEFT">← Left</option>
  <option value="RIGHT">→ Right</option>
                </select>
              </div>
            </div>

            {/* Direction Line Controls */}
            {drawingMode === 'direction' && directionPoints.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-800">
                    Drawing direction line ({directionPoints.length} points)
                  </span>
                  <button
                    onClick={handleResetDirection}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Clear Direction
                  </button>
                </div>
              </div>
            )}

            {/* Canvas */}
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={800}
                height={450}
                onClick={handleCanvasClick}
                className={`w-full ${
                  selectedCamera && !saveLoading 
                    ? drawingMode === 'zone' 
                      ? 'cursor-crosshair' 
                      : 'cursor-cell'
                    : 'cursor-not-allowed opacity-50'
                }`}
                disabled={saveLoading}
              />
            </div>

            {/* Instructions */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Select a camera and drawing mode</li>
                <li>• <strong>Zone Polygon Mode (Blue):</strong> Click to add zone boundary points (min 3 points)</li>
                <li>• <strong>Direction Line Mode (Red):</strong> Click to draw entry/exit direction line (2+ points)</li>
                <li>• Select entry direction from dropdown</li>
                <li>• Upload background image for reference</li>
                <li>• Click "Save Zone" to save configuration to database</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Saved Zones List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Saved Zones</h3>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {savedZones.length}
              </span>
            </div>
            
            {savedZones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No zones configured yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {savedZones.map((zone) => (
                  <div key={zone.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{zone.zoneName || zone.cameraName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Camera: {zone.camera_id} • Direction: {zone.entryDirection}
                          {zone.backendId && ` • Zone ID: ${zone.backendId}`}
                        </p>
                        <p className="text-xs text-gray-500">{zone.timestamp}</p>
                      </div>
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {zone.points.length} zone points
                      </span>
                      {zone.directionPoints && zone.directionPoints.length > 0 && (
                        <span className="text-xs text-red-600">
                          {zone.directionPoints.length} direction points
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Image Option */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Background Image</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a camera snapshot to use as background for drawing
            </p>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={!selectedCamera || saveLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {backgroundImage && (
                <button
                  onClick={() => setBackgroundImage(null)}
                  className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Remove Background
                </button>
              )}
            </div>
          </div>

          {/* Camera Info Card */}
          {selectedCamera && cameras.find(c => c.camera_id.toString() === selectedCamera) && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Camera Details</h3>
              {(() => {
                const camera = cameras.find(c => c.camera_id.toString() === selectedCamera);
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{camera.camera_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Code:</span>
                      <span className="font-mono text-xs">{camera.camera_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{camera.camera_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resolution:</span>
                      <span className="font-medium">{camera.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">FPS:</span>
                      <span className="font-medium">{camera.fps}</span>
                    </div>
                    {camera.branch && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Branch:</span>
                        <span className="font-medium">{camera.branch.branch_name}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ZoneDrawingPage;