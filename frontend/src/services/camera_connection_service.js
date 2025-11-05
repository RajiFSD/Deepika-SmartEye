// const ffmpeg = require('fluent-ffmpeg');
// const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
// const cv = require('opencv4nodejs');
// const fs = require('fs');
// const path = require('path');

// ffmpeg.setFfmpegPath(ffmpegPath);

// class CameraConnectionService {
//   constructor() {
//     this.activeStreams = new Map();
//     this.reconnectAttempts = new Map();
//     this.maxReconnectAttempts = 5;
//   }

//   /**
//    * Test CCTV camera connection
//    * Supports: RTSP, HTTP, RTMP, File URLs
//    */
//   async testConnection(streamUrl, timeout = 10000) {
//     try {
//       console.log('🔍 Testing camera connection:', streamUrl);

//       return new Promise((resolve, reject) => {
//         const timeoutId = setTimeout(() => {
//           reject(new Error('Connection timeout'));
//         }, timeout);

//         ffmpeg(streamUrl)
//           .outputOptions(['-frames:v 1', '-f image2pipe'])
//           .on('error', (err) => {
//             clearTimeout(timeoutId);
//             console.error('❌ Connection test failed:', err.message);
//             reject(new Error(`Connection failed: ${err.message}`));
//           })
//           .on('end', () => {
//             clearTimeout(timeoutId);
//             console.log('✅ Camera connection successful');
//             resolve({ success: true, message: 'Camera connected successfully' });
//           })
//           .pipe();
//       });
//     } catch (error) {
//       console.error('Error testing connection:', error);
//       throw error;
//     }
//   }

//   /**
//    * Start streaming from camera
//    * Captures frames at specified FPS for AI processing
//    */
//   async startStream(cameraId, streamUrl, options = {}) {
//     try {
//       const {
//         fps = 1, // Frame per second for AI processing
//         resolution = '640x480',
//         onFrame = null,
//         onError = null
//       } = options;

//       if (this.activeStreams.has(cameraId)) {
//         console.log('⚠️  Camera already streaming:', cameraId);
//         return { success: false, message: 'Camera already active' };
//       }

//       console.log('📹 Starting stream for camera:', cameraId);

//       const streamProcess = ffmpeg(streamUrl)
//         .inputOptions([
//           '-rtsp_transport tcp', // Use TCP for RTSP (more reliable)
//           '-stimeout 5000000' // 5 second timeout
//         ])
//         .outputOptions([
//           `-vf fps=${fps},scale=${resolution}`, // Frame rate and resolution
//           '-f image2pipe',
//           '-vcodec mjpeg'
//         ])
//         .on('start', (commandLine) => {
//           console.log('🎬 FFmpeg started:', commandLine);
//         })
//         .on('error', (err) => {
//           console.error('❌ Stream error:', err.message);
//           this.handleStreamError(cameraId, streamUrl, err, options);
//           if (onError) onError(err);
//         })
//         .on('end', () => {
//           console.log('🛑 Stream ended for camera:', cameraId);
//           this.activeStreams.delete(cameraId);
//         });

//       // Capture frames
//       const frameBuffer = [];
//       streamProcess.pipe()
//         .on('data', (chunk) => {
//           frameBuffer.push(chunk);

//           // Check if we have a complete JPEG frame (starts with FFD8, ends with FFD9)
//           if (chunk.includes(Buffer.from([0xFF, 0xD9]))) {
//             const frameData = Buffer.concat(frameBuffer);
//             frameBuffer.length = 0;

//             if (onFrame) {
//               onFrame(frameData, cameraId);
//             }
//           }
//         });

//       this.activeStreams.set(cameraId, streamProcess);
//       this.reconnectAttempts.set(cameraId, 0);

//       return { success: true, message: 'Stream started successfully' };
//     } catch (error) {
//       console.error('Error starting stream:', error);
//       throw error;
//     }
//   }

//   /**
//    * Handle stream errors and reconnection
//    */
//   async handleStreamError(cameraId, streamUrl, error, options) {
//     const attempts = this.reconnectAttempts.get(cameraId) || 0;

//     if (attempts < this.maxReconnectAttempts) {
//       console.log(`🔄 Reconnecting camera ${cameraId} (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
      
//       this.reconnectAttempts.set(cameraId, attempts + 1);
      
//       // Wait before reconnecting (exponential backoff)
//       const delay = Math.min(1000 * Math.pow(2, attempts), 50000);
      
//       setTimeout(() => {
//         this.startStream(cameraId, streamUrl, options);
//       }, delay);
//     } else {
//       console.error(`❌ Max reconnection attempts reached for camera ${cameraId}`);
//       this.activeStreams.delete(cameraId);
//       this.reconnectAttempts.delete(cameraId);
//     }
//   }

