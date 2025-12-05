import axios from 'axios';

// ✅ Updated to work with your existing backend
const CAMERA_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const UPLOAD_ANALYSIS_BASE = `${CAMERA_API_URL.replace(/\/api\/?$/, '')}/api/upload-analysis`;
//const CAMERA_API_ORIGIN = CAMERA_API_URL.replace(/\/api\/?$/, '');
const CAMERA_API_ORIGIN = CAMERA_API_URL;


const cameraApi = axios.create({
  baseURL: CAMERA_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Helper to convert relative URLs to absolute
function toAbsolute(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${CAMERA_API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * List all cameras
 */
export async function listCameras() {
  try {
    const { data } = await cameraApi.get('/cameras');
    return data;
  } catch (error) {
    console.error('❌ Error listing cameras:', error);
    throw error;
  }
}

/**
 * Test camera connection
 */
export async function testCamera(cameraConfig) {
  try {
    const { data } = await cameraApi.post('/camera/test', cameraConfig);
    return data;
  } catch (error) {
    console.error('❌ Error testing camera:', error);
    throw error;
  }
}

/**
 * Start camera stream
 * @param {Object} cameraConfig - Camera configuration
 * @returns {Promise<Object>} Stream info with streamId, streamUrl, and cameraStreamUrl
 */

export const startStream = async (config) => {
  try {
    console.log("inside start stream service-I");
    console.log('🚀 Starting stream with Config:', config);
   
    const { data } = await cameraApi.post('/camera/stream', {
      camera_id: config?.camera_id,
      tenant_id: config?.tenant_id,
      branch_id: config?.branch_id,
      processing_fps: 1,
      resolution: "1280x720"
    });
    
    if (!data?.success) {
      throw new Error(data?.message || 'Failed to start stream');
    }
    
    console.log('✅ Stream started:', data);
    
    // Extract stream information
    const streamId = data.streamId || data.stream_id || null;
    const streamUrl = data.streamUrl || data.stream_url || null;    
    const cameraStreamUrl = data.cameraStreamUrl || null;
    
    // Convert relative URLs to absolute
    const streamUrlAbsolute = toAbsolute(streamUrl);
    
    return { 
      ...data, 
      streamId, 
      streamUrl,
      streamUrlAbsolute,
      cameraStreamUrl // Direct camera URL (best for MJPEG)
    };
  } catch (error) {
    console.error('❌ Error starting stream:', error);
    throw error;
  }
}

/**
 * Stop camera stream
 * @param {string} streamId - Stream identifier
 */
export async function stopStream(streamId) {
  try {
    console.log('⏹️ Stopping stream:', streamId);
    
    const path = streamId 
      ? `/camera/stop/${encodeURIComponent(streamId)}` 
      : '/camera/stop';
    console.log('⏹️ Stop stream path:', path);
    const { data } = await cameraApi.post(path);
    
    console.log('✅ Stream stopped:', data);
    return data;
  } catch (error) {
    console.error('❌ Error stopping stream:', error);
    // Don't throw error - stream might already be stopped
    return { success: false, message: error.message };
  }
}

/**
 * Get snapshot from stream
 * @param {string} streamId - Stream identifier
 */
export async function getSnapshot(streamId) {
  try {
    const url = `/camera/snapshot/${encodeURIComponent(streamId)}`;
    const response = await cameraApi.get(url, { responseType: 'blob' });
    
    return { 
      blob: response.data, 
      urlAbsolute: toAbsolute(url) 
    };
  } catch (error) {
    console.error('❌ Error getting snapshot:', error);
    throw error;
  }
}

/**
 * Process video with gender detection
 * @param {File} videoFile - Video file to process
 * @param {Function} onProgress - Progress callback (percentage)
 * @returns {Promise<Object>} Detection results
 */
export async function processVideo(videoFile, onProgress) {
  return new Promise((resolve, reject) => {
    console.log('🎬 Processing video:', videoFile.name);
    
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('detect_gender', 'true');

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        if (onProgress) onProgress(progress);
      }
    });

    // Handle response
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result.success) {
            console.log('✅ Video processed successfully');
            resolve(result);
          } else {
            reject(new Error(result.message || 'Processing failed'));
          }
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed. Make sure detection service is running.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('POST', `${UPLOAD_ANALYSIS_BASE}/detection/process-video`);
    xhr.send(formData);
  });
}

