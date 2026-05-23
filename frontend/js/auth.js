/* ============================================================
   auth.js — Beautiful Gate Session Guard
   Include BEFORE main.js on protected pages (index.html, gallery.html)
============================================================ */
(async function () {
  'use strict';

  // ── Small helper: store session info locally as backup ──
  function saveLocalSession(user) {
    try { localStorage.setItem('bgl_user', JSON.stringify(user)); } catch(e) {}
  }
  function getLocalSession() {
    try { const u = localStorage.getItem('bgl_user'); return u ? JSON.parse(u) : null; } catch(e) { return null; }
  }
  function clearLocalSession() {
    try { localStorage.removeItem('bgl_user'); } catch(e) {}
  }

  // ── Check session with retry (cross-site cookies can be slow) ──
  async function checkSession(retries) {
    for (let i = 0; i <= retries; i++) {
      try {
        const res  = await fetch(window.API_BASE_URL + '/api/session', {
          credentials: 'include',
          cache: 'no-store'
        });
        if (!res.ok) throw new Error('Network response not ok');
        return await res.json();
      } catch (err) {
        if (i === retries) throw err;
        // wait 600ms then retry
        await new Promise(r => setTimeout(r, 600));
      }
    }
  }

  try {
    const data = await checkSession(2); // up to 3 attempts

    if (!data.loggedIn) {
      // Before redirecting, check if we have a local fallback
      const local = getLocalSession();
      if (local) {
        // Local record says logged in but server disagrees —
        // likely the Render free-tier instance woke up cold.
        // Try one final time after 1.5s
        await new Promise(r => setTimeout(r, 1500));
        const retry = await checkSession(1);
        if (!retry.loggedIn) {
          clearLocalSession();
          window.location.href = 'login.html';
          return;
        }
        // Server now agrees — continue with retry data
        Object.assign(data, retry);
      } else {
        window.location.href = 'login.html';
        return;
      }
    }

    if (data.user.role === 'admin') {
      window.location.href = 'admin.html';
      return;
    }

    // Save to localStorage so we can do the cold-start retry above
    saveLocalSession(data.user);
    window.BGL_SESSION = data.user;

    // Add user name + logout to navbar once DOM is ready
    function addUserToNavbar() {
      const navLinks = document.querySelector('.nav-links');
      if (!navLinks) return;
      if (document.getElementById('nav-user-info')) return;

      const fullName = data.user.fullName || data.user.username || 'Visitor';

      const liUser = document.createElement('li');
      liUser.id = 'nav-user-info';
      liUser.innerHTML = `<span style="font-size:0.8rem;color:var(--orange-light);padding:0 0.5rem;">
        ${escapeHtml(fullName)}
      </span>`;

      const liLogout = document.createElement('li');
      liLogout.innerHTML = `<a onclick="bglLogout()" style="cursor:pointer;color:var(--brown-light);font-size:0.8rem;">Logout</a>`;

      navLinks.appendChild(liUser);
      navLinks.appendChild(liLogout);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addUserToNavbar);
    } else {
      addUserToNavbar();
    }

  } catch (err) {
    console.error('Session check failed:', err);
    // Network completely failed — don't redirect to login immediately,
    // show a friendly message instead
    const local = getLocalSession();
    if (!local) {
      window.location.href = 'login.html';
    } else {
      // Show a non-blocking banner — user stays on page
      document.addEventListener('DOMContentLoaded', () => {
        const banner = document.createElement('div');
        banner.style.cssText = `
          position:fixed;top:0;left:0;right:0;z-index:9999;
          background:#f97316;color:#fff;text-align:center;
          padding:10px;font-size:0.85rem;font-family:sans-serif;
        `;
        banner.textContent = '⚠️ Cannot reach server — some features may be unavailable. Refresh to try again.';
        document.body.prepend(banner);
      });
      window.BGL_SESSION = local;
    }
  }

  window.bglLogout = async function () {
    if (!confirm('Are you sure you want to logout?')) return;
    clearLocalSession();
    try {
      await fetch(window.API_BASE_URL + '/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    window.location.href = 'login.html';
  };

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
