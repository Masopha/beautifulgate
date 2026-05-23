/* ============================================================
   auth.js — Beautiful Gate Session Guard
   Include BEFORE main.js on protected pages (index.html, gallery.html)
============================================================ */
(async function () {
  'use strict';

  try {
    const res  = await fetch(window.API_BASE_URL + '/api/session', { credentials: 'include' });
    const data = await res.json();

    if (!data.loggedIn) {
      window.location.href = 'login.html';
      return;
    }

    if (data.user.role === 'admin') {
      window.location.href = 'admin.html';
      return;
    }

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
    window.location.href = 'login.html';
  }

  window.bglLogout = async function () {
    if (!confirm('Are you sure you want to logout?')) return;
    try {
      await fetch(window.API_BASE_URL + '/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    window.location.href = 'login.html';
  };

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();