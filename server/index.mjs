import express from 'express';
import { configDotenv } from 'dotenv';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { createServer } from "http";
import { Server } from 'socket.io';
import adminRouter from '../microservices/admin-actions-dev/routes/adminRoute.mjs';
import userRouter from '../microservices/user-management/routes/userRoute.mjs';
import responderAuth from '../microservices/responder-management/routes/auth.mjs';
import responders from '../microservices/responder-management/routes/responders.mjs';
import emergencyRequestRouter from '../microservices/emergency-requests-management/routes/emergency-request.mjs';


const app = express()
app.use(express.json())

app.use(adminRouter)
app.use(userRouter)
app.use(responderAuth)
app.use(responders)
app.use("/emergency",emergencyRequestRouter)

const httpServer = createServer(app);
configDotenv()


const io = new Server(httpServer, { /* options */ });
app.set("io", io);
io.on("connection", (socket) => {
  // ...
  console.log("Socket Connected")
});

const PORT = process.env.ENVIRONMENT === 'production' ? process.env.PORT : process.env.LOCAL_PORT
httpServer.listen(PORT, ()=> {
    console.log("Server Started", `on port ${PORT} in ${process.env.ENVIRONMENT} mode`)
})

mongoose.connect(process.env.DATABASE_URL).then(
    ()=>{
        console.log('Database connected Successfully')
    }
).catch(
    (error)=>{
        console.error("Error connecting database\n",error)
    }
)


const db_connection = mongoose.connection;

//Initialize Grid Bucket
let bucket;

db_connection.once('open',  () => {
    bucket = new GridFSBucket(db_connection.db, { bucketName: 'uploads' });
});

export {bucket}


