const state = {
  page: 1,
  limit: 6,
  sort: 'newest',
  search: '',
  location: '',
  totalPages: 1,
};

const grid = document.getElementById('photographerGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const locationSelect = document.getElementById('locationSelect');
const pageIndicator = document.getElementById('pageIndicator');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const toast = document.getElementById('toast');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function formatStats(photographer) {
  return `
    <span><span class="stars">★</span> ${photographer.rating.toFixed(1)} (${photographer.reviewCount})</span>
    <span>${photographer.bookingCount} buổi chụp</span>
    <span>${photographer.likeCount} lượt thích</span>
  `;
}

function renderCard(photographer, index) {
  const locations = photographer.locations
    .map((location) => `<span class="tag">${escapeHtml(location)}</span>`)
    .join('');
  const verified = photographer.isVerified ? '<span class="verified" title="Đã xác minh">✓</span>' : '';

  return `
    <article class="photographer-card" style="animation-delay: ${index * 45}ms">
      <div class="cover-wrap" style="--cover: url('${escapeHtml(photographer.cover)}')">
        <img class="cover-image" src="${escapeHtml(photographer.cover)}" alt="Ảnh portfolio của ${escapeHtml(photographer.name)}" loading="lazy" />
        <button class="cover-arrow left" type="button" aria-label="Ảnh trước">‹</button>
        <button class="cover-arrow right" type="button" aria-label="Ảnh tiếp theo">›</button>
      </div>
      <div class="card-info">
        <div class="profile-row">
          <img class="avatar" src="${escapeHtml(photographer.avatar)}" alt="${escapeHtml(photographer.name)}" loading="lazy" />
          <div class="profile-main">
            <div class="profile-name">${escapeHtml(photographer.name)} ${verified}</div>
            <div class="stats">${formatStats(photographer)}</div>
            <div class="tags">${locations}</div>
          </div>
        </div>
        <p class="bio">${escapeHtml(photographer.bio)}</p>
        <div class="card-actions">
          <button class="favorite-btn" type="button" data-favorite="${photographer.id}"><span>♡</span> Yêu thích</button>
          <a class="detail-btn" href="/pages/booking.html?photographerId=${photographer.id}">Xem &amp; Đặt lịch <span>→</span></a>
        </div>
      </div>
    </article>
  `;
}

function renderPhotographers(photographers) {
  grid.innerHTML = photographers.map(renderCard).join('');
  emptyState.hidden = photographers.length > 0;

  grid.querySelectorAll('[data-favorite]').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('saved');
      button.querySelector('span').textContent = button.classList.contains('saved') ? '♥' : '♡';
      showToast(button.classList.contains('saved') ? 'Đã thêm vào yêu thích.' : 'Đã bỏ khỏi yêu thích.');
    });
  });
}

function updatePagination(pagination) {
  state.totalPages = Math.max(pagination.totalPages, 1);
  pageIndicator.textContent = `${pagination.page}/${state.totalPages}`;
  document.getElementById('firstPageBtn').disabled = state.page <= 1;
  document.getElementById('prevPageBtn').disabled = state.page <= 1;
  document.getElementById('nextPageBtn').disabled = state.page >= state.totalPages;
  document.getElementById('lastPageBtn').disabled = state.page >= state.totalPages;
}

async function loadPhotographers() {
  grid.innerHTML = '<p class="empty-state">Đang tải danh sách...</p>';
  const params = new URLSearchParams({
    page: state.page,
    limit: state.limit,
    sort: state.sort,
    search: state.search,
    location: state.location,
  });

  try {
    const response = await fetch(`/api/photographers?${params}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Không thể tải danh sách.');
    renderPhotographers(result.data);
    updatePagination(result.pagination);
  } catch (error) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    emptyState.textContent = error.message || 'Không thể kết nối tới máy chủ.';
    showToast(error.message || 'Không thể kết nối tới máy chủ.');
  }
}

function debounce(callback, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), delay);
  };
}

searchInput.addEventListener('input', debounce((event) => {
  state.search = event.target.value.trim();
  state.page = 1;
  loadPhotographers();
}, 350));

locationSelect.addEventListener('change', (event) => {
  state.location = event.target.value;
  state.page = 1;
  loadPhotographers();
});

document.querySelectorAll('[data-sort]').forEach((button) => {
  button.addEventListener('click', () => {
    state.sort = button.dataset.sort;
    state.page = 1;
    document.querySelectorAll('[data-sort]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    loadPhotographers();
  });
});

pageSizeSelect.addEventListener('change', (event) => {
  state.limit = Number(event.target.value);
  state.page = 1;
  loadPhotographers();
});

document.getElementById('firstPageBtn').addEventListener('click', () => { state.page = 1; loadPhotographers(); });
document.getElementById('prevPageBtn').addEventListener('click', () => { if (state.page > 1) state.page -= 1; loadPhotographers(); });
document.getElementById('nextPageBtn').addEventListener('click', () => { if (state.page < state.totalPages) state.page += 1; loadPhotographers(); });
document.getElementById('lastPageBtn').addEventListener('click', () => { state.page = state.totalPages; loadPhotographers(); });

loadPhotographers();
