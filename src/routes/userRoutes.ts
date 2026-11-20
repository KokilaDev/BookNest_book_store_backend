import { Router } from "express";
import { 
    getMyDetails,
    login, 
    logout, 
    refreshToken, 
    registerAdmin, 
    registerUser, 
    updateMyDetails
} from "../controller/userController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post('/register', registerUser)

router.post('/login', login)

router.get('/me', authenticate, getMyDetails)

router.put('/profile', authenticate, updateMyDetails)

router.post(
    '/admin/register', 
    registerAdmin
)

router.post('/refresh-token', refreshToken)

router.post('/logout', authenticate, logout)

export default router;