const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const RegistrationRequest = require('../../models/RegistrationRequest');
const logger = require('../../utils/logger');

/**
 * @route   GET /api/users/status/:address
 * @desc    Check the registration status of a given wallet address.
 * @access  Public
 */
router.get('/status/:address', async (req, res, next) => {
    try {
        const walletAddress = req.params.address.toLowerCase();

        // 1. Check if the user is already a verified user (Admin, Doctor, etc.)
        const verifiedUser = await User.findOne({ walletAddress: walletAddress, isVerified: true });
        if (verifiedUser) {
            // Provide the role for potential role-based redirects on the frontend
            return res.json({ success: true, status: 'verified', role: verifiedUser.role });
        }

        // 2. Check if there's a pending or verifying registration request from this address
        const pendingRequest = await RegistrationRequest.findOne({ 
            requesterAddress: walletAddress,
            status: { $in: ['pending', 'verifying'] } 
        });

        if (pendingRequest) {
            return res.json({ success: true, status: 'pending_verification' });
        }

        // 3. If none of the above, the user is considered unregistered.
        return res.json({ success: true, status: 'unregistered' });

    } catch (error) {
        logger.error(`Error fetching user status for ${req.params.address}:`, error);
        next(error);
    }
});

module.exports = router;

