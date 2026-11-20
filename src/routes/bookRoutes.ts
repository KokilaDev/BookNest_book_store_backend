import { Router } from "express";
import {
  addBook,
  getBooks,
  getLatestBooks,
  updateBook,
  updateStock,
  deleteBook,
} from "../controller/bookController";
import { upload } from "../middleware/upload";

const router = Router();

router.get("/", getBooks);
router.get("/latest", getLatestBooks);

router.post("/add", upload.single("coverImage"), addBook);

router.patch("/:id/stock", updateStock);
router.put("/:id", upload.single("coverImage"), updateBook);
router.delete("/:id", deleteBook);

export default router;