const mongoose = require('mongoose');

const accessGrantSchema = new mongoose.Schema({
    recordId: {
        type: Number,
        required: true,
        index: true,
    },
    patientAddress: {
        type: String,
        required: true,
        lowercase: true,
    },
    professionalAddress: {
        type: String,
        required: true,
        lowercase: true,
        index: true,
    },
}, { 
    timestamps: { createdAt: true, updatedAt: false },
    // Create a compound index to ensure a professional can't have duplicate access
    // to the same record.
    unique: ['recordId', 'professionalAddress']
});

const AccessGrant = mongoose.model('AccessGrant', accessGrantSchema);

module.exports = AccessGrant;
