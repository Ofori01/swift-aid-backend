import mongoose, { Schema } from "mongoose";

const agencySchema = new mongoose.Schema({
    agency_id : {
        type: mongoose.Schema.Types.ObjectId,
        auto : true
    },
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    name: {
        required: true,
        type: mongoose.Schema.Types.String
    },
    branch: {
        required: true,
        type: mongoose.Schema.Types.String
    },
    agency_type: {
        required: true,
        type: String,
        enum : ['Police', 'Fire service', 'Ambulance', 'Nadmo']

    },
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
    }
});

agencySchema.index({ location: '2dsphere' });

export default mongoose.model('agencies', agencySchema);