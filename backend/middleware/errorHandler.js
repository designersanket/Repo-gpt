const { failure } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err.message || err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred.';
  return failure(res, status, code, message);
};

module.exports = errorHandler;
