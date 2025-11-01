const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Hospital = require('../../models/Hospital');
const RegistrationRequest = require('../../models/RegistrationRequest');
const Record = require('../../models/Record');
const AccessRequest = require('../../models/AccessRequest');
const AccessGrant = require('../../models/AccessGrant');
const logger = require('../../utils/logger');

// [NEW] Import all sponsored functions from ethersService
const ethersService = require('../../services/ethersService');
// [NEW] Import ethers for signature verification (as discussed for savePublicKey)
const { ethers } = require('ethers');
// [NEW] Import jwt for authentication middleware
const jwt = require('jsonwebtoken');
const config = require('../../config');

// --- [NEW] AUTHENTICATION MIDDLEWARE ---
/**
 * @dev This middleware is the "guarantee" we discussed.
 * It protects our new sponsored endpoints by verifying the user's JWT.
 * It adds `req.user` (containing their wallet address) to the request,
 * which we use as the trusted `userAddress` for all sponsored calls.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authentication token is required.' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication token is missing.' });
    }

    try {
        // [FIX] Use the *actual* secret from your config (based on your plan)
        // You need to add a JWT_SECRET to your .env file
        const secret = config.jwtSecret || process.env.JWT_SECRET;
        if (!secret) {
            logger.error("JWT_SECRET is not defined in config or .env file.");
            throw new Error("Server configuration error.");
        }
        const decoded = jwt.verify(token, secret);
        
        // Attach user info (especially the address) to the request object
        req.user = decoded; 
        
        // [NEW] Also store the raw address for the sponsored routes
        // The JWT payload from Web3Auth often has the address in `sub` (subject)
        if (decoded.sub) {
             req.user.address = decoded.sub.split(':').pop(); // Get address from "eip155:13881:0x..."
        } else {
             logger.warn("JWT was valid but did not contain a 'sub' (address) field.");
        }

        next();
    } catch (error) {
        logger.error(`Invalid JWT token: ${error.message}`);
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

// --- [UNCHANGED] EXISTING DATABASE/INDEXER ROUTES ---
// All routes below are untouched and will continue to function as-is.

/**
 * @route   GET /api/users/status/:address
 * @desc    Check the comprehensive status of a given wallet address.
 * @access  Public
 */
router.get('/status/:address', async (req, res, next) => {
    try {
        const address = req.params.address.toLowerCase();
        const user = await User.findOne({ address });

        if (user) {
            return res.json({
                success: true,
                status: user.professionalStatus,
                role: user.role,
                isVerified: user.isVerified,
                hospitalId: user.hospitalId,
                requestedHospitalId: user.requestedHospitalId,
                name: user.name,
                publicKey: user.publicKey,
            });
        }
        
        const hospitalRequest = await RegistrationRequest.findOne({
            requesterAddress: address
        }).sort({ createdAt: -1 });

        if (hospitalRequest) {
            if (hospitalRequest.status === 'pending_hospital' || hospitalRequest.status === 'verifying') {
                return res.json({ success: true, status: 'pending_hospital' });
            }
            if (hospitalRequest.status === 'rejected') {
                return res.json({ success: true, status: 'rejected' });
            }
        }

        return res.json({ success: true, status: 'unregistered' });

    } catch (error) {
        logger.error(`Error fetching user status for ${req.params.address}:`, error);
        next(error);
    }
});

/**
 * @route   POST /api/users/request-association
 * @desc    Allows a professional to request affiliation with a hospital.
 * @access  Private (Authenticated User)
 */
