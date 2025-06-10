import { io } from "../../server/index.mjs"


//join room whether personal or emergency. Room is identified by either userId or emergencyID
export function joinRoomEvent(socket){
    return socket.on("join-room", ({roomId})=> {
        socket.join(roomId)
    })
}

// when responder shares eta
export function updateEtaEvent(socket){
    return socket.on('update-eta', ({emergencyId,responderId, eta})=> {
        io.to(emergencyId).emit('eta-update', {responderId, eta})
    })
}

//when responder accepts emergency requests
export function notifyOnAcceptance(socket){
    return socket.on("emergency-accepted", ({emergencyId, responderId})=>{
        io.to(emergencyId).emit('emergency-accepted',{responderId})
    })
}

//responder emergency assignment. Server emit event
export function assignEmergencyEvent(responderId, details){
    return io.to(responderId).emit('emergency-assigned', details)
}
