import { Document, model, Schema } from "mongoose"

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: UserRole[]
  status:
    | 'active'
    | 'inactive'
  avatar?: string
  joinedDate: string
  ordersCount: number
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  yearlyGoal?: {
    current: number
    target: number
  };
  tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  memberSince?: string
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: [String], enum: Object.values(UserRole), default: [UserRole.USER] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    avatar: { type: String },
    joinedDate: { type: String, default: () => new Date().toISOString() },
    ordersCount: { type: Number, default: 0 },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    postalCode: { type: String },
    yearlyGoal: {
      current: { type: Number, default: 0 },
      target: { type: Number, default: 0 },
    },
    tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },
    memberSince: { type: String, default: () => new Date().toISOString() },
  }
)

export const UserModel = model<IUser>('User', userSchema)