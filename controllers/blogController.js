const db = require("../config/db");

// Lấy danh sách bài viết (có thể lọc theo danh mục)
exports.getPosts = async (req, res) => {
    try {
        const category = String(req.query.category || '').trim();
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
        const offset = (page - 1) * limit;

        let query = `
            SELECT p.*, c.name as category_name, c.slug as category_slug 
            FROM blog_posts p
            LEFT JOIN blog_categories c ON p.category_id = c.category_id
            WHERE p.status = 'published'
        `;
        const params = [];

        if (category) {
            query += ' AND c.slug = ?';
            params.push(category);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [posts] = await db.query(query, params);

        // Lấy tổng số bài viết để tính số trang
        const [totalResult] = await db.query(
            `SELECT COUNT(*) as count FROM blog_posts p
             LEFT JOIN blog_categories c ON p.category_id = c.category_id
             WHERE p.status = 'published'${category ? ' AND c.slug = ?' : ''}`,
            category ? [category] : []
        );

        res.json({
            posts,
            totalPages: Math.ceil(totalResult[0].count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy danh sách danh mục
exports.getCategories = async (req, res) => {
    try {
        const [categories] = await db.query('SELECT category_id, name, slug FROM blog_categories ORDER BY category_id');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy bài viết theo slug
exports.getPostBySlug = async (req, res) => {
    try {
        const [posts] = await db.query(
            `SELECT p.*, c.name as category_name, c.slug as category_slug 
             FROM blog_posts p
             LEFT JOIN blog_categories c ON p.category_id = c.category_id
             WHERE p.slug = ? AND p.status = 'published'`,
            [req.params.slug]
        );

        if (posts.length === 0) {
            return res.status(404).json({ error: "Post not found" });
        }
        res.json(posts[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Tạo bài viết mới
exports.createPost = async (req, res) => {
    try {
        const { title, slug, excerpt, content, feature_image, category_id, author_name, reading_time, status } = req.body;

        const [result] = await db.query(
            `INSERT INTO blog_posts
             (title, slug, excerpt, content, feature_image, category_id, author_name, reading_time, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, slug, excerpt, content, feature_image, category_id, author_name, reading_time || 5, status || 'draft']
        );

        res.status(201).json({ post_id: result.insertId, message: "Post created" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Slug đã tồn tại, hãy dùng slug khác" });
        }
        res.status(500).json({ error: error.message });
    }
};

// Cập nhật bài viết
exports.updatePost = async (req, res) => {
    try {
        const { title, excerpt, content, feature_image, category_id, author_name, reading_time, status } = req.body;

        await db.query(
            `UPDATE blog_posts
             SET title=?, excerpt=?, content=?, feature_image=?, category_id=?, author_name=?, reading_time=?, status=? 
             WHERE post_id=?`,
            [title, excerpt, content, feature_image, category_id, author_name, reading_time, status, req.params.id]
        );

        res.json({ message: "Post updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa bài viết
exports.deletePost = async (req, res) => {
    try {
        await db.query('DELETE FROM blog_posts WHERE post_id=?', [req.params.id]);
        res.json({ message: "Post deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};