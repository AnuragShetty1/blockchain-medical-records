const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const RegistrationRequest = require('../../models/RegistrationRequest');
const Record = require('../../models/Record'); // <-- IMPORT the Record model
const logger = require('../../utils/logger');

/**
 * @route   GET /api/users/status/:address
 * @desc    Check the comprehensive status of a given wallet address.
 * @access  Public
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
 * @route   POST /api/users/request-association
 * @desc    Allows a professional to request affiliation with a hospital.
 * @access  Private (Authenticated User)
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
 * @route   POST /api/users/register-patient
 * @desc    Creates a database record for a newly registered patient.
 * @access  Private (Authenticated User)
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
 * @route   GET /api/users/records/patient/:address
 * @desc    Get all records for a specific patient, with optional search.
 * @access  Public (should be protected later)
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


module.exports = router;
