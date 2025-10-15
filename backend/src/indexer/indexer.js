const { ethers } = require('ethers');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const MedicalRecordsABI = require(path.join(__dirname, '../../../src/contracts/MedicalRecords.json')).abi;

const Hospital = require('../models/Hospital');
const RegistrationRequest = require('../models/RegistrationRequest');
const User = require('../models/User');

const startIndexer = () => {
    logger.info('Initializing blockchain indexer...');
    
    const provider = new ethers.JsonRpcProvider(config.providerUrl);
    const contract = new ethers.Contract(config.contractAddress, MedicalRecordsABI, provider);

    logger.info(`Indexer connected to contract at address: ${config.contractAddress}`);

    contract.on('RegistrationRequested', async (requestId, hospitalName, requesterAddress, event) => {
        try {
            logger.info(`[Event] RegistrationRequested: ID ${requestId} for ${hospitalName}`);
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

    contract.on('HospitalVerified', async (hospitalId, name, adminAddress, event) => {
        try {
            logger.info(`[Event] HospitalVerified: ID ${hospitalId}. Updating database...`);
            
            await Hospital.findOneAndUpdate({ hospitalId: Number(hospitalId) }, { hospitalId: Number(hospitalId), name, adminAddress, isVerified: true }, { upsert: true, new: true });
            logger.info(`[Indexer] Saved/Updated hospital: ${name}`);
            await User.findOneAndUpdate({ walletAddress: adminAddress.toLowerCase() }, { walletAddress: adminAddress.toLowerCase(), name: `Admin for ${name}`, role: 2, hospitalId: Number(hospitalId), isVerified: true }, { upsert: true, new: true });
            logger.info(`[Indexer] Saved/Updated hospital admin: ${adminAddress}`);

            // --- HARDENED DATABASE UPDATE ---
            const request = await RegistrationRequest.findOne({ requestId: Number(hospitalId) });

            if (request) {
                request.status = 'approved';
                await request.save(); // Use .save() for a more explicit and reliable write operation.
                logger.info(`[Indexer] SUCCESS: Permanently marked request ID ${hospitalId} as approved.`);
            } else {
                logger.error(`[Indexer] CRITICAL ERROR: Could not find request ID ${hospitalId} to update its status.`);
            }
            // --- END OF FIX ---

        } catch (error) {
            logger.error(`Error processing HospitalVerified event: ${error.message}`);
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

