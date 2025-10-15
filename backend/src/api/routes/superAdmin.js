const express = require('express');
const router = express.Router();
const Hospital = require('../../models/Hospital');
const RegistrationRequest = require('../../models/RegistrationRequest');
const ethersService = require('../../services/ethersService');
const logger = require('../../utils/logger');

/**
 * @route   GET /api/super-admin/requests
 * @desc    Fetch all pending hospital registration requests
 * @access  Public (for now, will be protected later)
 */
router.get('/requests', async (req, res, next) => {
    try {
        const pendingRequests = await RegistrationRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json({ success: true, data: pendingRequests });
    } catch (error) {
        logger.error('Error fetching pending requests:', error);
        next(error);
    }
});

/**
 * @route   GET /api/super-admin/hospitals
 * @desc    Fetch all verified hospitals
 * @access  Public (for now, will be protected later)
 */
router.get('/hospitals', async (req, res, next) => {
    try {
        const verifiedHospitals = await Hospital.find({ isVerified: true }).sort({ createdAt: -1 });
        res.json({ success: true, data: verifiedHospitals });
    } catch (error) {
        logger.error('Error fetching verified hospitals:', error);
        next(error);
    }
});

/**
 * @route   POST /api/super-admin/verify-hospital
 * @desc    Approve a request and wait for on-chain confirmation before responding.
 * @access  Public (for now)
 */
router.post('/verify-hospital', async (req, res, next) => {
    const { requestId, adminAddress } = req.body;

    if (requestId === undefined || requestId === null || !adminAddress) {
        return res.status(400).json({ success: false, message: 'A valid Request ID and Admin Address are required.' });
    }

    try {
        logger.info(`Verification process started for request ID: ${requestId}`);

        // Step 1: Send the transaction to the blockchain
        const tx = await ethersService.verifyHospital(requestId, adminAddress);
        logger.info(`Transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);

        // --- THE KEY CHANGE: WAIT FOR CONFIRMATION ---
        // Step 2: Wait for the transaction to be mined (1 confirmation).
        // This makes the API call synchronous and guarantees the event has been emitted.
        const receipt = await tx.wait(1);
        
        logger.info(`Transaction confirmed in block: ${receipt.blockNumber}.`);
        
        // A brief pause to ensure the indexer, which runs in parallel, has time to complete its database write.
        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5-second safety delay

        // Step 3: Send a definitive success message.
        res.json({ success: true, message: 'Hospital successfully verified on-chain.' });

    } catch (error) {
        logger.error(`On-chain verification failed for request ID ${requestId}:`, error);
        const reason = error.reason || 'An error occurred during the blockchain transaction.';
        res.status(500).json({ success: false, message: reason });
    }
});


module.exports = router;

