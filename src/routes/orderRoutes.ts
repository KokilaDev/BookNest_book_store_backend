import { Router, Response, NextFunction } from "express";
import {
  AuthRequest,
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelMyOrder,
} from "../controller/orderController";
import { authenticate } from "../middleware/auth";

const router = Router();

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

router.use(authenticate);

router.post("/", createOrder);
router.get("/my", getMyOrders);
router.patch("/:id/cancel", cancelMyOrder);

router.get("/", requireAdmin, getAllOrders);
router.patch("/:id/status", requireAdmin, updateOrderStatus);

router.get("/:id", getOrderById);

export default router;
