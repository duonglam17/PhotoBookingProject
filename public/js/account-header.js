(() => {
  const accountLink = document.querySelector('[data-account-link]');
  if (!accountLink || !localStorage.getItem('token')) return;

  let role = localStorage.getItem('userRole');
  let profileHref = role === 'photographer'
    ? '/pages/photographer-profile.html?me=1'
    : '/pages/my-bookings.html';
  const savedName = localStorage.getItem('userFullName');

  function showSignedInAccount(name) {
    accountLink.href = profileHref;
    accountLink.classList.add('signed-in-name');
    accountLink.textContent = name || 'Tài khoản';
    accountLink.title = name || 'Tài khoản';
    accountLink.setAttribute('aria-label', `Tài khoản: ${name || 'Tài khoản'}`);

    const menuWrapper = document.createElement('span');
    menuWrapper.className = 'account-menu-wrapper';
    accountLink.parentNode.insertBefore(menuWrapper, accountLink);
    menuWrapper.append(accountLink);

    const accountMenu = document.createElement('div');
    accountMenu.className = 'account-menu';
    accountMenu.setAttribute('role', 'menu');
    accountMenu.hidden = true;

    const profileItem = document.createElement('a');
    profileItem.href = profileHref;
    profileItem.textContent = 'Hồ sơ của tôi';
    profileItem.setAttribute('role', 'menuitem');

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.textContent = 'Đăng xuất';
    logoutButton.setAttribute('role', 'menuitem');
    logoutButton.addEventListener('click', () => {
      ['token', 'userId', 'userRole', 'userFullName'].forEach((key) => localStorage.removeItem(key));
      window.location.href = '/pages/auth.html';
    });

    accountMenu.append(profileItem, logoutButton);
    menuWrapper.append(accountMenu);
    accountLink.setAttribute('aria-haspopup', 'menu');
    accountLink.setAttribute('aria-expanded', 'false');
    accountLink.addEventListener('click', (event) => {
      event.preventDefault();
      accountMenu.hidden = !accountMenu.hidden;
      accountLink.setAttribute('aria-expanded', String(!accountMenu.hidden));
      if (!accountMenu.hidden) profileItem.focus();
    });

    document.addEventListener('click', (event) => {
      if (!menuWrapper.contains(event.target)) {
        accountMenu.hidden = true;
        accountLink.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !accountMenu.hidden) {
        accountMenu.hidden = true;
        accountLink.setAttribute('aria-expanded', 'false');
        accountLink.focus();
      }
    });
  }

  if (savedName) {
    showSignedInAccount(savedName);
    return;
  }

  accountLink.textContent = 'Đang tải...';
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
      if (user.role) {
        role = user.role;
        localStorage.setItem('userRole', role);
        profileHref = role === 'photographer'
          ? '/pages/photographer-profile.html?me=1'
          : '/pages/my-bookings.html';
      }
      showSignedInAccount(user.fullName);
    })
    .catch(() => {
      accountLink.textContent = 'Đăng nhập';
      accountLink.href = '/pages/auth.html';
      accountLink.classList.remove('signed-in-name');
    });
})();
