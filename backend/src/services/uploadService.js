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
    } catch (error) {
      console.error("Error creating upload directories:", error);
    }
  }

  async uploadImage(file) {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `img_${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.imageDir, fileName);

      await fs.writeFile(filePath, file.buffer);

      return {
        filename: fileName,
        original_name: file.originalname,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
        upload_date: new Date()
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image");
    }
  }

  async uploadVideo(file) {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `vid_${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.videoDir, fileName);

      await fs.writeFile(filePath, file.buffer);

      return {
        filename: fileName,
        original_name: file.originalname,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
        upload_date: new Date()
      };
    } catch (error) {
      console.error("Error uploading video:", error);
      throw new Error("Failed to upload video");
    }
  }

  async uploadMultipleFiles(files) {
    try {
      const uploadPromises = files.map(file => {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(fileExtension);
        const isVideo = ['.mp4', '.avi', '.mov', '.wmv', '.flv'].includes(fileExtension);

        if (isImage) {
          return this.uploadImage(file);
        } else if (isVideo) {
          return this.uploadVideo(file);
        } else {
          throw new Error(`Unsupported file type: ${fileExtension}`);
        }
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Error uploading multiple files:", error);
      throw new Error("Failed to upload files");
    }
  }

  async deleteFile(filename) {
    try {
      // Try to find and delete from both image and video directories
      const imagePath = path.join(this.imageDir, filename);
      const videoPath = path.join(this.videoDir, filename);

      try {
        await fs.access(imagePath);
        await fs.unlink(imagePath);
        return { message: "File deleted successfully", filename };
      } catch (imageError) {
        // Image file doesn't exist, try video
        try {
          await fs.access(videoPath);
          await fs.unlink(videoPath);
          return { message: "File deleted successfully", filename };
        } catch (videoError) {
          throw new Error("File not found");
        }
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new Error("Failed to delete file");
    }
  }

  async getFile(filename) {
    try {
      const imagePath = path.join(this.imageDir, filename);
      const videoPath = path.join(this.videoDir, filename);

      try {
        await fs.access(imagePath);
        return fs.createReadStream(imagePath);
      } catch (imageError) {
        try {
          await fs.access(videoPath);
          return fs.createReadStream(videoPath);
        } catch (videoError) {
          throw new Error("File not found");
        }
      }
    } catch (error) {
      console.error("Error retrieving file:", error);
      throw new Error("Failed to retrieve file");
    }
  }

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
        is_video: ['.mp4', '.avi', '.mov', '.wmv', '.flv'].includes(fileExtension)
      };
    } catch (error) {
      console.error("Error getting file info:", error);
      throw new Error("Failed to get file information");
    }
  }

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
            }
          }
        } catch (error) {
          console.error(`Error cleaning up directory ${dir}:`, error);
        }
      }

      return { message: `Cleaned up ${deletedCount} old files` };
    } catch (error) {
      console.error("Error during file cleanup:", error);
      throw new Error("Failed to clean up old files");
    }
  }
}

module.exports = new UploadService();