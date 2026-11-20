import { Schema, model, Document, Types } from "mongoose";

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type BookFormat = "Hardcover" | "Paperback" | "Clothbound Collector";

export interface IOrderItem {
  book: Types.ObjectId;
  title: string;
  author: string;
  coverImage: string;
  quantity: number;
  price: number;
  format: BookFormat;
}

export interface IOrder extends Document {
  user: Types.ObjectId; // the customer who placed the order
  orderNumber: string;
  customer: { name: string; email: string };
  items: IOrderItem[];
  paymentMethod: string;
  paymentStatus: "Paid" | "Pending" | "Failed";
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    phone?: string;
  };
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    book: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    coverImage: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // unit price at purchase time
    format: {
      type: String,
      enum: ["Hardcover", "Paperback", "Clothbound Collector"],
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
    items: {
      type: [orderItemSchema],
      validate: [(v: unknown[]) => v.length > 0, "Order must have items"],
    },
    paymentMethod: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Failed"],
      default: "Pending",
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      phone: { type: String },
    },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

orderSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    ret.id = String(ret._id);
    ret.date = ret.createdAt
      ? new Date(ret.createdAt).toISOString().split("T")[0]
      : "";
    ret.user = String(ret.user);
    ret.items = (ret.items ?? []).map(({ book, ...rest }: any) => ({
      bookId: String(book),
      ...rest,
    }));
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const OrderModel = model<IOrder>("Order", orderSchema);