//   /**
//    * Stop streaming from camera
//    */
//   stopStream(cameraId) {
//     try {
//       const streamProcess = this.activeStreams.get(cameraId);
      
//       if (streamProcess) {
//         streamProcess.kill('SIGKILL');
//         this.activeStreams.delete(cameraId);
//         this.reconnectAttempts.delete(cameraId);
//         console.log('🛑 Stream stopped for camera:', cameraId);
//         return { success: true, message: 'Stream stopped successfully' };
//       }

//       return { success: false, message: 'Camera stream not found' };
//     } catch (error) {
//       console.error('Error stopping stream:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get camera snapshot
//    */
//   async getCameraSnapshot(streamUrl, outputPath = null) {
//     try {
//       const snapshotPath = outputPath || path.join(__dirname, '../../uploads/snapshots', `snapshot_${Date.now()}.jpg`);
      
//       // Ensure directory exists
//       const dir = path.dirname(snapshotPath);
//       if (!fs.existsSync(dir)) {
//         fs.mkdirSync(dir, { recursive: true });
//       }

//       return new Promise((resolve, reject) => {
//         ffmpeg(streamUrl)
//           .inputOptions(['-rtsp_transport tcp'])
//           .outputOptions(['-frames:v 1'])
//           .output(snapshotPath)
//           .on('end', () => {
//             console.log('✅ Snapshot saved:', snapshotPath);
//             resolve({ success: true, path: snapshotPath });
//           })
//           .on('error', (err) => {
//             console.error('❌ Snapshot error:', err);
//             reject(err);
//           })
//           .run();
//       });
//     } catch (error) {
//       console.error('Error capturing snapshot:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get stream information
//    */
//   async getStreamInfo(streamUrl) {
//     try {
//       return new Promise((resolve, reject) => {
//         ffmpeg.ffprobe(streamUrl, (err, metadata) => {
//           if (err) {
//             reject(err);
//             return;
//           }

//           const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          
//           resolve({
//             duration: metadata.format.duration,
//             bitRate: metadata.format.bit_rate,
//             format: metadata.format.format_name,
//             video: videoStream ? {
//               codec: videoStream.codec_name,
//               width: videoStream.width,
//               height: videoStream.height,
//               fps: eval(videoStream.r_frame_rate)
//             } : null
//           });
//         });
//       });
//     } catch (error) {
//       console.error('Error getting stream info:', error);
//       throw error;
//     }
//   }

//   /**
//    * Check if camera is currently streaming
//    */
//   isStreaming(cameraId) {
//     return this.activeStreams.has(cameraId);
//   }

//   /**
//    * Get all active streams
//    */
//   getActiveStreams() {
//     return Array.from(this.activeStreams.keys());
//   }

//   /**
//    * Stop all streams
//    */
//   stopAllStreams() {
//     console.log('🛑 Stopping all camera streams...');
    
//     for (const cameraId of this.activeStreams.keys()) {
//       this.stopStream(cameraId);
//     }

//     console.log('✅ All streams stopped');
//   }

//   /**
//    * Get supported camera URL formats
//    */
//   getSupportedFormats() {
//     return {
//       rtsp: {
//         description: 'Real-Time Streaming Protocol',
//         examples: [
//           'rtsp://username:password@192.168.1.100:554/stream',
//           'rtsp://admin:admin123@camera-ip/Streaming/Channels/101',
//         ]
//       },
//       http: {
//         description: 'HTTP/MJPEG Stream',
//         examples: [
//           'http://192.168.1.100:8080/video',
//           'http://username:password@camera-ip/mjpeg'
//         ]
//       },
//       rtmp: {
//         description: 'Real-Time Messaging Protocol',
//         examples: [
//           'rtmp://192.168.1.100:1935/live/stream'
//         ]
//       },
//       file: {
//         description: 'Video File (for testing)',
//         examples: [
//           '/path/to/video.mp4',
//           'file:///C:/videos/sample.mp4'
//         ]
//       }
//     };
//   }
// }

// module.exports = new CameraConnectionService();

// cameraService.js — Flask camera API client (port 5000)
// import axios from 'axios';

// // Point straight to Flask (defaults to http://localhost:5000/api)
// // Add VITE_CAMERA_API_URL in your .env if you deploy behind a proxy.
// const CAMERA_API_URL =
//   import.meta.env.VITE_CAMERA_API_URL || 'http://localhost:5000/api';

// // Helpful: base origin without trailing /api, used to make absolute URLs
// const CAMERA_API_ORIGIN = CAMERA_API_URL.replace(/\/api\/?$/, '');

// // Separate axios instance so we don't inherit Node API interceptors
// const cameraApi = axios.create({
//   baseURL: CAMERA_API_URL,
//   headers: { 'Content-Type': 'application/json' },
//   timeout: 60000,
// });

