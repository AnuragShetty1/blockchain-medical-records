const express = require('express');
const router = express.Router();
const Hospital = require('../../models/Hospital');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const ethersService = require('../../services/ethersService');

/**
 * @route   GET /api/hospital-admin/hospitals/search
 * @desc    Search for active hospitals by name (case-insensitive)
 * @access  Public (for professionals during registration)
 */
router.get('/hospitals/search', async (req, res, next) => {
    try {
        const { name } = req.query;
        if (!name || name.trim().length < 2) {
            return res.json({ success: true, hospitals: [] });
        }

        const hospitals = await Hospital.find({
            name: { $regex: name, $options: 'i' }, // Case-insensitive regex search
            status: 'active'
        }).limit(10); // Limit results for performance

        res.json({ success: true, hospitals });
    } catch (error) {
        logger.error(`Error searching for hospitals:`, error);
        next(error);
    }
});

/**
 * @route   GET /api/hospital-admin/requests/:hospitalId
 * @desc    Get all pending professional affiliation requests for the admin's hospital
 * @access  Private (Hospital Admin only)
 */
router.get('/requests/:hospitalId', async (req, res, next) => {
    try {
        const { hospitalId } = req.params;
        const requests = await User.find({
            requestedHospitalId: hospitalId,
            professionalStatus: { $in: ['pending', 'verifying'] }
        }).select('address name role professionalStatus');

        res.json({ success: true, data: requests });
    } catch (error) {
        logger.error(`Error fetching affiliation requests:`, error);
        next(error);
    }
});

/**
 * @route   GET /api/hospital-admin/professionals/:hospitalId
 * @desc    Get all verified professionals for the admin's hospital, excluding the admin themselves.
 * @access  Private (Hospital Admin only)
 */
router.get('/professionals/:hospitalId', async (req, res, next) => {
    try {
        const { hospitalId } = req.params;

        // --- [THE DEFINITIVE FIX] ---
        // Step 1: Find the hospital record to get the admin's address.
        const hospital = await Hospital.findOne({ hospitalId: hospitalId });

        // If the hospital doesn't exist, there are no professionals to return.
        if (!hospital) {
            return res.json({ success: true, data: [] });
        }

        // Step 2: Get the admin's address from the hospital document.
        // Based on your provided data, this field is `adminAddress`.
        const adminAddress = hospital.adminAddress;

        // Step 3: Construct a query to find all users for this hospital
        // while explicitly excluding the admin's address.
        const query = {
            hospitalId: hospitalId,
            professionalStatus: { $in: ['approved', 'revoking'] },
            address: { $ne: adminAddress } // Exclude the admin by their specific address
        };
        // --- [END FIX] ---

        const professionals = await User.find(query).select('address name role professionalStatus');

        res.json({ success: true, data: professionals });
    } catch (error) {
        logger.error(`Error fetching professionals:`, error);
        next(error);
    }
});


/**
 * @route   POST /api/hospital-admin/verify-professional
 * @desc    Verifies a professional by assigning them a role via the smart contract.
 * @access  Private (Hospital Admin only)
 */
router.post('/verify-professional', async (req, res, next) => {
    const { professionalAddress, hospitalId, role } = req.body;

    if (!professionalAddress || hospitalId === undefined || hospitalId === null || !role) {
        return res.status(400).json({ success: false, message: 'Professional address, hospital ID, and role are required.' });
    }

    try {
        logger.info(`Verification process started for professional: ${professionalAddress}`);

        const user = await User.findOneAndUpdate(
            { address: professionalAddress, requestedHospitalId: hospitalId, professionalStatus: 'pending' },
            { $set: { professionalStatus: 'verifying' } },
            { new: true }
        );

        if (!user) {
            logger.warn(`Professional ${professionalAddress} is not in a pending state for this hospital.`);
            return res.status(409).json({ success: false, message: 'Request is not pending or does not exist.' });
        }

        const tx = await ethersService.assignRole(professionalAddress, hospitalId, role);
        logger.info(`Transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);

        await tx.wait(1);
        logger.info(`Transaction confirmed. The indexer will now handle the final 'approved' status.`);

        res.json({ success: true, message: 'Professional verification transaction was successfully confirmed.' });

    } catch (error) {
        logger.error(`On-chain verification failed for professional ${professionalAddress}:`, error);
        
        await User.findOneAndUpdate(
            { address: professionalAddress },
            { $set: { professionalStatus: 'pending' } } // Revert status
        );

        const reason = error.reason || 'An error occurred during the blockchain transaction.';
        res.status(500).json({ success: false, message: reason });
    }
});

/**
 * @route   POST /api/hospital-admin/revoke-professional
 * @desc    Revokes a professional's role via the smart contract.
 * @access  Private (Hospital Admin only)
 */
router.post('/revoke-professional', async (req, res, next) => {
    const { professionalAddress, role } = req.body;

    if (!professionalAddress || !role) {
        return res.status(400).json({ success: false, message: 'Professional address and role are required.' });
    }

    try {
        logger.info(`Revocation process started for professional: ${professionalAddress}`);
        
        const user = await User.findOneAndUpdate(
            { address: professionalAddress, professionalStatus: 'approved' },
            { $set: { professionalStatus: 'revoking' } },
            { new: true }
        );

        if (!user) {
            logger.warn(`Professional ${professionalAddress} is not in an approved state.`);
            return res.status(409).json({ success: false, message: 'Professional is not approved or does not exist.' });
        }

        const tx = await ethersService.revokeRole(professionalAddress, role);
        logger.info(`Transaction sent. Hash: ${tx.hash}. Waiting for confirmation...`);

        await tx.wait(1);
        logger.info(`Transaction confirmed. The indexer will now handle the final 'revoked' status.`);

        res.json({ success: true, message: 'Professional revocation transaction was successfully confirmed.' });

    } catch (error) {
        logger.error(`On-chain revocation failed for professional ${professionalAddress}:`, error);

        await User.findOneAndUpdate(
            { address: professionalAddress },
            { $set: { professionalStatus: 'approved' } } // Revert status
        );

        const reason = error.reason || 'An error occurred during the blockchain transaction.';
        res.status(500).json({ success: false, message: reason });
    }
});


module.exports = router;

