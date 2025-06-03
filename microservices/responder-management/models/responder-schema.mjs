import mongoose, { mongo, Schema } from "mongoose";


const responderSchema = new Schema({
    responder_id : {
        type: mongoose.Schema.Types.ObjectId,
        auto : true
    },
    email: {
        required: true,
        type: mongoose.Schema.Types.String,
        unique: true
    },
    password: {
        required: true,
        type: mongoose.Schema.Types.String
    },
    phone: {
        required: true,
        type: mongoose.Schema.Types.String,
        unique: true
    },
    name: {
        required: true,
        type: mongoose.Schema.Types.String,

    },
    role: {
        type:String,
        default:"responder"
    },
    image: {
        // required: true,
        type: mongoose.Schema.Types.ObjectId
    },
    badgeNumber: {
        required: true,
        type: mongoose.Schema.Types.String,
        unique: true
    },
    agency: {
        required: true,
        type: mongoose.Schema.Types.String
    },
    agency_id: {
        required: true,
        type: mongoose.Schema.Types.String,
        ref: 'agencies'

    },
    status: {
        required: true,
        type: mongoose.Schema.Types.String,
        enum: ['available', 'unavailable']
    },
    current_location: {
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
    }
});

responderSchema.index({ current_location: '2dsphere' });
const responderModel = mongoose.model('responder', responderSchema);

export default responderModel