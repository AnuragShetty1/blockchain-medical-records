const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/api/middlewares/errorHandler');
const startIndexer = require('./src/indexer/indexer');

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Basic Health Check Route ---
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend server is running.' });
});

// --- Global Error Handler ---
// This should be the last middleware
app.use(errorHandler);


const startServer = async () => {
    try {
        // --- Connect to MongoDB ---
        logger.info('Connecting to MongoDB...');
        await mongoose.connect(config.mongoURI);
        logger.info('MongoDB connected successfully.');

        // --- Start the server ---
        app.listen(config.port, () => {
            logger.info(`Server is running on port ${config.port}`);
        });

        // --- Start the Blockchain Indexer ---
        startIndexer();

    } catch (error) {
        logger.error('Failed to start the server:', error);
        process.exit(1);
    }
};

startServer();
