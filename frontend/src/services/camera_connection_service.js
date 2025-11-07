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
  console.log('📷 Camera API Base URL:', CAMERA_API_URL);
  console.log('Starting camera stream with config:', cameraConfig);
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