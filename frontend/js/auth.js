/* ============================================================
   auth.js — Beautiful Gate JWT Session Manager
   FIX: Only include on protected pages (index, gallery, admin).
   Do NOT include on login.html or register.html.
   Must be included AFTER config.js and BEFORE main.js.
============================================================ */

(function () {
  'use strict';

  const TOKEN_KEY = 'bgl_auth_token';
  const USER_KEY  = 'bgl_user';

  /* ── Token helpers ── */
  function saveToken(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
  }
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function saveUser(user) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (e) {}
  }
  function getUser() {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch (e) { return null; }
  }
  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /* ── Authenticated fetch — auto-adds Bearer header ── */
  window.authFetch = async function (url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, headers, credentials: 'omit' });
  };

  /* ── Verify token with server ── */
  async function verifyTokenOnServer(token) {
    try {
      const res  = await fetch(window.API_BASE_URL + '/api/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token })
      });
      return await res.json();
    } catch (err) {
      // Server unreachable
      return { valid: false, offline: true };
    }
  }

  /* ── Check current session ── */
  async function checkSession() {
    const token     = getToken();
    const savedUser = getUser();

    // No local token at all → not logged in
    if (!token || !savedUser) return { loggedIn: false };

    const result = await verifyTokenOnServer(token);

    if (result.offline) {
      // Server unreachable — honour cached session so page doesn't break
      // (admin pages will still fail API calls, but won't redirect loop)
      console.warn('[BGL] Server unreachable, using cached session');
      return { loggedIn: true, user: savedUser };
    }

    if (result.valid) {
      if (result.user) saveUser(result.user);
      return { loggedIn: true, user: result.user || savedUser };
    }

    // Token invalid/expired
    clearAuth();
    return { loggedIn: false };
  }

  /* ── Public API ── */
  window.getCurrentUser = function () { return getUser(); };
  window.getAuthToken   = function () { return getToken(); };

  window.authLogin = async function (username, password, role) {
    try {
      const res  = await fetch(window.API_BASE_URL + '/api/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (data.success && data.token) {
        saveToken(data.token);
        saveUser(data.user);
        return { success: true, redirect: data.redirect };
      }
      return { success: false, message: data.message };
    } catch (err) {
      return { success: false, message: 'Cannot connect to server.' };
    }
  };

  window.authLogout = async function (userId) {
    clearAuth();
    try {
      await fetch(window.API_BASE_URL + '/api/logout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId })
      });
    } catch (e) {}
  };

  window.handleLogout = async function () {
    const user = getUser();
    if (confirm('Are you sure you want to logout?')) {
      await window.authLogout(user?.id);
      window.location.href = 'login.html';
    }
  };

  /* ── Determine current page ── */
  function currentPage() {
    const p = window.location.pathname.split('/').pop();
    return p || 'index.html';
  }

  /* ── Add user info to navbar ── */
  function addUserToNavbar(user) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || document.getElementById('nav-user-info')) return;

    const name    = user.fullName || user.username || 'User';
    const liUser  = document.createElement('li');
    liUser.id     = 'nav-user-info';
    liUser.innerHTML = `<span style="font-size:0.8rem;color:var(--orange-light);padding:0 0.5rem;">
      👋 ${escapeHtml(name)}
    </span>`;

    const liLogout = document.createElement('li');
    liLogout.innerHTML = `<a onclick="handleLogout()" style="cursor:pointer;color:var(--brown-light);font-size:0.8rem;">Logout</a>`;

    navLinks.appendChild(liUser);
    navLinks.appendChild(liLogout);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ── Init: runs on every page that includes auth.js ── */
  (async function init() {
    const page    = currentPage();
    const session = await checkSession();

    window.BGL_SESSION = session.user || null;

    // ── Admin page: must be logged in as admin ──
    if (page === 'admin.html') {
      if (!session.loggedIn || session.user?.role !== 'admin') {
        clearAuth();
        window.location.href = 'login.html';
        return;
      }
    }

    // ── index.html / gallery.html: enforce login ──
    // Change this block if you want public access without login
    if (page === 'index.html' || page === 'gallery.html' || page === '') {
      if (!session.loggedIn) {
        window.location.href = 'login.html';
        return;
      }
    }

    // ── If already logged in and on login/register, go home ──
    if ((page === 'login.html' || page === 'register.html') && session.loggedIn) {
      window.location.href = session.user?.role === 'admin' ? 'admin.html' : 'index.html';
      return;
    }

    // ── Add user to navbar on logged-in pages ──
    if (session.loggedIn && session.user) {
      addUserToNavbar(session.user);
    }
  })();

})();
