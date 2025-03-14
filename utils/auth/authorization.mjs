import { verifyToken } from "./tokens.mjs"

export async function authorization(...role){
    return async function (req, res, next) {
        if (!req.token) return res.status(401).json({message: "Unauthorized"})
        const user = verifyToken(req.token) 
        if (!user) return res.status(401).json({message: "Unauthorized"})
        if (!role.includes(user.role)) return res.status(403).json({message: "Forbidden"})
        req.user = user
        next()
    }
}