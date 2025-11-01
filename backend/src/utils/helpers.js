const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Utility functions for common operations
 */
class Helper {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password, saltRounds = 12) {
    try {
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload, expiresIn = '1h', secret = process.env.JWT_SECRET) {
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token, secret = process.env.JWT_SECRET) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate random string
   */
  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID
   */
  static generateUUID() {
    return uuidv4();
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 255);
  }

  /**
   * Get file extension
   */
  static getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Validate email format
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Format date to string
   */
  static formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Format datetime to string
   */
  static formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    switch (format) {
      case 'YYYY-MM-DD HH:mm:ss':
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      case 'DD/MM/YYYY HH:mm:ss':
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      default:
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }

  /**
   * Calculate time difference in various units
   */
  static timeDifference(start, end, unit = 'seconds') {
    const diff = new Date(end) - new Date(start);
    
    switch (unit) {
      case 'milliseconds':
        return diff;
      case 'seconds':
        return Math.floor(diff / 1000);
      case 'minutes':
        return Math.floor(diff / (1000 * 60));
      case 'hours':
        return Math.floor(diff / (1000 * 60 * 60));
      case 'days':
        return Math.floor(diff / (1000 * 60 * 60 * 24));
      default:
        return diff;
    }
  }

  /**
   * Deep clone an object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }

  /**
   * Remove null/undefined properties from object
   */
  static removeEmptyProperties(obj) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v != null)
    );
  }

  /**
   * Convert object to query string
   */
  static objectToQueryString(obj) {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        params.append(key, value.toString());
      }
    }
    
    return params.toString();
  }

  /**
   * Parse query string to object
   */
  static queryStringToObject(queryString) {
    const params = new URLSearchParams(queryString);
    const obj = {};
    
    for (const [key, value] of params) {
      obj[key] = value;
    }
    
    return obj;
  }

  /**
   * Generate pagination metadata
   */
  static generatePagination(page, limit, total) {
    const currentPage = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = currentPage < totalPages;
    const hasPrev = currentPage > 1;

    return {
      currentPage,
      pageSize,
      totalItems: total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? currentPage + 1 : null,
      prevPage: hasPrev ? currentPage - 1 : null
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry(fn, maxAttempts = 3, delay = 1000) {
    let attempt = 1;
    
    while (attempt <= maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        
        const waitTime = delay * Math.pow(2, attempt - 1);
        await this.sleep(waitTime);
        attempt++;
      }
    }
  }

  /**
   * Validate coordinates for zone polygon
   */
  static validateCoordinates(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      return false;
    }

    for (const coord of coordinates) {
      if (typeof coord.x !== 'number' || typeof coord.y !== 'number') {
        return false;
      }
      if (coord.x < 0 || coord.x > 1 || coord.y < 0 || coord.y > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate bounding box from coordinates
   */
  static calculateBoundingBox(coordinates) {
    if (!this.validateCoordinates(coordinates)) {
      throw new Error('Invalid coordinates');
    }

    const xs = coordinates.map(coord => coord.x);
    const ys = coordinates.map(coord => coord.y);

    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  }

  /**
   * Check if point is inside polygon
   */
  static isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Format file size to human readable format
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate random color hex code
   */
  static generateRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  /**
   * Truncate text with ellipsis
   */
  static truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Capitalize first letter of each word
   */
  static capitalizeWords(str) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  /**
   * Convert snake_case to camelCase
   */
  static snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert camelCase to snake_case
   */
  static camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Mask sensitive data (emails, passwords, etc.)
   */
  static maskSensitiveData(data, fields = ['password', 'token', 'authorization']) {
    const masked = { ...data };
    
    for (const field of fields) {
      if (masked[field]) {
        masked[field] = '***MASKED***';
      }
    }
    
    return masked;
  }

  /**
   * Validate camera stream URL
   */
  static validateStreamUrl(url) {
    if (!this.isValidUrl(url)) return false;
    
    const supportedProtocols = ['rtsp:', 'http:', 'https:', 'rtmp:'];
    const urlObj = new URL(url);
    
    return supportedProtocols.includes(urlObj.protocol);
  }

  /**
   * Generate camera thumbnail path
   */
  static generateThumbnailPath(originalPath) {
    const ext = path.extname(originalPath);
    const base = path.basename(originalPath, ext);
    const dir = path.dirname(originalPath);
    
    return path.join(dir, `${base}_thumb${ext}`);
  }

  /**
   * Calculate occupancy rate
   */
  static calculateOccupancyRate(current, capacity) {
    if (!capacity || capacity === 0) return 0;
    return Math.min((current / capacity) * 100, 100).toFixed(2);
  }

  /**
   * Detect direction based on line crossing
   */
  static detectDirection(prevPoint, currentPoint, directionLine) {
    if (!prevPoint || !currentPoint || !directionLine) return null;
    
    // Simple direction detection based on line crossing
    // This would be more sophisticated in a real implementation
    const lineStart = directionLine[0];
    const lineEnd = directionLine[1];
    
    // Calculate which side of the line the points are on
    const prevSide = this.pointSideOfLine(prevPoint, lineStart, lineEnd);
    const currentSide = this.pointSideOfLine(currentPoint, lineStart, lineEnd);
    
    if (prevSide !== currentSide) {
      return currentSide > 0 ? 'IN' : 'OUT';
    }
    
    return null;
  }

  /**
   * Helper for direction detection
   */
  static pointSideOfLine(point, lineStart, lineEnd) {
    return (lineEnd.x - lineStart.x) * (point.y - lineStart.y) - 
           (lineEnd.y - lineStart.y) * (point.x - lineStart.x);
  }
}

module.exports = Helper;