const { ethers } = require('ethers');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const MedicalRecordsABI = require(path.join(__dirname, '../../../src/contracts/MedicalRecords.json')).abi;

const Hospital = require('../models/Hospital');
const RegistrationRequest = require('../models/RegistrationRequest');
const User = require('../models/User');
const Record = require('../models/Record');

const startIndexer = (wss) => {

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

    contract.on('HospitalVerified', async (hospitalId, adminAddress, event) => {
        const numericHospitalId = Number(hospitalId);
        try {
            logger.info(`[Event] HospitalVerified: ID ${numericHospitalId} for admin ${adminAddress}. Finalizing in database...`);
            
            const updatedRequest = await RegistrationRequest.findOneAndUpdate(
                { requestId: numericHospitalId, status: 'verifying' },
                { $set: { status: 'approved' } },
                { new: true }
            );

            if (!updatedRequest) {
                logger.warn(`[Indexer] Did not find a VERIFYING request for ID ${numericHospitalId}. The event might be a duplicate or the API pre-processing failed.`);
                return; 
            }

            const hospitalName = updatedRequest.hospitalName;
            logger.info(`[Indexer] SUCCESS: Finalized request ID ${numericHospitalId} as 'approved'.`);

            await Hospital.findOneAndUpdate(
                { hospitalId: numericHospitalId }, 
                { 
                    hospitalId: numericHospitalId, 
                    name: hospitalName,
                    adminAddress, 
                    isVerified: true,
                    status: 'active'
                }, 
                { upsert: true, new: true }
            );
            logger.info(`[Indexer] Saved/Updated hospital: ${hospitalName}`);
            
            await User.findOneAndUpdate(
                { address: adminAddress.toLowerCase() }, 
                { 
                    $set: {
                        address: adminAddress.toLowerCase(), 
                        name: `Admin for ${hospitalName}`,
                        role: 'HospitalAdmin',
                        professionalStatus: 'approved',
                        isVerified: true,
                        hospitalId: numericHospitalId,
                    }
                }, 
                { upsert: true, new: true }
            );
            logger.info(`[Indexer] Saved/Updated hospital admin: ${adminAddress} and linked to hospital ID ${numericHospitalId}`);

        } catch (error)
        {
            logger.error(`Error processing HospitalVerified event for ID ${numericHospitalId}: ${error.message}`);
        }
    });
    
    contract.on('HospitalRevoked', async (hospitalId, event) => {
        const numericHospitalId = Number(hospitalId);
        try {
            logger.info(`[Event] HospitalRevoked: ID ${numericHospitalId}. Finalizing in database...`);

            const revokedHospital = await Hospital.findOneAndUpdate(
                { hospitalId: numericHospitalId, status: 'revoking' },
                { $set: { status: 'revoked', isVerified: false } },
                { new: true }
            );

            if (!revokedHospital) {
                logger.warn(`[Indexer] Did not find a REVOKING hospital for ID ${numericHospitalId}. This could be a duplicate event or an API pre-processing failure.`);
                return;
            }
            
            logger.info(`[Indexer] SUCCESS: Finalized hospital ID ${numericHospitalId} as 'revoked'.`);

        } catch (error) {
            logger.error(`Error processing HospitalRevoked event for ID ${numericHospitalId}: ${error.message}`);
        }
    });

    contract.on('RoleAssigned', async (userAddress, role, hospitalId, event) => {
        try {
            const roleEnumToString = { 1: "Doctor", 7: "LabTechnician" };
            const roleName = roleEnumToString[Number(role)] || 'Unassigned Professional';
            logger.info(`[Event] RoleAssigned: ${roleName} to ${userAddress} for Hospital ID ${hospitalId}`);
            
            await User.findOneAndUpdate(
                { address: userAddress.toLowerCase() },
                { 
                    $set: { 
                        role: roleName, 
                        hospitalId: Number(hospitalId),
                        professionalStatus: 'approved',
                        isVerified: true, 
                    } 
                },
                { new: true }
            );
            logger.info(`[Indexer] User ${userAddress} status updated to 'approved'.`);
        } catch (error) {
            logger.error(`Error processing RoleAssigned event: ${error.message}`);
        }
    });

    contract.on('RoleRevoked', async (userAddress, role, hospitalId, event) => {
        try {
            logger.info(`[Event] RoleRevoked from ${userAddress}`);
            await User.findOneAndUpdate(
                { address: userAddress.toLowerCase() },
                { 
                    $set: { 
                        role: 'Patient', 
                        professionalStatus: 'revoked',
                        isVerified: false,
                    },
                    $unset: { 
                        hospitalId: "",
                        requestedHospitalId: ""
                    }
                }, 
                { new: true }
            );
                logger.info(`[Indexer] User ${userAddress} status updated to 'revoked'.`);
        } catch (error) {
            logger.error(`Error processing RoleRevoked event: ${error.message}`);
        }
    });

    contract.on('PublicKeySaved', async (userAddress, event) => {
        try {
            logger.info(`[Event] PublicKeySaved: for user ${userAddress}`);
            
            const userOnChain = await contract.users(userAddress);
            const publicKey = userOnChain.publicKey;

            if (publicKey && publicKey.length > 0) {
                await User.findOneAndUpdate(
                    { address: userAddress.toLowerCase() },
                    { 
                        $set: { 
                            publicKey: publicKey,
                        } 
                    },
                    { new: true }
                );
                logger.info(`[Indexer] User ${userAddress} public key updated in database.`);
            } else {
                    logger.warn(`[Indexer] PublicKeySaved event for ${userAddress} but key is empty on-chain.`);
            }
        } catch (error) {
            logger.error(`Error processing PublicKeySaved event: ${error.message}`);
        }
    });
    
    // --- MODIFIED ---
    // Updated listener to match the new RecordAdded event signature and data structure.
    contract.on('RecordAdded', async (recordId, owner, title, ipfsHash, category, isVerified, verifiedBy, timestamp, event) => {
        try {
            const numericRecordId = Number(recordId);
            logger.info(`[Event] RecordAdded: ID ${numericRecordId} for owner ${owner}`);

            await Record.findOneAndUpdate(
                { recordId: numericRecordId },
                {
                    recordId: numericRecordId,
                    owner: owner.toLowerCase(),
                    title: title,
                    ipfsHash: ipfsHash,
                    category: category,
                    isVerified: isVerified,
                    uploadedBy: verifiedBy.toLowerCase(),
                    timestamp: new Date(Number(timestamp) * 1000),
                },
                { upsert: true, new: true }
            );
            logger.info(`[Indexer] Saved record metadata for ID ${numericRecordId}.`);
        } catch(error) {
            logger.error(`Error processing RecordAdded event: ${error.message}`);
        }
    });
    
    logger.info('Indexer is now listening for blockchain events.');
};

module.exports = startIndexer;
