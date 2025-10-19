const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Hospital = require('../../models/Hospital');
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

        // --- MISTAKE ---
        // The original logic only checked for a rejected `RegistrationRequest` (for hospitals), but not
        // for a rejected `User` (for professionals). This caused an error when a rejected professional
        // tried to re-register because their rejection was stored in a different data model.

        // --- FIX ---
        // The logic is now updated to handle both scenarios.
        // First, it attempts to find and reset a rejected professional by updating their `professionalStatus`
        // in the User model. If that fails, it then attempts to find and delete a rejected hospital
        // request from the RegistrationRequest model. This makes the endpoint robust for both workflows.

        // Scenario 1: Check for and reset a rejected professional user.
        const rejectedUser = await User.findOneAndUpdate(
            { address: lowerCaseAddress, professionalStatus: 'rejected' },
            { $set: { professionalStatus: 'unregistered', requestedHospitalId: null } },
            { new: true }
        );

        if (rejectedUser) {
            logger.info(`Reset rejected professional status for address: ${lowerCaseAddress}`);
            return res.status(200).json({ success: true, message: 'Request status has been reset.' });
        }

        // Scenario 2: If no rejected user was found, check for a rejected hospital registration request.
        const result = await RegistrationRequest.deleteOne({
            requesterAddress: lowerCaseAddress,
            status: 'rejected'
        });

        if (result.deletedCount > 0) {
            logger.info(`Reset rejected hospital request for address: ${lowerCaseAddress}`);
            return res.status(200).json({ success: true, message: 'Request status has been reset.' });
        }
        
        // If neither was found, the request is invalid.
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
        const { requestId, response } = req.body; 

        if (requestId === undefined || !['approved', 'rejected'].includes(response)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID or response.' });
        }

        const request = await AccessRequest.findOne({ requestId: requestId, status: 'pending' });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Pending request not found.' });
        }

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


module.exports = router;

