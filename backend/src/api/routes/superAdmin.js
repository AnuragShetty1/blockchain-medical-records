const express = require('express');
const router = express.Router();
const Hospital = require('../../models/Hospital');
const RegistrationRequest = require('../../models/RegistrationRequest');
const ethersService = require('../../services/ethersService');
const logger = require('../../utils/logger');

/**
 * @route   GET /api/super-admin/requests
 * @desc    Fetch all pending and in-progress hospital registration requests
 * @access  Public (for now)
 */
router.get('/requests', async (req, res, next) => {
    try {
        // --- [CHANGE] ---
        // Fetch requests that are either 'pending' or 'verifying'.
        const pendingRequests = await RegistrationRequest.find({ 
            status: { $in: ['pending', 'verifying'] } 
        }).sort({ createdAt: -1 });
        res.json({ success: true, data: pendingRequests });
    } catch (error) {
        logger.error('Error fetching pending requests:', error);
        next(error);
    }
});

/**
 * @route   GET /api/super-admin/hospitals
 * @desc    Fetch all verified hospitals
 * @access  Public (for now)
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
 * @desc    Marks a request as 'verifying', sends the transaction, and waits for confirmation.
 * @access  Public (for now)
 */
router.post('/verify-hospital', async (req, res, next) => {
    const { requestId, adminAddress } = req.body;
    const numericRequestId = Number(requestId);

    if (requestId === undefined || !adminAddress) {
        return res.status(400).json({ success: false, message: 'A valid Request ID and Admin Address are required.' });
    }

    try {
        logger.info(`Verification process started for request ID: ${numericRequestId}`);

        // --- [CRITICAL CHANGE] ---
        // Step 1: Immediately and atomically set the status to 'verifying' in the database.
        const request = await RegistrationRequest.findOneAndUpdate(
            { requestId: numericRequestId, status: 'pending' },
            { $set: { status: 'verifying' } },
            { new: true }
        );

        // If no request was found/updated, it means it wasn't in a 'pending' state.
        if (!request) {
            logger.warn(`Request ID ${numericRequestId} is not in a pending state. It may already be processing.`);
            return res.status(409).json({ success: false, message: 'Request is not pending or has already been processed.' });
        }

        // Step 2: Send the transaction to the blockchain.
        const tx = await ethersService.verifyHospital(numericRequestId, adminAddress);
        logger.info(`Transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);

        // Step 3: Wait for the transaction to be mined.
        const receipt = await tx.wait(1);
        logger.info(`Transaction confirmed in block: ${receipt.blockNumber}. The indexer will now handle the final 'approved' status.`);

        // Step 4: Send a definitive success message. The frontend will see the final state via polling.
        res.json({ success: true, message: 'Hospital verification transaction was successfully confirmed on-chain.' });

    } catch (error) {
        logger.error(`On-chain verification failed for request ID ${numericRequestId}:`, error);
        
        // --- [SAFETY NET] ---
        // If the transaction fails, set the status to 'failed' for auditing.
        await RegistrationRequest.findOneAndUpdate(
            { requestId: numericRequestId },
            { $set: { status: 'failed' } }
        );

        const reason = error.reason || 'An error occurred during the blockchain transaction.';
        res.status(500).json({ success: false, message: reason });
    }
});


module.exports = router;
