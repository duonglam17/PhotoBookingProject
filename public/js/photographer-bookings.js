const token = localStorage.getItem('token') || '';
const requestList = document.getElementById('requestList');
const confirmedList = document.getElementById('confirmedList');
const scheduleStatus = document.getElementById('scheduleStatus');
const scheduleState = { bookings: [], pendingCount: 0, previousPendingCount: null, calendarDate: new Date() };
const statusLabels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', in_progress: 'Đang diễn ra', completed: 'Hoàn thành', cancelled: 'Đã hủy' };

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return 'Chưa có ngày';
  const normalized = String(value).slice(0, 10);
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? normalized : date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function parseBudget(booking) {
  const low = Number(booking.minBudget);
  const high = Number(booking.maxBudget);
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high < low) return '';
  return low === high ? formatMoney(low) : `${formatMoney(low)} – ${formatMoney(high)}`;
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
  if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải lịch chụp.');
  return result;
}

function renderBooking(booking, isRequest) {
  const title = booking.title || booking.packageName || 'Buổi chụp';
  const status = statusLabels[booking.status] || booking.status;
  const time = String(booking.startTime || '').slice(0, 5);
  const budget = parseBudget(booking);
  const description = booking.description || booking.note || '';
  const referenceImage = booking.referenceImage && /^\/images\/uploads\/[A-Za-z0-9._-]+$/.test(booking.referenceImage)
    ? `<a href="${escapeHtml(booking.referenceImage)}" target="_blank" rel="noopener noreferrer">Xem ảnh tham khảo</a>`
    : '';
  return `
    <article class="booking-card ${isRequest ? 'pending-card' : 'confirmed-card'}">
      <div class="booking-main">
        <div class="booking-title-row"><h3>${escapeHtml(title)}</h3><span class="booking-code">${escapeHtml(booking.bookingCode)}</span><span class="booking-status ${escapeHtml(booking.status)}">${escapeHtml(status)}</span></div>
        <div class="booking-meta"><span>${escapeHtml(formatDate(booking.bookingDate))}</span><span>${escapeHtml(time)}</span><span>${escapeHtml(booking.location)}</span></div>
        <p class="booking-description">${escapeHtml(description || 'Khách chưa ghi thêm mô tả.')}</p>
        <div class="booking-extra"><span>Khách: <strong>${escapeHtml(booking.clientName)}</strong></span><a href="tel:${escapeHtml(booking.clientPhone)}">${escapeHtml(booking.clientPhone)}</a><span>${escapeHtml(booking.clientEmail)}</span><span>${escapeHtml(booking.packageName)} · ${Number(booking.durationMinutes) || 0} phút</span>${referenceImage}</div>
      </div>
      <div class="booking-side">${budget ? `<span class="booking-price">${escapeHtml(budget)}</span>` : `<span class="booking-price">${escapeHtml(formatMoney(booking.packagePrice))}</span>`}${isRequest ? `<button class="confirm-button" type="button" data-confirm-booking="${Number(booking.bookingId)}">Xác nhận buổi chụp</button>` : ''}</div>
    </article>
  `;
}

