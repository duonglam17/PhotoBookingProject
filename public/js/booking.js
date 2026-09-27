const packages = [
  {
    id: 1,
    name: 'Cá nhân',
    price: 900000,
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: 'Cặp đôi',
    price: 1700000,
    image: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    name: 'Gia đình',
    price: 3000000,
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    name: 'Trẻ em',
    price: 1500000,
    image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 5,
    name: 'Sự kiện',
    price: 4200000,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 6,
    name: 'Studio',
    price: 2400000,
    image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80',
  },
];

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

const state = {
  selectedPackageId: 1,
  selectedDate: '',
  selectedTime: '',
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
};

const packageGrid = document.getElementById('packageGrid');
const calendarDays = document.getElementById('calendarDays');
const monthLabel = document.getElementById('monthLabel');
const timeGrid = document.getElementById('timeGrid');
const locationInput = document.getElementById('location');
const notesInput = document.getElementById('notes');
const shootTitleInput = document.getElementById('shootTitle');
const shootDescriptionInput = document.getElementById('shootDescription');
const minBudgetInput = document.getElementById('minBudget');
const maxBudgetInput = document.getElementById('maxBudget');
const addOnInputs = document.querySelectorAll('.add-on');
const submitBtn = document.getElementById('submitBookingBtn');
const validationText = document.getElementById('validationText');
const toast = document.getElementById('toast');

const fieldPackageName = document.getElementById('selectedPackageName');
const fieldPackagePrice = document.getElementById('selectedPackagePrice');
const fieldDate = document.getElementById('selectedDate');
const fieldTime = document.getElementById('selectedTime');
const fieldLocation = document.getElementById('selectedLocation');
const currentUserId = Number(localStorage.getItem('userId'));

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.className = 'toast';
  }, 2800);
}

function getCurrentMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days = [];

  for (let i = 0; i < startDay; i += 1) {
    days.push({ date: null, muted: true });
  }

  for (let d = 1; d <= totalDays; d += 1) {
    days.push({ date: new Date(year, month, d), muted: false });
  }

  return days;
}

function renderPackages() {
  packageGrid.innerHTML = packages
    .map(
      (pkg) => `
        <button type="button" class="package-item ${pkg.id === state.selectedPackageId ? 'active' : ''}" data-package-id="${pkg.id}">
          <div class="package-thumb">
            <img src="${pkg.image}" alt="${pkg.name}" />
          </div>
          <div class="package-name">${pkg.name}</div>
          <div class="package-price">${formatCurrency(pkg.price)}</div>
        </button>
      `
    )
    .join('');

  document.querySelectorAll('.package-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedPackageId = Number(btn.dataset.packageId);
      renderPackages();
      updateSummary();
    });
  });
}

function renderCalendar() {
  const year = state.calendarYear;
  const month = state.calendarMonth;
  const monthName = new Date(year, month).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });

  monthLabel.textContent = monthName;
  const days = getCurrentMonthDays(year, month);

  calendarDays.innerHTML = days
    .map((item) => {
      if (item.muted) {
        return `<div class="day muted"></div>`;
      }

      const date = item.date.getDate();
      const fullDate = item.date.toISOString().slice(0, 10);
      const isSelected = state.selectedDate === fullDate;

      return `
        <button type="button" class="day ${isSelected ? 'selected' : ''}" data-date="${fullDate}">${date}</button>
      `;
    })
    .join('');

  document.querySelectorAll('.day[data-date]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedDate = button.dataset.date;
      renderCalendar();
      updateSummary();
    });
  });
}

function renderTimeSlots() {
  timeGrid.innerHTML = timeSlots
    .map(
      (time) => `
        <button type="button" class="time-slot ${time === state.selectedTime ? 'active' : ''}" data-time="${time}">${time}</button>
      `
    )
    .join('');

  document.querySelectorAll('.time-slot').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedTime = button.dataset.time;
      renderTimeSlots();
      updateSummary();
    });
  });
}

