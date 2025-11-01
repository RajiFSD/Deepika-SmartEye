/**
 * HTTP Response Codes and Messages
 */
const RESPONSE_CODES = {
  // Success Responses
  SUCCESS: {
    code: 200,
    message: 'Request successful'
  },
  CREATED: {
    code: 201,
    message: 'Resource created successfully'
  },
  ACCEPTED: {
    code: 202,
    message: 'Request accepted'
  },
  NO_CONTENT: {
    code: 204,
    message: 'No content'
  },

  // Client Error Responses
  BAD_REQUEST: {
    code: 400,
    message: 'Bad request'
  },
  UNAUTHORIZED: {
    code: 401,
    message: 'Unauthorized access'
  },
  FORBIDDEN: {
    code: 403,
    message: 'Forbidden'
  },
  NOT_FOUND: {
    code: 404,
    message: 'Resource not found'
  },
  METHOD_NOT_ALLOWED: {
    code: 405,
    message: 'Method not allowed'
  },
  CONFLICT: {
    code: 409,
    message: 'Resource conflict'
  },
  UNPROCESSABLE_ENTITY: {
    code: 422,
    message: 'Unprocessable entity'
  },
  TOO_MANY_REQUESTS: {
    code: 429,
    message: 'Too many requests'
  },

  // Server Error Responses
  INTERNAL_SERVER_ERROR: {
    code: 500,
    message: 'Internal server error'
  },
  NOT_IMPLEMENTED: {
    code: 501,
    message: 'Not implemented'
  },
  BAD_GATEWAY: {
    code: 502,
    message: 'Bad gateway'
  },
  SERVICE_UNAVAILABLE: {
    code: 503,
    message: 'Service unavailable'
  },
  GATEWAY_TIMEOUT: {
    code: 504,
    message: 'Gateway timeout'
  }
};

/**
 * Application Specific Status Codes
 */
const APP_STATUS_CODES = {
  // Authentication & Authorization
  AUTH_TOKEN_EXPIRED: 1001,
  AUTH_TOKEN_INVALID: 1002,
  AUTH_TOKEN_MISSING: 1003,
  INVALID_CREDENTIALS: 1004,
  ACCOUNT_DISABLED: 1005,
  INSUFFICIENT_PERMISSIONS: 1006,

  // Validation Errors
  VALIDATION_ERROR: 2001,
  REQUIRED_FIELD_MISSING: 2002,
  INVALID_EMAIL_FORMAT: 2003,
  INVALID_PASSWORD_FORMAT: 2004,
  INVALID_DATE_FORMAT: 2005,
  INVALID_FILE_TYPE: 2006,
  FILE_SIZE_EXCEEDED: 2007,

  // Business Logic Errors
  CAMERA_NOT_FOUND: 3001,
  CAMERA_ALREADY_EXISTS: 3002,
  CAMERA_INACTIVE: 3003,
  ZONE_NOT_FOUND: 3004,
  OCCUPANCY_LIMIT_EXCEEDED: 3005,
  ALERT_ALREADY_TRIGGERED: 3006,
  ALERT_NOT_FOUND: 3007,
  INVALID_ZONE_POLYGON: 3008,

  // AI Processing Errors
  AI_MODEL_LOAD_FAILED: 4001,
  AI_PROCESSING_FAILED: 4002,
  STREAM_CONNECTION_FAILED: 4003,
  DETECTION_FAILED: 4004,
  TRACKING_FAILED: 4005,

  // Database Errors
  DATABASE_CONNECTION_ERROR: 5001,
  DATABASE_QUERY_ERROR: 5002,
  DUPLICATE_ENTRY: 5003,
  RECORD_NOT_FOUND: 5004,

  // External Service Errors
  EMAIL_SERVICE_ERROR: 6001,
  STORAGE_SERVICE_ERROR: 6002,
  AI_SERVICE_ERROR: 6003
};

/**
 * User Roles and Permissions
 */
const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer'
};

const PERMISSIONS = {
  // User Management
  CREATE_USER: 'create_user',
  READ_USER: 'read_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',

  // Camera Management
  CREATE_CAMERA: 'create_camera',
  READ_CAMERA: 'read_camera',
  UPDATE_CAMERA: 'update_camera',
  DELETE_CAMERA: 'delete_camera',

  // Zone Management
  CREATE_ZONE: 'create_zone',
  READ_ZONE: 'read_zone',
  UPDATE_ZONE: 'update_zone',
  DELETE_ZONE: 'delete_zone',

  // Alert Management
  CREATE_ALERT: 'create_alert',
  READ_ALERT: 'read_alert',
  UPDATE_ALERT: 'update_alert',
  DELETE_ALERT: 'delete_alert',

  // Report Management
  GENERATE_REPORT: 'generate_report',
  READ_REPORT: 'read_report',
  DELETE_REPORT: 'delete_report',

  // System Management
  MANAGE_SYSTEM: 'manage_system',
  VIEW_DASHBOARD: 'view_dashboard',
  EXPORT_DATA: 'export_data'
};

/**
 * Camera Types and Configurations
 */
const CAMERA_TYPES = {
  IP: 'IP',
  USB: 'USB',
  RTSP: 'RTSP',
  DVR: 'DVR',
  NVR: 'NVR'
};

const RESOLUTIONS = {
  '640x480': 'VGA',
  '1280x720': 'HD',
  '1920x1080': 'FHD',
  '2560x1440': 'QHD',
  '3840x2160': '4K'
};

/**
 * Detection and Tracking Constants
 */
const DETECTION_CONSTANTS = {
  MIN_CONFIDENCE: 0.5,
  MAX_CONFIDENCE: 1.0,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.7,
  TRACKING_MAX_AGE: 30, // frames
  TRACKING_MIN_HITS: 3, // frames
  DIRECTION_IN: 'IN',
  DIRECTION_OUT: 'OUT'
};

/**
 * Alert and Notification Constants
 */
const ALERT_TYPES = {
  OCCUPANCY_THRESHOLD: 'occupancy_threshold',
  CAMERA_OFFLINE: 'camera_offline',
  SYSTEM_ERROR: 'system_error',
  LOW_ACCURACY: 'low_accuracy'
};

const NOTIFICATION_METHODS = {
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  SMS: 'sms',
  IN_APP: 'in_app'
};

/**
 * File Upload Constants
 */
const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'],
  UPLOAD_DIR: 'uploads',
  IMAGE_DIR: 'uploads/images',
  VIDEO_DIR: 'uploads/videos',
  MAX_FILES: 10
};

/**
 * Report and Export Constants
 */
const REPORT_TYPES = {
  OCCUPANCY: 'occupancy',
  ALERTS: 'alerts',
  SUMMARY: 'summary',
  ACCURACY: 'accuracy'
};

const EXPORT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel',
  JSON: 'json',
  CSV: 'csv'
};

/**
 * Time and Date Constants
 */
const TIME_CONSTANTS = {
  DEFAULT_TIMEZONE: 'UTC',
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  TIME_FORMAT: 'HH:mm:ss'
};

/**
 * Pagination Constants
 */
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  SORT_ORDER: {
    ASC: 'ASC',
    DESC: 'DESC'
  }
};

module.exports = {
  RESPONSE_CODES,
  APP_STATUS_CODES,
  USER_ROLES,
  PERMISSIONS,
  CAMERA_TYPES,
  RESOLUTIONS,
  DETECTION_CONSTANTS,
  ALERT_TYPES,
  NOTIFICATION_METHODS,
  UPLOAD_CONSTANTS,
  REPORT_TYPES,
  EXPORT_FORMATS,
  TIME_CONSTANTS,
  PAGINATION
};