const photographers = [
  { name: 'Itatripphoto', meta: 'Từ 1-3 năm · 6 lượt thích', image: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85', text: 'Vui tính, nhiều chuyện, các bạn muốn một bộ ảnh vui tươi thì ghé qua với mình nhé.' },
  { name: 'Nguyễn chụp film', meta: 'Từ 1-3 năm · Hà Nội', image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85', text: 'Mình là Nguyễn Minh, chuyên chụp những khoảnh khắc tự nhiên và nhiều cảm xúc.' },
  { name: 'Trịnh Hải Dương', meta: 'Trên 5 năm · TP.HCM', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=900&q=85', text: 'Photographer sống với đam mê, luôn sẵn sàng đồng hành cùng câu chuyện của bạn.' },
  { name: 'Linh Studio', meta: 'Từ 3-5 năm · Đà Nẵng', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85', text: 'Phong cách nhẹ nhàng, tự nhiên và ưu tiên những khoảnh khắc chân thật.' },
  { name: 'Mộc Nhiên Photo', meta: 'Từ 1-3 năm · Hà Nội', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85', text: 'Ghi lại những buổi gặp gỡ đời thường bằng màu ảnh trong trẻo và ấm áp.' },
];

const photographerGrid = document.getElementById('photographerGrid');
let photographerOffset = 0;

function renderPhotographers() {
  const visibleCount = window.innerWidth <= 560 ? 1 : 3;
  const cards = Array.from({ length: visibleCount }, (_, index) => photographers[(photographerOffset + index) % photographers.length]);
  photographerGrid.innerHTML = cards.map((photographer) => `
    <article class="photographer-card">
      <img src="${photographer.image}" alt="${photographer.name}" loading="lazy" />
      <div class="photographer-info">
        <h3>${photographer.name}</h3>
        <div class="photographer-meta">${photographer.meta}</div>
        <p>${photographer.text}</p>
        <a class="card-link" href="/pages/booking.html">Xem & Đặt lịch →</a>
      </div>
    </article>
  `).join('');
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
  photographerOffset = (photographerOffset - 1 + photographers.length) % photographers.length;
  renderPhotographers();
});

document.getElementById('nextPhotographer').addEventListener('click', () => {
  photographerOffset = (photographerOffset + 1) % photographers.length;
  renderPhotographers();
});

const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => backToTop.classList.toggle('visible', window.scrollY > 500));
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('resize', renderPhotographers);

renderPhotographers();