router.post('/request-association', async (req, res, next) => {
    try {
        const { address, name, role, requestedHospitalId } = req.body;

        if (!address || !name || role === undefined || role === null || requestedHospitalId === undefined || requestedHospitalId === null) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const lowerCaseAddress = address.toLowerCase();

        const existingUser = await User.findOne({ address: lowerCaseAddress });

        if (existingUser) {
            const isPendingOrActive = ['pending', 'verifying', 'approved', 'revoking'].includes(existingUser.professionalStatus);
            if (isPendingOrActive) {
                logger.warn(`Attempt to re-register by active/pending user: ${lowerCaseAddress}`);
                return res.status(409).json({ success: false, message: 'You already have a pending or active registration.' });
            }
        }

        const updatedUser = await User.findOneAndUpdate(
            { address: lowerCaseAddress },
            {
                $set: {
                    address: lowerCaseAddress,
                    name: name,
                    role: role,
                    professionalStatus: 'pending',
                    requestedHospitalId: requestedHospitalId,
                    isVerified: false,
                    hospitalId: null,
                }
            },
            { upsert: true, new: true }
        );

        logger.info(`User ${name} (${lowerCaseAddress}) requested association with hospital ${requestedHospitalId}`);
        res.status(200).json({
            success: true,
            message: 'Affiliation request submitted successfully. Please wait for admin approval.',
            user: updatedUser
        });

    } catch (error) {
        logger.error(`Error processing association request:`, error);
        next(error);
    }
});

/**
 * @route   POST /api/users/register-patient
 * @desc    Creates a database record for a newly registered patient.
 * @access  Private (Authenticated User)
 */
router.post('/register-patient', async (req, res, next) => {
    try {
        const { address, name } = req.body;

        if (!address || !name) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }

        const lowerCaseAddress = address.toLowerCase();

        const newPatient = await User.findOneAndUpdate(
            { address: lowerCaseAddress },
            {
                $set: {
                    address: lowerCaseAddress,
                    name: name,
                    role: 'Patient',
                    isVerified: true,
                    professionalStatus: 'approved',
                }
            },
            { upsert: true, new: true }
        );

        logger.info(`Patient ${name} (${lowerCaseAddress}) created in database.`);
        res.status(201).json({
            success: true,
            message: 'Patient record created successfully.',
            user: newPatient
        });

    } catch (error) {
        logger.error(`Error processing patient registration:`, error);
        next(error);
    }
});

/**
 * @route   POST /api/users/reset-hospital-request
 * @desc    Resets a rejected request for a hospital OR a professional to allow re-registration.
 * @access  Private (Authenticated User)
 */
router.post('/reset-hospital-request', async (req, res, next) => {
    try {
        const { address } = req.body;
        const lowerCaseAddress = address.toLowerCase();

        if (!address) {
            return res.status(400).json({ success: false, message: 'User address is required.' });
        }
        
        const rejectedUser = await User.findOneAndUpdate(
            { address: lowerCaseAddress, professionalStatus: 'rejected' },
            { $set: { professionalStatus: 'unregistered', requestedHospitalId: null } },
            { new: true }
        );

        if (rejectedUser) {
            logger.info(`Reset rejected professional status for address: ${lowerCaseAddress}`);
            return res.status(200).json({ success: true, message: 'Request status has been reset.' });
        }

        const result = await RegistrationRequest.deleteOne({
            requesterAddress: lowerCaseAddress,
            status: 'rejected'
        });

        if (result.deletedCount > 0) {
            logger.info(`Reset rejected hospital request for address: ${lowerCaseAddress}`);
            return res.status(200).json({ success: true, message: 'Request status has been reset.' });
        }
        
        logger.warn(`No rejected professional or hospital request found for address: ${lowerCaseAddress} to reset.`);
        return res.status(404).json({ success: false, message: 'No rejected request found to reset.' });

    } catch (error) {
        logger.error(`Error resetting request for ${req.body.address}:`, error);
        next(error);
    }
});


/**
 * @route   GET /api/users/records/patient/:address
 * @desc    Get all records for a specific patient, with optional search.
 * @access  Public (should be protected later)
 */
