/* ================================================================
   OPERA TAIPEI — JAVASCRIPT
   Handles all interactive behaviour:
   - Navigation shrink on scroll
   - Mobile hamburger menu toggle
   - Menu tab switching
   - Fade-in animation on scroll (IntersectionObserver)
   - Image error fallback

   Written defensively: every DOM query is null-checked so the
   page never crashes if an element is missing or renamed.

   NOTE: Content sections use CSS animation as a fallback, so
   they will always become visible even if this script fails.
================================================================ */


/* ================================================================
   DOM REFERENCES
================================================================ */
const navbar          = document.getElementById('navbar');
const hamburgerButton = document.getElementById('hamburger');
const mobileMenu      = document.getElementById('mobile-menu');
const mobileNavLinks  = document.querySelectorAll('.mobile-nav-link');
const menuTabButtons  = document.querySelectorAll('.menu-tab');
const menuPanels      = document.querySelectorAll('.menu-panel');
const fadeInElements  = document.querySelectorAll('.fade-in');
const allImages       = document.querySelectorAll('img');


/* ================================================================
   NAV SHRINK ON SCROLL
   Adds "scrolled" class after user scrolls past the hero.
================================================================ */
const SCROLL_THRESHOLD = 80;

if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
  });
}


/* ================================================================
   MOBILE HAMBURGER MENU
   Toggles the mobile dropdown and animates the hamburger icon.
================================================================ */
if (hamburgerButton && mobileMenu) {

  hamburgerButton.addEventListener('click', () => {
    hamburgerButton.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburgerButton.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });

}


/* ================================================================
   MENU TAB SWITCHING
   data-tab attribute on buttons maps to id="tab-{value}" panels.
================================================================ */
if (menuTabButtons.length > 0) {

  menuTabButtons.forEach(tabButton => {
    tabButton.addEventListener('click', () => {
      menuTabButtons.forEach(btn => btn.classList.remove('active'));
      menuPanels.forEach(panel => panel.classList.remove('active'));
      tabButton.classList.add('active');
      const targetPanel = document.getElementById('tab-' + tabButton.dataset.tab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

}


/* ================================================================
   FADE-IN ON SCROLL
   Uses IntersectionObserver to add .visible when elements enter
   the viewport. Falls back to revealing all elements immediately
   if IntersectionObserver is unsupported.

   The CSS also has a 0.5s animation fallback so content is ALWAYS
   visible even if this entire script block never executes.
================================================================ */
function revealElement(element) {
  element.classList.add('visible');
}

if (fadeInElements.length > 0) {

  if ('IntersectionObserver' in window) {

    const observerOptions = {
      threshold:  0.05,
      rootMargin: '0px 0px -20px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          revealElement(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    fadeInElements.forEach(el => observer.observe(el));

    /* Also reveal anything already in the viewport on page load */
    setTimeout(() => {
      fadeInElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          revealElement(el);
        }
      });
    }, 100);

  } else {
    /* Immediate fallback for browsers without IntersectionObserver */
    fadeInElements.forEach(revealElement);
  }

}


/* ================================================================
   IMAGE ERROR FALLBACK
   Hides broken images and shows a styled placeholder via .img-error.
================================================================ */
allImages.forEach(img => {

  /* Already broken when script runs */
  if (img.complete && img.naturalWidth === 0) {
    img.style.display = 'none';
    if (img.parentElement) img.parentElement.classList.add('img-error');
  }

  /* Future failures */
  img.addEventListener('error', () => {
    img.style.display = 'none';
    if (img.parentElement) img.parentElement.classList.add('img-error');
  });

});


/* ================================================================
   DUAL LANGUAGE — i18n
   Loads translations.json, then wires up the EN / 中文 buttons.

   Two attribute conventions:
     data-i18n="key"       → sets element.textContent
     data-i18n-html="key"  → sets element.innerHTML  (allows <em>, <br>)

   CTA buttons (Instagram, Email, FB, IG, Maps) have no data-i18n
   attribute and are therefore never touched.
================================================================ */
(function () {
  'use strict';

  let translations = null;
  let currentLang  = 'en';

  /* -- Apply a language to the whole page -- */
  function applyLang(lang) {
    if (!translations || !translations[lang]) { return; }

    const dict = translations[lang];

    /* Plain-text nodes */
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        el.textContent = dict[key];
      }
    });

    /* HTML nodes (contain <em>, <br>, <span>, etc.) */
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-html');
      if (Object.prototype.hasOwnProperty.call(dict, key)) {
        el.innerHTML = dict[key];
      }
    });

    /* Update <html lang="…"> for accessibility and SEO */
    document.documentElement.lang = (lang === 'zh') ? 'zh-Hant' : 'en';

    currentLang = lang;
  }

  /* -- Wire up the EN / 中文 toggle buttons -- */
  function initLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const lang = btn.getAttribute('data-lang');
        if (lang === currentLang) { return; }

        /* Update active state */
        document.querySelectorAll('.lang-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');

        applyLang(lang);
      });
    });
  }

  /* -- Load translations.json then bootstrap -- */
  fetch('translations.json')
    .then(function (res) {
      if (!res.ok) { throw new Error('translations.json fetch failed: ' + res.status); }
      return res.json();
    })
    .then(function (data) {
      translations = data;
      initLangButtons();
      /* Default language is EN — page HTML is already in EN, no need to re-apply */
    })
    .catch(function (err) {
      console.warn('i18n: could not load translations —', err.message);
      /* Page remains in English; lang buttons are visible but do nothing */
    });

}());
