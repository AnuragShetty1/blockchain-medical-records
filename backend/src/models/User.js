const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true,
    },
    role: {
        type: String,
        enum: ['Patient', 'Doctor', 'LabTechnician', 'Admin', 'SuperAdmin', 'Unassigned'],
        default: 'Unassigned',
    },
    name: { // Optional, can be added later
        type: String,
    },
    hospitalId: { // Link to a hospital if they are staff
        type: Number,
    },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
