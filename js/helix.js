/*
  Landing-page project gallery: the projects wrapped around a slowly turning double helix.

  Inspired by the "double helix gallery" idea (two strands of cards on the surface of a
  rotating cylinder). This is an independent implementation that works with real links:
  cards are the actual project anchors, keyboard focus rotates a project to the front, and
  touch / reduced-motion visitors get sensible behaviour. Drag to spin, hover or focus for
  details. Without JavaScript the same markup is a plain grid of linked thumbnails.

  Geometry: every card lives on one of two strands. A card's progress p runs 0..1 along the
  strand and wraps; its angle around the cylinder is p * TURNS * 2PI (+ PI for strand 2), and
  it is placed with rotateY(angle) translateZ(radius) translateY(y). Cards facing away fade
  and blur so the front of the helix reads clearly.
*/
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var TURNS = 2;                       // full rotations from the top of a strand to the bottom
  var STRANDS = 2;
  var COMMON_REPEATS = 2;              // times each ordinary project appears on a strand (rare ones: once)
  var RARE_GAP = 5;                    // narrow screens: one rare card per this many cards
  var DRIFT = 0.2;                     // cards per second of ambient motion
  var FRICTION = 0.94;                 // per-frame velocity decay after a flick, at 60fps
  var FLOOR = 0.3;                     // minimum opacity of far-side cards: the back strand stays visible
  var MAX_BLUR = 3;                    // px of blur on far-side cards
  var CARD_SCALE = 0.78;               // overall card size, relative to the space available
  var CARD_RATIO = 4 / 3;

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = matchMedia('(hover: none)');

  function wrap(v, n) { return ((v % n) + n) % n; }

  function init(host) {
    if (host.getAttribute('data-helix-ready')) return;

    var stage = host.querySelector('.helix__stage');
    var source = host.querySelector('.helix__source');
    var caption = host.querySelector('.helix__caption');
    if (!stage || !source) return;
    var links = Array.prototype.slice.call(source.querySelectorAll('a'));
    if (!links.length) return;
    host.setAttribute('data-helix-ready', '1');

    var N = links.length;

    // The thumbnails are small, and a card turning round to the front should never show up
    // empty, so load them all now instead of waiting for each to scroll into view.
    links.forEach(function (a) {
      var img = a.querySelector('img');
      if (img) img.setAttribute('loading', 'eager');
    });

    /* ------------------------------------------------------------ the deal */

    // Which project sits in each slot of each strand. Every project is on both strands.
    // Normally they repeat evenly. Projects marked data-rare (the individual FRC robots)
    // appear once per strand while the others appear COMMON_REPEATS times, so the robots
    // turn up only now and then, evenly spaced with the other projects between them.
    var rare = links.filter(function (a) { return a.hasAttribute('data-rare'); });
    var common = links.filter(function (a) { return !a.hasAttribute('data-rare'); });
    var layout = [[], []];

    // On a narrow screen the cylinder is small, so a long strand packs the cards so tightly that
    // their flat faces cut through each other, and every card is more work for a phone. There
    // the strands are shorter and the rare projects go in once in total (alternating strands).
    var compact = stage.clientWidth < 520;

    if (rare.length && common.length && compact) {
      var total = Math.max(rare.length * RARE_GAP, rare.length + 2 * common.length);
      total += total % 2;                         // an even deck deals the same count to each strand
      var deck = new Array(total), taken = 0;
      rare.forEach(function (a, k) { deck[Math.floor((k + 0.5) * total / rare.length)] = a; });
      for (var q = 0; q < total; q++) if (!deck[q]) deck[q] = common[taken++ % common.length];
      deck.forEach(function (a, q) { layout[q % 2].push(a); });
    } else if (rare.length && common.length) {
      var length = rare.length + COMMON_REPEATS * common.length;
      for (var t = 0; t < STRANDS; t++) {
        var slots = new Array(length), next = t * Math.floor(common.length / STRANDS);
        // The rare projects go evenly along the strand; the second strand starts its list
        // part-way round so the two strands do not show the same project at the same height.
        rare.forEach(function (a, k) {
          slots[Math.floor((k + 0.5) * length / rare.length)] = rare[(k + t * Math.floor(rare.length / STRANDS)) % rare.length];
        });
        for (var d = 0; d < length; d++) if (!slots[d]) slots[d] = common[next++ % common.length];
        layout[t] = slots;
      }
    } else {
      var each = N * Math.max(1, Math.round(16 / N)); // about 16 per strand, each project evenly
      for (var u = 0; u < STRANDS; u++) for (var j = 0; j < each; j++) layout[u].push(links[j % N]);
    }

    var PER = layout[0].length;                   // cards per strand
    // A longer strand packs the cards closer together: shrink them a little, and drift faster
    // in cards per second so the helix still turns at the same speed.
    var crowd = Math.min(1, Math.sqrt(16 / PER));
    var drift = DRIFT * PER / 16;

    /* ----------------------------------------------------------- build cards */

    var world = document.createElement('div');
    world.className = 'helix__world';
    stage.appendChild(world);

    var cards = [];
    var shown = [];                               // projects that already have their real link on the helix
    var repeats = [];
    for (var s = 0; s < STRANDS; s++) {
      for (var i = 0; i < PER; i++) {
        var link = layout[s][i];
        var primary = shown.indexOf(link) < 0;
        if (primary) shown.push(link);
        var el = primary ? link : link.cloneNode(true);
        if (!primary) {
          // Repeats are decoration; only one real link per project is exposed to keyboards
          // and assistive technology.
          el.setAttribute('aria-hidden', 'true');
          el.setAttribute('tabindex', '-1');
          repeats.push(el);
        }
        cards.push({ el: el, base: i, phase: s * Math.PI, strand: s, live: true });
      }
    }
    // Real links go in first, in list order, so tabbing visits the projects in that order.
    links.forEach(function (a) { world.appendChild(a); });
    repeats.forEach(function (a) { world.appendChild(a); });
    host.classList.add('is-live');

    // Fade each thumbnail in once it has loaded rather than letting it paint in line by line.
    if (window.showWhenLoaded) {
      cards.forEach(function (c) {
        var img = c.el.querySelector('img');
        if (img) window.showWhenLoaded(img);
      });
    }

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
      var cardW = Math.min(220, w * 0.27) * crowd * CARD_SCALE;
      // Keep the whole cylinder (plus perspective growth on the near side) inside the box.
      var radius = (w / 2 - cardW * 0.46) / 1.08;
      // Safety net for small cylinders: neighbours on a strand are TURNS * 360 / PER degrees
      // apart, and a card much wider than 2 * radius * tan(half that angle) would cut through
      // the next one.
      var limit = 1.3 * 2 * radius * Math.tan(Math.PI * TURNS / PER);
      cardW = Math.max(72, Math.min(cardW, limit));
      radius = Math.max(70, (w / 2 - cardW * 0.46) / 1.08);
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

    var travel = 0;          // strand progress offset, in cards (drift + drag + focus)
    var driftNow = reduceMotion.matches ? 0 : drift; // eased toward 0 while hovering a card
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

    /* ----------------------------------------------------------------- frame */

    var lastTravel = NaN, lastLook = '';
    var frames = 0;

    // Only touch what changed: a card's transform moves every frame, but its opacity and blur
    // change in small steps, so they are only rewritten when they actually do.
    function render() {
      var look = view.radius + ':' + view.span;
      if (travel === lastTravel && look === lastLook) return;   // nothing moved (hovering, reduced motion)
      lastTravel = travel; lastLook = look;

      var radius = view.radius, span = view.span;
      for (var k = 0; k < cards.length; k++) {
        var c = cards[k];
        var p = wrap(c.base + travel, PER) / PER;
        var a = p * TURNS * TAU + c.phase;
        var y = (p - 0.5) * span;
        var d = (Math.cos(a) + 1) / 2;           // 0 far side .. 1 near side
        c.el.style.transform = 'translate(-50%,-50%) rotateY(' + a.toFixed(4) + 'rad) translateZ(' + radius.toFixed(1) + 'px) translateY(' + y.toFixed(1) + 'px)';

        var o = (FLOOR + (1 - FLOOR) * d * d).toFixed(2);
        if (o !== c.opacity) { c.opacity = o; c.el.style.opacity = o; }

        var blur = Math.round((1 - d) * (1 - d) * MAX_BLUR * 4) / 4;
        var f = blur > 0.25 ? 'blur(' + blur + 'px)' : 'none';
        if (f !== c.filter) { c.filter = f; c.el.style.filter = f; }

        var live = d > 0.5;
        if (live !== c.live) { c.live = live; c.el.style.pointerEvents = live ? '' : 'none'; }
      }
    }

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      var holding = hovered || focused || tapped || dragging;
      var goal = (holding || reduceMotion.matches) ? 0 : drift;
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

      // On a touch screen, drawing every other frame while it drifts is invisible and halves the work.
      if (dragging || !coarse.matches || (++frames % 2)) render();
      if (visible) requestAnimationFrame(frame);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var was = visible;
        visible = entries[0].isIntersecting;
        if (visible && !was) { last = performance.now(); requestAnimationFrame(frame); }
      }).observe(host);
    }
    requestAnimationFrame(frame);

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
      // Progress values at which this strand faces the viewer (angle = 0 mod 2PI). The second
      // strand faces front a quarter of the way down and up, which is inside the faded ends,
      // so those cards stop a little short, turned about 35 degrees, where they stay clear.
      var offset = card.strand ? 0.5 / TURNS : 0;
      var best = null;
      for (var m = -1; m <= TURNS + 1; m++) {
        var p = m / TURNS + offset;
        if (p < 0.2 || p > 0.8) continue;
        p = Math.min(0.7, Math.max(0.3, p));
        var delta = p - cur;
        delta -= Math.round(delta);
        if (best === null || Math.abs(delta) < Math.abs(best)) best = delta;
      }
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
