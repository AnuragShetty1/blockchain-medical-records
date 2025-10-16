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
 * @desc    Fetch all ACTIVE hospitals
 * @access  Public (for now)
 */
router.get('/hospitals', async (req, res, next) => {
    try {
        // --- [CHANGE] ---
        // Now fetches only 'active' hospitals for the professional registration dropdown.
        const verifiedHospitals = await Hospital.find({ 
            status: 'active'
        }).sort({ createdAt: -1 });
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

        const request = await RegistrationRequest.findOneAndUpdate(
            { requestId: numericRequestId, status: 'pending' },
            { $set: { status: 'verifying' } },
            { new: true }
        );

        if (!request) {
            logger.warn(`Request ID ${numericRequestId} is not in a pending state. It may already be processing.`);
            return res.status(409).json({ success: false, message: 'Request is not pending or has already been processed.' });
        }

        const tx = await ethersService.verifyHospital(numericRequestId, adminAddress);
        logger.info(`Transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);

        const receipt = await tx.wait(1);
        logger.info(`Transaction confirmed in block: ${receipt.blockNumber}. The indexer will now handle the final 'approved' status.`);

        res.json({ success: true, message: 'Hospital verification transaction was successfully confirmed on-chain.' });

    } catch (error) {
        logger.error(`On-chain verification failed for request ID ${numericRequestId}:`, error);
        
        await RegistrationRequest.findOneAndUpdate(
            { requestId: numericRequestId },
            { $set: { status: 'failed' } }
        );

        const reason = error.reason || 'An error occurred during the blockchain transaction.';
        res.status(500).json({ success: false, message: reason });
    }
});

// --- [NEW] Revoke Hospital Endpoint ---
/**
 * @route   POST /api/super-admin/revoke-hospital
 * @desc    Marks a hospital as 'revoking', sends the transaction, and waits for confirmation.
 * @access  Public (for now)
 */
router.post('/revoke-hospital', async (req, res, next) => {
    const { hospitalId } = req.body;
    const numericHospitalId = Number(hospitalId);

    if (hospitalId === undefined) {
        return res.status(400).json({ success: false, message: 'A valid Hospital ID is required.' });
    }

    try {
        logger.info(`Revocation process started for hospital ID: ${numericHospitalId}`);

        const hospital = await Hospital.findOneAndUpdate(
            { hospitalId: numericHospitalId, status: 'active' },
            { $set: { status: 'revoking' } },
            { new: true }
        );

        if (!hospital) {
            logger.warn(`Hospital ID ${numericHospitalId} is not in an active state.`);
            return res.status(409).json({ success: false, message: 'Hospital is not active or has already been revoked.' });
        }

        const tx = await ethersService.revokeHospital(numericHospitalId);
        logger.info(`Transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);

        await tx.wait(1);
        logger.info(`Transaction confirmed. The indexer will now handle the final 'revoked' status.`);

        res.json({ success: true, message: 'Hospital revocation transaction was successfully confirmed on-chain.' });

    } catch (error) {
        logger.error(`On-chain revocation failed for hospital ID ${numericHospitalId}:`, error);

        // Safety Net: If the transaction fails, revert the status back to 'active'.
        await Hospital.findOneAndUpdate(
            { hospitalId: numericHospitalId },
            { $set: { status: 'active' } }
        );

        const reason = error.reason || 'An error occurred during the blockchain transaction.';
        res.status(500).json({ success: false, message: reason });
    }
});

module.exports = router;