/**
 * Detect people in a single frame
 * @param {Blob} frameBlob - Image frame blob
 * @param {number} cameraId - Camera ID
 * @returns {Promise<Object>} Detection results
 */
export async function detectFrame(frameBlob, cameraId) {
  try {
    const formData = new FormData();
    formData.append('frame', frameBlob, 'frame.jpg');
    if (cameraId) {
      formData.append('camera_id', cameraId);
    }

    const response = await fetch(`${UPLOAD_ANALYSIS_BASE}/detection/detect-frame`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    // Don't log every timeout - just return empty result
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return { success: false, detections: [], error: 'timeout' };
    }
    
    console.warn('⚠️ Frame detection error:', error.message);
    throw error;
  }
}

/**
 * Check detection service health
 * @returns {Promise<Object>} Health status
 */
export async function checkDetectionHealth() {
  try {
    const response = await fetch(`${UPLOAD_ANALYSIS_BASE}/detection/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    return { 
      success: false, 
      status: 'unavailable',
      message: 'Detection service is not responding' 
    };
  } catch (error) {
    return { 
      success: false, 
      status: 'unavailable',
      message: error.message 
    };
  }
}

/**
 * Get detection service capabilities
 * @returns {Promise<Object>} Service capabilities
 */
export async function getDetectionCapabilities() {
  try {
    const response = await fetch(`${UPLOAD_ANALYSIS_BASE}/detection/capabilities`);
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to get capabilities');
  } catch (error) {
    console.error('❌ Error getting capabilities:', error);
    return { 
      success: false, 
      capabilities: [] 
    };
  }
}

/**
 * Health check for camera service
 */
export async function healthCheck() {
  try {
    const { data } = await cameraApi.get('/health');
    return data;
  } catch (error) {
    console.error('❌ Camera service health check failed:', error);
    return { 
      status: 'error', 
      message: 'Camera service unavailable' 
    };
  }
}

/**
 * Build MJPEG player URL and raw camera URL for Python
 * @param {Object} options
 * @param {string} options.streamType - 'http' | 'rtsp' | etc.
 * @param {string} options.streamId   - Local stream identifier (e.g. "camera_5")
 * @param {Object} options.camera     - Selected camera config
 * @returns {{ mjpegUrl: string, rawCameraUrl: string }}
 */
export function buildStreamUrls({ streamType, streamId, camera }) {
  let mjpegUrl = '';

  // For HTTP / RTSP streams, we expose /camera/video/:streamId
  if (streamType === 'http' || streamType === 'rtsp') {
    mjpegUrl = buildStreamUrl(streamId); // uses toAbsolute + /camera/video/:id
  }
 
  // Raw camera URL for Python
  // Prefer explicit stream_url, then ip/port/path, else fallback to mjpeg
  const rawCameraUrl =
    camera?.stream_url ||
    buildDirectCameraUrl(camera) ||
    mjpegUrl;

  return { mjpegUrl, rawCameraUrl };
}


/**
 * Build stream URL from stream ID
 * @param {string} streamId - Stream identifier
 */
export function buildStreamUrl(streamId) {
  if (!streamId) return null;
  return toAbsolute(`/camera/video/${encodeURIComponent(streamId)}`);
  //return toAbsolute(`api/camera/video/${(streamId)}`);
}

/**
 * Build direct camera URL from config
 * @param {Object} camera - Camera configuration
 */
export function buildDirectCameraUrl(camera) {
  if (camera.stream_url) {
    return camera.stream_url;
  }
  
  if (camera.ip_address) {
    const port = camera.port || '8080';
    const path = camera.stream_path || '/video';
    return `http://${camera.ip_address}:${port}${path}`;
  }
  
  return null;
}

export default {
  listCameras,
  testCamera,
  startStream,
  stopStream,
  getSnapshot,
  processVideo,
  detectFrame,
  checkDetectionHealth,
  getDetectionCapabilities,
  healthCheck,
  buildStreamUrl,
  buildDirectCameraUrl,
  buildStreamUrls,
};