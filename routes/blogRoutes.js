const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blogController");

// Lấy danh sách bài viết (lọc theo category qua query ?category=slug)
router.get("/blogs", blogController.getPosts);

// Lấy danh sách danh mục (phải đặt TRƯỚC route /blogs/:slug)
router.get("/blogs/categories", blogController.getCategories);

// Lấy bài viết theo slug
router.get("/blogs/:slug", blogController.getPostBySlug);

// Tạo bài viết mới
router.post("/blogs", blogController.createPost);

// Cập nhật bài viết
router.put("/blogs/:id", blogController.updatePost);

// Xóa bài viết
router.delete("/blogs/:id", blogController.deletePost);

module.exports = router;