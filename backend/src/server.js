// Add this at the VERY TOP of server.js (before any other imports)
require('module-alias/register');

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Service imports
const emailService = require('./services/emailService');
const schedulerService = require('./services/schedulerService');
const aiIngestService = require('./services/aiIngestService');
const occupancyService = require('./services/occupancyService');

// Route imports
const authRoutes = require('./routes/auth.routes');
const cameraRoutes = require('./routes/camera.routes');
const alertRoutes = require('./routes/alert.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const peopleCountRoutes = require('./routes/peopleCount.routes');
const reportRoutes = require('./routes/report.routes');
const uploadRoutes = require('./routes/upload.routes');
const zoneRoutes = require('./routes/zone.routes');
const branchRoutes = require('./routes/branch.routes');
const tenantRoutes = require('./routes/tenant.routes');
const uploadAnalysisRoutes = require('./routes/uploadAnalysisRoutes');
const alertThresholdRoutes = require('./routes/alertThreshold.routes');
const adminRoutes = require('./routes/adminRoutes');
const cameraStreamRoutes = require('./routes/cameraStreamRoutes');
const planRoutes = require('./routes/plan.routes');
const ObjectCountingJobRoutes = require('./routes/objectCounting.routes');
const rolePluginRoutes = require('./routes/rolePluginRoutes');


class Server {
  constructor() {
    this.app = express();
    this.port = PORT;
    this.services = {};
    
    this.initializeMiddleware();
    this.initializeServices();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddleware() {
    // CORS - MUST BE FIRST (BEFORE helmet)
    this.app.use(cors({
      origin: 'http://localhost:5173', // Your React app URL
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Range', 'X-Content-Range']
    }));
    
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
    
    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }
    
    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Make services available to routes
    this.app.use((req, res, next) => {
      req.services = this.services;
      next();
    });
  }

  async initializeServices() {
    try {
      console.log('🔄 Initializing SmartEye AI Services...');
      
      // 1. Initialize database connection
      const { syncDatabase } = require('./models');
      await syncDatabase();
      console.log('✅ Database synchronized');
      
      // 2. Initialize email service
      this.services.email = emailService;
      await this.services.email.init();
      console.log('✅ Email service initialized');
      
      // 3. Initialize scheduler service (starts cron jobs)
      this.services.scheduler = schedulerService;
      this.services.scheduler.init();
      console.log('✅ Scheduler service initialized');
      
      // 4. Initialize AI and occupancy services
      this.services.aiIngest = aiIngestService;
      this.services.occupancy = occupancyService;
      console.log('✅ AI and occupancy services initialized');
      
      // 5. Start AI processing for active cameras
      await this.startCameraProcessing();
      
      console.log('🎉 All SmartEye AI services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      // Don't exit in development to allow for hot reloading
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  async startCameraProcessing() {
    try {
      const { Camera } = require('./models');
      const activeCameras = await Camera.findAll({
        where: { is_active: true },
        attributes: ['camera_id', 'camera_name', 'stream_url']
      });

      console.log(`📹 Found ${activeCameras.length} active cameras`);

      for (const camera of activeCameras) {
        try {
          await this.services.aiIngest.startCameraProcessing(camera.camera_id);
          console.log(`✅ Started AI processing for camera: ${camera.camera_name}`);
        } catch (error) {
          console.error(`❌ Failed to start camera ${camera.camera_name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error starting camera processing:', error);
    }
  }

  initializeRoutes() {
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/cameras', cameraRoutes);
    this.app.use('/api/alerts', alertRoutes);
    this.app.use('/api/dashboard', dashboardRoutes);
    this.app.use('/api/people-count', peopleCountRoutes);
    this.app.use('/api/reports', reportRoutes);
    this.app.use('/api/upload', uploadRoutes);
    this.app.use('/api/zones', zoneRoutes);
    this.app.use('/api/branches', branchRoutes);
    this.app.use('/api/tenants', tenantRoutes);
    this.app.use('/api/upload-analysis', uploadAnalysisRoutes);
    this.app.use('/api/alert-thresholds', alertThresholdRoutes);
    this.app.use('/api/admin', adminRoutes);  
    this.app.use('/api/camera', cameraStreamRoutes);
    this.app.use('/api/plans', planRoutes);
    this.app.use('/api/object-counting', ObjectCountingJobRoutes);
    this.app.use('/api/role-plugins', rolePluginRoutes);
    
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        message: 'SmartEye AI Backend is running',
        timestamp: new Date(),
        services: {
          database: 'Connected',
          email: this.services.email?.transporter ? 'Ready' : 'Initializing',
          scheduler: 'Running',
          ai_processing: 'Active'
        }
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'SmartEye AI People Counting API',
        version: '1.0.0',
        documentation: '/api/health'
      });
    });
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res, next) => {
      if (!res.headersSent) {
        res.status(404).json({
          success: false,
          error: 'Route not found',
          path: req.originalUrl,
          message: 'The requested endpoint was not found on this server'
        });
      } else {
        next();
      }
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);

      if (res.headersSent) return next(error);

      const statusCode = error.status || error.statusCode || 500;

      res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal server error' : 'Request failed',
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      });
    });
  }

  start() {
    this.server = this.app.listen(PORT,"0.0.0.0", () => {
      console.log(`
🚀 SmartEye AI Server is running on port ${this.port}
📊 Environment: ${process.env.NODE_ENV || 'development'}
🏥 Health check: http://localhost:${this.port}/api/health
📚 API Base: http://localhost:${this.port}/api/
🌐 CORS enabled for: http://localhost:5173
      `);
    });

    this.setupGracefulShutdown();
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      
      // Stop accepting new requests
      this.server.close(() => {
        console.log('✅ HTTP server closed');
      });
      
      // Stop scheduled jobs
      if (this.services.scheduler) {
        this.services.scheduler.stopAllJobs();
        console.log('✅ Scheduler jobs stopped');
      }
      
      // Stop AI processing for all cameras
      if (this.services.aiIngest) {
        this.services.aiIngest.stopAllProcessing();
        console.log('✅ AI processing stopped');
      }
      
      // Give processes time to complete
      setTimeout(() => {
        console.log('👋 SmartEye AI shutdown complete');
        process.exit(0);
      }, 5000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// Start the server
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;