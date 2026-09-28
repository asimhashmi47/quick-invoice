const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.details || undefined,
    });
  }

  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
  }

  console.error(err);
  res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: 'Resource not found.' });
}

module.exports = { errorHandler, notFoundHandler };
