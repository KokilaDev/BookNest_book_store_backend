import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import userRoutes from "./routes/userRoutes";
import bookRoutes from "./routes/bookRoutes";
import orderRoutes from "./routes/orderRoutes";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend Running...");
    console.log(req);
});

app.use("/uploads", express.static("uploads"));

app.use("/auth", userRoutes);
app.use("/books", bookRoutes);
app.use("/orders", orderRoutes);

connectDB();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});