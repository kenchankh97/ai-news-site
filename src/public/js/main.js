'use strict';

// ---- Mobile Menu ----
(function () {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  const iconOpen = document.getElementById('menuIconOpen');
  const iconClose = document.getElementById('menuIconClose');
  if (!btn || !menu) return;

  let open = false;
  btn.addEventListener('click', () => {
    open = !open;
    menu.classList.toggle('hidden', !open);
    iconOpen.classList.toggle('hidden', open);
    iconClose.classList.toggle('hidden', !open);
    btn.setAttribute('aria-expanded', String(open));
  });
})();

// ---- Toast Notifications ----
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const colors = {
    success: 'bg-green-900 border-green-700 text-green-100',
    error:   'bg-red-900 border-red-700 text-red-100',
    info:    'bg-indigo-900 border-indigo-700 text-indigo-100',
    warning: 'bg-yellow-900 border-yellow-700 text-yellow-100'
  };
  const icons = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    error:   '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    info:    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>'
  };

  const toast = document.createElement('div');
  toast.className = `toast pointer-events-auto ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      ${icons[type] || icons.info}
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ---- Manual News Refresh ----
async function triggerRefresh(clickedBtn) {
  console.log('[Debug] triggerRefresh called');
  const btn   = clickedBtn || document.getElementById('refreshBtn');
  const label = document.getElementById('refreshLabel');
  const icon  = document.getElementById('refreshIcon');

  const csrfMeta  = document.querySelector('meta[name="csrf-token"]');
  const csrfToken = csrfMeta?.content;
  console.log('[Debug] csrf meta:', csrfMeta ? 'found' : 'MISSING', '| token length:', csrfToken?.length ?? 0);

  if (!csrfToken) {
    showToast('Session expired. Please reload the page.', 'error');
    return;
  }

  console.log('[Debug] Sending POST /api/news/refresh ...');
  // Disable button and show spinner
  btn.disabled = true;
  if (label) label.textContent = 'Fetching...';
  if (icon) {
    icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>';
    icon.classList.add('animate-spin');
  }

  try {
    const res = await fetch('/api/news/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
      }
    });

    const data = await res.json();

    if (res.status === 429) {
      showToast('Please wait before refreshing again.', 'warning');
    } else if (res.status === 401) {
      showToast('Session expired. Please reload the page and log in again.', 'warning');
    } else if (data.success) {
      if (data.articlesAdded > 0) {
        showToast(`${data.message} Reloading...`, 'success');
        setTimeout(() => window.location.reload(), 1500);
        return;
      } else {
        showToast(data.message, 'info');
      }
    } else {
      showToast(data.error || data.message || 'Refresh failed.', 'error');
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    if (label) {
      const lang = window._lang || 'en';
      label.textContent = lang === 'zh-TW' ? '更新新聞' : lang === 'zh-CN' ? '更新新闻' : 'Refresh';
    }
    if (icon) icon.classList.remove('animate-spin');
  }
}

// ---- Bind refresh button event listeners ----
// (cannot use onclick= attributes due to CSP script-src-attr restrictions)
(function () {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () { triggerRefresh(refreshBtn); });
  }

  const emptyStateBtn = document.getElementById('emptyStateRefreshBtn');
  if (emptyStateBtn) {
    emptyStateBtn.addEventListener('click', function () { triggerRefresh(emptyStateBtn); });
  }
})();

// ---- Auto-dismiss flash messages ----
(function () {
  const alerts = document.querySelectorAll('[role="alert"]');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transition = 'opacity 0.5s';
      setTimeout(() => alert.remove(), 500);
    }, 6000);
  });
})();
