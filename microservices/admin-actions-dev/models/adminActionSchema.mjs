import mongoose from "mongoose";

const adminActionSchema = new mongoose.Schema({
    action_id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
    request_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'EmergencyRequest'
    },
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Admin'
    },
    action: {
        type: String,
        enum: ['accepted', 'declined', 'reassigned'],
        required: true
    },
    reason: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {timestamps:true});

const adminActionModel = mongoose.model('AdminActionModel', adminActionSchema);
export default adminActionModel;