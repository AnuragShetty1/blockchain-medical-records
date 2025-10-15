const { ethers } = require('ethers');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
// Correct the path to go up three levels to the project root, then into src/contracts
const MedicalRecordsABI = require(path.join(__dirname, '../../../src/contracts/MedicalRecords.json')).abi;

// Import Mongoose Models
const Hospital = require('../models/Hospital');
const RegistrationRequest = require('../models/RegistrationRequest');
const User = require('../models/User');
// Other models will be used as the indexer grows
// const Record = require('../models/Record');
// const AccessGrant = require('../models/AccessGrant');

const startIndexer = () => {
    logger.info('Initializing blockchain indexer...');
    
    const provider = new ethers.JsonRpcProvider(config.providerUrl);
    const contract = new ethers.Contract(config.contractAddress, MedicalRecordsABI, provider);

    logger.info(`Indexer connected to contract at address: ${config.contractAddress}`);

    // --- Event Listeners ---

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
            logger.info(`[Event] HospitalVerified: ID ${hospitalId} for ${name}`);
            // Create the hospital record
            await Hospital.findOneAndUpdate(
                { hospitalId: Number(hospitalId) },
                {
                    hospitalId: Number(hospitalId),
                    name,
                    adminAddress,
                    isVerified: true,
                },
                { upsert: true, new: true }
            );

            // Update the corresponding registration request status to 'approved'
            // This assumes a link between request and hospital exists off-chain or via other events
            // For now, we find a pending request from that admin.
            await RegistrationRequest.findOneAndUpdate(
                { requesterAddress: adminAddress, status: 'pending' },
                { status: 'approved' }
            );
            
            // Assign the Admin role to the user
            await User.findOneAndUpdate(
                { address: adminAddress.toLowerCase() },
                { address: adminAddress.toLowerCase(), role: 'Admin', hospitalId: Number(hospitalId) },
                { upsert: true, new: true }
            );

        } catch (error) {
            logger.error(`Error processing HospitalVerified event: ${error.message}`);
        }
    });
    
    contract.on('RoleAssigned', async (userAddress, role, hospitalId, event) => {
        try {
            // Roles enum in contract: 0: Patient, 1: Doctor, 2: LabTechnician, 3: Admin, 4: SuperAdmin
            const roleMap = ['Patient', 'Doctor', 'LabTechnician', 'Admin', 'SuperAdmin'];
            const roleName = roleMap[Number(role)] || 'Unassigned';

            logger.info(`[Event] RoleAssigned: ${roleName} to ${userAddress} for Hospital ID ${hospitalId}`);

            await User.findOneAndUpdate(
                { address: userAddress.toLowerCase() },
                {
                    address: userAddress.toLowerCase(),
                    role: roleName,
                    hospitalId: Number(hospitalId),
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            logger.error(`Error processing RoleAssigned event: ${error.message}`);
        }
    });
    
    contract.on('RoleRevoked', async (userAddress, role, hospitalId, event) => {
        try {
            const roleMap = ['Patient', 'Doctor', 'LabTechnician', 'Admin', 'SuperAdmin'];
            const roleName = roleMap[Number(role)] || 'Unassigned';

            logger.info(`[Event] RoleRevoked: ${roleName} from ${userAddress}`);

            // Set role to Unassigned
            await User.findOneAndUpdate(
                { address: userAddress.toLowerCase() },
                { role: 'Unassigned', $unset: { hospitalId: "" } }, // also remove from hospital
                { new: true }
            );
        } catch (error) {
            logger.error(`Error processing RoleRevoked event: ${error.message}`);
        }
    });

    // TODO: Add listeners for RecordUploaded, RecordAccessGranted, RecordAccessRevoked etc.

    logger.info('Indexer is now listening for blockchain events.');
};

module.exports = startIndexer;

