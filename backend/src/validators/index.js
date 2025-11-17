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

// 🆕 Camera Validators - UPDATED with user_id and all new fields
const cameraValidator = {
  create: Joi.object({
    tenant_id: commonValidators.id,
    branch_id: commonValidators.id,
    user_id: commonValidators.optionalId, // 🆕 Added user_id
    camera_name: commonValidators.name.required(),
    camera_code: Joi.string().alphanum().min(2).max(50).required(),
    camera_type: Joi.string().valid('IP', 'USB', 'RTSP', 'DVR', 'NVR').default('IP'),
    stream_url: commonValidators.url.optional().allow(''),
    
    // 🆕 Connection & Authentication fields
    ip_address: commonValidators.ipAddress.optional(),
    port: Joi.string().max(10).default('554'),
    username: Joi.string().max(100).optional().allow(''),
    password: Joi.string().max(255).optional().allow(''),
    protocol: Joi.string().valid('RTSP', 'HTTP', 'RTMP', 'ONVIF', 'HLS').default('RTSP'),
    channel: Joi.string().max(10).default('1'),
    stream_path: Joi.string().max(255).optional().allow(''),
    secondary_stream_url: commonValidators.url.optional().allow(''),
    
    // 🆕 Status and features
    recording_enabled: commonValidators.boolean.default(false),
    motion_detection_enabled: commonValidators.boolean.default(false),
    connection_status: Joi.string().valid('connected', 'disconnected', 'error', 'connecting').default('disconnected'),
    
    // 🆕 Hardware info
    manufacturer: Joi.string().max(100).optional().allow(''),
    model: Joi.string().max(100).optional().allow(''),
    firmware_version: Joi.string().max(50).optional().allow(''),
    mac_address: Joi.string().max(20).optional().allow(''),
    
    // 🆕 PTZ
    ptz_enabled: commonValidators.boolean.default(false),
    zoom_level: Joi.number().integer().min(1).default(1),
    pan_position: Joi.number().integer().default(0),
    tilt_position: Joi.number().integer().default(0),
    
    // 🆕 AI Processing
    ai_processing_enabled: commonValidators.boolean.default(true),
    processing_fps: Joi.number().integer().min(1).max(60).default(1),
    detection_zones: Joi.object().optional(),
    
    // Original fields
    location_description: commonValidators.text.optional().allow(''),
    is_active: commonValidators.boolean.default(true),
    fps: Joi.number().integer().min(1).max(60).default(25),
    resolution: Joi.string().pattern(/^\d+x\d+$/).default('1920x1080'),
    
    // 🆕 Metadata
    notes: commonValidators.text.optional().allow(''),
    tags: Joi.string().max(500).optional().allow('')
  }),

  update: Joi.object({
    tenant_id: commonValidators.optionalId,
    branch_id: commonValidators.optionalId,
    user_id: commonValidators.optionalId.allow(null), // 🆕 Added user_id (allow null for unassignment)
    camera_name: commonValidators.name.optional(),
    camera_code: Joi.string().alphanum().min(2).max(50).optional(),
    camera_type: Joi.string().valid('IP', 'USB', 'RTSP', 'DVR', 'NVR').optional(),
    stream_url: commonValidators.url.optional().allow(''),
    
    // 🆕 Connection & Authentication fields
    ip_address: commonValidators.ipAddress.optional(),
    port: Joi.string().max(10).optional(),
    username: Joi.string().max(100).optional().allow(''),
    password: Joi.string().max(255).optional().allow(''),
    protocol: Joi.string().valid('RTSP', 'HTTP', 'RTMP', 'ONVIF', 'HLS').optional(),
    channel: Joi.string().max(10).optional(),
    stream_path: Joi.string().max(255).optional().allow(''),
    secondary_stream_url: commonValidators.url.optional().allow(''),
    
    // 🆕 Status and features
    recording_enabled: commonValidators.boolean.optional(),
    motion_detection_enabled: commonValidators.boolean.optional(),
    connection_status: Joi.string().valid('connected', 'disconnected', 'error', 'connecting').optional(),
    last_connected_at: commonValidators.date.optional(),
    last_error_message: Joi.string().optional().allow(''),
    uptime_percentage: Joi.number().min(0).max(100).optional(),
    
    // 🆕 Hardware info
    manufacturer: Joi.string().max(100).optional().allow(''),
    model: Joi.string().max(100).optional().allow(''),
    firmware_version: Joi.string().max(50).optional().allow(''),
    mac_address: Joi.string().max(20).optional().allow(''),
    
    // 🆕 PTZ
    ptz_enabled: commonValidators.boolean.optional(),
    zoom_level: Joi.number().integer().min(1).optional(),
    pan_position: Joi.number().integer().optional(),
    tilt_position: Joi.number().integer().optional(),
    
    // 🆕 AI Processing
    ai_processing_enabled: commonValidators.boolean.optional(),
    processing_fps: Joi.number().integer().min(1).max(60).optional(),
    detection_zones: Joi.object().optional(),
    
    // Original fields
    location_description: commonValidators.text.optional().allow(''),
    is_active: commonValidators.boolean.optional(),
    fps: Joi.number().integer().min(1).max(60).optional(),
    resolution: Joi.string().pattern(/^\d+x\d+$/).optional(),
    
    // 🆕 Metadata
    notes: commonValidators.text.optional().allow(''),
    tags: Joi.string().max(500).optional().allow('')
  }).min(1)
};

