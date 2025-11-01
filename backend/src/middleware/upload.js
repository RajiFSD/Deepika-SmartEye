const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Hardcoded upload constants
const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'],
  UPLOAD_DIR: 'uploads',
  IMAGE_DIR: 'uploads/images',
  VIDEO_DIR: 'uploads/videos',
  MAX_FILES: 10
};

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [UPLOAD_CONSTANTS.UPLOAD_DIR, UPLOAD_CONSTANTS.IMAGE_DIR, UPLOAD_CONSTANTS.VIDEO_DIR];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDirs();
    
    // Determine destination based on file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, UPLOAD_CONSTANTS.IMAGE_DIR);
    } else if (file.mimetype.startsWith('video/')) {
      cb(null, UPLOAD_CONSTANTS.VIDEO_DIR);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = UPLOAD_CONSTANTS.ALLOWED_IMAGE_TYPES;
  const allowedVideoTypes = UPLOAD_CONSTANTS.ALLOWED_VIDEO_TYPES;

  if (file.mimetype.startsWith('image/') && allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (file.mimetype.startsWith('video/') && allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${[...allowedImageTypes, ...allowedVideoTypes].join(', ')}`), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: UPLOAD_CONSTANTS.MAX_FILE_SIZE,
  }
});

// Export the multer instance directly
module.exports = upload;