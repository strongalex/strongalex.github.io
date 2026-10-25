/*
  Small interactive details. Everything here is progressive enhancement: the site is fully
  readable and usable without this file. (The landing-page project helix lives in helix.js.)
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------------------- theme toggle */

  var toggle = document.querySelector('.theme-toggle');

  function storedTheme() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      var apply = function () {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
      };

      if (reduceMotion || !document.startViewTransition) { apply(); return; }

      // Circular reveal that grows out of the toggle button.
      var r = toggle.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

      root.setAttribute('data-vt', 'theme');
      var transition = document.startViewTransition(apply);
      transition.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function () {});
      transition.finished.finally(function () { root.removeAttribute('data-vt'); });
    });
  }

  // Follow the operating system's setting until the visitor picks a theme themselves.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!storedTheme()) root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });

  /* ------------------------------------------------------------ scroll reveal */

  var revealed = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealed.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    void root.offsetHeight; // commit the hidden state so the first reveal can transition
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        el.classList.add('is-in');
        // Once revealed, drop the reveal rules so hover transitions are not delayed.
        el.addEventListener('transitionend', function done(e) {
          if (e.target !== el || e.propertyName !== 'opacity') return;
          el.removeEventListener('transitionend', done);
          el.removeAttribute('data-reveal');
        });
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
    revealed.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------- section links on long pages */

  // Pages with three or more sections get a row of links to them, built from the
  // headings that are already on the page.
  var prose = document.querySelector('.page .prose');
  if (prose) {
    var heads = Array.prototype.slice.call(prose.querySelectorAll('h1:not(.subtitle), h2'));
    if (heads.length >= 3) {
      var jump = document.createElement('nav');
      jump.className = 'jump';
      jump.setAttribute('aria-label', 'Sections');
      var taken = {};
      heads.forEach(function (h) {
        if (!h.id) {
          var base = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
          var id = base, n = 2;
          while (taken[id] || document.getElementById(id)) id = base + '-' + n++;
          h.id = id;
        }
        taken[h.id] = true;
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent.trim();
        jump.appendChild(a);
      });
      prose.parentNode.insertBefore(jump, prose);
    }
  }

  /* ------------------------------------------- "G" toggles the layout grid */

  addEventListener('keydown', function (e) {
    if (e.key.toLowerCase() !== 'g' || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;
    root.classList.toggle('show-grid');
  });
})();