router.get('/records/patient/:address', async (req, res, next) => {
    try {
        const { address } = req.params;
        const { q } = req.query; 

        let query = { owner: address.toLowerCase() };

        if (q) {
            query.title = { $regex: q, $options: 'i' };
        }

        const records = await Record.find(query).sort({ timestamp: -1 });

        res.json({ success: true, data: records });
    } catch (error) {
        logger.error(`Error fetching records for patient ${req.params.address}:`, error);
        next(error);
    }
});

/**
 * @route   GET /api/users/search-patients
 * @desc    Search for patients by name or address (case-insensitive)
 * @access  Public (for now, should be protected for professionals later)
 */
router.get('/search-patients', async (req, res, next) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ success: true, data: [] });
        }

        const searchQuery = {
            $and: [
                { role: "Patient" },
                {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { address: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        };

        const patients = await User.find(searchQuery)
            .select('address name publicKey')
            .limit(10); 

        res.json({ success: true, data: patients });

    } catch (error) {
        logger.error(`Error searching for patients:`, error);
        next(error);
    }
});


/**
 * @route   GET /api/users/access-requests/patient/:address
 * @desc    Get all pending access requests for a patient.
 * @access  Private (Patient only)
 */
router.get('/access-requests/patient/:address', async (req, res, next) => {
    try {
        const patientAddress = req.params.address.toLowerCase();

        const requests = await AccessRequest.aggregate([
            {
                $match: {
                    patientAddress: patientAddress,
                    status: 'pending'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'professionalAddress',
                    foreignField: 'address',
                    as: 'professionalInfo'
                }
            },
            {
                $lookup: {
                    from: 'records',
                    localField: 'recordIds',
                    foreignField: 'recordId',
                    as: 'recordInfo'
                }
            },
            {
                $project: {
                    _id: 0,
                    requestId: 1,
                    professional: { $arrayElemAt: ['$professionalInfo.name', 0] },
                    professionalAddress: 1,
                    requestedRecords: {
                        $map: {
                            input: '$recordInfo',
                            as: 'record',
                            in: {
                                recordId: '$$record.recordId',
                                title: '$$record.title'
                            }
                        }
                    },
                    createdAt: '$createdAt'
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json({ success: true, data: requests });

    } catch (error) {
        logger.error(`Error fetching access requests for patient ${req.params.address}:`, error);
        next(error);
    }
});


/**
 * @route   POST /api/users/access-requests/respond
 * @desc    Allow a patient to approve or reject an access request.
 * @access  Private (Patient only)
 */
router.post('/access-requests/respond', async (req, res, next) => {
    try {
        // [MODIFIED] Destructure new 'grants' array from body
        const { requestId, response, grants } = req.body;

        if (requestId === undefined || !['approved', 'rejected'].includes(response)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID or response.' });
        }

        // [MODIFIED] Find the request and *keep* it in memory
        const request = await AccessRequest.findOne({ requestId: requestId, status: 'pending' });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Pending request not found.' });
        }

        // --- [NEW LOGIC] ---
        // If approved, we must create the AccessGrant documents.
        if (response === 'approved') {
            // Check if the required 'grants' array is provided
            if (!grants || !Array.isArray(grants) || grants.length === 0) {
                logger.error(`Approval for request ${requestId} failed: Missing 'grants' array with rewrapped keys.`);
                return res.status(400).json({
                    success: false,
                    message: 'Approval requires a non-empty "grants" array with rewrapped keys and expiration dates.'
                });
            }

            // Verify that the grants provided match the records in the request
            const requestedRecordIds = new Set(request.recordIds.map(id => id.toString()));
            const grantedRecordIds = new Set(grants.map(g => g.recordId.toString()));

            if (requestedRecordIds.size !== grantedRecordIds.size ||
                ![...requestedRecordIds].every(id => grantedRecordIds.has(id))) {

                logger.warn(`Grant mismatch for request ${requestId}. Requested: [${[...requestedRecordIds].join()}] Granted: [${[...grantedRecordIds].join()}]`);
                return res.status(400).json({ success: false, message: 'Granted records do not match requested records.' });
            }

            // Map the grants array to the AccessGrant schema
            const newGrants = grants.map(grant => ({
                recordId: grant.recordId,
                patientAddress: request.patientAddress,
                professionalAddress: request.professionalAddress,
                rewrappedKey: grant.rewrappedKey,
                expirationTimestamp: new Date(grant.expirationTimestamp),
            }));

            // Insert all new grants into the database
            try {
                await AccessGrant.insertMany(newGrants, { ordered: false });
                logger.info(`Successfully created ${newGrants.length} access grants for request ${requestId}.`);
            } catch (error) {
                // Handle potential duplicate key errors if grants already exist
                if (error.code === 11000) {
                    logger.warn(`Some access grants for request ${requestId} already existed.`);
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }
        // --- [END NEW LOGIC] ---

        // [UNCHANGED] Update the original request status
        request.status = response;
        await request.save();

        logger.info(`Patient responded '${response}' to access request ID ${requestId}.`);
        res.status(200).json({ success: true, message: `Request has been ${response}.` });

    } catch (error) {
        logger.error(`Error responding to access request:`, error);
        next(error);
    }
});

/**
 * @route   GET /api/users/records/professional/:address
 * @desc    Get all records a professional has been granted access to, grouped by patient.
 * @access  Private (Professional only)
 */
router.get('/records/professional/:address', async (req, res, next) => {
    try {
        const professionalAddress = req.params.address.toLowerCase();

        const grants = await AccessGrant.find({ 
            professionalAddress: professionalAddress,
            expirationTimestamp: { $gt: new Date() } 
        });

        if (!grants || grants.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const grantsByPatient = grants.reduce((acc, grant) => {
            const patientAddr = grant.patientAddress;
            if (!acc[patientAddr]) {
                acc[patientAddr] = [];
            }
            acc[patientAddr].push(grant);
            return acc;
        }, {});
        
        const patientAddresses = Object.keys(grantsByPatient);

        const [patients, allRecords] = await Promise.all([
             User.find({ address: { $in: patientAddresses } }).select('name address'),
             Record.find({ recordId: { $in: grants.map(g => g.recordId) } })
        ]);

        const recordsMap = allRecords.reduce((acc, record) => {
            acc[record.recordId] = record;
            return acc;
        }, {});

        const patientMap = patients.reduce((acc, patient) => {
            acc[patient.address] = patient;
            return acc;
        }, {});

        const result = patientAddresses.map(address => {
            const patientGrants = grantsByPatient[address];
            const patientRecords = patientGrants
                .map(grant => {
                    const record = recordsMap[grant.recordId];
                    if (!record) return null;
                    return { ...record.toObject(), rewrappedKey: grant.rewrappedKey };
                })
                .filter(Boolean); 
            
            return {
                patient: {
                    name: patientMap[address]?.name || 'Unknown Patient',
                    address: address
                },
                records: patientRecords
            }
        });

        res.json({ success: true, data: result });

    } catch (error) {
        logger.error(`Error fetching records for professional ${req.params.address}:`, error);
        next(error);
    }
});

/**
 * @route   GET /api/users/access-grants/patient/:address
 * @desc    Get all active access grants given by a patient, grouped by professional.
 * @access  Private (Patient only)
 */
router.get('/access-grants/patient/:address', async (req, res, next) => {
    try {
        const patientAddress = req.params.address.toLowerCase();

        const grants = await AccessGrant.aggregate([
            {
                $match: {
                    patientAddress: patientAddress,
                    expirationTimestamp: { $gt: new Date() }
                }
            },
            {
                $group: {
                    _id: '$professionalAddress',
                    recordIds: { $push: '$recordId' },
                    grantedAt: { $max: '$createdAt' } 
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'address',
                    as: 'professionalInfo'
                }
            },
            {
                $lookup: {
                    from: 'hospitals',
                    localField: 'professionalInfo.hospitalId',
                    foreignField: 'hospitalId',
                    as: 'hospitalInfo'
                }
            },
            {
                $project: {
                    _id: 0,
                    professionalAddress: '$_id',
                    professionalName: { $ifNull: [{ $arrayElemAt: ['$professionalInfo.name', 0] }, "Unknown Professional"] },
                    hospitalName: { $ifNull: [{ $arrayElemAt: ['$hospitalInfo.name', 0] }, "Independent"] },
                    recordIds: '$recordIds',
                    lastGranted: '$grantedAt'
                }
            },
            { $sort: { lastGranted: -1 } }
        ]);

        res.json({ success: true, data: grants });

    } catch (error) {
        logger.error(`Error fetching access grants for patient ${req.params.address}:`, error);
        next(error);
    }
});

/**
 * @route   GET /api/hospitals
 * @desc    Get a list of all verified hospitals.
 * @access  Public
 */
router.get('/hospitals', async (req, res, next) => {
    try {
        const hospitals = await Hospital.find({ isVerified: true })
            .select('hospitalId name')
            .sort({ name: 1 });
        res.json({ success: true, data: hospitals });
    } catch (error) {
        logger.error('Error fetching hospitals:', error);
        next(error);
    }
});

/**
 * @route   GET /api/hospitals/:id/professionals
 * @desc    Get all verified professionals for a specific hospital.
 * @access  Public
 */
router.get('/hospitals/:hospitalId/professionals', async (req, res, next) => {
    try {
        const { hospitalId } = req.params;
        const professionals = await User.find({
            hospitalId: Number(hospitalId),
            isVerified: true,
            role: { $in: ['Doctor', 'LabTechnician'] } 
        }).select('address name role publicKey');
        
        res.json({ success: true, data: professionals });
    } catch (error) {
        logger.error(`Error fetching professionals for hospital ${req.params.hospitalId}:`, error);
        next(error);
    }
});

/**
 * @route   POST /api/users/records/details
 * @desc    Get specific details for a list of records by their IDs.
 * @access  Private (Authenticated user)
 */
router.post('/records/details', async (req, res, next) => {
    try {
        const { recordIds } = req.body;

        if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Record IDs must be provided as a non-empty array.' });
        }

        const records = await Record.find({
            recordId: { $in: recordIds }
        }).select('recordId encryptedSymmetricKey'); 

        res.json({ success: true, data: records });

    } catch (error) {
        logger.error(`Error fetching record details:`, error);
        next(error);
    }
});


// --- [NEW] SPONSORED ON-CHAIN ROUTES ---
// All routes below are new. They are protected by our 'authenticate'
// middleware and call the ethersService to perform sponsored transactions.
// The user's address is securely taken from `req.user.address` (from the JWT).

// A helper function to handle common transaction responses
const handleTransaction = (promise, res, next) => {
    promise
        .then(tx => {
            // Don't wait for tx.wait() here, as it can take 15-30s.
            // The indexer will pick up the transaction.
            // Send back the hash immediately for frontend UI.
            res.status(202).json({ success: true, message: 'Transaction submitted.', transactionHash: tx.hash });
        })
        .catch(error => {
            logger.error(`Sponsored transaction failed: ${error.message}`);
            next(error); // Pass to the global error handler
        });
};

/**
 * @route   POST /api/users/sponsored/register-user
 * @desc    Sponsors the 'registerUser' transaction.
 * @access  Private (Authenticated User)
 */
router.post('/sponsored/register-user', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing, or from req.user if auth is on.
    const { name, role, hospitalId, userAddress: bodyAddress } = req.body;
    // This allows both JWT (req.user.address) and MetaMask testing (req.body.userAddress)
    const userAddress = req.user?.address || bodyAddress; 

    if (!name || role === undefined) { // role can be 0 (Patient)
        return res.status(400).json({ success: false, message: 'Missing required fields: name, role' });
    }
    if (!userAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }
    
    handleTransaction(
        // [FIX] Pass hospitalId (which is 0 for patients, as sent by frontend)
        ethersService.registerUser(userAddress, name, role, hospitalId),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/save-public-key
 * @desc    Sponsors the 'savePublicKey' transaction.
 * @access  Private (Authenticated User)
 * @body    { string publicKey, string signature, string userAddress }
 */
router.post('/sponsored/save-public-key', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { publicKey, signature, userAddress: bodyAddress } = req.body;
    const userAddress = req.user?.address || bodyAddress;

    if (!publicKey || !signature) {
        return res.status(400).json({ success: false, message: 'Missing required fields: publicKey, signature' });
    }
     if (!userAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    // --- Security Check (as discussed) ---
    // We verify the gasless signature to prove the user *owns* the private key
    // associated with the public key they are trying to save.
    const message = `Save my public key: ${publicKey}`;
    let recoveredAddress;
    try {
        recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
        logger.warn(`Invalid signature for savePublicKey: ${error.message}`);
        return res.status(400).json({ success: false, message: 'Invalid signature provided.' });
    }

    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
        logger.warn(`Signature address (${recoveredAddress}) does not match authenticated user (${userAddress}).`);
        return res.status(403).json({ success: false, message: 'Signature does not match authenticated user.' });
    }
    // --- End Security Check ---

    handleTransaction(
        ethersService.savePublicKey(userAddress, publicKey),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/update-profile
 * @desc    Sponsors the 'updateUserProfile' transaction.
 * @access  Private (Authenticated User)
 */
router.post('/sponsored/update-profile', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { name, contactInfo, profileMetadataURI, userAddress: bodyAddress } = req.body;
    const userAddress = req.user?.address || bodyAddress;

    // [FIX] name is the only required field from the frontend 'api' definition
    if (name === undefined) {
        return res.status(400).json({ success: false, message: 'Missing fields. Must provide name.' });
    }
    if (!userAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    handleTransaction(
        // [FIX] Pass correct params, using defaults for ones not sent by frontend
        ethersService.updateUserProfile(userAddress, name, contactInfo || "", profileMetadataURI || ""),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/request-registration
 * @desc    Sponsors the 'requestRegistration' (for a hospital) transaction.
 * @access  Private (Authenticated User)
 */
// [FIX] Renamed route from '/request-hospital-registration' to '/request-registration'
router.post('/sponsored/request-registration', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { hospitalName, userAddress: bodyAddress } = req.body;
    const userAddress = req.user?.address || bodyAddress; // The requester

    if (!hospitalName) {
        return res.status(400).json({ success: false, message: 'Missing required field: hospitalName' });
    }
     if (!userAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    handleTransaction(
        ethersService.requestRegistration(userAddress, hospitalName),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/grant-access
 * @desc    Sponsors the 'grantRecordAccess' transaction (for a single record).
 * @access  Private (Patient only)
 */
router.post('/sponsored/grant-access', /*authenticate,*/ (req, res, next) => {
    const { professionalAddress, recordId, duration, encryptedDek, userAddress: bodyAddress } = req.body;
    const patientAddress = req.user?.address || bodyAddress; 

    if (!professionalAddress || recordId === undefined || !duration || !encryptedDek) {
        return res.status(400).json({ success: false, message: 'Missing required fields: professionalAddress, recordId, duration, encryptedDek' });
    }
     if (!patientAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    handleTransaction(
        ethersService.grantRecordAccess(patientAddress, recordId, professionalAddress, duration, encryptedDek),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/grant-multiple-access
 * @desc    Sponsors the 'grantMultipleRecordAccess' transaction.
 * @access  Private (Patient only)
 */
router.post('/sponsored/grant-multiple-access', /*authenticate,*/ (req, res, next) => {
    const { professionalAddress, recordIds, duration, encryptedDeks, userAddress: bodyAddress } = req.body;
    const patientAddress = req.user?.address || bodyAddress; // The patient is the one granting

    if (!professionalAddress || !recordIds || !Array.isArray(recordIds) || !duration || !encryptedDeks || !Array.isArray(encryptedDeks)) {
        return res.status(400).json({ success: false, message: 'Missing required fields: professionalAddress, recordIds, duration, encryptedDeks' });
    }
    if (recordIds.length !== encryptedDeks.length) {
         return res.status(400).json({ success: false, message: 'Record IDs and Encrypted Keys array length mismatch.' });
    }
     if (!patientAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    handleTransaction(
        ethersService.grantMultipleRecordAccess(patientAddress, recordIds, professionalAddress, duration, encryptedDeks),
        res,
        next
    );
});


/**
 * @route   POST /api/users/sponsored/revoke-access
 * @desc    Sponsors the 'revokeMultipleRecordAccess' transaction.
 * @access  Private (Patient only)
 */
router.post('/sponsored/revoke-access', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    // [FIX] Read 'professionalAddress' not 'professional'
    const { professionalAddress, recordIds, userAddress: bodyAddress } = req.body;
    const patientAddress = req.user?.address || bodyAddress; // The patient is the one revoking

    if (!professionalAddress || !recordIds) {
        return res.status(400).json({ success: false, message: 'Missing required fields: professionalAddress, recordIds' });
    }
     if (!patientAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    handleTransaction(
        // [FIX] Pass `professionalAddress`
        ethersService.revokeMultipleRecordAccess(patientAddress, professionalAddress, recordIds),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/request-access-insurance
 * @desc    Sponsors an insurance provider's 'requestAccess' transaction.
 * @access  Private (InsuranceProvider only)
 */
router.post('/sponsored/request-access-insurance', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { patientAddress, claimId, userAddress: bodyAddress } = req.body;
    const providerAddress = req.user?.address || bodyAddress; // The insurance provider

    if (!patientAddress || !claimId) {
        return res.status(400).json({ success: false, message: 'Missing required fields: patientAddress, claimId' });
    }
     if (!providerAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    handleTransaction(
        ethersService.requestAccess(providerAddress, patientAddress, claimId),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/approve-request-insurance
 * @desc    Sponsors a patient's 'approveRequest' transaction.
 * @access  Private (Patient only)
 */
router.post('/sponsored/approve-request-insurance', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { requestId, durationInDays, userAddress: bodyAddress } = req.body;
    const patientAddress = req.user?.address || bodyAddress; // The patient

    if (requestId === undefined || !durationInDays) {
        return res.status(400).json({ success: false, message: 'Missing required fields: requestId, durationInDays' });
    }
     if (!patientAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    handleTransaction(
        ethersService.approveRequest(patientAddress, requestId, durationInDays),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/request-access-professional
 * @desc    Sponsors a professional's 'requestRecordAccess' transaction.
 * @access  Private (Professional only)
 */
// [FIX] Renamed route to match frontend `api`
router.post('/sponsored/request-access', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { patientAddress, recordIds, justification, userAddress: bodyAddress } = req.body;
    const professionalAddress = req.user?.address || bodyAddress; // The professional

    if (!patientAddress || !recordIds) {
        return res.status(400).json({ success: false, message: 'Missing required fields: patientAddress, recordIds' });
    }
     if (!professionalAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }
    
    // [FIX] Pass `justification` (which might be undefined, service should handle)
    handleTransaction(
        ethersService.requestRecordAccess(professionalAddress, patientAddress, recordIds, justification),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/add-self-record
 * @desc    Sponsors a patient's 'addSelfUploadedRecord' transaction.
 * @access  Private (Patient only)
 */
router.post('/sponsored/add-self-record', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { ipfsHash, title, category, userAddress: bodyAddress } = req.body;
    const patientAddress = req.user?.address || bodyAddress; // The patient

    if (!ipfsHash || !title || !category) {
        return res.status(400).json({ success: false, message: 'Missing required fields: ipfsHash, title, category' });
    }
     if (!patientAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    handleTransaction(
        ethersService.addSelfUploadedRecord(patientAddress, ipfsHash, title, category),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/add-verified-record
 * @desc    Sponsors a professional's 'addVerifiedRecord' transaction.
 * @access  Private (Professional only)
 */
router.post('/sponsored/add-verified-record', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { patient, ipfsHash, title, category, encryptedKeyForPatient, encryptedKeyForHospital, userAddress: bodyAddress } = req.body;
    const professionalAddress = req.user?.address || bodyAddress; // The professional

    if (!patient || !ipfsHash || !title || !category || !encryptedKeyForPatient || !encryptedKeyForHospital) {
        return res.status(400).json({ success: false, message: 'Missing one or more required fields.' });
    }
     if (!professionalAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    handleTransaction(
        ethersService.addVerifiedRecord(professionalAddress, patient, ipfsHash, title, category, encryptedKeyForPatient, encryptedKeyForHospital),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/add-self-records-batch
 * @desc    Sponsors a patient's 'addSelfUploadedRecordsBatch' transaction.
 * @access  Private (Patient only)
 */
// [FIX] Renamed route to match frontend
router.post('/sponsored/add-self-records-batch', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { records, userAddress: bodyAddress } = req.body; // `records` is an array of objects
    const patientAddress = req.user?.address || bodyAddress; // The patient

    if (!records || !Array.isArray(records)) {
        return res.status(400).json({ success: false, message: 'Missing required field: records array' });
    }
     if (!patientAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    // [FIX] Destructure the records array for the service function
    const ipfsHashes = records.map(r => r.ipfsHash);
    const titles = records.map(r => r.title);
    const categories = records.map(r => r.category);

    if (ipfsHashes.length !== titles.length || ipfsHashes.length !== categories.length) {
        return res.status(400).json({ success: false, message: 'All arrays must have the same length.' });
    }

    handleTransaction(
        ethersService.addSelfUploadedRecordsBatch(patientAddress, ipfsHashes, titles, categories),
        res,
        next
    );
});

/**
 * @route   POST /api/users/sponsored/add-verified-records-batch
 * @desc    Sponsors a professional's 'addVerifiedRecordsBatch' transaction.
 * @access  Private (Professional only)
 */
// [FIX] Renamed route to match frontend
router.post('/sponsored/add-verified-records-batch', /*authenticate,*/ (req, res, next) => {
    // [FIX] Read 'userAddress' from req.body for testing
    const { patient, records, userAddress: bodyAddress } = req.body; // `records` is an array of objects
    const professionalAddress = req.user?.address || bodyAddress; // The professional

    if (!patient || !records || !Array.isArray(records)) {
        return res.status(400).json({ success: false, message: 'Missing one or more required fields.' });
    }
     if (!professionalAddress) {
         return res.status(400).json({ success: false, message: 'Missing userAddress.' });
    }

    // [FIX] Destructure the records array
    const ipfsHashes = records.map(r => r.ipfsHash);
    const titles = records.map(r => r.title);
    const categories = records.map(r => r.category);
    const encryptedKeysForPatient = records.map(r => r.encryptedKeyForPatient);
    const encryptedKeysForHospital = records.map(r => r.encryptedKeyForHospital);


    if (
        ipfsHashes.length !== titles.length ||
        ipfsHashes.length !== categories.length ||
        ipfsHashes.length !== encryptedKeysForPatient.length ||
        ipfsHashes.length !== encryptedKeysForHospital.length
    ) {
        return res.status(400).json({ success: false, message: 'All arrays must have the same length.' });
    }

    handleTransaction(
        ethersService.addVerifiedRecordsBatch(professionalAddress, patient, ipfsHashes, titles, categories, encryptedKeysForPatient, encryptedKeysForHospital),
        res,
        next
    );
});
module.exports = router;