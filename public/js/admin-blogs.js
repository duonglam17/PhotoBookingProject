(() => {
  const token = localStorage.getItem('token') || '';
  const editor = document.getElementById('blogEditor');
  const editorStatus = document.getElementById('blogEditorStatus');
  const tableBody = document.getElementById('blogsTable');
  const state = { posts: [], categories: [], editingId: null };

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
    const result = await response.json();
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/pages/auth.html';
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }
    if (!response.ok || !result.success) throw new Error(result.message || 'Không thể hoàn thành thao tác blog.');
    return result;
  }

  function setEditorStatus(message, isError = true) {
    editorStatus.textContent = message;
    editorStatus.classList.toggle('error', isError);
    editorStatus.classList.toggle('success', !isError);
  }

  function showEditor(post = null) {
    state.editingId = post?.id || null;
    document.getElementById('blogEditorTitle').textContent = post ? 'Chỉnh sửa bài viết' : 'Bài viết mới';
    document.getElementById('saveBlogButton').textContent = post ? 'Lưu thay đổi' : 'Lưu bài viết';
    document.getElementById('blogSourceUrl').value = post?.sourceUrl || '';
    document.getElementById('blogTitle').value = post?.title || '';
    document.getElementById('blogCategory').value = post?.categoryId || '';
    document.getElementById('blogImage').value = post?.featureImage || '';
    document.getElementById('blogAuthor').value = post?.authorName || '';
    document.getElementById('blogExcerpt').value = post?.excerpt || '';
    document.getElementById('blogContent').value = post?.plainContent || '';
    document.getElementById('blogStatus').value = post?.status || 'draft';
    document.getElementById('blogSourcePreview').hidden = true;
    setEditorStatus('');
    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderPosts(posts) {
    document.getElementById('blogsEmpty').hidden = posts.length > 0;
    tableBody.innerHTML = posts.map((post) => `
      <tr>
        <td><div class="blog-table-person">${post.featureImage ? `<img src="${escapeHtml(post.featureImage)}" alt="" loading="lazy" />` : '<span class="blog-image-placeholder">P</span>'}<div><strong>${escapeHtml(post.title)}</strong><small>${escapeHtml(post.excerpt || '')}</small></div></div></td>
        <td>${escapeHtml(post.categoryName || 'Chưa phân loại')}</td>
        <td>${post.sourceUrl ? `<a class="source-link" href="${escapeHtml(post.sourceUrl)}" target="_blank" rel="noopener noreferrer">Mở bài gốc ↗</a>` : '—'}</td>
        <td>${escapeHtml(formatDate(post.createdAt))}</td>
        <td><span class="status-pill ${post.status === 'published' ? 'active' : 'pending'}">${post.status === 'published' ? 'Đã đăng' : 'Bản nháp'}</span></td>
        <td><div class="blog-row-actions"><button class="row-detail-button" type="button" data-edit-blog="${post.id}">Sửa</button><button class="blog-delete-button" type="button" data-delete-blog="${post.id}">Xóa</button></div></td>
      </tr>
    `).join('');
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('vi-VN');
  }

  async function loadBlogData() {
    try {
      const [postsResult, categoriesResult] = await Promise.all([
        api('/api/admin/blogs'),
        api('/api/admin/blog-categories'),
      ]);
      state.posts = postsResult.data || [];
      state.categories = categoriesResult.data || [];
      const selectedCategory = document.getElementById('blogCategory').value;
      document.getElementById('blogCategory').innerHTML = '<option value="">Chưa phân loại</option>' + state.categories.map((category) =>
        `<option value="${category.id}">${escapeHtml(category.name)}</option>`,
      ).join('');
      if (selectedCategory) document.getElementById('blogCategory').value = selectedCategory;
      renderPosts(state.posts);
    } catch (error) {
      setEditorStatus(error.message);
      document.getElementById('adminStatus').textContent = error.message;
    }
  }

  async function previewSource() {
    const button = document.getElementById('previewBlogSource');
    const sourceUrl = document.getElementById('blogSourceUrl').value.trim();
    if (!sourceUrl) {
      setEditorStatus('Nhập link bài báo trước khi lấy thông tin.');
      return;
    }
    button.disabled = true;
    button.textContent = 'Đang đọc...';
    setEditorStatus('');
    try {
      const result = await api('/api/admin/blogs/preview', { method: 'POST', body: JSON.stringify({ url: sourceUrl }) });
      const data = result.data;
      document.getElementById('blogTitle').value = data.title || document.getElementById('blogTitle').value;
      document.getElementById('blogImage').value = data.image || '';
      document.getElementById('blogExcerpt').value = data.description || document.getElementById('blogExcerpt').value;
      document.getElementById('blogContent').value = data.description || document.getElementById('blogContent').value;
      const preview = document.getElementById('blogSourcePreview');
      preview.innerHTML = `${data.image ? `<img src="${escapeHtml(data.image)}" alt="Ảnh đại diện xem trước" />` : '<span class="blog-image-placeholder">P</span>'}<div><strong>${escapeHtml(data.title || 'Không tìm thấy tiêu đề')}</strong><p>${escapeHtml(data.description || 'Trang nguồn không cung cấp mô tả.')}</p><small>${escapeHtml(data.sourceUrl)}</small></div>`;
      preview.querySelector('img')?.addEventListener('error', (event) => {
        const placeholder = document.createElement('span');
        placeholder.className = 'blog-image-placeholder';
        placeholder.textContent = 'P';
        event.currentTarget.replaceWith(placeholder);
      }, { once: true });
      preview.hidden = false;
      setEditorStatus('Đã lấy thông tin từ trang nguồn. Bạn có thể chỉnh sửa trước khi lưu.', false);
    } catch (error) {
      setEditorStatus(error.message || 'Không thể đọc metadata của link.');
    } finally {
      button.disabled = false;
      button.textContent = 'Lấy thông tin';
    }
  }

  async function savePost(event) {
    event.preventDefault();
    const button = document.getElementById('saveBlogButton');
    button.disabled = true;
    setEditorStatus('Đang lưu bài viết...', false);
    const payload = {
      sourceUrl: document.getElementById('blogSourceUrl').value.trim(),
      title: document.getElementById('blogTitle').value.trim(),
      categoryId: document.getElementById('blogCategory').value || null,
      featureImage: document.getElementById('blogImage').value.trim() || null,
      authorName: document.getElementById('blogAuthor').value.trim(),
      excerpt: document.getElementById('blogExcerpt').value.trim(),
      content: document.getElementById('blogContent').value.trim(),
      status: document.getElementById('blogStatus').value,
    };
    try {
      await api(state.editingId ? `/api/admin/blogs/${state.editingId}` : '/api/admin/blogs', {
        method: state.editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      editor.hidden = true;
      await loadBlogData();
    } catch (error) {
      setEditorStatus(error.message || 'Không thể lưu bài viết.');
    } finally {
      button.disabled = false;
    }
  }

  async function deletePost(id) {
    const post = state.posts.find((item) => String(item.id) === String(id));
    if (!post || !window.confirm(`Xóa bài viết “${post.title}”?`)) return;
    try {
      await api(`/api/admin/blogs/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setEditorStatus('Đã xóa bài viết.', false);
      await loadBlogData();
    } catch (error) {
      document.getElementById('adminStatus').textContent = error.message || 'Không thể xóa bài viết.';
    }
  }

  document.querySelector('[data-view="blogsView"]').addEventListener('click', () => loadBlogData());
  document.getElementById('newBlogButton').addEventListener('click', () => showEditor());
  document.getElementById('closeBlogEditor').addEventListener('click', () => { editor.hidden = true; });
  document.getElementById('previewBlogSource').addEventListener('click', previewSource);
  editor.addEventListener('submit', savePost);
  tableBody.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-blog]');
    const deleteButton = event.target.closest('[data-delete-blog]');
    if (editButton) {
      const post = state.posts.find((item) => String(item.id) === editButton.dataset.editBlog);
      if (post) showEditor(post);
    }
    if (deleteButton) deletePost(deleteButton.dataset.deleteBlog);
  });
})();
