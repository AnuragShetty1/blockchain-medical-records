const logger = require('../../utils/logger');

// This middleware catches errors passed by next(error)
const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unexpected error occurred.',
        // You might want to provide the error stack in development mode
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

module.exports = errorHandler;
