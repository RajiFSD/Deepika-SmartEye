const Joi = require('joi');

// Common validation patterns
const commonValidators = {
  id: Joi.number().integer().positive().required(),
  optionalId: Joi.number().integer().positive().optional(),
  email: Joi.string().email().max(255),
  password: Joi.string().min(6).max(100),
  name: Joi.string().max(255).trim(),
  text: Joi.string().max(1000),
  boolean: Joi.boolean(),
  date: Joi.date(),
  url: Joi.string().uri().max(500),
  ipAddress: Joi.string().ip(),
  coordinates: Joi.array().items(
    Joi.object({
      x: Joi.number().min(0).max(1).required(),
      y: Joi.number().min(0).max(1).required()
    })
  ).min(3)
};

// Auth Validators
const authValidator = {
  login: Joi.object({
    email: commonValidators.email.required(),
    password: commonValidators.password.required()
  }),

  register: Joi.object({
    tenant_id: commonValidators.id,
    username: Joi.string().alphanum().min(3).max(100).required(),
    email: commonValidators.email.required(),
    password: commonValidators.password.required(),
    full_name: commonValidators.name.optional(),
    role: Joi.string().valid('super_admin', 'admin', 'manager', 'viewer').default('viewer')
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),

  forgotPassword: Joi.object({
    email: commonValidators.email.required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: commonValidators.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  })
};

// User Validators
const userValidator = {
  create: Joi.object({
    tenant_id: commonValidators.id,
    username: Joi.string().alphanum().min(3).max(100).required(),
    email: commonValidators.email.required(),
    password: commonValidators.password.required(),
    full_name: commonValidators.name.optional(),
    role: Joi.string().valid('super_admin', 'admin', 'manager', 'viewer').default('viewer'),
    is_active: commonValidators.boolean.default(true)
  }),

  update: Joi.object({
    username: Joi.string().alphanum().min(3).max(100).optional(),
    email: commonValidators.email.optional(),
    full_name: commonValidators.name.optional().allow(''),
    role: Joi.string().valid('super_admin', 'admin', 'manager', 'viewer').optional(),
    is_active: commonValidators.boolean.optional()
  }).min(1)
};

// Tenant Validators
const tenantValidator = {
  create: Joi.object({
    tenant_name: commonValidators.name.required(),
    tenant_code: Joi.string().alphanum().min(2).max(50).required(),
    contact_email: commonValidators.email.optional(),
    contact_phone: Joi.string().max(20).optional().allow(''),
    subscription_type: Joi.string().valid('basic', 'premium', 'enterprise').default('basic'),
    is_active: commonValidators.boolean.default(true)
  }),

  update: Joi.object({
    tenant_name: commonValidators.name.optional(),
    contact_email: commonValidators.email.optional(),
    contact_phone: Joi.string().max(20).optional().allow(''),
    subscription_type: Joi.string().valid('basic', 'premium', 'enterprise').optional(),
    is_active: commonValidators.boolean.optional()
  }).min(1)
};

// Branch Validators
const branchValidator = {
  create: Joi.object({
    tenant_id: commonValidators.id,
    branch_name: commonValidators.name.required(),
    branch_code: Joi.string().alphanum().min(2).max(50).required(),
    address: commonValidators.text.optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    state: Joi.string().max(100).optional().allow(''),
    country: Joi.string().max(100).optional().allow(''),
    timezone: Joi.string().default('UTC'),
    is_active: commonValidators.boolean.default(true)
  }),

  update: Joi.object({
    branch_name: commonValidators.name.optional(),
    branch_code: Joi.string().alphanum().min(2).max(50).optional(),
    address: commonValidators.text.optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    state: Joi.string().max(100).optional().allow(''),
    country: Joi.string().max(100).optional().allow(''),
    timezone: Joi.string().optional(),
    is_active: commonValidators.boolean.optional()
  }).min(1)
};

// Camera Validators
const cameraValidator = {
  create: Joi.object({
    tenant_id: commonValidators.id,
    branch_id: commonValidators.id,
    camera_name: commonValidators.name.required(),
    camera_code: Joi.string().alphanum().min(2).max(50).required(),
    camera_type: Joi.string().valid('IP', 'USB', 'RTSP', 'DVR', 'NVR').default('IP'),
    stream_url: commonValidators.url.optional().allow(''),
    location_description: commonValidators.text.optional().allow(''),
    is_active: commonValidators.boolean.default(true),
    fps: Joi.number().integer().min(1).max(60).default(25),
    resolution: Joi.string().pattern(/^\d+x\d+$/).default('1920x1080')
  }),

update: Joi.object({
    tenant_id: commonValidators.optionalId,      // ← Added
    branch_id: commonValidators.optionalId,      // ← Added (fixes your error!)
    camera_name: commonValidators.name.optional(),
    camera_code: Joi.string().alphanum().min(2).max(50).optional(),
    camera_type: Joi.string().valid('IP', 'USB', 'RTSP', 'DVR', 'NVR').optional(),
    stream_url: commonValidators.url.optional().allow(''),
    location_description: commonValidators.text.optional().allow(''),
    is_active: commonValidators.boolean.optional(),
    fps: Joi.number().integer().min(1).max(60).optional(),
    resolution: Joi.string().pattern(/^\d+x\d+$/).optional()
  }).min(1)
};

// Zone Validators
const zoneValidator = {
  create: Joi.object({
    camera_id: commonValidators.id,
    tenant_id: commonValidators.id,
    zone_name: Joi.string().max(255).default('Entry/Exit Zone'),
    polygon_json: commonValidators.coordinates.required(),
    //direction_line_json: commonValidators.coordinates.optional(),
    direction_line_json: Joi.alternatives().try(
  commonValidators.coordinates,
  Joi.array().max(0), // Allow empty arrays
  Joi.any().valid(null) // Allow null
).optional().default([]),
    entry_direction: Joi.string().valid('UP', 'DOWN', 'LEFT', 'RIGHT').default('UP'),
    is_active: commonValidators.boolean.default(true),
    created_by: commonValidators.optionalId
  }),

  update: Joi.object({
    zone_name: Joi.string().max(255).optional(),
    polygon_json: commonValidators.coordinates.optional(),
    //direction_line_json: commonValidators.coordinates.optional(),
    direction_line_json: Joi.alternatives().try(
  commonValidators.coordinates,
  Joi.array().max(0), // Allow empty arrays
  Joi.any().valid(null) // Allow null
).optional().default([]),
    entry_direction: Joi.string().valid('UP', 'DOWN', 'LEFT', 'RIGHT').optional(),
    is_active: commonValidators.boolean.optional()
  }).min(1)
};

// Alert Threshold Validators
const alertThresholdValidator = {
  create: Joi.object({
    camera_id: commonValidators.id,
    tenant_id: commonValidators.id,
    zone_id: commonValidators.optionalId,
    max_occupancy: Joi.number().integer().min(1).max(1000).required(),
    alert_enabled: commonValidators.boolean.default(true),
    notification_email: Joi.string().max(500).optional().allow(''),
    notification_webhook: commonValidators.url.optional().allow('')
  }),

  update: Joi.object({
    max_occupancy: Joi.number().integer().min(1).max(1000).optional(),
    alert_enabled: commonValidators.boolean.optional(),
    notification_email: Joi.string().max(500).optional().allow(''),
    notification_webhook: commonValidators.url.optional().allow('')
  }).min(1)
};

// Alert Log Validators
const alertLogValidator = {
  create: Joi.object({
    threshold_id: commonValidators.id,
    camera_id: commonValidators.id,
    tenant_id: commonValidators.id,
    current_occupancy: Joi.number().integer().min(0).required(),
    max_occupancy: Joi.number().integer().min(1).required(),
    alert_time: commonValidators.date.default(Date.now),
    status: Joi.string().valid('triggered', 'resolved').default('triggered')
  }),

  update: Joi.object({
    current_occupancy: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('triggered', 'resolved').optional(),
    resolved_at: commonValidators.date.optional()
  }).min(1)
};

// People Count Log Validators
const peopleCountValidator = {
  create: Joi.object({
    camera_id: commonValidators.id,
    tenant_id: commonValidators.id,
    branch_id: commonValidators.id,
    zone_id: commonValidators.optionalId,
    person_id: Joi.string().max(100).optional().allow(''),
    direction: Joi.string().valid('IN', 'OUT').required(),
    detection_time: commonValidators.date.required(),
    frame_number: Joi.number().integer().min(0).optional(),
    confidence_score: Joi.number().min(0).max(1).optional(),
    image_path: Joi.string().max(500).optional().allow(''),
    thumbnail_path: Joi.string().max(500).optional().allow(''),
    metadata: Joi.object().optional()
  }),

  batchCreate: Joi.array().items(
    Joi.object({
      camera_id: commonValidators.id,
      tenant_id: commonValidators.id,
      branch_id: commonValidators.id,
      zone_id: commonValidators.optionalId,
      person_id: Joi.string().max(100).optional().allow(''),
      direction: Joi.string().valid('IN', 'OUT').required(),
      detection_time: commonValidators.date.required(),
      frame_number: Joi.number().integer().min(0).optional(),
      confidence_score: Joi.number().min(0).max(1).optional(),
      bbox: Joi.array().items(Joi.number()).length(4).optional(), // [x, y, width, height]
      model_version: Joi.string().optional()
    })
  ).min(1).max(100) // Limit batch size
};

// Current Occupancy Validators
const currentOccupancyValidator = {
  create: Joi.object({
    camera_id: commonValidators.id,
    tenant_id: commonValidators.id,
    branch_id: commonValidators.id,
    zone_id: commonValidators.optionalId,
    current_count: Joi.number().integer().min(0).default(0),
    total_entries: Joi.number().integer().min(0).default(0),
    total_exits: Joi.number().integer().min(0).default(0)
  }),

  update: Joi.object({
    current_count: Joi.number().integer().min(0).optional(),
    total_entries: Joi.number().integer().min(0).optional(),
    total_exits: Joi.number().integer().min(0).optional()
  }).min(1)
};

// Report Validators
const reportValidator = {
  generate: Joi.object({
    report_type: Joi.string().valid('occupancy', 'alerts', 'summary', 'accuracy').required(),
    parameters: Joi.object({
      start_date: commonValidators.date.required(),
      end_date: commonValidators.date.required(),
      camera_id: commonValidators.optionalId,
      branch_id: commonValidators.optionalId,
      tenant_id: commonValidators.optionalId,
      format: Joi.string().valid('pdf', 'excel', 'json').default('pdf')
    }).required(),
    format: Joi.string().valid('pdf', 'excel', 'json').default('pdf')
  }),

  occupancy: Joi.object({
    start_date: commonValidators.date.required(),
    end_date: commonValidators.date.required(),
    camera_id: commonValidators.optionalId,
    branch_id: commonValidators.optionalId,
    format: Joi.string().valid('pdf', 'excel', 'json').default('pdf')
  }),

  alert: Joi.object({
    start_date: commonValidators.date.required(),
    end_date: commonValidators.date.required(),
    camera_id: commonValidators.optionalId,
    branch_id: commonValidators.optionalId,
    status: Joi.string().valid('triggered', 'resolved').optional(),
    format: Joi.string().valid('pdf', 'excel', 'json').default('pdf')
  })
};

// Upload Validators
const uploadValidator = {
  image: Joi.object({
    // File validation is handled by multer middleware
    // This can be used for additional metadata validation
    camera_id: commonValidators.optionalId,
    description: Joi.string().max(500).optional()
  }),

  video: Joi.object({
    camera_id: commonValidators.optionalId,
    description: Joi.string().max(500).optional(),
    duration: Joi.number().min(0).optional()
  })
};

// Plugin Job Validators
const pluginJobValidator = {
  create: Joi.object({
    job_id: Joi.string().max(100).required(),
    tenant_id: commonValidators.id,
    user_id: commonValidators.optionalId,
    camera_id: commonValidators.optionalId,
    plugin_type: Joi.string().max(50).default('people_counting'),
    input_type: Joi.string().valid('video', 'image', 'stream').required(),
    input_path: Joi.string().max(500).required(),
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed').default('pending')
  }),

  update: Joi.object({
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional(),
    result_json: Joi.object().optional(),
    error_message: Joi.string().optional().allow(''),
    total_detections: Joi.number().integer().min(0).optional(),
    processing_time_seconds: Joi.number().integer().min(0).optional(),
    started_at: commonValidators.date.optional(),
    completed_at: commonValidators.date.optional()
  }).min(1)
};

// Detection Accuracy Validators
const detectionAccuracyValidator = {
  create: Joi.object({
    camera_id: commonValidators.id,
    tenant_id: commonValidators.id,
    date: Joi.date().required(),
    total_detections: Joi.number().integer().min(0).default(0),
    successful_detections: Joi.number().integer().min(0).default(0),
    failed_detections: Joi.number().integer().min(0).default(0)
  }),

  update: Joi.object({
    total_detections: Joi.number().integer().min(0).optional(),
    successful_detections: Joi.number().integer().min(0).optional(),
    failed_detections: Joi.number().integer().min(0).optional()
  }).min(1)
};

// Query Parameter Validators
const queryValidator = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    order: Joi.string().valid('ASC', 'DESC').default('DESC')
  }),

  dateRange: Joi.object({
    start_date: commonValidators.date.required(),
    end_date: commonValidators.date.required()
  }),

  cameraQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    is_active: commonValidators.boolean.optional(),
    branch_id: commonValidators.optionalId,
    tenant_id: commonValidators.optionalId
  }),

  peopleCountQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    direction: Joi.string().valid('IN', 'OUT').optional(),
    start_date: commonValidators.date.optional(),
    end_date: commonValidators.date.optional(),
    camera_id: commonValidators.optionalId,
    branch_id: commonValidators.optionalId,
    zone_id: commonValidators.optionalId
  }),

  alertQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('triggered', 'resolved').optional(),
    start_date: commonValidators.date.optional(),
    end_date: commonValidators.date.optional()
  })
};

