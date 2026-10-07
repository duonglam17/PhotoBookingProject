const requestCodeForm = document.getElementById('requestCodeForm');
const verifyCodeForm = document.getElementById('verifyCodeForm');
const resetEmailInput = document.getElementById('resetEmail');
const resetStatus = document.getElementById('resetStatus');
const sendCodeButton = document.getElementById('sendCodeButton');
const resendCodeButton = document.getElementById('resendCodeButton');
let resendCountdown;

function showStatus(message, success = false) {
  resetStatus.textContent = message;
  resetStatus.classList.toggle('success', success);
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Không thể hoàn thành yêu cầu.');
  return result;
}

function startResendCooldown(seconds = 60) {
  let remaining = seconds;
  resendCodeButton.disabled = true;
  clearInterval(resendCountdown);
  const updateButton = () => {
    resendCodeButton.textContent = remaining > 0 ? `Gửi lại mã sau ${remaining}s` : 'Gửi lại mã';
    if (remaining <= 0) {
      resendCodeButton.disabled = false;
      clearInterval(resendCountdown);
    }
    remaining -= 1;
  };
  updateButton();
  resendCountdown = setInterval(updateButton, 1000);
}

async function requestCode() {
  const email = resetEmailInput.value.trim();
  if (!email) {
    showStatus('Vui lòng nhập email tài khoản.');
    resetEmailInput.focus();
    return;
  }
  sendCodeButton.disabled = true;
  showStatus('Đang gửi mã xác nhận...', true);
  try {
    const result = await postJson('/api/auth/forgot-password', { email });
    document.getElementById('sentEmailLabel').textContent = email;
    document.getElementById('emailStep').classList.add('active');
    document.getElementById('codeStep').classList.add('active');
    requestCodeForm.hidden = true;
    verifyCodeForm.hidden = false;
    document.getElementById('resetIntro').textContent = 'Nhập mã xác nhận trong email và chọn mật khẩu mới.';
    showStatus(result.message, true);
    document.getElementById('verificationCode').focus();
    startResendCooldown();
  } catch (error) {
    showStatus(error.message || 'Chưa gửi được mã. Vui lòng thử lại.');
  } finally {
    sendCodeButton.disabled = false;
  }
}

async function resendCode() {
  resendCodeButton.disabled = true;
  showStatus('Đang gửi lại mã...', true);
  try {
    const result = await postJson('/api/auth/forgot-password', { email: resetEmailInput.value.trim() });
    showStatus(result.message, true);
    startResendCooldown();
  } catch (error) {
    showStatus(error.message || 'Chưa gửi lại được mã.');
    resendCodeButton.disabled = false;
    resendCodeButton.textContent = 'Gửi lại mã';
  }
}

async function resetPassword(event) {
  event.preventDefault();
  const code = document.getElementById('verificationCode').value.trim();
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  if (newPassword !== confirmPassword) {
    showStatus('Mật khẩu xác nhận chưa trùng khớp.');
    return;
  }
  const button = document.getElementById('resetPasswordButton');
  button.disabled = true;
  showStatus('Đang cập nhật mật khẩu...', true);
  try {
    const result = await postJson('/api/auth/reset-password', {
      email: resetEmailInput.value.trim(),
      code,
      newPassword,
    });
    verifyCodeForm.hidden = true;
    document.getElementById('stepTrack').hidden = true;
    document.getElementById('resetTitle').textContent = 'Đổi mật khẩu thành công';
    document.getElementById('resetIntro').textContent = result.message;
    showStatus('Mật khẩu mới đã được lưu an toàn.', true);
    document.getElementById('returnToLogin').hidden = false;
    clearInterval(resendCountdown);
  } catch (error) {
    showStatus(error.message || 'Không thể đổi mật khẩu.');
  } finally {
    button.disabled = false;
  }
}

requestCodeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  requestCode();
});
verifyCodeForm.addEventListener('submit', resetPassword);
resendCodeButton.addEventListener('click', resendCode);
document.getElementById('verificationCode').addEventListener('input', (event) => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
});
