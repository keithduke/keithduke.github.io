/* ════════════════════════════════════════════
   UI.JS — Shared UI utilities
════════════════════════════════════════════ */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'default'|'success'|'error'} type
 * @param {number} duration ms
 */
export function showToast(message, type = 'default', duration = 2400) {
  const stack = document.getElementById('toastStack');
  const toast = document.createElement('div');
  toast.className = `toast${type !== 'default' ? ` toast--${type}` : ''}`;
  toast.textContent = message;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
