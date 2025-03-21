import mongoose from "mongoose";

const emergencyRequestSchema = new mongoose.Schema({
    request_id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    description: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Declined', 'Completed'],
        default: 'Pending'
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    assigned_admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    assigned_responders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Responder'
    }],
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    createdAt:{
        type:mongoose.Schema.Types.Date,
        default:Date.now()
    },
    updatedAt: {
        type: mongoose.Schema.Types.Date,
        default: Date.now()
        
    }
}, { timestamps: true });

emergencyRequestSchema.index({ location: '2dsphere' });
const emergencyRequestModel = mongoose.model("EmergencyRequest", emergencyRequestSchema);

export default emergencyRequestModel