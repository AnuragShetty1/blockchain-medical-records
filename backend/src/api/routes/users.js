const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Hospital = require('../../models/Hospital'); // Import Hospital model
const RegistrationRequest = require('../../models/RegistrationRequest');
const Record = require('../../models/Record');
const AccessRequest = require('../../models/AccessRequest');
const AccessGrant = require('../../models/AccessGrant');
const logger = require('../../utils/logger');

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

        const pendingRequest = await RegistrationRequest.findOne({
            requesterAddress: address,
            status: { $in: ['pending', 'verifying'] }
        });

        if (pendingRequest) {
            return res.json({ success: true, status: 'pending_verification' });
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
 * @route   GET /api/users/records/patient/:address
 * @desc    Get all records for a specific patient, with optional search.
 * @access  Public (should be protected later)
 */
router.get('/records/patient/:address', async (req, res, next) => {
    try {
        const { address } = req.params;
        const { q } = req.query; // Search query for title

        let query = { owner: address.toLowerCase() };

        if (q) {
            // Using a case-insensitive regex for a flexible substring search
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

        // Return empty if the query is too short or missing
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
            .select('address name publicKey') // Select only necessary fields
            .limit(10); // Limit results for performance

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

        // This aggregation pipeline enriches the request data.
        const requests = await AccessRequest.aggregate([
            // 1. Find all pending requests for the specified patient.
            {
                $match: {
                    patientAddress: patientAddress,
                    status: 'pending'
                }
            },
            // 2. Join with the 'users' collection to get the professional's name.
            {
                $lookup: {
                    from: 'users',
                    localField: 'professionalAddress',
                    foreignField: 'address',
                    as: 'professionalInfo'
                }
            },
            // 3. Join with the 'records' collection to get details of the requested records.
            {
                $lookup: {
                    from: 'records',
                    localField: 'recordIds',
                    foreignField: 'recordId',
                    as: 'recordInfo'
                }
            },
            // 4. Reshape the output for a clean API response.
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
            // 5. Sort by most recent request.
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
        const { requestId, response } = req.body; // response should be 'approved' or 'rejected'

        if (requestId === undefined || !['approved', 'rejected'].includes(response)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID or response.' });
        }

        const request = await AccessRequest.findOne({ requestId: requestId, status: 'pending' });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Pending request not found.' });
        }

        // TODO: Add authentication check to ensure `msg.sender` owns this request.

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
        
        // Group grants by patient address
        const grantsByPatient = grants.reduce((acc, grant) => {
            const patientAddr = grant.patientAddress;
            if (!acc[patientAddr]) {
                acc[patientAddr] = [];
            }
            acc[patientAddr].push(grant);
            return acc;
        }, {});
        
        const patientAddresses = Object.keys(grantsByPatient);

        // Fetch user and record details in parallel
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
                    if (!record) return null; // Handle case where record might not be found
                    // Attach the rewrapped key for decryption on the frontend
                    return { ...record.toObject(), rewrappedKey: grant.rewrappedKey };
                })
                .filter(Boolean); // Filter out any nulls
            
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
            // 1. Find all active grants for the specified patient.
            {
                $match: {
                    patientAddress: patientAddress,
                    expirationTimestamp: { $gt: new Date() }
                }
            },
            // 2. Group grants by the professional they were granted to.
            {
                $group: {
                    _id: '$professionalAddress',
                    recordIds: { $push: '$recordId' },
                    grantedAt: { $max: '$createdAt' } // Get the most recent grant time for sorting
                }
            },
            // 3. Join with the 'users' collection to get professional details.
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'address',
                    as: 'professionalInfo'
                }
            },
            // 4. Join with 'hospitals' to get the professional's hospital name
            {
                $lookup: {
                    from: 'hospitals',
                    localField: 'professionalInfo.hospitalId',
                    foreignField: 'hospitalId',
                    as: 'hospitalInfo'
                }
            },
            // 5. Reshape the output for a clean API response.
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
            // 6. Sort by the most recently granted access.
            { $sort: { lastGranted: -1 } }
        ]);

        res.json({ success: true, data: grants });

    } catch (error) {
        logger.error(`Error fetching access grants for patient ${req.params.address}:`, error);
        next(error);
    }
});

// --- [NEW] ENDPOINTS TO SUPPORT PROACTIVE SHARING UI ---

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
            role: { $in: ['Doctor', 'LabTechnician'] } // Or other relevant roles
        }).select('address name role publicKey');
        
        res.json({ success: true, data: professionals });
    } catch (error) {
        logger.error(`Error fetching professionals for hospital ${req.params.hospitalId}:`, error);
        next(error);
    }
});


module.exports = router;

