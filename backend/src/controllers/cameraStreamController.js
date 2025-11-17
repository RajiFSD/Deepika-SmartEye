// Backend controller for camera streaming
// Add this to your Express/Node.js backend

const { spawn } = require('child_process');
const Camera = require('../models/Camera');

class CameraStreamController {
  /**
   * Stream MJPEG from RTSP source
   * Route: GET /api/cameras/:id/stream/mjpeg
   */
  async streamMjpeg(req, res) {
    try {
      const { id } = req.params;
      
      // Get camera from database
      const camera = await Camera.findByPk(id);
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }

      // Get stream URL (RTSP)
      const streamUrl = camera.stream_url || camera.buildStreamUrl();
      if (!streamUrl) {
        return res.status(400).json({ message: 'Camera has no valid stream URL' });
      }

      // Set response headers for MJPEG stream
      res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=--myboundary',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache'
      });

      // Use FFmpeg to convert RTSP to MJPEG
      const ffmpeg = spawn('ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-i', streamUrl,
        '-f', 'mjpeg',
        '-q:v', '5',              // Quality (2-31, lower is better)
        '-r', '10',               // Frame rate (10 fps)
        '-vf', 'scale=1280:720',  // Scale down to reduce bandwidth
        '-'
      ]);

      let isFirstFrame = true;

      // Pipe FFmpeg output to response
      ffmpeg.stdout.on('data', (data) => {
        try {
          if (isFirstFrame) {
            isFirstFrame = false;
          } else {
            res.write('--myboundary\r\n');
          }
          res.write('Content-Type: image/jpeg\r\n');
          res.write('Content-Length: ' + data.length + '\r\n\r\n');
          res.write(data);
        } catch (error) {
          console.error('Error writing frame:', error);
        }
      });

      ffmpeg.stderr.on('data', (data) => {
        console.error('FFmpeg stderr:', data.toString());
      });

      ffmpeg.on('error', (error) => {
        console.error('FFmpeg process error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Streaming error' });
        }
      });

      ffmpeg.on('close', (code) => {
        console.log('FFmpeg process closed with code', code);
        res.end();
      });

      // Clean up when client disconnects
      req.on('close', () => {
        ffmpeg.kill('SIGTERM');
      });

    } catch (error) {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to start stream' });
      }
    }
  }

  /**
   * Get single snapshot from camera
   * Route: GET /api/cameras/:id/snapshot
   */
  async getSnapshot(req, res) {
    try {
      const { id } = req.params;
      
      const camera = await Camera.findByPk(id);
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }

      const streamUrl = camera.stream_url || camera.buildStreamUrl();
      if (!streamUrl) {
        return res.status(400).json({ message: 'Camera has no valid stream URL' });
      }

      // Use FFmpeg to grab a single frame
      const ffmpeg = spawn('ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-i', streamUrl,
        '-vframes', '1',          // Capture only 1 frame
        '-f', 'mjpeg',
        '-q:v', '2',              // High quality
        '-'
      ]);

      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache'
      });

      ffmpeg.stdout.pipe(res);

      ffmpeg.stderr.on('data', (data) => {
        console.error('FFmpeg stderr:', data.toString());
      });

      ffmpeg.on('error', (error) => {
        console.error('FFmpeg error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to capture snapshot' });
        }
      });

    } catch (error) {
      console.error('Snapshot error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Failed to get snapshot' });
      }
    }
  }

  /**
   * Alternative: Stream using HLS (HTTP Live Streaming)
   * Better for mobile and scalability
   * Route: GET /api/cameras/:id/stream/hls
   */
  async streamHls(req, res) {
    try {
      const { id } = req.params;
      
      const camera = await Camera.findByPk(id);
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }

      const streamUrl = camera.stream_url || camera.buildStreamUrl();
      
      // Return HLS manifest URL
      // Note: You'll need to set up HLS streaming separately
      // using tools like nginx-rtmp-module or MediaMTX
      
      res.json({
        success: true,
        stream_type: 'hls',
        manifest_url: `/streams/${id}/index.m3u8`
      });

    } catch (error) {
      console.error('HLS stream error:', error);
      res.status(500).json({ message: 'Failed to start HLS stream' });
    }
  }

  /**
   * Test camera connection
   * Route: POST /api/cameras/test-connection
   */
  async testConnection(req, res) {
    try {
      const { stream_url } = req.body;

      if (!stream_url) {
        return res.status(400).json({ message: 'Stream URL is required' });
      }

      // Try to grab a single frame
      const ffmpeg = spawn('ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-i', stream_url,
        '-vframes', '1',
        '-f', 'null',
        '-',
        '-timeout', '10000000'  // 10 second timeout
      ]);

      let isSuccess = false;

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          isSuccess = true;
          res.json({
            success: true,
            message: 'Camera connection successful'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to connect to camera'
          });
        }
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!isSuccess) {
          ffmpeg.kill('SIGTERM');
          res.status(408).json({
            success: false,
            message: 'Connection timeout'
          });
        }
      }, 15000);

    } catch (error) {
      console.error('Connection test error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to test connection' 
      });
    }
  }
}

module.exports = new CameraStreamController();

