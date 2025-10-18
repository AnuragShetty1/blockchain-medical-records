import mongoose from 'mongoose';

const accessRequestSchema = new mongoose.Schema({
    requestId: {
        type: Number,
        required: true,
        unique: true,
        index: true,
    },
    recordIds: [{
        type: Number,
        required: true,
    }],
    professionalAddress: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    patientAddress: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
}, { timestamps: true });

const AccessRequest = mongoose.model('AccessRequest', accessRequestSchema);

export default AccessRequest;
