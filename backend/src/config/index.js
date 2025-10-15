const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
    port: process.env.PORT || 5001,
    mongoURI: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    providerUrl: process.env.PROVIDER_URL,
    contractAddress: process.env.CONTRACT_ADDRESS,
};

// Validate essential configuration
if (!config.mongoURI || !config.providerUrl || !config.contractAddress) {
    console.error("FATAL ERROR: Missing required environment variables. Please check your .env file.");
    // In a real app, you might not want to exit if the contract address is missing during certain tests,
    // but for the indexer to run, it's essential.
    if (!process.env.NODE_ENV === 'test') {
        process.exit(1);
    }
}


module.exports = config;
