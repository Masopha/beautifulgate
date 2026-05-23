/* ============================================================
   auth.js — Beautiful Gate JWT Session Manager
   Include BEFORE main.js on protected pages
============================================================ */

(function() {
  'use strict';

  const TOKEN_KEY = 'bgl_auth_token';
  const USER_KEY = 'bgl_user';

  // ── Token management functions ──
  function saveToken(token) {
    try { 
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch(e) {}
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch(e) { return null; }
  }

  function saveUser(user) {
    try { if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
          else localStorage.removeItem(USER_KEY);
    } catch(e) {}
  }

  function getUser() {
    try { const u = localStorage.getItem(USER_KEY); return u ? JSON.parse(u) : null; } catch(e) { return null; }
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // ── Make authenticated fetch (adds JWT header automatically) ──
  window.authFetch = async function(url, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(url, {
      ...options,
      headers,
      credentials: 'omit' // No cookies needed with JWT!
    });
  };

  // ── Verify token with server ──
  async function verifyTokenOnServer(token) {
    try {
      const res = await fetch(window.API_BASE_URL + '/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { valid: false };
    }
  }

  // ── Main session check ──
  async function checkSession() {
    const token = getToken();
    const savedUser = getUser();
    
    if (!token || !savedUser) {
      return { loggedIn: false };
    }
    
    try {
      const result = await verifyTokenOnServer(token);
      if (result.valid) {
        // Update user data if needed
        if (result.user) {
          saveUser(result.user);
          return { loggedIn: true, user: result.user };
        }
        return { loggedIn: true, user: savedUser };
      } else {
        clearAuth();
        return { loggedIn: false };
      }
    } catch (err) {
      // If server unreachable but we have token, assume logged in (offline mode)
      if (savedUser) {
        return { loggedIn: true, user: savedUser };
      }
      return { loggedIn: false };
    }
  }

  // ── Login function (stores token and user) ──
  window.authLogin = async function(username, password, role) {
    try {
      const res = await fetch(window.API_BASE_URL + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
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

  // ── Logout function ──
  window.authLogout = async function(userId) {
    clearAuth();
    try {
      await fetch(window.API_BASE_URL + '/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
    } catch(e) {}
  };

  // ── Get current user (synchronous) ──
  window.getCurrentUser = function() {
    return getUser();
  };

  // ── Get current token ──
  window.getAuthToken = function() {
    return getToken();
  };

  // ── Initialize: check session on page load ──
  (async function init() {
    const session = await checkSession();
    window.BGL_SESSION = session.user || null;
    
    if (!session.loggedIn) {
      // Only redirect if we're on a protected page
      const protectedPages = ['index.html', 'gallery.html', 'admin.html'];
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      
      if (protectedPages.includes(currentPage) && currentPage !== 'login.html' && currentPage !== 'register.html') {
        // Check if we're on admin.html - redirect to login
        if (currentPage === 'admin.html') {
          window.location.href = 'login.html';
          return;
        }
        // For index/gallery, we allow but show limited features
        // (auth.js is included but not enforced for public viewing)
      }
    }
    
    // If on admin page but not admin, redirect
    if (window.location.pathname.includes('admin.html')) {
      if (!session.loggedIn || session.user?.role !== 'admin') {
        window.location.href = 'login.html';
        return;
      }
    }
    
    // Add user info to navbar if user is logged in
    if (session.loggedIn && session.user && document.querySelector('.nav-links')) {
      addUserToNavbar(session.user);
    }
  })();

  function addUserToNavbar(user) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    if (document.getElementById('nav-user-info')) return;

    const fullName = user.fullName || user.username || 'User';
    const isAdmin = user.role === 'admin';

    const liUser = document.createElement('li');
    liUser.id = 'nav-user-info';
    liUser.innerHTML = `<span style="font-size:0.8rem;color:var(--orange-light);padding:0 0.5rem;">
      👋 ${escapeHtml(fullName)}
    </span>`;

    const liLogout = document.createElement('li');
    liLogout.innerHTML = `<a onclick="handleLogout()" style="cursor:pointer;color:var(--brown-light);font-size:0.8rem;">Logout</a>`;

    navLinks.appendChild(liUser);
    navLinks.appendChild(liLogout);
  }

  window.handleLogout = async function() {
    const user = getUser();
    if (confirm('Are you sure you want to logout?')) {
      await authLogout(user?.id);
      window.location.href = 'login.html';
    }
  };

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
