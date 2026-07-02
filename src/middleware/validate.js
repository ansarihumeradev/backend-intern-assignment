const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Run this after express-validator rule chains to collect and throw errors uniformly.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'Validation failed', errors.array()));
  }
  next();
}

module.exports = validate;
