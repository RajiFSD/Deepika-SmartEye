const uploadService = require("@services/uploadService");
const ResponseHandler = require("@utils/responseHandler");

class UploadController {
  async uploadImage(req, res) {
    try {
      if (!req.file) return ResponseHandler.badRequest(res, "No image file provided");

      const result = await uploadService.uploadImage(req.file);
      return ResponseHandler.success(res, result, "Image uploaded successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async uploadVideo(req, res) {
    try {
      if (!req.file) return ResponseHandler.badRequest(res, "No video file provided");

      const result = await uploadService.uploadVideo(req.file);
      return ResponseHandler.success(res, result, "Video uploaded successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) return ResponseHandler.badRequest(res, "No files provided");

      const results = await uploadService.uploadMultipleFiles(req.files);
      return ResponseHandler.success(res, results, "Files uploaded successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async deleteFile(req, res) {
    try {
      const result = await uploadService.deleteFile(req.params.filename);
      return ResponseHandler.success(res, result, "File deleted successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getFile(req, res) {
    try {
      const fileStream = await uploadService.getFile(req.params.filename);
      
      // Set appropriate headers based on file type
      const ext = req.params.filename.split('.').pop().toLowerCase();
      const contentType = this.getContentType(ext);
      res.setHeader('Content-Type', contentType);
      
      fileStream.pipe(res);
    } catch (error) {
      return ResponseHandler.notFound(res, "File not found");
    }
  }

  getContentType(ext) {
    const contentTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new UploadController();