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
        //cannot be required because when user makes a request, they may not know the severity
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
    image:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'image'
    },
    emergency_type: {
        type: String,
        enum: ['Medical', 'Fire', 'Crime', 'Accident', 'Other', "Violence", "Rescue"],
        required: true,
        default: 'Other'
    },
    assigned_admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    assigned_responders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'responder'
    }],
    number_of_responders: {
        police_service: {
            type: Number,
            min: 0
        },
        fire_service: {
            type: Number,
            min: 0
        },
        ambulance_service: {
            type: Number,
            min: 0
        }
    },
    emergency_location: {
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
const emergencyRequestModel = mongoose.model("emergencyRequest", emergencyRequestSchema);

export default emergencyRequestModel