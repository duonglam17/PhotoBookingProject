const photographerGrid = document.getElementById('photographerGrid');
let photographerOffset = 0;
let photographers = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderPhotographers() {
  if (!photographers.length) {
    photographerGrid.innerHTML = '<p class="photographer-empty">Chưa có nhiếp ảnh gia được duyệt. <a href="/pages/photographers.html">Xem danh sách</a></p>';
    document.querySelector('.carousel-controls').hidden = true;
    return;
  }

  const visibleCount = window.innerWidth <= 560 ? 1 : 3;
  const cards = Array.from({ length: Math.min(visibleCount, photographers.length) }, (_, index) => photographers[(photographerOffset + index) % photographers.length]);
  document.querySelector('.carousel-controls').hidden = photographers.length <= visibleCount;
  photographerGrid.innerHTML = cards.map((photographer) => `
    <article class="photographer-card">
      ${photographer.cover ? `<img src="${escapeHtml(photographer.cover)}" alt="Ảnh bìa ${escapeHtml(photographer.name)}" loading="lazy" />` : `<div class="home-photographer-placeholder" aria-label="Chưa có ảnh hồ sơ">${escapeHtml((photographer.name || 'P').trim().charAt(0).toUpperCase())}</div>`}
      <div class="photographer-info">
        <h3>${escapeHtml(photographer.name)}</h3>
        <div class="photographer-meta">${escapeHtml(photographer.experience || 'Nhiếp ảnh gia')} · ${escapeHtml((photographer.locations || []).join(', '))}</div>
        <p>${escapeHtml(photographer.equipment || 'Thông tin thiết bị chưa được cập nhật.')}</p>
        <a class="card-link" href="/pages/photographer-profile.html?id=${encodeURIComponent(photographer.id)}">Xem hồ sơ →</a>
      </div>
    </article>
  `).join('');
}

async function loadPhotographers() {
  photographerGrid.innerHTML = '<p class="photographer-empty">Đang tải nhiếp ảnh gia...</p>';
  try {
    const response = await fetch('/api/photographers?page=1&limit=12&sort=rating');
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải nhiếp ảnh gia.');
    photographers = result.data;
    renderPhotographers();
  } catch (error) {
    photographerGrid.innerHTML = `<p class="photographer-empty">${escapeHtml(error.message || 'Không thể tải nhiếp ảnh gia.')} <a href="/pages/photographers.html">Mở danh sách</a></p>`;
    document.querySelector('.carousel-controls').hidden = true;
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelector('.menu-toggle').addEventListener('click', (event) => {
  const button = event.currentTarget;
  const navigation = document.querySelector('.main-nav');
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  navigation.classList.toggle('open', !expanded);
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelector('.main-nav').classList.remove('open');
    document.querySelector('.menu-toggle').setAttribute('aria-expanded', 'false');
  });
});

document.getElementById('quickSearch').addEventListener('submit', (event) => {
  event.preventDefault();
  const category = document.getElementById('searchCategory').value;
  const date = document.getElementById('searchDate').value;
  const location = document.getElementById('searchLocation').value.trim();
  const search = new URLSearchParams({ category, date, location });
  window.location.href = `/pages/booking.html?${search.toString()}`;
});

document.getElementById('prevPhotographer').addEventListener('click', () => {
  if (!photographers.length) return;
  photographerOffset = (photographerOffset - 1 + photographers.length) % photographers.length;
  renderPhotographers();
});

document.getElementById('nextPhotographer').addEventListener('click', () => {
  if (!photographers.length) return;
  photographerOffset = (photographerOffset + 1) % photographers.length;
  renderPhotographers();
});

const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.scrollY > 500));
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('resize', renderPhotographers);

loadPhotographers();