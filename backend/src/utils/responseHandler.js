/**
 * Response Handler Utility
 * Standardizes API responses across the application
 */

class ResponseHandler {
  /**
   * Success response (200)
   */
  static success(res, data = null, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Created response (201)
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * No content response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Bad request response (400)
   */
  static badRequest(res, message = 'Bad request', errors = null) {
    return res.status(400).json({
      success: false,
      message,
      errors,
    });
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return res.status(401).json({
      success: false,
      message,
    });
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(res, message = 'Access forbidden') {
    return res.status(403).json({
      success: false,
      message,
    });
  }

  /**
   * Not found response (404)
   */
  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      message,
    });
  }

  /**
   * Conflict response (409)
   */
  static conflict(res, message = 'Resource conflict') {
    return res.status(409).json({
      success: false,
      message,
    });
  }

  /**
   * Unprocessable entity response (422)
   */
  static unprocessableEntity(res, message = 'Validation failed', errors = null) {
    return res.status(422).json({
      success: false,
      message,
      errors,
    });
  }

  /**
   * Internal server error response (500)
   */
  static internalServerError(res, message = 'Internal server error', error = null) {
    // Log error for debugging (don't send detailed error to client in production)
    if (process.env.NODE_ENV === 'development') {
      console.error('Internal Server Error:', error);
    }

    return res.status(500).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && error && { error: error.toString() }),
    });
  }

  /**
   * Service unavailable response (503)
   */
  static serviceUnavailable(res, message = 'Service temporarily unavailable') {
    return res.status(503).json({
      success: false,
      message,
    });
  }

  /**
   * Custom response
   */
  static custom(res, statusCode, data) {
    return res.status(statusCode).json(data);
  }

  /**
   * Paginated response
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    });
  }
}

module.exports = ResponseHandler;