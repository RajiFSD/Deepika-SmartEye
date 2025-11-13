const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class UploadService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.imageDir = path.join(this.uploadDir, 'images');
    this.videoDir = path.join(this.uploadDir, 'videos');
    this.initDirectories();
  }

  async initDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.imageDir, { recursive: true });
      await fs.mkdir(this.videoDir, { recursive: true });
      console.log('✅ Upload directories initialized');
    } catch (error) {
      console.error("❌ Error creating upload directories:", error);
    }
  }

  /**
   * Upload image - saves ONCE from memory buffer
   */
  async uploadImage(file) {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `img_${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.imageDir, fileName);

      // Write ONCE from buffer (not from disk)
      await fs.writeFile(filePath, file.buffer);
      
      console.log(`✅ Image saved: ${fileName} (${file.size} bytes)`);

      return {
        filename: fileName,
        original_name: file.originalname,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
        upload_date: new Date()
      };
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      throw new Error("Failed to upload image");
    }
  }

  /**
   * Upload video - saves ONCE from memory buffer
   */
  async uploadVideo(file) {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `vid_${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.videoDir, fileName);

      // Write ONCE from buffer (not from disk)
      await fs.writeFile(filePath, file.buffer);
      
      console.log(`✅ Video saved: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

      return {
        filename: fileName,
        original_name: file.originalname,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
        upload_date: new Date()
      };
    } catch (error) {
      console.error("❌ Error uploading video:", error);
      throw new Error("Failed to upload video");
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(files) {
    try {
      const uploadPromises = files.map(file => {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(fileExtension);
        const isVideo = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'].includes(fileExtension);

        if (isImage) {
          return this.uploadImage(file);
        } else if (isVideo) {
          return this.uploadVideo(file);
        } else {
          throw new Error(`Unsupported file type: ${fileExtension}`);
        }
      });

      const results = await Promise.all(uploadPromises);
      console.log(`✅ Uploaded ${results.length} files successfully`);
      
      return results;
    } catch (error) {
      console.error("❌ Error uploading multiple files:", error);
      throw new Error("Failed to upload files");
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filename) {
    try {
      // Try to find and delete from both image and video directories
      const imagePath = path.join(this.imageDir, filename);
      const videoPath = path.join(this.videoDir, filename);

      try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
        console.log(`🗑️ Deleted image: ${filename}`);
        return { message: "File deleted successfully", filename };
      } catch (imageError) {
        // Image file doesn't exist, try video
        try {
          await fs.access(videoPath);
          await fs.unlink(videoPath);
          console.log(`🗑️ Deleted video: ${filename}`);
          return { message: "File deleted successfully", filename };
        } catch (videoError) {
          throw new Error("File not found");
        }
      }
    } catch (error) {
      console.error("❌ Error deleting file:", error);
      throw new Error("Failed to delete file");
    }
  }

  /**
   * Get file stream
   */
  async getFile(filename) {
    try {
      const imagePath = path.join(this.imageDir, filename);
      const videoPath = path.join(this.videoDir, filename);

      try {
        await fs.access(imagePath);
        const fsSync = require('fs');
        return fsSync.createReadStream(imagePath);
      } catch (imageError) {
        try {
          await fs.access(videoPath);
          const fsSync = require('fs');
          return fsSync.createReadStream(videoPath);
        } catch (videoError) {
          throw new Error("File not found");
        }
      }
    } catch (error) {
      console.error("❌ Error retrieving file:", error);
      throw new Error("Failed to retrieve file");
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(filename) {
    try {
      const imagePath = path.join(this.imageDir, filename);
      const videoPath = path.join(this.videoDir, filename);

      let filePath;
      try {
        await fs.access(imagePath);
        filePath = imagePath;
      } catch (imageError) {
        try {
          await fs.access(videoPath);
          filePath = videoPath;
        } catch (videoError) {
          throw new Error("File not found");
        }
      }

      const stats = await fs.stat(filePath);
      const fileExtension = path.extname(filename).toLowerCase();

      return {
        filename,
        file_path: filePath,
        file_size: stats.size,
        created_date: stats.birthtime,
        modified_date: stats.mtime,
        is_image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(fileExtension),
        is_video: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'].includes(fileExtension)
      };
    } catch (error) {
      console.error("❌ Error getting file info:", error);
      throw new Error("Failed to get file information");
    }
  }

  /**
   * Cleanup old files
   */
  async cleanupOldFiles(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const directories = [this.imageDir, this.videoDir];
      let deletedCount = 0;

      for (const dir of directories) {
        try {
          const files = await fs.readdir(dir);
          
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              deletedCount++;
              console.log(`🗑️ Cleaned up old file: ${file}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error cleaning up directory ${dir}:`, error);
        }
      }

      console.log(`✅ Cleanup complete: ${deletedCount} old files removed`);
      return { message: `Cleaned up ${deletedCount} old files`, deleted: deletedCount };
    } catch (error) {
      console.error("❌ Error during file cleanup:", error);
      throw new Error("Failed to clean up old files");
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const imageFiles = await fs.readdir(this.imageDir);
      const videoFiles = await fs.readdir(this.videoDir);

      let imageTotalSize = 0;
      let videoTotalSize = 0;

      for (const file of imageFiles) {
        const stats = await fs.stat(path.join(this.imageDir, file));
        imageTotalSize += stats.size;
      }

      for (const file of videoFiles) {
        const stats = await fs.stat(path.join(this.videoDir, file));
        videoTotalSize += stats.size;
      }

      return {
        images: {
          count: imageFiles.length,
          totalSize: imageTotalSize,
          totalSizeMB: (imageTotalSize / 1024 / 1024).toFixed(2)
        },
        videos: {
          count: videoFiles.length,
          totalSize: videoTotalSize,
          totalSizeMB: (videoTotalSize / 1024 / 1024).toFixed(2)
        },
        total: {
          count: imageFiles.length + videoFiles.length,
          totalSize: imageTotalSize + videoTotalSize,
          totalSizeMB: ((imageTotalSize + videoTotalSize) / 1024 / 1024).toFixed(2)
        }
      };
    } catch (error) {
      console.error("❌ Error getting storage stats:", error);
      throw new Error("Failed to get storage statistics");
    }
  }
}

module.exports = new UploadService();