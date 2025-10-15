const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const errorHandler = require('./src/api/middlewares/errorHandler');
const startIndexer = require('./src/indexer/indexer');

// --- Import API Routes ---
const superAdminRoutes = require('./src/api/routes/superAdmin');


const app = express();

// --- Middlewares ---

// Explicitly set the allowed origin for CORS
// This tells the browser that requests from your frontend are safe to allow.
app.use(cors({
    origin: 'http://localhost:3000'
}));

app.use(express.json());

// --- Basic Health Check Route ---
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend server is running.' });
});

// --- API Routes ---
app.use('/api/super-admin', superAdminRoutes);


// --- Global Error Handler ---
// This should be the last middleware
app.use(errorHandler);


const startServer = async () => {
    try {
        // --- Connect to MongoDB ---
        logger.info('Connecting to MongoDB...');
        
        // --- FIX: Using the correct and explicit config variable ---
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

