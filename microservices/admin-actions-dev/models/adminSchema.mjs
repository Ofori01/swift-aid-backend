import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
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
        type: mongoose.Schema.Types.String
    },
    role: {
        type: String,
        default: "admin"
    },
    image: {
        type: mongoose.Schema.Types.ObjectId
    },
    badgeNumber: {
        required: true,
        type: mongoose.Schema.Types.String,
        unique: true
    }
});

const adminModel = mongoose.model('admin', AdminSchema);
export default adminModel;
