const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
    hospitalId: {
        type: Number,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    adminAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;
