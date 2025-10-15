const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    recordId: {
        type: Number,
        required: true,
        unique: true,
        index: true,
    },
    patientAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true,
    },
    ipfsHash: {
        type: String,
        required: true,
    },
    uploadedBy: {
        type: String,
        required: true,
        lowercase: true,
    },
}, { timestamps: true });

const Record = mongoose.model('Record', recordSchema);

module.exports = Record;
