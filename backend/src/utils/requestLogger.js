/**
 * Request Logger Middleware
 * Logs all incoming HTTP requests and responses
 */

const logger = require('@utils/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  logger.info(`→ ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    logger.info(`← ${req.method} ${req.originalUrl} ${res.statusCode}`, {
      responseTime: `${responseTime}ms`,
      statusCode: res.statusCode,
    });

    originalSend.call(this, data);
  };

  next();
};

module.exports = requestLogger;