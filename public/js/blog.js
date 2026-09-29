const API_BASE = '/api';

const PLACEHOLDER_IMG = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
        <rect width="800" height="450" fill="#e5e5e5"/>
        <circle cx="400" cy="210" r="60" fill="#d0d0d0"/>
        <rect x="340" y="285" width="120" height="90" fill="#d0d0d0" rx="10"/>
        <circle cx="360" cy="330" r="12" fill="#cfcfcf"/>
        <circle cx="440" cy="330" r="12" fill="#cfcfcf"/>
        <text x="400" y="400" text-anchor="middle" font-family="Montserrat, sans-serif" font-size="22" fill="#aaaaaa" font-weight="600">PDUN</text>
    </svg>`
);

const SAMPLE_BLOG_IMAGES = [
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1000&q=85',
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=85',
];

function resolveBlogImage(source) {
    if (!source) return PLACEHOLDER_IMG;
    const sampleMatch = String(source).match(/\/images\/blog\/blog-(\d+)\.jpg$/);
    if (sampleMatch) {
        return SAMPLE_BLOG_IMAGES[(Number(sampleMatch[1]) - 1) % SAMPLE_BLOG_IMAGES.length];
    }
    return source;
}

// ============ BLOG LIST PAGE ============
async function loadBlogList() {
    const blogGrid = document.getElementById('blog-grid');
    const categoryTabs = document.getElementById('category-tabs');

    if (!blogGrid) return;

    const urlParams = new URLSearchParams(window.location.search);
    const currentCategory = urlParams.get('category');

    // Load danh mục
    try {
        const catRes = await fetch(`${API_BASE}/blogs/categories`);
        const categories = await catRes.json();

        categoryTabs.innerHTML = `
            <a href="/pages/blogs.html" class="category-tab ${!currentCategory ? 'active' : ''}">Tất cả</a>
            ${categories.map(cat => `
                <a href="/pages/blogs.html?category=${cat.slug}" 
                   class="category-tab ${currentCategory === cat.slug ? 'active' : ''}">
                    ${cat.name}
                </a>
            `).join('')}
        `;
    } catch (error) {
        console.error('Lỗi tải danh mục:', error);
    }

    // Load bài viết
    try {
        const postsRes = await fetch(`${API_BASE}/blogs${currentCategory ? '?category=' + currentCategory : ''}`);
        const data = await postsRes.json();

        if (data.posts.length === 0) {
            blogGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <h3>Chưa có bài viết</h3>
                    <p>Hiện tại chưa có bài viết nào trong danh mục này.</p>
                </div>
            `;
            return;
        }

        blogGrid.innerHTML = data.posts.map(post => `
            <a href="/pages/blog-detail.html?slug=${post.slug}" class="blog-card">
                <img src="${resolveBlogImage(post.feature_image)}"
                     alt="${escapeHtml(post.title)}" class="blog-card-image" 
                     onerror="this.onerror=null; this.src=PLACEHOLDER_IMG">
                <div class="blog-card-content">
                    <div class="blog-card-meta">
                        ${post.category_name ? `<span class="blog-card-category">${escapeHtml(post.category_name)}</span>` : ''}
                        <span>${formatDate(post.created_at)}</span>
                    </div>
                    <h3 class="blog-card-title">${escapeHtml(post.title)}</h3>
                    <p class="blog-card-excerpt">${escapeHtml(post.excerpt || '')}</p>
                </div>
            </a>
        `).join('');
    } catch (error) {
        console.error('Lỗi tải bài viết:', error);
        blogGrid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><h3>Lỗi tải dữ liệu</h3><p>Vui lòng kiểm tra server và thử lại.</p></div>`;
    }
}

// ============ BLOG DETAIL PAGE ============
async function loadBlogDetail() {
    const container = document.getElementById('blog-detail');
    const relatedSection = document.querySelector('.related-section');
    const relatedGrid = document.getElementById('related-grid');

    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        container.innerHTML = '<p>Không tìm thấy bài viết</p>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/blogs/${slug}`);

        if (!res.ok) {
            container.innerHTML = '<p>Không tìm thấy bài viết</p>';
            return;
        }

        const post = await res.json();

        // Cập nhật breadcrumb
        const catBreadcrumb = document.getElementById('breadcrumb-category');
        const titleBreadcrumb = document.getElementById('breadcrumb-title');
        if (catBreadcrumb) {
            catBreadcrumb.textContent = post.category_name || '';
            catBreadcrumb.href = `/pages/blogs.html?category=${post.category_slug || ''}`;
        }
        if (titleBreadcrumb) titleBreadcrumb.textContent = post.title;

        // Cập nhật tiêu đề trang
        document.title = `${post.title} - PDUN Blog`;

        container.innerHTML = `
            <img src="${resolveBlogImage(post.feature_image)}"
                 alt="${escapeHtml(post.title)}" class="blog-detail-image"
                 onerror="this.onerror=null; this.src=PLACEHOLDER_IMG">

            <div class="blog-detail-header">
                ${post.category_name ? `
                    <a href="/pages/blogs.html?category=${post.category_slug}" class="blog-detail-category">
                        ${escapeHtml(post.category_name)}
                    </a>
                ` : ''}
                <h1 class="blog-detail-title">${escapeHtml(post.title)}</h1>
                <div class="blog-detail-meta">
                    ${post.author_name ? `<span>Tác giả: ${escapeHtml(post.author_name)}</span>` : ''}
                    <span>${formatDate(post.created_at)}</span>
                    <span>${post.reading_time || 5} phút đọc</span>
                </div>
            </div>

            <div class="blog-detail-content">
                ${post.content}
            </div>

            <div class="author-box">
                <div class="author-avatar">${post.author_name ? post.author_name.charAt(0).toUpperCase() : 'P'}</div>
                <div class="author-info">
                    <h4>${post.author_name || 'PDUN'}</h4>
                    <p>Your Moments, Our Passion!</p>
                </div>
            </div>
        `;

        container.querySelectorAll('.blog-detail-content img').forEach((image) => {
            image.src = resolveBlogImage(image.getAttribute('src'));
        });

        // Load bài viết liên quan
        if (post.category_slug) {
            try {
                const relatedRes = await fetch(`${API_BASE}/blogs?category=${post.category_slug}&limit=10`);
                const relatedData = await relatedRes.json();
                const relatedPosts = relatedData.posts.filter(p => p.post_id !== post.post_id).slice(0, 3);

                if (relatedPosts.length > 0 && relatedGrid && relatedSection) {
                    relatedSection.style.display = 'block';
                    relatedGrid.innerHTML = relatedPosts.map(p => `
                        <a href="/pages/blog-detail.html?slug=${p.slug}" class="related-card">
                            <img src="${resolveBlogImage(p.feature_image)}"
                                 alt="${escapeHtml(p.title)}" class="related-card-image"
                                 onerror="this.onerror=null; this.src=PLACEHOLDER_IMG">
                            <div class="related-card-content">
                                <h4 class="related-card-title">${escapeHtml(p.title)}</h4>
                            </div>
                        </a>
                    `).join('');
                }
            } catch (error) {
                console.error('Lỗi tải bài viết liên quan:', error);
            }
        }

    } catch (error) {
        console.error('Lỗi:', error);
        container.innerHTML = '<p>Lỗi tải bài viết</p>';
    }
}

// ============ HELPERS ============
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadBlogList();
    loadBlogDetail();
});