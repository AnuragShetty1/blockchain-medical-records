const { ethers } = require('ethers');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const MedicalRecordsABI = require(path.join(__dirname, '../../../src/contracts/MedicalRecords.json')).abi;

const Hospital = require('../models/Hospital');
const RegistrationRequest = require('../models/RegistrationRequest');
const User = require('../models/User');

// Note: The 'wss' parameter is part of the old WebSocket code and is no longer used.
// It can be removed in a future cleanup, but is harmless for now.
const startIndexer = (wss) => {

    logger.info('Initializing blockchain indexer...');
    
    const provider = new ethers.JsonRpcProvider(config.providerUrl);
    const contract = new ethers.Contract(config.contractAddress, MedicalRecordsABI, provider);

    logger.info(`Indexer connected to contract at address: ${config.contractAddress}`);

    // This listener is for new requests coming in. No changes needed here.
    contract.on('RegistrationRequested', async (requestId, hospitalName, requesterAddress, event) => {
        try {
            logger.info(`[Event] RegistrationRequested: ID ${requestId} for ${hospitalName}`);
            // Use upsert to prevent duplicates from event re-fires.
            await RegistrationRequest.findOneAndUpdate(
                { requestId: Number(requestId) },
                {
                    requestId: Number(requestId),
                    hospitalName,
                    requesterAddress,
                    status: 'pending',
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            logger.error(`Error processing RegistrationRequested event: ${error.message}`);
        }
    });

    contract.on('HospitalVerified', async (hospitalId, adminAddress, event) => {
        const numericHospitalId = Number(hospitalId);
        try {
            logger.info(`[Event] HospitalVerified: ID ${numericHospitalId} for admin ${adminAddress}. Finalizing in database...`);
            
            // --- [THE DEFINITIVE FIX] ---
            // The query now correctly looks for a request that is in the 'verifying' state.
            // This allows the indexer to finalize the process started by the API.
            const updatedRequest = await RegistrationRequest.findOneAndUpdate(
                { requestId: numericHospitalId, status: 'verifying' }, // <<< CRITICAL CHANGE IS HERE
                { $set: { status: 'approved' } },
                { new: true }
            );

            // If no request was found, it means the event was for a request not in the 'verifying' state.
            // This is a safety measure.
            if (!updatedRequest) {
                logger.warn(`[Indexer] Did not find a VERIFYING request for ID ${numericHospitalId}. The event might be a duplicate or the API pre-processing failed.`);
                return; 
            }

            const hospitalName = updatedRequest.hospitalName;
            logger.info(`[Indexer] SUCCESS: Finalized request ID ${numericHospitalId} as 'approved'.`);

            // Now, create the hospital and user documents as the source of truth.
            await Hospital.findOneAndUpdate(
                { hospitalId: numericHospitalId }, 
                { 
                    hospitalId: numericHospitalId, 
                    name: hospitalName,
                    adminAddress, 
                    isVerified: true 
                }, 
                { upsert: true, new: true }
            );
            logger.info(`[Indexer] Saved/Updated hospital: ${hospitalName}`);
            
            await User.findOneAndUpdate(
                { walletAddress: adminAddress.toLowerCase() }, 
                { 
                    walletAddress: adminAddress.toLowerCase(), 
                    name: `Admin for ${hospitalName}`,
                    role: 2, // HospitalAdmin
                    hospitalId: numericHospitalId,
                    isVerified: true 
                }, 
                { upsert: true, new: true }
            );
            logger.info(`[Indexer] Saved/Updated hospital admin: ${adminAddress}`);

        } catch (error)
        {
            logger.error(`Error processing HospitalVerified event for ID ${numericHospitalId}: ${error.message}`);
        }
    });
    
    contract.on('RoleAssigned', async (userAddress, role, hospitalId, event) => {
        try {
            const roleMap = { 0: "Patient", 1: "Doctor", 2: "Admin", 3: "Insurance" };
            const roleName = roleMap[Number(role)] || 'Unassigned';
            logger.info(`[Event] RoleAssigned: ${roleName} to ${userAddress} for Hospital ID ${hospitalId}`);
            await User.findOneAndUpdate( { walletAddress: userAddress.toLowerCase() }, { $set: { role: Number(role), hospitalId: Number(hospitalId), isVerified: true, } }, { new: true } );
        } catch (error) {
            logger.error(`Error processing RoleAssigned event: ${error.message}`);
        }
    });

    contract.on('RoleRevoked', async (userAddress, role, hospitalId, event) => {
        try {
            const roleMap = { 0: "Patient", 1: "Doctor", 2: "Admin", 3: "Insurance" };
            const roleName = roleMap[Number(role)] || 'Unassigned';
            logger.info(`[Event] RoleRevoked: ${roleName} from ${userAddress}`);
            await User.findOneAndUpdate( { walletAddress: userAddress.toLowerCase() }, {  $set: { role: 0 }, $unset: { hospitalId: "" } },  { new: true } );
        } catch (error) {
            logger.error(`Error processing RoleRevoked event: ${error.message}`);
        }
    });
    
    logger.info('Indexer is now listening for blockchain events.');
};

module.exports = startIndexer;

