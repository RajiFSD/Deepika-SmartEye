// middleware/upload.js
const multer = require('multer');
const path = require('path');

// ✅ USE MEMORY STORAGE - Don't save to disk automatically
const storage = multer.memoryStorage();

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|bmp/;
  const allowedVideoTypes = /mp4|avi|mov|wmv|flv|mkv/;
  
  const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimetype = file.mimetype;

  // Check if it's an allowed image
  if (mimetype.startsWith('image/') && allowedImageTypes.test(extname)) {
    return cb(null, true);
  }
  
  // Check if it's an allowed video
  if (mimetype.startsWith('video/') && allowedVideoTypes.test(extname)) {
    return cb(null, true);
  }

  // Reject file
  cb(new Error(`Invalid file type. Only images (${allowedImageTypes.source}) and videos (${allowedVideoTypes.source}) are allowed.`));
};

// Configure multer
const upload = multer({
  storage: storage, // ✅ Memory storage - file will be in req.file.buffer
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;