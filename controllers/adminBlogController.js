const dns = require("node:dns").promises;
const net = require("node:net");
const db = require("../config/db");

const MAX_HTML_BYTES = 1_500_000;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code) => {
      if (code[0] === "#") {
        const number = code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
        return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
      }
      return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[code.toLowerCase()] || entity;
    })
    .trim();
}

function isPublicIp(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    const [first, second] = parts;
    return !(first === 0 || first === 10 || first === 127 || first >= 224 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 100 && second >= 64 && second <= 127));
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return normalized !== "::" && normalized !== "::1" &&
      !normalized.startsWith("fc") && !normalized.startsWith("fd") &&
      !/^fe[89ab]/.test(normalized) && !normalized.startsWith("::ffff:127.") &&
      !normalized.startsWith("::ffff:10.") && !normalized.startsWith("::ffff:192.168.");
  }
  return false;
}

async function validatePublicUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || ""));
  } catch {
    throw new Error("Link bài viết không hợp lệ.");
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("Link phải dùng HTTP/HTTPS và không chứa thông tin đăng nhập.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Không thể lấy thông tin từ địa chỉ nội bộ.");
  }
  const literalIp = net.isIP(hostname);
  const addresses = literalIp ? [{ address: hostname }] : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("Link không trỏ tới máy chủ công khai.");
  }
  return parsed;
}

function readMetaTags(html) {
  const meta = {};
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = {};
    for (const attribute of tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes[attribute[1].toLowerCase()] = attribute[2] ?? attribute[3] ?? attribute[4] ?? "";
    }
    const key = (attributes.property || attributes.name || attributes.itemprop || "").toLowerCase();
    if (key && attributes.content && !meta[key]) meta[key] = decodeEntities(attributes.content);
  }
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const headingTag = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = meta["og:title"] || meta["twitter:title"] ||
    (titleTag ? decodeEntities(titleTag[1].replace(/<[^>]*>/g, "")) : "") ||
    (headingTag ? decodeEntities(headingTag[1].replace(/<[^>]*>/g, "")) : "");
  const firstParagraph = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => decodeEntities(match[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ")))
    .find((paragraph) => paragraph.length >= 40) || "";
  const description = meta["og:description"] || meta.description || meta["twitter:description"] || firstParagraph;
  const articleImage = html.match(/<(?:article|main)\b[^>]*>[\s\S]{0,12000}?<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
  const image = meta["og:image"] || meta["og:image:url"] || meta["twitter:image"] ||
    (articleImage ? (articleImage[1] || articleImage[2] || articleImage[3]) : "");
  return { title, description: description.slice(0, 500), image };
}

async function fetchArticleMetadata(sourceUrl) {
  let currentUrl = sourceUrl;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const parsedUrl = await validatePublicUrl(currentUrl);
    const response = await fetch(parsedUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "PdunFotoBlogPreview/1.0", Accept: "text/html,application/xhtml+xml" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 3) throw new Error("Link chuyển hướng quá nhiều lần.");
      currentUrl = new URL(location, parsedUrl).href;
      continue;
    }
    if (!response.ok) throw new Error(`Trang bài viết trả về lỗi HTTP ${response.status}.`);
    if (!(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) {
      throw new Error("Link không trỏ tới trang HTML.");
    }
    const declaredLength = Number(response.headers.get("content-length")) || 0;
    if (declaredLength > MAX_HTML_BYTES) throw new Error("Trang nguồn quá lớn để đọc metadata.");

    const reader = response.body.getReader();
    const chunks = [];
    let bytesRead = 0;
    while (bytesRead < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value.subarray(0, MAX_HTML_BYTES - bytesRead);
      chunks.push(chunk);
      bytesRead += chunk.byteLength;
      if (chunk.byteLength < value.byteLength) break;
    }
    await reader.cancel();
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    const metadata = readMetaTags(html);
    let image = "";
    if (metadata.image) {
      try {
        const imageUrl = new URL(metadata.image, parsedUrl);
        if (["http:", "https:"].includes(imageUrl.protocol) && !imageUrl.username && !imageUrl.password) image = imageUrl.href;
      } catch {
        image = "";
      }
    }
    return {
      ...metadata,
      sourceUrl: parsedUrl.href,
      image,
    };
  }
  throw new Error("Không thể đọc metadata của link này.");
}

function createSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 240);
}

function safeArticleContent(content, excerpt, sourceUrl) {
  const body = String(content || excerpt || "").trim();
  const paragraphs = body.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const html = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("\n");
  return sourceUrl
    ? `${html}<p><a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Xem bài viết gốc</a></p>`
    : html;
}

exports.previewArticle = async (req, res) => {
  try {
    const metadata = await fetchArticleMetadata(req.body.url);
    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(400).json({ success: false, message: error.name === "TimeoutError" ? "Trang nguồn phản hồi quá chậm." : error.message || "Không thể đọc metadata từ link này." });
  }
};

