/* =============================================
   BEAUTIFUL GATE LESOTHO — MAIN JAVASCRIPT
   ============================================= */

'use strict';

// ─── DOM Ready ───
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initCursor();
  initNavbar();
  initMobileMenu();
  initHeroParticles();
  initScrollReveal();
  initCounters();
  initDonateAmounts();
  initBackToTop();
  initAnnouncementBar();
  initSmoothLinks();
  initFormHandling();
});
document.addEventListener('click', (e) => {
const card = e.target.closest('.v-card');
if (!card) return;
const video = card.querySelector('video');
if (!video) return;
// toggle play/pause and expand thumbnail if needed
if (video.paused) {
video.play().catch(()=>{}); // ignore play promise errors
} else {
video.pause();
video.currentTime = 0;
}
});
// ─── LOADER ───
function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      document.body.style.overflow = '';
    }, 2400);
  });

  // Prevent scroll during load
  document.body.style.overflow = 'hidden';
}

// ─── CUSTOM CURSOR ───
function initCursor() {
  const cursor = document.querySelector('.cursor');
  const follower = document.querySelector('.cursor-follower');
  if (!cursor || !follower) return;

  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
  });

  // Smooth follower
  function animateFollower() {
    followerX += (mouseX - followerX) * 0.12;
    followerY += (mouseY - followerY) * 0.12;
    follower.style.left = followerX + 'px';
    follower.style.top = followerY + 'px';
    requestAnimationFrame(animateFollower);
  }
  animateFollower();

  // Hover effects
  const hoverTargets = document.querySelectorAll('a, button, .program-card, .story-featured, .story-mini, .involved-card, .amount-btn');
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hover');
      follower.classList.add('hover');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hover');
      follower.classList.remove('hover');
    });
  });
}

// ─── NAVBAR ───
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const scrollThreshold = 60;

  function updateNav() {
    if (window.scrollY > scrollThreshold) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // Active link on scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[data-section]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.dataset.section === id) link.classList.add('active');
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));
}

// ─── MOBILE MENU ───
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });

  mobileMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ─── HERO PARTICLES ───
function initHeroParticles() {
  const container = document.querySelector('.particles-container');
  if (!container) return;

  const count = 28;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    const size = Math.random() * 6 + 2;
    const left = Math.random() * 100;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 15;
    const opacity = Math.random() * 0.15 + 0.05;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      bottom: -20px;
      animation-duration: ${duration}s;
      animation-delay: -${delay}s;
      opacity: ${opacity};
    `;
    container.appendChild(p);
  }
}

// ─── SCROLL REVEAL ───
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

// ─── COUNTER ANIMATION ───
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const duration = 2200;
  const isDecimal = String(target).includes('.');
  const start = performance.now();

  function update(timestamp) {
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // cubic ease out
    const current = target * eased;

    el.textContent = prefix + (isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString()) + suffix;

    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = prefix + (isDecimal ? target.toFixed(1) : target.toLocaleString()) + suffix;
  }

  requestAnimationFrame(update);
}

// ─── DONATE AMOUNT BUTTONS ───
function initDonateAmounts() {
  const btns = document.querySelectorAll('.amount-btn');
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Animate progress bars when in view
  const bars = document.querySelectorAll('.breakdown-bar');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        bars.forEach(bar => {
          const width = bar.dataset.width;
          setTimeout(() => { bar.style.width = width; }, 300);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.4 });

  const donateSection = document.getElementById('donate');
  if (donateSection) observer.observe(donateSection);
}

// ─── BACK TO TOP ───
function initBackToTop() {
  const btn = document.getElementById('back-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ─── ANNOUNCEMENT BAR ───
function initAnnouncementBar() {
  const bar = document.querySelector('.announcement-bar');
  const closeBtn = bar?.querySelector('.close-bar');
  if (!closeBtn) return;

  closeBtn.addEventListener('click', () => {
    bar.style.maxHeight = bar.offsetHeight + 'px';
    requestAnimationFrame(() => {
      bar.style.transition = 'max-height 0.4s ease, opacity 0.4s ease';
      bar.style.maxHeight = '0';
      bar.style.opacity = '0';
      bar.style.overflow = 'hidden';
    });
    setTimeout(() => bar.remove(), 400);
  });
}

// ─── SMOOTH SCROLL LINKS ───
function initSmoothLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navH = document.getElementById('navbar')?.offsetHeight || 80;
        const top = target.getBoundingClientRect().top + window.scrollY - navH - 20;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ─── CONTACT FORM ───
function initFormHandling() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn      = form.querySelector('[type="submit"]');
    const original = btn.innerHTML;

    // Gather fields — form uses fname + lname separately
    const fname   = (form.querySelector('#fname')?.value   || '').trim();
    const lname   = (form.querySelector('#lname')?.value   || '').trim();
    const email   = (form.querySelector('#email')?.value   || '').trim();
    const subject = (form.querySelector('#subject')?.value || '').trim();
    const message = (form.querySelector('#message')?.value || '').trim();

    if (!fname || !email || !subject || !message) {
      btn.innerHTML = '⚠ Please fill in all required fields.';
      btn.style.background = 'var(--brown-light)';
      setTimeout(() => { btn.innerHTML = original; btn.style.background = ''; }, 3000);
      return;
    }

    btn.innerHTML = `<span>Sending…</span>`;
    btn.disabled  = true;

    try {
      const res  = await fetch(window.API_BASE_URL + '/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fullName: (fname + ' ' + lname).trim(),
          email,
          subject,
          message
        })
      });

      const data = await res.json();

      if (data.success) {
        btn.innerHTML      = `✓ Message sent! We'll be in touch soon.`;
        btn.style.background = 'var(--teal)';
        form.reset();
      } else {
        btn.innerHTML      = `⚠ ${data.message || 'Could not send. Please try again.'}`;
        btn.style.background = 'var(--brown-light)';
      }
    } catch (err) {
      console.error('[BGL] Contact form error:', err);
      btn.innerHTML      = '⚠ Could not reach server. Please try again later.';
      btn.style.background = 'var(--brown-light)';
    }

    setTimeout(() => {
      btn.innerHTML      = original;
      btn.style.background = '';
      btn.disabled       = false;
    }, 4000);
  });
}

// ─── PARALLAX on Hero ───
window.addEventListener('scroll', () => {
  const hero = document.getElementById('hero');
  if (!hero) return;
  const scrollY = window.scrollY;
  const blobs = hero.querySelectorAll('.hero-blob');
  blobs.forEach((blob, i) => {
    const speed = (i + 1) * 0.08;
    blob.style.transform = `translate(0, ${scrollY * speed}px)`;
  });
}, { passive: true });

// ─── Image lazy loading graceful fallback ───
document.querySelectorAll('img[data-src]').forEach(img => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      observer.disconnect();
    }
  });
  observer.observe(img);
});
// ─── UPDATED: Back to top supports both id variants ───
(function() {
  const btn = document.getElementById('back-top') || document.getElementById('btt');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
    btn.classList.toggle('show', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// ─── SCROLL REVEAL: also handle .rv .rl .rr classes ───
(function() {
  const els = document.querySelectorAll('.rv, .rl, .rr');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
})();

// ─── NAVBAR: support both #navbar and #nav ids ───
(function() {
  const nav = document.getElementById('navbar') || document.getElementById('nav');
  if (!nav) return;
  function updateNav() {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
      nav.classList.add('solid');
    } else {
      nav.classList.remove('scrolled');
      nav.classList.remove('solid');
    }
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();
})();