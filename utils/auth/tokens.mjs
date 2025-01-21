import jwt from 'jsonwebtoken';



export function generateToken(user) {
    return jwt.sign(user, process.env.JWT_SECRET, {expiresIn: "30d"} );
}

export function verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}