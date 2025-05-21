import express from 'express'
import { getUser, getUsers, updateUser } from '../controllers/userController.mjs'
import multer from 'multer'
import { userLogin, userSignup } from '../controllers/userAuthControllers.mjs'

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const uploadConfig = upload.fields([
    {name: 'ghana_card_image_front', maxCount: 1},
    {name: 'ghana_card_image_back', maxCount: 1}
])


const userRouter = express.Router()

userRouter.get('/user/:id', getUser)
userRouter.get('/users', getUsers)
userRouter.put('/user/:id', updateUser)
userRouter.post('/user/signup',uploadConfig,userSignup)
userRouter.post('/user/login', userLogin)

export default userRouter