// 🆕 Camera Bulk Operations Validators
const cameraBulkValidator = {
  bulkAssign: Joi.object({
    camera_ids: Joi.array().items(commonValidators.id).min(1).max(100).required(),
    user_id: commonValidators.optionalId.allow(null), // Allow null for unassignment
    tenant_id: commonValidators.id
  }),

  bulkUpdateStatus: Joi.object({
    camera_ids: Joi.array().items(commonValidators.id).min(1).max(100).required(),
    is_active: commonValidators.boolean.required()
  }),

  bulkUpdateConnection: Joi.object({
    camera_ids: Joi.array().items(commonValidators.id).min(1).max(100).required(),
    connection_status: Joi.string().valid('connected', 'disconnected', 'error', 'connecting').required()
  })
};

// 🆕 Camera Assignment Validator
const cameraAssignmentValidator = {
  assign: Joi.object({
    user_id: commonValidators.optionalId.allow(null) // Allow null for unassignment
  })
};

// Zone Validators
const zoneValidator = {
  create: Joi.object({
    camera_id: commonValidators.id,
    tenant_id: commonValidators.id,
    zone_name: Joi.string().max(255).default('Entry/Exit Zone'),
    polygon_json: commonValidators.coordinates.required(),
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

  // 🆕 Updated Camera Query Validator with user_id
  cameraQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    is_active: commonValidators.boolean.optional(),
    branch_id: commonValidators.optionalId,
    tenant_id: commonValidators.optionalId,
    user_id: commonValidators.optionalId, // 🆕 Added user_id filter
    connection_status: Joi.string().valid('connected', 'disconnected', 'error', 'connecting').optional(),
    with_stream_status: commonValidators.boolean.optional(),
    sort: Joi.string().optional(),
    order: Joi.string().valid('ASC', 'DESC').default('DESC')
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

const rolePluginValidator = Joi.object({
  role_name: Joi.string()
    .valid("super_admin", "admin", "manager", "viewer","branch_admin")
    .required(),
  screen_name: Joi.string().min(3).max(100).required(),
});

const productConfigValidator = {
  create: Joi.object({
    name: Joi.string().max(100).required(),
    product_id: commonValidators.id,
    layers_count: Joi.number().integer().min(1),
    racks_per_layer: Joi.number().integer().min(1),
    items_per_rack: Joi.number().integer().min(1),
    box_capacity: Joi.number().integer().optional(),
    bottle_ml: Joi.number().integer().optional(),
    arrangement_type: Joi.string().max(100).optional(),
    tolerance_limit: Joi.number().integer().default(0),    
    is_active: commonValidators.boolean.default(true)
  }),
  update: Joi.object({
    name: Joi.string().max(100).optional(),
    layers_count: Joi.number().integer().optional(),
    racks_per_layer: Joi.number().integer().optional(),
    items_per_rack: Joi.number().integer().optional(),
    box_capacity: Joi.number().integer().optional(),
    bottle_ml: Joi.number().integer().optional(),
    arrangement_type: Joi.string().max(100).optional(),
    tolerance_limit: Joi.number().integer().optional(),
    is_active: commonValidators.boolean.optional()
  }).min(1),
};

const productValidator = {
  create: Joi.object({
    product_name: commonValidators.name.required(),
    product_type: Joi.string().max(100).optional().allow(""),
    yolo_name: Joi.string().max(100).optional().allow(""),
    size: Joi.string().max(100).optional().allow(""),
    description: Joi.string().optional().allow(""),
    uom: Joi.string().max(50).optional().allow(""),
    is_active: commonValidators.boolean.default(true),
  }),
  update: Joi.object({
    product_name: commonValidators.name.optional(),
    product_type: Joi.string().max(100).optional(),
    yolo_name: Joi.string().max(100).optional(),
    size: Joi.string().max(100).optional(),
    description: Joi.string().optional(),
    uom: Joi.string().max(50).optional(),
    is_active: commonValidators.boolean.optional(),
  }).min(1),
};

const tenantProductValidator = {
  create: Joi.object({
    tenant_id: commonValidators.id,
    branch_id: commonValidators.id,
    camera_id: commonValidators.id,
    user_id: commonValidators.id,
    product_id: commonValidators.id,
    configuration_id: commonValidators.optionalId,
    is_active: commonValidators.boolean.default(true),
  }),
  update: Joi.object({
    branch_id: commonValidators.optionalId,
    camera_id: commonValidators.optionalId,
    user_id: commonValidators.optionalId,
    product_id: commonValidators.optionalId,
    configuration_id: commonValidators.optionalId,
    is_active: commonValidators.boolean.optional(),
  }).min(1),
};

const productScanValidator = {
  create: Joi.object({
    tenant_id: commonValidators.id,
    branch_id: commonValidators.id,
    camera_id: commonValidators.id,
    product_id: commonValidators.id,
    scanned_by: commonValidators.id,
    total_expected: Joi.number().integer().min(0).required(),
    total_detected: Joi.number().integer().min(0).required(),
    missing_count: Joi.number().integer().min(0).optional(),
    qr_code: Joi.string().max(255).optional().allow(""),
    manufacturing_date: commonValidators.date.optional(),
    expiry_date: commonValidators.date.optional(),
    batch_number: Joi.string().max(100).optional().allow(""),
    result_status: Joi.string().valid("OK", "NOT_OK").required(),
    alarm_triggered: commonValidators.boolean.optional(),
    remarks: Joi.string().optional().allow(""),
  }),
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
  cameraValidator, // 🆕 Updated with user_id
  zoneValidator,
  rolePluginValidator,
  
  // 🆕 Camera Specific Validators
  cameraBulkValidator,
  cameraAssignmentValidator,
  
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
  commonValidators,

  // Products Validators
  productConfigValidator,
  productValidator,
  tenantProductValidator,
  productScanValidator,
};