function updateSummary() {
  const selectedPackage = packages.find((pkg) => pkg.id === state.selectedPackageId) || packages[0];
  fieldPackageName.textContent = selectedPackage.name;
  fieldPackagePrice.textContent = formatCurrency(selectedPackage.price);

  fieldDate.textContent = state.selectedDate ? new Date(state.selectedDate).toLocaleDateString('vi-VN') : 'Chưa chọn';
  fieldTime.textContent = state.selectedTime || 'Chưa chọn';

  const location = locationInput.value.trim();
  fieldLocation.textContent = location || 'Chưa nhập';
}

function validateBookingForm() {
  const selectedPackage = packages.find((pkg) => pkg.id === state.selectedPackageId);
  const hasLocation = locationInput.value.trim();
  const hasTitle = shootTitleInput.value.trim();
  const hasDescription = shootDescriptionInput.value.trim();
  const hasValidBudget = Number(minBudgetInput.value || 0) > 0 && Number(maxBudgetInput.value || 0) > 0;

  if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
    validationText.textContent = 'Vui lòng đăng nhập trước khi đặt lịch.';
    return false;
  }

  if (!selectedPackage) {
    validationText.textContent = 'Vui lòng chọn gói chụp.';
    return false;
  }

  if (!state.selectedDate) {
    validationText.textContent = 'Vui lòng chọn ngày chụp.';
    return false;
  }

  if (!state.selectedTime) {
    validationText.textContent = 'Vui lòng chọn giờ chụp.';
    return false;
  }

  if (!hasLocation) {
    validationText.textContent = 'Vui lòng nhập địa điểm chụp.';
    return false;
  }

  if (!hasTitle) {
    validationText.textContent = 'Vui lòng nhập tiêu đề buổi chụp.';
    return false;
  }

  if (!hasDescription) {
    validationText.textContent = 'Vui lòng mô tả nội dung buổi chụp.';
    return false;
  }

  if (!hasValidBudget) {
    validationText.textContent = 'Vui lòng nhập khoảng chi phí hợp lệ.';
    return false;
  }

  validationText.textContent = '';
  return true;
}

async function submitBooking() {
  if (!validateBookingForm()) {
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang gửi...';

  try {
    const addOns = Array.from(addOnInputs)
      .filter((input) => input.checked)
      .map((input) => input.value);

    const payload = {
      userId: currentUserId,
      packageId: state.selectedPackageId,
      bookingDate: state.selectedDate,
      startTime: state.selectedTime,
      location: locationInput.value.trim(),
      title: shootTitleInput.value.trim(),
      description: shootDescriptionInput.value.trim(),
      minBudget: Number(minBudgetInput.value || 0),
      maxBudget: Number(maxBudgetInput.value || 0),
      addOns,
      notes: notesInput.value.trim(),
    };

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Không thể gửi yêu cầu đặt lịch.');
    }

    showToast('Đặt lịch thành công!', 'success');
    validationText.textContent = '';
    locationInput.value = '';
    notesInput.value = '';
    shootTitleInput.value = '';
    shootDescriptionInput.value = '';
    minBudgetInput.value = '900000';
    maxBudgetInput.value = '1700000';
    state.selectedDate = '';
    state.selectedTime = '';
    renderCalendar();
    renderTimeSlots();
    updateSummary();
  } catch (error) {
    showToast(error.message || 'Có lỗi xảy ra.', 'error');
    validationText.textContent = error.message || 'Có lỗi xảy ra.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Xác nhận yêu cầu';
  }
}

document.getElementById('prevMonthBtn').addEventListener('click', () => {
  const d = new Date(state.calendarYear, state.calendarMonth - 1, 1);
  state.calendarMonth = d.getMonth();
  state.calendarYear = d.getFullYear();
  renderCalendar();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
  const d = new Date(state.calendarYear, state.calendarMonth + 1, 1);
  state.calendarMonth = d.getMonth();
  state.calendarYear = d.getFullYear();
  renderCalendar();
});

locationInput.addEventListener('input', updateSummary);
shootTitleInput.addEventListener('input', () => {
  validationText.textContent = '';
});
shootDescriptionInput.addEventListener('input', () => {
  validationText.textContent = '';
});
minBudgetInput.addEventListener('input', () => {
  validationText.textContent = '';
});
maxBudgetInput.addEventListener('input', () => {
  validationText.textContent = '';
});
submitBtn.addEventListener('click', submitBooking);

renderPackages();
renderCalendar();
renderTimeSlots();
updateSummary();
