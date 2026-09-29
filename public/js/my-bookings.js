const bookingList = document.getElementById('bookingList');
const listStatus = document.getElementById('listStatus');
const filterButtons = [...document.querySelectorAll('[data-status]')];
const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};
let bookings = [];
let currentFilter = 'all';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa xác định' : date.toLocaleDateString('vi-VN');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function parseNotes(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return { note: value || '' };
  }
}

function renderBookings() {
  const visibleBookings = currentFilter === 'all'
    ? bookings
    : bookings.filter((booking) => booking.status === currentFilter);

  listStatus.textContent = visibleBookings.length ? `${visibleBookings.length} buổi chụp` : '';
  if (!visibleBookings.length) {
    bookingList.innerHTML = `
      <div class="empty-state">
        <strong>${bookings.length ? 'Không có lịch ở trạng thái này' : 'Bạn chưa có lịch đặt nào'}</strong>
        <span>${bookings.length ? 'Thử chọn trạng thái khác để xem các buổi chụp.' : 'Khi bạn gửi yêu cầu đặt lịch, thông tin sẽ xuất hiện tại đây.'}</span>
        <a href="/pages/booking.html">Khám phá gói chụp</a>
      </div>
    `;
    return;
  }

  bookingList.innerHTML = visibleBookings.map((booking) => {
    const details = parseNotes(booking.notes);
    const description = [details.description, details.note].filter(Boolean).join('\n');
    const title = details.title || booking.packageName || 'Buổi chụp';
    return `
      <article class="booking-card">
        <div class="booking-card-main">
          <div class="booking-card-heading">
            <h2>${escapeHtml(title)}</h2>
            <span class="booking-code">${escapeHtml(booking.bookingCode)}</span>
          </div>
          <div class="booking-meta">
            <span>${escapeHtml(booking.packageName)}</span>
            <span>${escapeHtml(formatDate(booking.bookingDate))} · ${escapeHtml(String(booking.startTime).slice(0, 5))}</span>
            <span>${escapeHtml(booking.location)}</span>
            <span>${escapeHtml(booking.photographerName || 'Chưa chọn nhiếp ảnh gia')}</span>
          </div>
          ${description ? `<p class="booking-description">${escapeHtml(description)}</p>` : ''}
        </div>
        <div class="booking-aside">
          <span class="booking-price">${formatCurrency(booking.packagePrice)}</span>
          <span class="status-chip ${escapeHtml(booking.status)}">${escapeHtml(statusLabels[booking.status] || booking.status)}</span>
        </div>
      </article>
    `;
  }).join('');
}

async function loadBookings() {
  const token = localStorage.getItem('token');
  if (!token) {
    listStatus.textContent = 'Bạn cần đăng nhập để xem lịch đặt.';
    bookingList.innerHTML = '<div class="empty-state"><strong>Chưa đăng nhập</strong><span>Lịch đặt được lưu theo tài khoản của bạn.</span><a href="/pages/auth.html">Đăng nhập</a></div>';
    return;
  }

  try {
    const response = await fetch('/api/bookings/mine', { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải lịch đặt.');
    bookings = result.data;
    renderBookings();
  } catch (error) {
    listStatus.textContent = error.message || 'Không thể kết nối tới máy chủ.';
    bookingList.innerHTML = '';
  }
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.status;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderBookings();
  });
});

if (localStorage.getItem('token')) {
  document.getElementById('accountLink').textContent = 'Tài khoản';
  document.getElementById('accountLink').href = localStorage.getItem('userRole') === 'photographer'
    ? '/pages/photographer-profile.html?me=1'
    : '/pages/my-bookings.html';
}

loadBookings();
