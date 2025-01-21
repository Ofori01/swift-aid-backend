import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
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
    created_at:{
        type:mongoose.Schema.Types.Date,
        defaut:Date.now()
    },

}, {timestamps:true})

export default mongoose.model('User', userSchema)