function renderSchedule() {
  const pending = scheduleState.bookings.filter((booking) => booking.status === 'pending');
  const confirmed = scheduleState.bookings.filter((booking) => ['confirmed', 'in_progress'].includes(booking.status));
  const selectedDate = document.getElementById('scheduleDate').value;
  const selectedBookings = selectedDate
    ? confirmed.filter((booking) => String(booking.bookingDate).slice(0, 10) === selectedDate)
    : confirmed;
  document.getElementById('pendingCount').textContent = String(pending.length);
  document.getElementById('confirmedCount').textContent = String(confirmed.length);
  document.getElementById('upcomingCount').textContent = String(confirmed.filter((booking) => String(booking.bookingDate).slice(0, 10) >= todayIso()).length);
  document.getElementById('requestCountLabel').textContent = `${pending.length} yêu cầu`;
  requestList.innerHTML = pending.length
    ? pending.map((booking) => renderBooking(booking, true)).join('')
    : '<div class="empty-state"><strong>Chưa có yêu cầu đặt lịch mới</strong><span>Khi khách chọn bạn và gửi yêu cầu, thông tin buổi chụp sẽ xuất hiện tại đây.</span></div>';
  confirmedList.innerHTML = selectedBookings.length
    ? selectedBookings.map((booking) => renderBooking(booking, false)).join('')
    : `<div class="empty-state"><strong>${selectedDate ? 'Ngày này chưa có buổi chụp đã xác nhận' : 'Chưa có buổi chụp đã xác nhận'}</strong><span>Sau khi xác nhận yêu cầu, lịch sẽ xuất hiện ở đây kèm thông tin buổi chụp.</span></div>`;
  document.getElementById('selectedScheduleDate').textContent = formatDate(selectedDate);
  renderCalendar(confirmed, selectedDate);
  renderNotification(pending);
}

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function renderCalendar(confirmedBookings, selectedDate) {
  const year = scheduleState.calendarDate.getFullYear();
  const month = scheduleState.calendarDate.getMonth();
  const monthLabel = scheduleState.calendarDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  document.getElementById('calendarMonthLabel').textContent = monthLabel;

  const daysWithBookings = new Set(confirmedBookings.map((booking) => String(booking.bookingDate).slice(0, 10)));
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  const cells = [];

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const day = cellIndex - firstDayOffset + 1;
    if (day < 1 || day > daysInMonth) {
      cells.push('<span class="calendar-empty" aria-hidden="true"></span>');
      continue;
    }
    const dateKey = toDateKey(year, month, day);
    const hasBooking = daysWithBookings.has(dateKey);
    const isSelected = selectedDate === dateKey;
    const isToday = todayIso() === dateKey;
    const classes = ['calendar-day', hasBooking ? 'has-booking' : '', isSelected ? 'selected' : '', isToday ? 'today' : ''].filter(Boolean).join(' ');
    const bookingLabel = hasBooking ? ', có lịch đã xác nhận' : '';
    cells.push(`<button class="${classes}" type="button" data-schedule-date="${dateKey}" aria-pressed="${isSelected}" aria-label="${day} ${monthLabel}${bookingLabel}">${day}${hasBooking ? '<span class="calendar-booking-dot" aria-hidden="true"></span>' : ''}</button>`);
  }
  document.getElementById('scheduleCalendarDays').innerHTML = cells.join('');
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function renderNotification(pending) {
  const alert = document.getElementById('newBookingAlert');
  alert.hidden = pending.length === 0;
  if (!pending.length) return;
  const title = document.getElementById('newBookingAlertTitle');
  const copy = document.getElementById('newBookingAlertCopy');
  title.textContent = pending.length === 1 ? 'Bạn có yêu cầu đặt lịch mới' : `Bạn có ${pending.length} yêu cầu đặt lịch mới`;
  copy.textContent = `${pending[0].clientName} · ${pending[0].title || pending[0].packageName} · ${formatDate(pending[0].bookingDate)}`;
  if (scheduleState.previousPendingCount !== null && pending.length > scheduleState.previousPendingCount) {
    alert.classList.remove('has-new-request');
    requestAnimationFrame(() => alert.classList.add('has-new-request'));
  }
  scheduleState.previousPendingCount = pending.length;
}

async function loadSchedule({ quiet = false } = {}) {
  if (!quiet) {
    scheduleStatus.textContent = 'Đang tải lịch chụp...';
    scheduleStatus.classList.remove('success');
  }
  try {
    const result = await api('/api/bookings/photographer/mine');
    scheduleState.bookings = result.data || [];
    scheduleState.pendingCount = Number(result.pendingCount) || 0;
    renderSchedule();
    scheduleStatus.textContent = quiet ? '' : 'Lịch được cập nhật.';
    scheduleStatus.classList.add('success');
  } catch (error) {
    scheduleStatus.textContent = error.message || 'Không thể tải lịch chụp.';
    scheduleStatus.classList.remove('success');
  }
}

async function confirmBooking(button) {
  const bookingId = button.dataset.confirmBooking;
  button.disabled = true;
  button.textContent = 'Đang xác nhận...';
  try {
    const result = await api(`/api/bookings/photographer/${encodeURIComponent(bookingId)}/confirm`, { method: 'PATCH' });
    scheduleStatus.textContent = result.message || 'Đã xác nhận buổi chụp.';
    scheduleStatus.classList.add('success');
    await loadSchedule({ quiet: true });
  } catch (error) {
    scheduleStatus.textContent = error.message || 'Không thể xác nhận buổi chụp.';
    scheduleStatus.classList.remove('success');
    button.disabled = false;
    button.textContent = 'Xác nhận buổi chụp';
  }
}

requestList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-confirm-booking]');
  if (button) confirmBooking(button);
});
document.getElementById('refreshSchedule').addEventListener('click', () => loadSchedule());
document.getElementById('scheduleCalendarDays').addEventListener('click', (event) => {
  const dayButton = event.target.closest('[data-schedule-date]');
  if (!dayButton) return;
  document.getElementById('scheduleDate').value = dayButton.dataset.scheduleDate;
  const [year, month] = dayButton.dataset.scheduleDate.split('-').map(Number);
  scheduleState.calendarDate = new Date(year, month - 1, 1);
  renderSchedule();
});
document.getElementById('previousCalendarMonth').addEventListener('click', () => {
  scheduleState.calendarDate = new Date(scheduleState.calendarDate.getFullYear(), scheduleState.calendarDate.getMonth() - 1, 1);
  renderSchedule();
});
document.getElementById('nextCalendarMonth').addEventListener('click', () => {
  scheduleState.calendarDate = new Date(scheduleState.calendarDate.getFullYear(), scheduleState.calendarDate.getMonth() + 1, 1);
  renderSchedule();
});
document.getElementById('scheduleDate').value = todayIso();

if (localStorage.getItem('userRole') !== 'photographer') {
  window.location.replace('/pages/auth.html');
} else {
  loadSchedule();
  window.setInterval(() => loadSchedule({ quiet: true }), 30000);
}