// // If you later add auth on Flask, you can attach a token here:
// // cameraApi.interceptors.request.use((config) => {
// //   const token = localStorage.getItem('authToken');
// //   if (token) config.headers.Authorization = `Bearer ${token}`;
// //   return config;
// // });

// /** Ensure URLs work as <img src>, returning absolute URLs */
// function toAbsolute(url) {
//   if (!url) return url;
//   if (/^https?:\/\//i.test(url)) return url;               // already absolute
//   return `${CAMERA_API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
// }

// /** List cameras (placeholder data from Flask demo) */
// export async function listCameras() {
//   console.log('🔵 II____Fetching camera list from Flask API...');
//   console.log('API URL:', CAMERA_API_URL);
//   const { data } = await cameraApi.get('/cameras/list');   // GET /api/cameras/list
//   console.log('Cameras from Flask API:', data);
//   return data;
// }

// /** Test a camera connection before starting a stream */
// export async function testCamera(cameraConfig) {
//   const { data } = await cameraApi.post('/camera/test', cameraConfig); // POST /api/camera/test
//   return data;
// }

/**
 * Start a stream and get { streamId, streamUrlAbsolute }
 * streamUrlAbsolute is ready for <img src="...">
 */
// export async function startStream(cameraConfig) {
//   const { data } = await cameraApi.post('/camera/stream', cameraConfig); // POST /api/camera/stream
//   if (!data?.success) throw new Error(data?.message || 'Failed to start stream');

//   const streamId = data.streamId || null;
//   const streamUrl = data.streamUrl || null;                // e.g. /api/camera/video/<id>
//   const streamUrlAbsolute = toAbsolute(streamUrl);
//   return { ...data, streamId, streamUrlAbsolute };
// }

// /** Stop one stream (preferred) or all streams if no streamId given */
// export async function stopStream(streamId) {
//   const path = streamId ? `/camera/stop/${encodeURIComponent(streamId)}` : '/camera/stop';
//   const { data } = await cameraApi.post(path);             // POST /api/camera/stop(/<id>)
//   return data;
// }

// /** Get a single JPEG snapshot (Blob) for download/preview */
// export async function getSnapshot(streamId) {
//   const url = `/camera/snapshot/${encodeURIComponent(streamId)}`; // GET /api/camera/snapshot/<id>
//   const response = await cameraApi.get(url, { responseType: 'blob' });
//   return { blob: response.data, urlAbsolute: toAbsolute(url) };
// }

// /** Health check (useful for readiness UI) */
// export async function healthCheck() {
//   const { data } = await cameraApi.get('/health');         // GET /api/health
//   return data;
// }

// /** Convenience: build the absolute video URL from a known streamId */
// export function buildStreamUrl(streamId) {
//   return toAbsolute(`/api/camera/video/${encodeURIComponent(streamId)}`); // /api/camera/video/<id>
// }


import axios from 'axios';

// Base URL (override with VITE_CAMERA_API_URL if needed)
const CAMERA_API_URL = import.meta.env.VITE_CAMERA_API_URL || 'http://localhost:5000/api';
const CAMERA_API_ORIGIN = CAMERA_API_URL.replace(/\/api\/?$/, '');

const cameraApi = axios.create({
  baseURL: CAMERA_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

function toAbsolute(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${CAMERA_API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function listCameras() {
  const { data } = await cameraApi.get('/cameras/list');
  return data;
}

export async function testCamera(cameraConfig) {
  const { data } = await cameraApi.post('/camera/test', cameraConfig);
  return data;
}

export async function startStream(cameraConfig) {
  const { data } = await cameraApi.post('/camera/stream', cameraConfig);
  if (!data?.success) throw new Error(data?.message || 'Failed to start stream');
  const streamId = data.streamId || null;
  const streamUrl = data.streamUrl || null;
  const streamUrlAbsolute = toAbsolute(streamUrl);
  return { ...data, streamId, streamUrlAbsolute };
}

export async function stopStream(streamId) {
  const path = streamId ? `/camera/stop/${encodeURIComponent(streamId)}` : '/camera/stop';
  const { data } = await cameraApi.post(path);
  return data;
}

export async function getSnapshot(streamId) {
  const url = `/camera/snapshot/${encodeURIComponent(streamId)}`;
  const response = await cameraApi.get(url, { responseType: 'blob' });
  return { blob: response.data, urlAbsolute: toAbsolute(url) };
}

export async function healthCheck() {
  const { data } = await cameraApi.get('/health');
  return data;
}

export function buildStreamUrl(streamId) {
  return toAbsolute(`/api/camera/video/${encodeURIComponent(streamId)}`);
}