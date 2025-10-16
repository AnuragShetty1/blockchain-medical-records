const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true,
    },
    name: {
        type: String,
    },
    // The user's on-chain role (e.g., Patient, Doctor)
    role: {
        type: String,
        enum: ['Patient', 'Doctor', 'LabTechnician', 'HospitalAdmin', 'SuperAdmin', 'Unassigned'],
        default: 'Unassigned',
    },
    // The user's off-chain professional status for affiliation workflow
    professionalStatus: {
        type: String,
        enum: ['unaffiliated', 'pending', 'approved', 'rejected', 'revoked'],
        default: 'unaffiliated',
    },
    // Tracks if the user is verified on-chain by an admin
    isVerified: {
        type: Boolean,
        default: false,
    },
    // The ID of the hospital a professional is currently affiliated with
    hospitalId: {
        type: Number,
        default: null,
    },
    // The ID of the hospital a professional has requested to join
    requestedHospitalId: {
        type: Number,
        default: null,
    },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;