// AI Detection Validators (for real-time AI processing)
const aiDetectionValidator = {
  single: Joi.object({
    camera_id: commonValidators.id,
    person_id: Joi.string().max(100).optional(),
    direction: Joi.string().valid('IN', 'OUT').required(),
    confidence: Joi.number().min(0).max(1).required(),
    bbox: Joi.array().items(Joi.number()).length(4).required(), // [x, y, width, height]
    frame_time: commonValidators.date.required(),
    frame_number: Joi.number().integer().min(0).optional(),
    zone_id: commonValidators.optionalId,
    model_version: Joi.string().optional(),
    image_path: Joi.string().max(500).optional()
  }),

  batch: Joi.array().items(
    Joi.object({
      camera_id: commonValidators.id,
      person_id: Joi.string().max(100).optional(),
      direction: Joi.string().valid('IN', 'OUT').required(),
      confidence: Joi.number().min(0).max(1).required(),
      bbox: Joi.array().items(Joi.number()).length(4).required(),
      frame_time: commonValidators.date.required(),
      frame_number: Joi.number().integer().min(0).optional(),
      zone_id: commonValidators.optionalId
    })
  ).min(1).max(50) // Smaller batch for real-time processing
};

// Export all validators
module.exports = {
  // Auth
  authValidator,
  loginValidator: authValidator.login,
  registerValidator: authValidator.register,
  refreshTokenValidator: authValidator.refreshToken,
  forgotPasswordValidator: authValidator.forgotPassword,
  resetPasswordValidator: authValidator.resetPassword,

  // Core Models
  userValidator,
  tenantValidator,
  branchValidator,
  cameraValidator,
  zoneValidator,
  
  // Business Logic
  alertThresholdValidator,
  alertLogValidator,
  peopleCountValidator,
  currentOccupancyValidator,
  
  // Additional Features
  reportValidator,
  uploadValidator,
  pluginJobValidator,
  detectionAccuracyValidator,
  
  // Query Parameters
  queryValidator,
  
  // AI Processing
  aiDetectionValidator,

  // Common validators for reuse
  commonValidators
};