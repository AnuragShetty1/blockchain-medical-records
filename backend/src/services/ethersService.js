const { ethers } = require('ethers');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const MedicalRecordsABI = require(path.join(__dirname, '../../../src/contracts/MedicalRecords.json')).abi;

let contract;
let signer;

/**
 * Initializes the ethers provider, signer (backend wallet), and contract instance.
 */
const init = () => {
    if (contract) {
        return; // Already initialized
    }

    try {
        if (!process.env.SUPER_ADMIN_PRIVATE_KEY) {
            throw new Error('SUPER_ADMIN_PRIVATE_KEY is not set in the .env file. Cannot sign transactions.');
        }

        const provider = new ethers.JsonRpcProvider(config.providerUrl);
        const wallet = new ethers.Wallet(process.env.SUPER_ADMIN_PRIVATE_KEY, provider);
        signer = wallet;
        
        contract = new ethers.Contract(config.contractAddress, MedicalRecordsABI, signer);

        logger.info(`Ethers service initialized. Signer address: ${signer.address}`);
    } catch (error) {
        logger.error(`Failed to initialize ethers service: ${error.message}`);
        // Exit if we can't initialize the signer, as the service is useless without it.
        process.exit(1);
    }
};

/**
 * Calls the verifyHospital function on the smart contract.
 * @param {number} hospitalId - The ID of the hospital/request to verify.
 * @param {string} adminAddress - The wallet address of the new hospital admin.
 * @returns {Promise<ethers.TransactionResponse>} The transaction response object.
 */
const verifyHospital = async (hospitalId, adminAddress) => {
    if (!contract) {
        throw new Error('Ethers service is not initialized.');
    }
    try {
        // The contract function expects a uint256 for hospitalId.
        const tx = await contract.verifyHospital(BigInt(hospitalId), adminAddress);
        return tx;
    } catch (error) {
        logger.error(`Error in verifyHospital contract call: ${error.message}`);
        // Re-throw the error so the route handler can catch it and send a proper response.
        throw error;
    }
};

// Initialize the service on startup
init();

module.exports = {
    verifyHospital,
};

