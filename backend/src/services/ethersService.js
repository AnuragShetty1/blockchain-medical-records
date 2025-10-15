const { ethers } = require('ethers');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const MedicalRecordsABI = require(path.join(__dirname, '../../../src/contracts/MedicalRecords.json')).abi;

let contract;
let signer;

const init = () => {
    if (contract) {
        return; 
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
        process.exit(1);
    }
};

const verifyHospital = async (hospitalId, adminAddress) => {
    if (!contract) throw new Error('Ethers service is not initialized.');
    try {
        const tx = await contract.verifyHospital(BigInt(hospitalId), adminAddress);
        return tx;
    } catch (error) {
        logger.error(`Error in verifyHospital contract call: ${error.message}`);
        throw error;
    }
};

// --- [NEW] ---
/**
 * Calls the revokeHospital function on the smart contract.
 * @param {number} hospitalId - The ID of the hospital to revoke.
 * @returns {Promise<ethers.TransactionResponse>} The transaction response object.
 */
const revokeHospital = async (hospitalId) => {
    if (!contract) {
        throw new Error('Ethers service is not initialized.');
    }
    try {
        const tx = await contract.revokeHospital(BigInt(hospitalId));
        return tx;
    } catch (error) {
        logger.error(`Error in revokeHospital contract call: ${error.message}`);
        throw error;
    }
};


init();

module.exports = {
    verifyHospital,
    revokeHospital, // Export the new function
};
