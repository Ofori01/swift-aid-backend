import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        auto: true
    },
    name:{
        type:String,
        required:true
    },
    phone_number:{
        type:String,
        required:true
    },
    role:{
        type:String,
        default:"user"
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    ghana_card_number:{
        type:String,
        required:true
    },
    ghana_card_image_front:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    ghana_card_image_back:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    createdAt:{
        type:mongoose.Schema.Types.Date,
        default:Date.now()
    },
    updatedAt: {
        type: mongoose.Schema.Types.Date,
        default: Date.now()
        
    }

}, {timestamps:true})
const userModel = mongoose.model('User', userSchema) 
export default userModel