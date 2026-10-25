/*
  Small interactive details. Everything here is progressive enhancement: the site is fully
  readable and usable without this file, and pointer effects switch off for touch devices
  and for visitors who prefer reduced motion.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  function frame(fn) {
    var queued = false, lastEvent;
    return function (e) {
      lastEvent = e;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; fn(lastEvent); });
    };
  }

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
          { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function () {});
      transition.finished.finally(function () { root.removeAttribute('data-vt'); });
    });
  }

  // Follow the operating system's setting until the visitor picks a theme themselves.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!storedTheme()) root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  });

  /* ------------------------------------------------------------ text scramble */

  // Resolves a heading out of random glyphs, character by character. Each character is
  // pinned to its final width while it animates so the layout never jumps.
  var GLYPHS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';

  function scramble(el) {
    if (reduceMotion || el._scrambling) return;
    var text = el._text || (el._text = el.textContent.trim());
    if (!text) return;
    el._scrambling = true;

    var wrap = document.createElement('span');
    var cells = [];
    text.split(' ').forEach(function (word, i, words) {
      var w = document.createElement('span');
      w.style.cssText = 'display:inline-block;white-space:nowrap';
      word.split('').forEach(function (ch) {
        var c = document.createElement('span');
        c.textContent = ch;
        c._final = ch;
        cells.push(c);
        w.appendChild(c);
      });
      wrap.appendChild(w);
      if (i < words.length - 1) wrap.appendChild(document.createTextNode(' '));
    });

    el.setAttribute('aria-label', text);
    el.textContent = '';
    el.appendChild(wrap);

    var widths = cells.map(function (c) { return c.getBoundingClientRect().width; });
    cells.forEach(function (c, i) {
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'display:inline-block;text-align:center;width:' + widths[i] + 'px';
      c._start = Math.floor(Math.random() * 14);
      c._end = c._start + 10 + Math.floor(Math.random() * 18);
    });

    var tick = 0;
    (function step() {
      var done = 0;
      cells.forEach(function (c) {
        if (tick >= c._end) { c.textContent = c._final; done++; }
        else if (tick >= c._start) {
          if (!c._glyph || Math.random() < 0.3) c._glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          c.textContent = c._glyph;
        } else c.textContent = ' ';
      });
      tick++;
      if (done < cells.length) requestAnimationFrame(step);
      else {
        el.textContent = text;
        el.removeAttribute('aria-label');
        el._scrambling = false;
      }
    })();
  }

  var scramblers = document.querySelectorAll('[data-scramble]');
  if (finePointer) {
    scramblers.forEach(function (el) {
      el.addEventListener('pointerenter', function () { scramble(el); });
    });
  }

  /* ------------------------------------------------------------ scroll reveal */

  var revealed = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  function onShown(el) {
    var target = el.matches('[data-scramble]') ? el : el.querySelector('[data-scramble]');
    if (target) {
      var go = function () { setTimeout(function () { scramble(target); }, 200); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
    }
  }

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
        onShown(el);
        // Once revealed, drop the reveal rules so hover transitions are not delayed.
        el.addEventListener('transitionend', function done(e) {
          if (e.target !== el || e.propertyName !== 'opacity') return;
          el.removeEventListener('transitionend', done);
          el.removeAttribute('data-reveal');
        });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealed.forEach(function (el) { io.observe(el); });
  }

  if (!finePointer || reduceMotion) return;

  /* ------------------------------------------------- spotlight card borders */

  document.querySelectorAll('[data-spotlight-group]').forEach(function (group) {
    var cards = Array.prototype.slice.call(group.querySelectorAll('[data-spotlight]'));
    group.addEventListener('pointermove', frame(function (e) {
      cards.forEach(function (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    }), { passive: true });
  });

  /* -------------------------------------------- cursor-lit dot grid (hero) */

  var hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('pointermove', frame(function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }), { passive: true });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--mx', '-999px');
      hero.style.setProperty('--my', '-999px');
    });
  }

  /* ----------------------------------------------------- portrait 3D tilt */

  document.querySelectorAll('[data-tilt]').forEach(function (el) {
    var MAX = 11;
    el.addEventListener('pointermove', frame(function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add('is-active');
      el.style.setProperty('--ry', ((px - 0.5) * 2 * MAX).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((0.5 - py) * 2 * MAX).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    }), { passive: true });
    el.addEventListener('pointerleave', function () {
      el.classList.remove('is-active');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });

  /* ------------------------------------------------------ magnetic buttons */

  var magnets = Array.prototype.slice.call(document.querySelectorAll('[data-magnetic]')).map(function (el) {
    return { el: el, x: 0, y: 0 };
  });

  if (magnets.length) {
    addEventListener('pointermove', frame(function (e) {
      magnets.forEach(function (m) {
        var r = m.el.getBoundingClientRect();
        var cx = r.left + r.width / 2 - m.x, cy = r.top + r.height / 2 - m.y;
        var dx = e.clientX - cx, dy = e.clientY - cy;
        var reach = Math.max(r.width, r.height) / 2 + 40;
        if (Math.hypot(dx, dy) < reach) {
          m.x = dx * 0.3; m.y = dy * 0.3;
          m.el.style.transform = 'translate(' + m.x.toFixed(1) + 'px,' + m.y.toFixed(1) + 'px)';
        } else if (m.x || m.y) {
          m.x = 0; m.y = 0;
          m.el.style.transform = '';
        }
      });
    }), { passive: true });
  }

  /* ------------------------------------------- "G" toggles the layout grid */

  addEventListener('keydown', function (e) {
    if (e.key.toLowerCase() !== 'g' || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;
    root.classList.toggle('show-grid');
  });
})();
