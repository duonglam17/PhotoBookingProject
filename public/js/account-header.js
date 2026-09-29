(() => {
  const accountLink = document.querySelector('[data-account-link]');
  if (!accountLink || !localStorage.getItem('token')) return;

  const role = localStorage.getItem('userRole');
  const profileHref = role === 'photographer'
    ? '/pages/photographer-profile.html?me=1'
    : '/pages/my-bookings.html';
  const savedName = localStorage.getItem('userFullName');

  accountLink.href = profileHref;
  accountLink.classList.add('signed-in-name');

  if (savedName) {
    accountLink.textContent = savedName;
    accountLink.title = savedName;
    accountLink.setAttribute('aria-label', `Tài khoản: ${savedName}`);
    return;
  }

  accountLink.textContent = 'Tài khoản';
  fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  })
    .then((response) => {
      if (!response.ok) throw new Error('Phiên đăng nhập không còn hợp lệ.');
      return response.json();
    })
    .then((result) => {
      const user = result.user;
      if (!user?.fullName) throw new Error('Không tìm thấy tên tài khoản.');
      localStorage.setItem('userFullName', user.fullName);
      if (user.role) localStorage.setItem('userRole', user.role);
      accountLink.href = user.role === 'photographer'
        ? '/pages/photographer-profile.html?me=1'
        : '/pages/my-bookings.html';
      accountLink.textContent = user.fullName;
      accountLink.title = user.fullName;
      accountLink.setAttribute('aria-label', `Tài khoản: ${user.fullName}`);
    })
    .catch(() => {
      accountLink.textContent = 'Đăng nhập';
      accountLink.href = '/pages/auth.html';
      accountLink.classList.remove('signed-in-name');
    });
})();
