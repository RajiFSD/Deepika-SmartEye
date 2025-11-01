const ResponseHandler = require('../utils/responseHandler');

/**
 * Generic validation middleware
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true // For objects with additional properties
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return ResponseHandler.badRequest(res, 'Validation failed', errorDetails);
    }

    // Replace the request data with validated data (stripped of unknown properties)
    req[property] = error ? req[property] : schema.validate(req[property]).value;
    next();
  };
};

/**
 * Validate request body
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate request query parameters
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate URL parameters
 */
const validateParams = (schema) => validate(schema, 'params');

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams
};