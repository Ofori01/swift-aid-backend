import express from 'express'
import { getUser, getUsers, updateUser } from '../controllers/userController.mjs'

const route = express.Router()

route.get('user/:id', getUser)
route.get('users', getUsers)
route.put('user/:id', updateUser)

export default route