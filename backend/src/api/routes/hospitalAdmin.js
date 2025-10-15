const express = require('express');
const router = express.Router();
const Hospital = require('../../models/Hospital');
const User = require('../../models/User');
const logger = require('../../utils/logger');

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
 * @route   GET /api/hospital-admin/requests
 * @desc    Get all pending professional affiliation requests for the admin's hospital
 * @access  Private (Hospital Admin only)
 * @todo    Add JWT authentication middleware
 */
router.get('/requests/:hospitalId', async (req, res, next) => {
    try {
        const { hospitalId } = req.params;
        // In a real app, hospitalId would be derived from the admin's JWT
        const requests = await User.find({
            requestedHospitalId: hospitalId,
            professionalStatus: 'pending'
        }).select('address name role'); // Select only the fields needed for the UI

        res.json({ success: true, requests });
    } catch (error) {
        logger.error(`Error fetching affiliation requests:`, error);
        next(error);
    }
});

/**
 * @route   GET /api/hospital-admin/professionals
 * @desc    Get all verified professionals for the admin's hospital
 * @access  Private (Hospital Admin only)
 * @todo    Add JWT authentication middleware
 */
router.get('/professionals/:hospitalId', async (req, res, next) => {
    try {
        const { hospitalId } = req.params;
        // In a real app, hospitalId would be derived from the admin's JWT
        const professionals = await User.find({
            hospitalId: hospitalId,
            professionalStatus: 'approved'
        }).select('address name role');

        res.json({ success: true, professionals });
    } catch (error) {
        logger.error(`Error fetching professionals:`, error);
        next(error);
    }
});


module.exports = router;
