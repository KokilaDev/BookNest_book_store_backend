import { Request, Response } from "express"
import dotenv from "dotenv";
import { AuthRequest } from "../middleware/auth";
import { UserModel, UserRole } from "../model/userModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import { signAccessToken, signRefreshToken } from "../util/token";

dotenv.config();

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string

export const registerUser = async (req: Request, res: Response) => {
  try {

    const { name, email, password } = req.body;

    const existingUser = await UserModel.findOne({ email: email });

    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser = new UserModel({
        name,
        email,
        password: hashedPassword,
        role: [UserRole.USER],
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    res.status(500).json({ 
        message: "Server error", 
        error: error 
    });
  }
}

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);

        return res.status(200).json({
            message: "Login successful",
            data: {
                email: user.email,
                role: user.role,
                accessToken,
                refreshToken,
                id: user._id,
                name: user.name,
            },
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error,
        });
    }
}

export const getMyDetails = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;

        const user = await UserModel.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Ok",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                avatar: user.avatar,
                joinedDate: user.joinedDate,
                ordersCount: user.ordersCount,
                phone: user.phone,
                address: user.address,
                city: user.city,
                postalCode: user.postalCode,
                yearlyGoal: user.yearlyGoal,
                tier: user.tier,
                memberSince: user.memberSince,
            },
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to get user details",
            error: error,
        });
    }
}

export const updateMyDetails = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;

        const { 
            name,
            email,
            phone,
            address,
            city,
            postalCode,
            yearlyGoal,
            tier,
            memberSince,
        } = req.body;

        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { name, email, phone, address, city, postalCode, yearlyGoal, tier, memberSince },
            { new: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        res.status(200).json({
            success: true,
            message: "User details updated successfully",
            data: updatedUser,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update user details",
            error: error,
        });
    }
}

export const registerAdmin = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await UserModel.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: "Admin already exists" });
        }

        const hash = await bcrypt.hash(password, 10);

        const user = await UserModel.create({
            name,
            email,
            password: hash,
            role: [UserRole.ADMIN],
        });

        res.status(201).json({
            message: "Admin registered successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to register admin",
            error: error,
        });
    }
}

export const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token is required" });
        }

        const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        const userId = payload.sub;

        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newAccessToken = signAccessToken(user);

        return res.status(200).json({
            message: "Access token refreshed successfully",
            data: {
                accessToken: newAccessToken,
            },
        });

    } catch (error) {
        return res.status(401).json({ 
            message: "Invalid or expired refresh token", 
            error: error 
        });
    }
}

export const logout = async (req: Request, res: Response) => {
    try {
        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        return res.status(500).json({
            message: "Logout failed",
            error: error,
        });
    }
}