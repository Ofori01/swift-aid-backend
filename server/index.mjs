import express from 'express';
import { configDotenv } from 'dotenv';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { createServer } from "http";
import { Server } from 'socket.io';


const app = express()
app.use(express.json())
const httpServer = createServer(app);
configDotenv()


const io = new Server(httpServer, { /* options */ });

io.on("connection", (socket) => {
  // ...
  console.log("Socket Connected")
});

const PORT = process.env.ENVIRONMENT === 'production' ? process.env.PORT : process.env.LOCAL_PORT
httpServer.listen(PORT, ()=> {
    console.log("Server Started")
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


