const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const RegistrationRequest = require('../../models/RegistrationRequest');
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
            // User exists in our DB, return their detailed status
            return res.json({
                success: true,
                status: user.professionalStatus, // 'unaffiliated', 'pending', 'approved', 'revoked'
                role: user.role,
                isVerified: user.isVerified,
                hospitalId: user.hospitalId,
                requestedHospitalId: user.requestedHospitalId,
            });
        }

        // Fallback for hospital admins who might not be in the Users collection initially
        const pendingRequest = await RegistrationRequest.findOne({
            requesterAddress: address,
            status: { $in: ['pending', 'verifying'] }
        });

        if (pendingRequest) {
            return res.json({ success: true, status: 'pending_verification' });
        }
        
        // If no record found at all
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
 * @todo    Add JWT authentication middleware
 */
router.post('/request-association', async (req, res, next) => {
    try {
        const { address, name, role, requestedHospitalId } = req.body;

        if (!address || !name || !role || !requestedHospitalId) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }
        
        const lowerCaseAddress = address.toLowerCase();

        // Find or create the user, then set their request details
        const updatedUser = await User.findOneAndUpdate(
            { address: lowerCaseAddress },
            {
                $set: {
                    address: lowerCaseAddress,
                    name: name,
                    role: role,
                    professionalStatus: 'pending',
                    requestedHospitalId: requestedHospitalId,
                    isVerified: false, // Reset verification status on new request
                    hospitalId: null, // Clear old hospital ID if re-applying
                }
            },
            { upsert: true, new: true }
        );

        logger.info(`User ${name} (${lowerCaseAddress}) requested association with hospital ${requestedHospitalId}`);
        res.status(200).json({ success: true, user: updatedUser });

    } catch (error) {
        logger.error(`Error processing association request:`, error);
        next(error);
    }
});


module.exports = router;
