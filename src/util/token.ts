import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { IUser } from "../model/userModel"

dotenv.config()

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string

export const signAccessToken = (user: IUser): string => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            roles: user.role,
        },
        JWT_ACCESS_SECRET,
        { expiresIn: "30m" }
    )
}

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string

export const signRefreshToken = (user: IUser): string => {
    return jwt.sign(
        {
            id: user._id,
        },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
    )
}