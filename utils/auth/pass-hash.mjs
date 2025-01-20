import bcrypt from 'bcryptjs'

export function generatePasswordHash(password) {
    return bcrypt.hashSync(password, 10)
}

export function comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash)
}
