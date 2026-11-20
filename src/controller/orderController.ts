import { Request, Response } from "express";
import { randomInt } from "crypto";
import { isValidObjectId } from "mongoose";
import { OrderModel, OrderStatus, BookFormat, IOrderItem } from "../model/orderModel";
import { BookModel } from "../model/bookModel";

export interface AuthRequest extends Request {
  user?: { id: string; role: "ADMIN" | "USER"; name?: string; email?: string };
}

const FREE_SHIPPING_THRESHOLD = 50;
const SHIPPING_FEE = 5.95;
const TAX_RATE = 0.08;
const STATUSES: OrderStatus[] = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];
const FORMATS: BookFormat[] = ["Hardcover", "Paperback", "Clothbound Collector"];

const round2 = (n: number) => Math.round(n * 100) / 100;

const generateOrderNumber = async (): Promise<string> => {
  for (let i = 0; i < 5; i++) {
    const num = `BN-${randomInt(100000, 1000000)}`;
    if (!(await OrderModel.exists({ orderNumber: num }))) return num;
  }
  return `BN-${Date.now()}`;
};

const restock = async (items: { book: any; quantity: number }[]) => {
  for (const it of items) {
    await BookModel.updateOne(
      { _id: it.book },
      { $inc: { stock: it.quantity }, $set: { inStock: true } }
    );
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { items, paymentMethod, shippingAddress, customer } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }
    if (!paymentMethod) {
      return res.status(400).json({ message: "Payment method is required" });
    }
    const addr = shippingAddress ?? {};
    if (!addr.fullName || !addr.address || !addr.city || !addr.postalCode) {
      return res.status(400).json({ message: "Incomplete shipping address" });
    }
    const cust = {
      name: customer?.name ?? req.user?.name ?? addr.fullName,
      email: customer?.email ?? req.user?.email,
    };
    if (!cust.email) {
      return res.status(400).json({ message: "Customer email is required" });
    }

    const orderItems: IOrderItem[] = [];
    for (const line of items) {
      const quantity = Number(line.quantity);
      if (
        !isValidObjectId(line.bookId) ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        !FORMATS.includes(line.format)
      ) {
        return res.status(400).json({ message: "Invalid order item" });
      }

      const book: any = await BookModel.findById(line.bookId);
      if (!book) {
        return res.status(404).json({ message: `Book not found: ${line.bookId}` });
      }

      const formatObj = book.formats?.find((f: any) => f.format === line.format);
      const price = formatObj ? formatObj.price : book.price;

      orderItems.push({
        book: book._id,
        title: book.title,
        author: book.author,
        coverImage: book.coverImage,
        quantity,
        price,
        format: line.format,
      });
    }

    const reserved: { book: any; quantity: number }[] = [];
    for (const it of orderItems) {
      const updated: any = await BookModel.findOneAndUpdate(
        { _id: it.book, stock: { $gte: it.quantity } },
        { $inc: { stock: -it.quantity } },
        { new: true }
      );
      if (!updated) {
        await restock(reserved);
        return res
          .status(400)
          .json({ message: `Not enough stock for "${it.title}"` });
      }
      reserved.push({ book: it.book, quantity: it.quantity });
      if (updated.stock <= 0 && updated.inStock) {
        updated.inStock = false;
        await updated.save();
      }
    }

    const subtotal = round2(
      orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0)
    );
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const tax = round2(subtotal * TAX_RATE);
    const total = round2(subtotal + shipping + tax);

    try {
      const order = await OrderModel.create({
        user: userId,
        orderNumber: await generateOrderNumber(),
        customer: cust,
        items: orderItems,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "Pending" : "Paid",
        shippingAddress: {
          fullName: addr.fullName,
          address: addr.address,
          city: addr.city,
          postalCode: addr.postalCode,
          phone: addr.phone,
        },
        subtotal,
        shipping,
        tax,
        total,
        status: "Pending",
      });
      return res.status(201).json({ message: "Order placed", data: order });
    } catch (err) {
      await restock(reserved);
      throw err;
    }
  } catch (err) {
    console.error("createOrder error:", err);
    return res.status(500).json({ message: "Failed to place order" });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const orders = await OrderModel.find({ user: userId }).sort({ createdAt: -1 });
    return res.json({ data: orders });
  } catch (err) {
    console.error("getMyOrders error:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await OrderModel.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const isOwner = String(order.user) === req.user?.id;
    if (!isOwner && req.user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.json({ data: order });
  } catch (err) {
    console.error("getOrderById error:", err);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
};

export const getAllOrders = async (_req: AuthRequest, res: Response) => {
  try {
    const orders = await OrderModel.find().sort({ createdAt: -1 });
    return res.json({ data: orders });
  } catch (err) {
    console.error("getAllOrders error:", err);
    return res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await OrderModel.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (status === "Cancelled" && order.status !== "Cancelled") {
      await restock(order.items);
    }

    order.status = status;
    if (status === "Delivered" && order.paymentStatus === "Pending") {
      order.paymentStatus = "Paid";
    }
    await order.save();

    return res.json({ message: "Order status updated", data: order });
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    return res.status(500).json({ message: "Failed to update order" });
  }
};

export const cancelMyOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await OrderModel.findOne({ _id: id, user: req.user?.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "Only pending orders can be cancelled" });
    }

    await restock(order.items);
    order.status = "Cancelled";
    await order.save();

    return res.json({ message: "Order cancelled", data: order });
  } catch (err) {
    console.error("cancelMyOrder error:", err);
    return res.status(500).json({ message: "Failed to cancel order" });
  }
};
