import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { BookModel } from "../model/bookModel";

const generateBookId = async () => {
  const lastBook = await BookModel.findOne({ id: /^B-\d+$/ })
    .sort({ id: -1 })
    .select("id");

  let nextNumber = 1;

  if (lastBook?.id) {
    const lastNumber = parseInt(lastBook.id.split("-")[1], 10);
    if (!Number.isNaN(lastNumber)) nextNumber = lastNumber + 1;
  }

  return `B-${String(nextNumber).padStart(4, "0")}`;
};

const removeImageFile = (coverImage?: string) => {
  if (!coverImage || !coverImage.startsWith("/uploads/")) return;
  const filePath = path.join(process.cwd(), coverImage);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Failed to delete image:", err);
    }
  });
};

export const addBook = async (req: Request, res: Response) => {
  try {
    const {
      title,
      subtitle,
      author,
      category,
      price,
      description,
      pages,
      language,
      publishYear,
      publisher,
      isbn,
      inStock,
      stock,
      excerpt,
      dimensions,
      weight,
      newArrival,
      tags,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Cover image is required",
      });
    }

    const id = await generateBookId();
    const coverImage = `/uploads/${req.file.filename}`;

    const newBook = await BookModel.create({
      id,
      title,
      subtitle,
      author,
      category,
      price,
      coverImage,
      description,
      isbn,
      publisher,
      publishYear,
      pages,
      language,
      stock,
      inStock,
      rating: 0,
      reviewsCount: 0,
      excerpt: excerpt || description,
      formats: [{ format: "Paperback", price: Number(price) }],
      dimensions: dimensions || "",
      weight: weight || "",
      newArrival: newArrival || false,
      tags: tags || [],
    });

    res.status(201).json({
      success: true,
      message: "Book added successfully",
      data: newBook,
    });
  } catch (error: any) {
    if (req.file) removeImageFile(`/uploads/${req.file.filename}`);
    console.error("Error adding book:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add book",
      error: error.message,
    });
  }
};

export const getBooks = async (_req: Request, res: Response) => {
  try {
    const books = await BookModel.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Books retrieved successfully",
      data: books,
    });
  } catch (error: any) {
    console.error("Error retrieving books:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve books",
      error: error.message,
    });
  }
};

export const updateBook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await BookModel.findOne({ id });
    if (!existing) {
      if (req.file) removeImageFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const updates: Record<string, any> = {};

    const textFields = [
      "title", "subtitle", "author", "category", "description",
      "language", "publisher", "isbn", "dimensions", "weight",
      "excerpt", "badge",
    ];
    for (const field of textFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const numberFields = [
      "price", "originalPrice", "pages", "publishYear", "stock", "rating",
    ];
    for (const field of numberFields) {
      if (req.body[field] !== undefined && req.body[field] !== "") {
        updates[field] = Number(req.body[field]);
      }
    }

    for (const field of ["newArrival", "popular"]) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field] === true || req.body[field] === "true";
      }
    }

    if (req.body.tags !== undefined) {
      updates.tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : [req.body.tags];
    }

    if (updates.stock !== undefined) {
      updates.inStock = updates.stock > 0;
    }

    if (updates.price !== undefined) {
      updates.formats = existing.formats.map((f) =>
        f.format === "Paperback"
          ? { format: f.format, price: updates.price }
          : { format: f.format, price: f.price }
      );
    }

    const oldImage = existing.coverImage;
    if (req.file) {
      updates.coverImage = `/uploads/${req.file.filename}`;
    }

    const updated = await BookModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (req.file) removeImageFile(oldImage);

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      data: updated,
    });
  } catch (error: any) {
    if (req.file) removeImageFile(`/uploads/${req.file.filename}`);
    console.error("Error updating book:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update book",
      error: error.message,
    });
  }
};

export const updateStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stock = Number(req.body.stock);

    if (Number.isNaN(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock value",
      });
    }

    const updated = await BookModel.findOneAndUpdate(
      { id },
      { $set: { stock, inStock: stock > 0 } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error updating stock:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update stock",
      error: error.message,
    });
  }
};

export const deleteBook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await BookModel.findOneAndDelete({ id });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    removeImageFile(deleted.coverImage);

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
      data: deleted,
    });
  } catch (error: any) {
    console.error("Error deleting book:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete book",
      error: error.message,
    });
  }
};

export const getLatestBooks = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 50);

    const books = await BookModel.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      message: "Latest books retrieved successfully",
      data: books,
    });
  } catch (error: any) {
    console.error("Error retrieving latest books:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve latest books",
      error: error.message,
    });
  }
};