exports.listPosts = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.post_id AS id, p.title, p.slug, p.excerpt, p.content,
        p.feature_image AS featureImage,
         p.category_id AS categoryId, category.name AS categoryName, p.author_name AS authorName,
         p.reading_time AS readingTime, p.status, p.created_at AS createdAt,
         source.source_url AS sourceUrl
       FROM blog_posts p
       LEFT JOIN blog_categories category ON category.category_id = p.category_id
       LEFT JOIN blog_post_sources source ON source.post_id = p.post_id
       ORDER BY p.updated_at DESC, p.post_id DESC`,
    );
    res.json({ success: true, data: rows.map((row) => ({
      ...row,
      plainContent: String(row.content || "").replace(/<\/(?:p|div|h[1-6]|li)>/gi, "\n").replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'"),
    })) });
  } catch (error) {
    console.error("Lỗi tải bài blog quản trị:", error);
    res.status(500).json({ success: false, message: "Không thể tải danh sách bài blog." });
  }
};

exports.createPost = async (req, res) => savePost(req, res, null);
exports.updatePost = async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ success: false, message: "Mã bài viết không hợp lệ." });
  return savePost(req, res, Number(req.params.id));
};

async function savePost(req, res, postId) {
  const { title, sourceUrl, featureImage, excerpt, content, categoryId, authorName, status = "draft" } = req.body;
  if (typeof title !== "string" || !title.trim() || title.trim().length > 255 ||
      typeof excerpt !== "string" || !excerpt.trim() || excerpt.length > 5000 ||
      typeof content !== "string" || content.length > 30000 ||
      !["draft", "published"].includes(status)) {
    return res.status(400).json({ success: false, message: "Vui lòng nhập tiêu đề, đoạn giới thiệu, nội dung và trạng thái hợp lệ." });
  }

  let validatedSource = null;
  if (String(sourceUrl || "").trim()) {
    try {
      validatedSource = await validatePublicUrl(sourceUrl);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  } else if (!postId) {
    return res.status(400).json({ success: false, message: "Vui lòng nhập link bài báo." });
  }
  let validatedImage = null;
  if (featureImage) {
    try {
      const imageUrl = new URL(featureImage);
      if (!['http:', 'https:'].includes(imageUrl.protocol) || imageUrl.username || imageUrl.password) throw new Error();
      validatedImage = imageUrl.href;
    } catch {
      return res.status(400).json({ success: false, message: "Link ảnh đại diện không hợp lệ." });
    }
  }

  const categoryValue = categoryId ? Number(categoryId) : null;
  if (categoryValue !== null && (!Number.isInteger(categoryValue) || categoryValue < 1)) {
    return res.status(400).json({ success: false, message: "Danh mục không hợp lệ." });
  }
  const titleValue = title.trim();
  const slug = createSlug(titleValue);
  if (!slug) return res.status(400).json({ success: false, message: "Không thể tạo đường dẫn từ tiêu đề." });
  const safeContent = safeArticleContent(content, excerpt, validatedSource?.href || "");
  const readingTime = Math.max(1, Math.ceil((String(content || excerpt).trim().split(/\s+/).length || 1) / 200));

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    let savedId = postId;
    if (postId) {
      const [result] = await connection.execute(
        `UPDATE blog_posts SET title = ?, slug = ?, excerpt = ?, content = ?, feature_image = ?,
           category_id = ?, author_name = ?, reading_time = ?, status = ? WHERE post_id = ?`,
        [titleValue, slug, excerpt.trim(), safeContent, validatedImage, categoryValue,
          String(authorName || "").trim().slice(0, 120) || null, readingTime, status, postId],
      );
      if (!result.affectedRows) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: "Không tìm thấy bài viết." });
      }
    } else {
      const [result] = await connection.execute(
        `INSERT INTO blog_posts (title, slug, excerpt, content, feature_image, category_id, author_name, reading_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [titleValue, slug, excerpt.trim(), safeContent, validatedImage, categoryValue,
          String(authorName || "").trim().slice(0, 120) || null, readingTime, status],
      );
      savedId = result.insertId;
    }
    if (validatedSource) {
      await connection.execute(
        `INSERT INTO blog_post_sources (post_id, source_url) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE source_url = VALUES(source_url)`,
        [savedId, validatedSource.href],
      );
    }
    await connection.commit();
    res.status(postId ? 200 : 201).json({ success: true, message: postId ? "Đã cập nhật bài viết." : "Đã tạo bài viết.", data: { id: savedId, slug } });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi lưu bài blog:", error);
    res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({ success: false, message: error.code === "ER_DUP_ENTRY" ? "Đã có bài viết dùng đường dẫn này." : "Không thể lưu bài viết." });
  } finally {
    if (connection) connection.release();
  }
}

exports.deletePost = async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ success: false, message: "Mã bài viết không hợp lệ." });
  try {
    const [result] = await db.execute("DELETE FROM blog_posts WHERE post_id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết." });
    res.json({ success: true, message: "Đã xóa bài viết." });
  } catch (error) {
    console.error("Lỗi xóa bài blog:", error);
    res.status(500).json({ success: false, message: "Không thể xóa bài viết." });
  }
};

exports.listCategories = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT category_id AS id, name, slug FROM blog_categories ORDER BY name");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Lỗi tải danh mục blog:", error);
    res.status(500).json({ success: false, message: "Không thể tải danh mục blog." });
  }
};
