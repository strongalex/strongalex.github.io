/*
  Project galleries wrapped around a slowly turning double helix.

  Inspired by the "double helix gallery" idea (two strands of cards on the surface of a
  rotating cylinder). This is an independent implementation that works with real links:
  cards are actual anchors, keyboard focus rotates a card to the front, and touch /
  reduced-motion visitors get sensible behaviour.

  Two uses, picked per host element:
    - Interactive (the landing page): cards come from the host's .helix__source list; drag to
      spin, hover or focus for details.
    - Decorative (data-helix-decor, e.g. the FRC page): a large, blurred helix behind the whole
      page, built from the images in data-helix-from. It is not interactive, is hidden from
      assistive technology, and drifts with the page's scroll position.

  Geometry: every card lives on one of two strands. A card's progress p runs 0..1 along the
  strand and wraps; its angle around the cylinder is p * TURNS * 2PI (+ PI for strand 2), and
  it is placed with rotateY(angle) translateZ(radius) translateY(y). Cards facing away fade
  (and, when interactive, blur) so the front of the helix reads clearly.
*/
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var TURNS = 2;                       // full rotations from one end of a strand to the other
  var STRANDS = 2;
  var FRICTION = 0.94;                 // per-frame velocity decay after a flick, at 60fps
  var FLOOR = 0.08;                    // minimum opacity of far-side cards
  var MAX_BLUR = 4;                    // px of blur on far-side cards (interactive only)
  var CARD_RATIO = 4 / 3;
  var PARALLAX = 0.4;                  // decorative helix moves at this fraction of scroll speed

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = matchMedia('(hover: none)');

  function wrap(v, n) { return ((v % n) + n) % n; }

  /* --------------------------------------------------------- collecting cards */

  function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
  }

  // Cards built from every image in the source element, each linked to the heading above it.
  // Only the first image of each heading is exposed to keyboards and screen readers, and none
  // are when the helix is decorative.
  function itemsFromContent(host, decor) {
    var root = document.querySelector(host.getAttribute('data-helix-from'));
    if (!root) return [];
    var thumbs = host.getAttribute('data-thumbs') || '';
    var items = [], seen = {}, current = null;

    Array.prototype.forEach.call(root.querySelectorAll('h1:not(.subtitle), h2, img'), function (node) {
      if (node.tagName !== 'IMG') {
        if (!node.id) node.id = slug(node.textContent);
        current = node;
        return;
      }
      if (!current) return;

      var title = current.textContent.trim();
      var alt = node.getAttribute('alt') || '';
      var original = node.currentSrc || node.src;
      var name = original.split('/').pop().replace(/\.[^.]+$/, '');

      var a = document.createElement('a');
      a.className = 'helix__card';
      a.href = '#' + current.id;
      a.draggable = false;
      a.setAttribute('aria-label', alt ? title + ': ' + alt : title);
      a.setAttribute('data-title', title);
      a.setAttribute('data-summary', alt);

      var img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      img.src = thumbs + name + '.jpg';
      // Use the small copy when there is one, the original image otherwise.
      img.addEventListener('error', function onerr() { img.removeEventListener('error', onerr); img.src = original; });
      a.appendChild(img);

      items.push({ el: a, primary: !decor && !seen[current.id] });
      seen[current.id] = true;
    });
    return items;
  }

  function itemsFromSource(host) {
    var source = host.querySelector('.helix__source');
    if (!source) return [];
    return Array.prototype.map.call(source.querySelectorAll('a'), function (a) { return { el: a, primary: true }; });
  }

  /* -------------------------------------------------------------- one helix */

  function init(host) {
    if (host.getAttribute('data-helix-ready')) return;

    var decor = host.hasAttribute('data-helix-decor');
    var stage = host.querySelector('.helix__stage');
    var caption = host.querySelector('.helix__caption');
    var items = host.hasAttribute('data-helix-from') ? itemsFromContent(host, decor) : itemsFromSource(host);
    if (!stage || !items.length) return;
    host.setAttribute('data-helix-ready', '1');

    var DRIFT = decor ? 0.04 : 0.2;                 // cards per second of ambient motion
    var maxBlur = decor ? 0 : MAX_BLUR;            // the decorative helix is blurred as a whole in CSS
    var N = items.length;
    var PER = N * Math.max(1, Math.ceil(16 / N));  // cards per strand: each project appears evenly

    /* ----------------------------------------------------------- build cards */

    var world = document.createElement('div');
    world.className = 'helix__world';
    stage.appendChild(world);

    var cards = [];
    for (var s = 0; s < STRANDS; s++) {
      for (var i = 0; i < PER; i++) {
        var item = items[i % N];
        var real = s === 0 && i < N && item.primary;
        var el = real ? item.el : item.el.cloneNode(true);
        if (!real) {
          // Repeats are decoration; only one real link per project is exposed to keyboards
          // and assistive technology.
          el.setAttribute('aria-hidden', 'true');
          el.setAttribute('tabindex', '-1');
        }
        world.appendChild(el);
        cards.push({ el: el, base: i, phase: s * Math.PI, strand: s, live: true });
      }
    }
    host.classList.add('is-live');

    // Crop an image to the card only when that costs little; otherwise show it whole so
    // photos and diagrams are never clipped through the middle.
    cards.forEach(function (c) {
      var img = c.el.querySelector('img');
      if (!img) return;
      var fit = function () {
        var r = img.naturalWidth / img.naturalHeight;
        if (r && Math.abs(Math.log(r / CARD_RATIO)) > 0.16) img.style.objectFit = 'contain';
      };
      if (img.complete && img.naturalWidth) fit(); else img.addEventListener('load', fit);
    });

    /* --------------------------------------------------------------- metrics */

    var view = { span: 0, radius: 0 };

    function measure() {
      var w = stage.clientWidth, h = stage.clientHeight;
      // Decorative cards are large: the helix is a soft wash of colour, not a gallery.
      var cardW = decor ? Math.max(150, Math.min(340, w * 0.24)) : Math.max(110, Math.min(220, w * 0.27));
      // Keep the whole cylinder (plus perspective growth on the near side) inside the box.
      var radius = Math.max(70, (w / 2 - cardW * 0.46) / 1.08);
      view.radius = radius;
      view.span = h * 1.5;
      host.style.setProperty('--card-w', cardW.toFixed(0) + 'px');
      host.style.setProperty('--card-h', (cardW / CARD_RATIO).toFixed(0) + 'px');
      host.style.setProperty('--perspective', Math.max(700, radius * 3.2).toFixed(0) + 'px');
    }

    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
    else addEventListener('resize', measure);

    /* ----------------------------------------------------------------- state */

    var travel = 0;          // strand progress offset, in cards (drift + drag + focus + scroll)
    var driftNow = reduceMotion.matches ? 0 : DRIFT; // eased toward 0 while hovering a card
    var velocity = 0;        // cards per second, from a flick
    var target = null;       // travel value to ease to (keyboard focus)
    var hovered = null;
    var focused = null;
    var tapped = null;
    var dragging = false;
    var moved = 0;
    var lastX = 0, lastT = 0;
    var visible = true;
    var last = performance.now();
    var lastScroll = scrollY;

    /* ----------------------------------------------------------------- frame */

    function render() {
      var radius = view.radius, span = view.span;
      for (var k = 0; k < cards.length; k++) {
        var c = cards[k];
        var p = wrap(c.base + travel, PER) / PER;
        var a = p * TURNS * TAU + c.phase;
        var y = (p - 0.5) * span;
        var d = (Math.cos(a) + 1) / 2;           // 0 far side .. 1 near side
        c.el.style.transform = 'translate(-50%,-50%) rotateY(' + a.toFixed(4) + 'rad) translateZ(' + radius.toFixed(1) + 'px) translateY(' + y.toFixed(1) + 'px)';
        c.el.style.opacity = (FLOOR + (1 - FLOOR) * d * d).toFixed(3);
        if (maxBlur) {
          var blur = (1 - d) * (1 - d) * maxBlur;
          c.el.style.filter = blur > 0.25 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
        }
        if (!decor) {
          var live = d > 0.5;
          if (live !== c.live) { c.live = live; c.el.style.pointerEvents = live ? '' : 'none'; }
        }
      }
    }

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      var holding = hovered || focused || tapped || dragging;
      var goal = (holding || reduceMotion.matches) ? 0 : DRIFT;
      driftNow += (goal - driftNow) * Math.min(1, dt * 6);

      if (target !== null) {
        var diff = target - travel;
        travel += diff * Math.min(1, dt * 7);
        if (Math.abs(diff) < 0.005) { travel = target; target = null; }
      } else {
        travel += driftNow * dt;
      }

      if (!dragging && velocity) {
        travel += velocity * dt;
        velocity *= Math.pow(FRICTION, dt * 60);
        if (Math.abs(velocity) < 0.02) velocity = 0;
      }

      if (decor) {
        // Scrolling down carries the helix up, like the page, but more slowly.
        if (!reduceMotion.matches) travel += (lastScroll - scrollY) * PARALLAX * PER / view.span;
        lastScroll = scrollY;
      }

      render();
      if (visible) requestAnimationFrame(frame);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var was = visible;
        visible = entries[0].isIntersecting;
        if (visible && !was) { last = performance.now(); lastScroll = scrollY; requestAnimationFrame(frame); }
      }).observe(host);
    }
    requestAnimationFrame(frame);

    // A decorative helix has no controls; everything below is for the interactive one.
    if (decor) return;

    /* ------------------------------------------------------------------ drag */

    // Pixels of horizontal drag -> cards of travel, so near-side cards follow the pointer ~1:1
    // as the cylinder turns.
    function sensitivity() { return (1 / view.radius) * (PER / (TURNS * TAU)); }

    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      moved = 0;
      velocity = 0;
      target = null;
      lastX = e.clientX;
      lastT = e.timeStamp;
      stage.classList.add('is-dragging');
    });

    addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dt = (e.timeStamp - lastT) / 1000;
      lastX = e.clientX;
      lastT = e.timeStamp;
      moved += Math.abs(dx);
      var step = dx * sensitivity();
      travel += step;
      if (dt > 0) velocity = step / dt;
    });

    function release() {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('is-dragging');
      if (reduceMotion.matches) velocity = 0;
    }
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);

    // A drag that ends on a card must not also follow its link.
    stage.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; return; }
      var card = cardFor(e.target);
      if (coarse.matches && card && tapped !== card.el) {
        // First tap on touch screens previews the project; the second tap opens it.
        e.preventDefault();
        tapped = card.el;
        show(card.el);
      }
    }, true);

    /* ------------------------------------------------- hover, focus, caption */

    function cardFor(node) {
      var el = node && node.closest ? node.closest('.helix__card') : null;
      for (var k = 0; k < cards.length; k++) if (cards[k].el === el) return cards[k];
      return null;
    }

    function show(el) {
      if (!caption) return;
      if (!el) { caption.classList.remove('is-on'); return; }
      caption.querySelector('.helix__caption-date').textContent = el.getAttribute('data-date') || '';
      caption.querySelector('.helix__caption-title').textContent = el.getAttribute('data-title') || '';
      caption.querySelector('.helix__caption-summary').textContent = el.getAttribute('data-summary') || '';
      caption.querySelector('.helix__caption-cta').textContent = el.getAttribute('data-cta') || '';
      caption.classList.add('is-on');
    }

    stage.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch' || dragging) return;
      var card = cardFor(e.target);
      if (card) { hovered = card.el; show(card.el); }
    });

    stage.addEventListener('pointerout', function (e) {
      if (e.pointerType === 'touch') return;
      var card = cardFor(e.target);
      if (card && card.el === hovered && !card.el.contains(e.relatedTarget)) {
        hovered = null;
        if (!focused) show(null);
      }
    });

    // Keyboard: focusing a card spins it round to the front of the helix.
    function bringToFront(card) {
      var cur = wrap(card.base + travel, PER) / PER;
      // Progress values at which this strand faces the viewer (angle = 0 mod 2PI).
      var offset = card.strand ? 0.5 / TURNS : 0;
      var best = null;
      [[0.3, 0.7], [0.2, 0.8]].some(function (range) {
        for (var m = -1; m <= TURNS + 1; m++) {
          var p = m / TURNS + offset;
          if (p < range[0] || p > range[1]) continue; // stay clear of the faded ends
          var delta = p - cur;
          delta -= Math.round(delta);
          if (best === null || Math.abs(delta) < Math.abs(best)) best = delta;
        }
        return best !== null;
      });
      if (best === null) return;
      var goal = travel + best * PER;
      if (reduceMotion.matches) travel = goal; else target = goal;
      velocity = 0;
    }

    host.addEventListener('focusin', function (e) {
      var card = cardFor(e.target);
      if (!card) return;
      focused = card.el;
      show(card.el);
      if (!hovered) bringToFront(card);
    });

    host.addEventListener('focusout', function (e) {
      if (!host.contains(e.relatedTarget)) { focused = null; tapped = null; if (!hovered) show(null); }
    });

    // Tapping outside a previewed card dismisses the preview on touch screens.
    document.addEventListener('pointerdown', function (e) {
      if (tapped && !stage.contains(e.target)) { tapped = null; show(null); }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-helix]'), init);
})();
