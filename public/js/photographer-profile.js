const profilePage = document.getElementById('profilePage');
const profileContent = document.getElementById('profileContent');
const profileError = document.getElementById('profileError');
const profileErrorMessage = document.getElementById('profileErrorMessage');

function safeImageUrl(value) {
  const imageUrl = String(value || '').trim();
  if (imageUrl.startsWith('/')) return imageUrl;

  try {
    const parsedUrl = new URL(imageUrl, window.location.origin);
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.href : '';
  } catch {
    return '';
  }
}

function formatCount(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
}

function showProfileError(message) {
  profilePage.setAttribute('aria-busy', 'false');
  document.querySelector('.profile-cover').hidden = true;
  document.querySelector('.profile-heading').hidden = true;
  profileContent.hidden = true;
  profileError.hidden = false;
  profileErrorMessage.textContent = message;
}

function setProfileImage(imageElement, imageUrl) {
  const safeUrl = safeImageUrl(imageUrl);
  if (!safeUrl) {
    imageElement.hidden = true;
    return;
  }

  imageElement.src = safeUrl;
  imageElement.addEventListener('error', () => {
    imageElement.hidden = true;
  }, { once: true });
}

function safeExternalUrl(value) {
  try {
    const parsedUrl = new URL(String(value || ''));
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.href : '';
  } catch {
    return '';
  }
}

function formatReviewDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
}

function renderReviews(reviews) {
  const reviewList = document.getElementById('reviewsList');
  const emptyState = document.getElementById('reviewsEmpty');
  if (!reviews.length) {
    emptyState.hidden = false;
    reviewList.hidden = true;
    return;
  }

  emptyState.hidden = true;
  reviewList.hidden = false;
  reviewList.innerHTML = reviews.map((review) => {
    const rating = Math.min(5, Math.max(0, Number(review.rating) || 0));
    const stars = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
    return `
      <article class="review-card">
        <div class="review-card-heading">
          <strong>${escapeHtml(review.clientName || 'Khách hàng')}</strong>
          <time>${escapeHtml(formatReviewDate(review.createdAt))}</time>
        </div>
        <div class="review-stars" aria-label="${rating} trên 5 sao">${stars}</div>
        <p>${escapeHtml(review.comment || 'Khách hàng chưa để lại nhận xét.')}</p>
      </article>
    `;
  }).join('');
}

function renderProfile(photographer) {
  const locations = Array.isArray(photographer.locations) ? photographer.locations : [];
  const rating = Number(photographer.rating) || 0;
  const reviewCount = Number(photographer.reviewCount) || 0;
  const bookingUrl = `/pages/booking.html?photographerId=${encodeURIComponent(photographer.id)}`;

  document.title = `${photographer.name || 'Nhiếp ảnh gia'} | Potonow`;
  document.getElementById('photographerName').textContent = photographer.name || 'Nhiếp ảnh gia';
  document.getElementById('experienceLabel').textContent = photographer.experience || 'Nhiếp ảnh gia Potonow';
  document.getElementById('locationLabel').textContent = locations.join(' · ') || 'Chưa cập nhật khu vực';
  document.getElementById('photographerEquipment').textContent = photographer.equipment || 'Chưa cập nhật thiết bị chụp.';
  document.getElementById('experienceDetail').textContent = photographer.experience || 'Chưa cập nhật kinh nghiệm.';
  document.getElementById('bookingCount').textContent = formatCount(photographer.bookingCount);
  document.getElementById('reviewCountLabel').textContent = formatCount(reviewCount);
  document.getElementById('reviewCountAside').textContent = formatCount(reviewCount);
  document.getElementById('ratingSummary').innerHTML = `<strong>${rating.toFixed(1)}</strong><span aria-label="sao">★</span> ${formatCount(reviewCount)} đánh giá`;
  document.getElementById('ratingValue').textContent = rating.toFixed(1);
  document.getElementById('reviewsDescription').textContent = `${formatCount(reviewCount)} đánh giá · ${formatCount(photographer.bookingCount)} buổi chụp đã hoàn thành`;
  document.getElementById('reviewsEmptyTitle').textContent = reviewCount
    ? 'Nội dung đánh giá đang được cập nhật'
    : 'Chưa có đánh giá';
  document.getElementById('reviewsEmptyMessage').textContent = reviewCount
    ? 'Điểm đánh giá đã được ghi nhận; nội dung nhận xét chưa có trong dữ liệu.'
    : 'Nhận xét từ khách hàng sẽ xuất hiện tại đây sau các buổi chụp.';
  document.getElementById('locationTags').innerHTML = locations.length
    ? locations.map((location) => `<span>${escapeHtml(location)}</span>`).join('')
    : '<span>Chưa cập nhật</span>';

  setProfileImage(document.getElementById('coverImage'), photographer.cover);
  setProfileImage(document.getElementById('avatarImage'), photographer.avatar);
  if (!safeImageUrl(photographer.avatar)) {
    const avatarFallback = document.getElementById('avatarFallback');
    avatarFallback.textContent = (photographer.name || 'P').trim().charAt(0).toUpperCase();
    avatarFallback.hidden = false;
  }

  const portfolioUrl = safeExternalUrl(photographer.portfolioUrl);
  const portfolioLink = document.getElementById('portfolioLink');
  if (portfolioUrl) {
    portfolioLink.href = portfolioUrl;
    portfolioLink.hidden = false;
  }
  renderReviews(Array.isArray(photographer.reviews) ? photographer.reviews : []);

  for (const buttonId of ['bookButton', 'secondaryBookButton']) {
    const button = document.getElementById(buttonId);
    button.href = bookingUrl;
    button.removeAttribute('aria-disabled');
  }

  const profileNotice = document.getElementById('profileNotice');
  profileNotice.hidden = Boolean(photographer.isVerified);
  document.getElementById('profileNoticeText').textContent = photographer.status === 'pending'
    ? 'Hồ sơ của bạn đang được Potonow xét duyệt. Chỉ bạn mới xem được trang này cho đến khi hồ sơ được duyệt.'
    : 'Hồ sơ này đang chờ Potonow xác minh thông tin.';
  profilePage.setAttribute('aria-busy', 'false');
  profileContent.hidden = false;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setupTabs() {
  document.querySelectorAll('.profile-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach((item) => {
        const selected = item === tab;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-selected', String(selected));
      });

      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.hidden = panel.id !== tab.dataset.panel;
      });
    });
  });
}

async function loadProfile() {
  setupTabs();
  const parameters = new URLSearchParams(window.location.search);
  const photographerId = parameters.get('id');
  const ownProfile = parameters.get('me') === '1';
  if (!ownProfile && (!photographerId || !/^\d+$/.test(photographerId))) {
    showProfileError('Hãy mở hồ sơ từ danh sách nhiếp ảnh gia để xem thông tin chi tiết.');
    return;
  }

  try {
    const headers = ownProfile ? { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } : {};
    const endpoint = ownProfile
      ? '/api/photographers/me'
      : `/api/photographers/${encodeURIComponent(photographerId)}`;
    const response = await fetch(endpoint, { headers });
    const result = await response.json();
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || 'Không tìm thấy hồ sơ nhiếp ảnh gia này.');
    }
    renderProfile(result.data);
  } catch (error) {
    showProfileError(error.message || 'Không thể kết nối tới máy chủ. Vui lòng thử lại.');
  }
}

loadProfile();
