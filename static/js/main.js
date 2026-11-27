/* GeoGrain project page: gallery (dataset picker, tile strips in carousels, compare dialog with a choice of both
 * sides) with deferred tile loading. Vanilla JS, no dependencies.
 * Runs after family.js (nav, hero, tabs, tables, lightbox, BibTeX), whose helpers it takes from window.Family.
 * Every module is opt-in through markup and silently does nothing when its markup is absent.
 * Built on the PanBase page's gallery script (itself from the GeoCR page), without its error maps and crops:
 * every GeoGrain tile is a whole generated image. */
(function () {
  'use strict';

  var F = window.Family;
  var $ = F.$, $$ = F.$$;
  var openDialog = F.openDialog, wireDialog = F.wireDialog, closeDialog = F.closeDialog;

  var ICON = {
    close: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    prev: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>',
    next: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>',
    split: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/></svg>'
  };

  /* ------------------------------------------------------------------
   * Deferred media.  <img data-src> inside [data-defer-media] is only
   *     requested once the block comes near the viewport (1500 px ahead,
   *     so on a desktop screen it starts with the page).  Then the current
   *     example of every tab panel is loaded, the one on screen first, so a
   *     tab switch never shows an empty tile; a moment later the examples
   *     either side of each current one follow, so the arrows never do
   *     either.  The rest load as the reader moves through them.
   * ------------------------------------------------------------------ */
  var deferRoots = [];
  function isShown(el, root) {
    for (var node = el; node && node !== root; node = node.parentElement) {
      if (node.hidden) return false;
      if (node.classList.contains('carousel-slide') && !node.classList.contains('is-active')) return false;
    }
    return true;
  }
  /* Load an image, hidden (.is-loading) until it has arrived. Every gallery file exists as AVIF
   * (about a quarter of the JPEG, visually identical) and as JPEG: the AVIF is tried first where
   * the browser supports it, and its JPEG if it fails. A failed request (GitHub Pages answers 429
   * for a few minutes when one address sends too many) is retried after 2, 4, 8, 16 and 32 s;
   * until then the image stays hidden instead of showing a broken-image icon. The tiles of an
   * example share one sheet, so they share one request, and so do their retries. */
  function candidates(jpg) {
    return F.avifOK() ? [F.avifUrl(jpg), jpg] : [jpg];
  }
  function loadWithRetry(img, urls, done) {
    var tries = 0, key = urls[urls.length - 1];        // the request is known by its JPEG
    urls = urls.slice();
    img._want = key;
    img.classList.add('is-loading');
    img.onload = function () {
      if (img._want !== key) return;
      img.classList.remove('is-loading');
      if (done) done();
    };
    img.onerror = function () {
      if (img._want !== key) return;
      if (urls.length > 1) { urls.shift(); img.src = urls[0]; return; }   // the AVIF failed: its JPEG
      if (tries >= 5) return;
      var wait = 2000 * Math.pow(2, tries++);
      setTimeout(function () {
        if (img._want === key) img.src = urls[0] + (urls[0].indexOf('?') < 0 ? '?' : '&') + 'retry=' + tries;
      }, wait);
    };
    img.src = urls[0];
  }
  function loadImg(img) {
    if (!img.hasAttribute('data-src')) return;
    img.removeAttribute('data-src');
    F.avif.then(function () { loadWithRetry(img, candidates(img.getAttribute('data-img'))); });
  }
  function loadSlide(slide) {
    if (slide) $$('img[data-src]', slide).forEach(loadImg);
  }

  /* 1024 px images ahead of the compare dialog, so that a click opens on the sharp images at once:
   * the GeoGrain and real images of the example on screen (a moment after its tiles), a tile's own
   * image as the pointer rests on it or it takes focus, and the rest of an example once its dialog
   * is open (to switch sides instantly). Each is one request, made once. */
  var fulls = {};                       // JPEG path -> { url: the file that loaded, ready }
  function prefetch(jpg) {
    if (!jpg || fulls[jpg]) return;
    var rec = fulls[jpg] = { url: null, ready: false }, urls = candidates(jpg), im = new Image();
    im.decoding = 'async';
    im.onload = function () { rec.url = urls[0]; rec.ready = true; };
    im.onerror = function () {
      if (urls.length > 1) { urls.shift(); im.src = urls[0]; } else delete fulls[jpg];   // retried on demand
    };
    im.src = urls[0];
  }
  function prefetchExample(slide, all) {
    if (!slide) return;
    $$(all ? '.tile img' : '.tile--ours img, .tile--gt img', slide).forEach(function (img) {
      prefetch(img.getAttribute('data-full'));
    });
  }
  function loadDeferred(root) {
    if (!root._near) return;
    $$('img[data-src]', root).forEach(function (img) {
      if (!img.closest('.carousel-slide') && isShown(img, root)) loadImg(img);
    });
    var cars = $$('[data-carousel]', root);
    cars.sort(function (a, b) { return (isShown(a, root) ? 0 : 1) - (isShown(b, root) ? 0 : 1); });
    cars.forEach(function (car) { loadSlide($('.carousel-slide.is-active', car)); });
    clearTimeout(root._ahead);
    root._ahead = setTimeout(function () {
      cars.forEach(function (car) {
        if (!isShown(car, root)) return;      // other datasets: their neighbours follow when shown
        var slides = $$('.carousel-slide', car), n = slides.length;
        var k = slides.indexOf($('.carousel-slide.is-active', car));
        if (k >= 0) prefetchExample(slides[k]);
        if (k < 0 || n < 2) return;
        loadSlide(slides[(k + 1) % n]);
        loadSlide(slides[(k - 1 + n) % n]);
      });
    }, 900);
  }
  function refreshDeferred(from) {
    deferRoots.forEach(function (r) {
      if (!from || r.contains(from) || from.contains(r)) loadDeferred(r);
    });
  }
  function initDeferred() {
    deferRoots = $$('[data-defer-media]');
    deferRoots.forEach(function (root) {
      if (!('IntersectionObserver' in window)) { root._near = true; return; }
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !root._near) { root._near = true; obs.disconnect(); loadDeferred(root); }
        });
      }, { rootMargin: '1500px 0px' }).observe(root);
    });
  }

  // a tab switch (family.js) may reveal a panel whose tiles are still deferred
  document.addEventListener('family:tabselect', function (e) { refreshDeferred(e.target); });

  /* ------------------------------------------------------------------
   * Carousel  [data-carousel] > .carousel-viewport > .carousel-track
   *    > .carousel-slide.  Controls are generated: counter "Example k / N",
   *    dots, prev/next.  Keyboard arrows when focus is inside; swipe.
   * ------------------------------------------------------------------ */
  function initCarousels() {
    $$('[data-carousel]').forEach(function (root) {
      var viewport = $('.carousel-viewport', root);
      var track = $('.carousel-track', root);
      var slides = track ? $$('.carousel-slide', track) : [];
      var n = slides.length;
      if (!n) return;
      var label = root.getAttribute('data-label') || 'Slide';
      var index = 0;

      root.setAttribute('role', 'region');
      root.setAttribute('aria-roledescription', 'carousel');
      if (!root.hasAttribute('tabindex')) root.tabIndex = 0;
      slides.forEach(function (s, i) {
        s.setAttribute('role', 'group');
        s.setAttribute('aria-roledescription', 'slide');
        if (!s.hasAttribute('aria-label')) s.setAttribute('aria-label', label + ' ' + (i + 1) + ' of ' + n);
      });

      var controls = $('.carousel-controls', root);
      if (!controls) {
        controls = document.createElement('div');
        controls.className = 'carousel-controls';
        root.insertBefore(controls, root.firstChild);
      }
      var dotsHtml = '';
      for (var i = 0; i < n; i++) {
        dotsHtml += '<button type="button" class="carousel-dot" aria-label="' + label + ' ' + (i + 1) + '"></button>';
      }
      controls.innerHTML =
        '<p class="carousel-status" aria-live="polite"><span class="carousel-counter"></span><span class="carousel-title"></span></p>' +
        '<div class="carousel-nav">' +
          '<div class="carousel-dots">' + dotsHtml + '</div>' +
          '<button type="button" class="carousel-btn carousel-btn--bar carousel-prev" aria-label="Previous ' + label.toLowerCase() + '">' + ICON.prev + '</button>' +
          '<button type="button" class="carousel-btn carousel-btn--bar carousel-next" aria-label="Next ' + label.toLowerCase() + '">' + ICON.next + '</button>' +
        '</div>';
      var counter = $('.carousel-counter', controls), titleEl = $('.carousel-title', controls);
      var dots = $$('.carousel-dot', controls);
      // the main previous / next buttons: large, either side of the tiles, half way down them
      // (the small pair in the bar above is for phones, where the sides have no room)
      var stage = document.createElement('div');
      stage.className = 'carousel-stage';
      viewport.parentNode.insertBefore(stage, viewport);
      stage.appendChild(viewport);
      stage.insertAdjacentHTML('beforeend',
        '<button type="button" class="carousel-btn carousel-side carousel-prev" aria-label="Previous ' + label.toLowerCase() + '">' + ICON.prev + '</button>' +
        '<button type="button" class="carousel-btn carousel-side carousel-next" aria-label="Next ' + label.toLowerCase() + '">' + ICON.next + '</button>');
      if (n < 2) {
        $('.carousel-nav', controls).hidden = true;
        $$('.carousel-side', stage).forEach(function (b) { b.hidden = true; });
      }

      function offset(i) { return 'translateX(calc(' + (-100 * i) + '% - ' + (12 * i) + 'px))'; }
      function go(i) {
        var prev = slides[index];
        var active = document.activeElement;
        var hadFocus = !!(prev && active && prev.contains(active));
        var k0 = hadFocus ? $$('.tile-btn', prev).indexOf(active) : -1;
        index = (i + n) % n;
        track.style.transform = offset(index);
        slides.forEach(function (s, k) {
          var on = k === index;
          s.classList.toggle('is-active', on);
          s.setAttribute('aria-hidden', String(!on));
          if (on) s.removeAttribute('inert'); else s.setAttribute('inert', '');
        });
        // keyboard users keep their place: the same tile on the new slide (or the carousel itself)
        if (hadFocus && slides[index] !== prev) {
          var target = (k0 >= 0 && $$('.tile-btn', slides[index])[k0]) || root;
          target.focus({ preventScroll: true });
        }
        dots.forEach(function (d, k) {
          if (k === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
        });
        counter.textContent = label + ' ' + (index + 1) + ' / ' + n;
        titleEl.textContent = slides[index].getAttribute('data-title') || '';
        refreshDeferred(root);
      }
      root.carouselGo = go;
      root.carouselStep = function (d) { go(index + d); };

      $$('.carousel-prev', root).forEach(function (b) { b.addEventListener('click', function () { go(index - 1); }); });
      $$('.carousel-next', root).forEach(function (b) { b.addEventListener('click', function () { go(index + 1); }); });
      dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });

      root.addEventListener('keydown', function (e) {
        if (e.target.closest('input, textarea, select, [role="tablist"], [contenteditable]')) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      });

      // touch / pen swipe (mouse users have the buttons)
      var sw = null, suppressClick = false;
      viewport.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' || n < 2) return;
        sw = { x: e.clientX, y: e.clientY, id: e.pointerId, active: false };
      });
      viewport.addEventListener('pointermove', function (e) {
        if (!sw || e.pointerId !== sw.id) return;
        var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
        if (!sw.active) {
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            sw.active = true;
            root.classList.add('is-dragging');
            try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          } else if (Math.abs(dy) > 10) { sw = null; return; }
        }
        if (sw && sw.active) track.style.transform = 'translateX(calc(' + (-100 * index) + '% - ' + (12 * index) + 'px + ' + dx + 'px))';
      });
      function endSwipe(e) {
        if (!sw) return;
        var s = sw; sw = null;
        root.classList.remove('is-dragging');
        if (!s.active) return;
        var dx = e.clientX - s.x;
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 60);
        if (e.type !== 'pointercancel' && Math.abs(dx) > Math.min(80, viewport.clientWidth * 0.15)) go(index + (dx < 0 ? 1 : -1));
        else go(index);
      }
      viewport.addEventListener('pointerup', endSwipe);
      viewport.addEventListener('pointercancel', endSwipe);
      viewport.addEventListener('click', function (e) {
        if (suppressClick) { e.preventDefault(); e.stopPropagation(); }
      }, true);

      go(0);
    });

    // the arrow keys change the example whenever a carousel is on screen, without clicking
    // into it first (inside it, its own handler above has already taken the key)
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable], [role="tablist"], [role="slider"], dialog, [data-carousel]')) return;
      if (document.querySelector('dialog[open]')) return;
      var vh = window.innerHeight, best = null, bestSeen = 0;
      $$('[data-carousel]').forEach(function (c) {
        if (!c.carouselStep || !c.getClientRects().length) return;
        var r = c.getBoundingClientRect();
        var seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (seen > bestSeen) { bestSeen = seen; best = c; }
      });
      if (!best || bestSeen < Math.min(240, vh / 3)) return;
      e.preventDefault();
      best.carouselStep(e.key === 'ArrowLeft' ? -1 : 1);
    });
  }

  /* ------------------------------------------------------------------
   * Compare dialog: two images of an example with a drag divider.
   *    Left and right are picked from the example's tiles. Default: the
   *    clicked tile against GeoGrain; GeoGrain against the real image when
   *    GeoGrain or the real image is clicked.
   * ------------------------------------------------------------------ */
  var cmp = null;
  function tileInfo(tile) {
    var img = $('img', tile);
    var m = $('.tile-m', tile);
    return {
      tile: tile,
      name: m ? m.textContent.replace(/\s+/g, ' ').trim() : '',
      // the sheet as the tile loaded it (AVIF or JPEG), so the dialog's placeholder comes from the cache
      sheet: img.currentSrc || candidates(img.getAttribute('data-img'))[0],
      cell: +img.getAttribute('data-i') || 0,
      full: img.getAttribute('data-full'),
      px: +img.getAttribute('data-px') || 1024,
      ours: tile.classList.contains('tile--ours'),
      gt: tile.classList.contains('tile--gt'),
      input: tile.classList.contains('tile--input')
    };
  }

  function buildCompare() {
    var d = document.createElement('dialog');
    d.className = 'cmp';
    d.setAttribute('aria-labelledby', 'cmp-title');
    d.innerHTML =
      '<div class="cmp-head">' +
        '<div><p class="cmp-kicker"></p><h2 class="cmp-title" id="cmp-title"></h2></div>' +
        '<button type="button" class="icon-btn cmp-close" aria-label="Close">' + ICON.close + '</button>' +
      '</div>' +
      '<div class="cmp-body">' +
        '<input class="cmp-range visually-hidden" type="range" min="0" max="100" step="1" value="50" aria-label="Divider position (percent of the image showing the left side)">' +
        '<div class="cmp-stage">' +
          '<span class="cmp-ph cmp-ph--b" aria-hidden="true"></span>' +
          '<img class="cmp-img cmp-img--b" alt="" draggable="false" fetchpriority="high">' +
          '<span class="cmp-ph cmp-ph--a" aria-hidden="true"></span>' +
          '<img class="cmp-img cmp-img--a" alt="" draggable="false" fetchpriority="high">' +
          '<span class="cmp-label cmp-label--a"></span><span class="cmp-label cmp-label--b"></span>' +
          '<span class="cmp-handle" aria-hidden="true"><span class="cmp-knob">' + ICON.split + '</span></span>' +
        '</div>' +
        '<p class="cmp-note"></p>' +
        '<div class="cmp-pickers">' +
          '<label class="cmp-pick"><span class="cmp-pick-label">Left</span><select class="cmp-select" data-side="a"></select></label>' +
          '<button type="button" class="icon-btn cmp-swap" aria-label="Swap left and right">' + ICON.split + '</button>' +
          '<label class="cmp-pick"><span class="cmp-pick-label">Right</span><select class="cmp-select" data-side="b"></select></label>' +
        '</div>' +
        '<p class="cmp-hint"><span class="hint-pointer">Drag across the image or use <kbd>&larr;</kbd> <kbd>&rarr;</kbd> &middot; <kbd>Esc</kbd> closes</span>' +
          '<span class="hint-touch">Drag across the image to move the divider</span></p>' +
      '</div>';
    document.body.appendChild(d);
    var c = {
      dlg: d, stage: $('.cmp-stage', d), range: $('.cmp-range', d), a: $('.cmp-img--a', d), b: $('.cmp-img--b', d),
      pa: $('.cmp-ph--a', d), pb: $('.cmp-ph--b', d),
      la: $('.cmp-label--a', d), lb: $('.cmp-label--b', d), selA: $('.cmp-select[data-side="a"]', d),
      selB: $('.cmp-select[data-side="b"]', d), note: $('.cmp-note', d),
      kicker: $('.cmp-kicker', d), title: $('.cmp-title', d), items: [], ia: 0, ib: 0
    };
    function setPos(p) {
      p = Math.max(0, Math.min(100, p));
      c.stage.style.setProperty('--pos', p + '%');
      c.range.value = String(Math.round(p));
    }
    c.setPos = setPos;
    c.range.addEventListener('input', function () { setPos(+c.range.value); });
    var dragging = false;
    function fromEvent(e) {
      var r = c.stage.getBoundingClientRect();
      setPos(((e.clientX - r.left) / r.width) * 100);
    }
    c.stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      try { c.stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      fromEvent(e);
    });
    c.stage.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      c.stage.addEventListener(t, function () { dragging = false; });
    });
    d.addEventListener('keydown', function (e) {
      if (e.target === c.range) return;                       // native range handles its keys
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (e.target.closest('select')) return;                // let the menus keep their keys
        e.preventDefault();
        setPos(+c.range.value + (e.key === 'ArrowLeft' ? -5 : 5));
      }
    });
    [c.selA, c.selB].forEach(function (sel) {
      sel.addEventListener('change', function () {
        if (sel === c.selA) c.ia = +sel.value; else c.ib = +sel.value;
        show();
      });
    });
    $('.cmp-swap', d).addEventListener('click', function () {
      var t = c.ia; c.ia = c.ib; c.ib = t;
      show();
    });
    $('.cmp-close', d).addEventListener('click', function () { closeDialog(d); });
    d.addEventListener('click', function (e) { if (e.target === d) closeDialog(d); });   // backdrop
    wireDialog(d);

    function show() {
      var A = c.items[c.ia], B = c.items[c.ib];
      if (!A || !B) return;
      var w = A.px + 'px';
      c.dlg.style.setProperty('--cmp-w', w);
      c.stage.style.setProperty('--cmp-w', w);
      // each side opens on its 1024 px image: at once when it was fetched ahead; otherwise as soon as it
      // arrives, with the tile from the example's sheet in its place if that takes more than 0.3 s
      [[c.pa, c.a, A], [c.pb, c.b, B]].forEach(function (s) {
        var ph = s[0], img = s[1], it = s[2];
        ph.style.backgroundImage = it.sheet ? 'url("' + it.sheet + '")' : 'none';
        ph.style.backgroundPosition = (it.cell * 100 / 9) + '% 0';
        img.alt = it.name;
        if (img._want === it.full) return;
        var rec = fulls[it.full];
        clearTimeout(ph._t);
        ph.classList.remove('is-shown');
        if (rec && rec.ready) {
          img._want = it.full; img.onload = img.onerror = null;
          img.classList.remove('is-loading');
          img.src = rec.url;
        } else {
          loadWithRetry(img, candidates(it.full));
          ph._t = setTimeout(function () { if (img.classList.contains('is-loading')) ph.classList.add('is-shown'); }, 300);
        }
      });
      c.la.textContent = A.name; c.la.classList.toggle('is-ours', A.ours);
      c.lb.textContent = B.name; c.lb.classList.toggle('is-ours', B.ours);
      c.title.innerHTML = '';
      c.title.appendChild(document.createTextNode(A.name + ' '));
      var vs = document.createElement('span'); vs.className = 'vs'; vs.textContent = 'vs';
      c.title.appendChild(vs);
      c.title.appendChild(document.createTextNode(' ' + B.name));
      [[c.selA, c.ia, c.ib], [c.selB, c.ib, c.ia]].forEach(function (r) {
        $$('option', r[0]).forEach(function (o) { o.disabled = +o.value === r[2]; });
        r[0].value = String(r[1]);
      });
    }
    c.show = show;
    return c;
  }

  function openCompare(strip, tile) {
    var slide = strip.closest('.carousel-slide');
    var tiles = $$('.tile', slide || strip);
    if (!cmp) cmp = buildCompare();
    var c = cmp;
    c.items = tiles.map(tileInfo);
    var ours = c.items.filter(function (x) { return x.ours; })[0];
    var gt = c.items.filter(function (x) { return x.gt; })[0];
    var clicked = c.items.filter(function (x) { return x.tile === tile; })[0] || c.items[0];
    if (clicked.ours || clicked.gt) { c.ia = c.items.indexOf(ours || clicked); c.ib = c.items.indexOf(gt || clicked); }
    else { c.ia = c.items.indexOf(clicked); c.ib = c.items.indexOf(ours || clicked); }
    if (c.ia === c.ib) c.ib = c.ia === 0 ? 1 : 0;
    c.note.textContent = strip.getAttribute('data-note') || '';
    c.kicker.textContent = (slide && slide.getAttribute('data-title')) || 'Comparison';
    [c.selA, c.selB].forEach(function (sel) {
      sel.innerHTML = '';
      [['Input and reference', true], ['Methods', false]].forEach(function (g) {
        var og = document.createElement('optgroup');
        og.label = g[0];
        c.items.forEach(function (it, i) {
          if ((it.gt || it.input) !== g[1]) return;
          var o = document.createElement('option');
          o.value = String(i);
          o.textContent = it.name;
          og.appendChild(o);
        });
        if (og.children.length) sel.appendChild(og);
      });
    });
    c.setPos(50);
    openDialog(c.dlg);
    c.show();
    c.range.focus({ preventScroll: true });
    // the other tiles of this example, so that switching either side is instant
    clearTimeout(c._rest);
    c._rest = setTimeout(function () { prefetchExample(slide || strip, true); }, 600);
  }

  /* Balanced rows: pick the column count auto-fill would use, then spread
   * the tiles evenly over the resulting rows (10 tiles at 8 per row -> 5 + 5
   * instead of 8 + 2).  Never upscales a tile beyond data-max-scale. */
  function balanceStrip(strip) {
    var tiles = $$('.tile', strip), N = tiles.length;
    var W = strip.clientWidth;
    if (!N || !W) return;
    var cs = getComputedStyle(strip);
    var min = parseFloat(cs.getPropertyValue('--tile-min')) || 140;
    min = Math.min(min, W / 2 - 6);
    var gap = parseFloat(cs.columnGap) || 10;
    var fit = Math.max(1, Math.floor((W + gap) / (min + gap)));
    var nat = parseFloat(strip.getAttribute('data-tile-px')) || 0;
    var maxScale = parseFloat(strip.getAttribute('data-max-scale')) || 1.6;
    var rows = Math.ceil(N / fit);
    var cols = Math.min(fit, Math.ceil(N / rows));
    while (nat && cols < fit && (W - gap * (cols - 1)) / cols > nat * maxScale + 12) cols++;
    strip.style.setProperty('--cols', String(cols));
    strip.setAttribute('data-cols', String(cols));
  }

  function initStrips() {
    var strips = $$('.strip');
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function (entries) {
        entries.forEach(function (en) { balanceStrip(en.target); });
      });
      strips.forEach(function (s) { ro.observe(s); });
    } else {
      strips.forEach(balanceStrip);
      window.addEventListener('resize', function () { strips.forEach(balanceStrip); });
    }
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.tile-btn');
      if (!btn) return;
      var strip = btn.closest('.strip');
      if (strip) openCompare(strip, btn.closest('.tile'));
    });
    // a tile about to be clicked: fetch its 1024 px image (and the example's GeoGrain and real image)
    ['pointerover', 'focusin'].forEach(function (type) {
      document.addEventListener(type, function (e) {
        var btn = e.target.closest && e.target.closest('.tile-btn');
        if (!btn || btn._pre) return;
        btn._pre = true;
        var img = $('img', btn);
        if (img) prefetch(img.getAttribute('data-full'));
        prefetchExample(btn.closest('.carousel-slide'));
      });
    });
  }

  /* ------------------------------------------------------------------
   * Captions.  A caption whose last line would be a stub (a word or two)
   *    takes a slightly tighter word space when that is all it takes to
   *    lose the stub (.cap-tight); a two-line caption that still has one is
   *    set on two balanced, centred lines (.cap-balanced); a single line
   *    nearly as wide as its figure runs to both edges (.cap-full).  See
   *    style.css, section 8.  Run again when the width changes or a tab or
   *    disclosure shows hidden captions.
   * ------------------------------------------------------------------ */
  function lineCount(c) {
    var lh = parseFloat(getComputedStyle(c).lineHeight) || 20;
    return Math.round(c.getBoundingClientRect().height / lh);
  }
  function lastLineFill(c) {
    var cs = getComputedStyle(c), lh = parseFloat(cs.lineHeight) || 20;
    var box = c.getBoundingClientRect();
    var r = document.createRange();
    r.selectNodeContents(c);
    var left = Infinity, right = -Infinity;
    Array.prototype.forEach.call(r.getClientRects(), function (x) {
      if (!x.width || (x.top + x.bottom) / 2 < box.bottom - lh) return;
      left = Math.min(left, x.left); right = Math.max(right, x.right);
    });
    var inner = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return right > left ? (right - left) / inner : 1;
  }
  function tidyCaptions() {
    var narrow = window.innerWidth <= 1100;   /* captions are flush left there (style.css) */
    $$('.figure > figcaption, .table-figure > figcaption').forEach(function (c) {
      c.classList.remove('cap-tight', 'cap-balanced', 'cap-full');
      if (narrow || !c.getClientRects().length) return;
      var n = lineCount(c);
      if (n >= 2 && lastLineFill(c) <= 0.25) {
        c.classList.add('cap-tight');
        if (lineCount(c) >= n) {
          c.classList.remove('cap-tight');
          if (n === 2) c.classList.add('cap-balanced');
        }
      }
      // a single line within a few per cent of the figure's width runs to both of its edges
      if (lineCount(c) === 1 && c.getBoundingClientRect().width >= 0.97 * c.parentElement.getBoundingClientRect().width) {
        c.classList.add('cap-full');
      }
    });
  }
  function initCaptions() {
    var run = function () { window.requestAnimationFrame(tidyCaptions); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run); else run();
    var w = window.innerWidth, t = null;
    window.addEventListener('resize', function () {
      if (window.innerWidth === w) return;
      w = window.innerWidth; clearTimeout(t); t = setTimeout(run, 120);
    });
    document.addEventListener('family:tabselect', run);
    document.addEventListener('toggle', run, true);
  }

  /* ------------------------------------------------------------------
   * Justified text below 1100 px.  There the text blocks of style.css
   *    section 8 are justified to a measure that follows the window, and
   *    a line can come out loose: a name or a number too long to fit
   *    leaves wide word spaces behind it.  As each block comes near the
   *    screen, this tries a few word and letter spacings within what a
   *    typesetter's justification allows (word space -0.05 to +0.08 em,
   *    letter space -0.01 to +0.01 em) and keeps the one whose loosest
   *    line is tightest, a last line of one short word counting as a
   *    loose line; a block already even keeps the normal spacing.  A block
   *    on screen or above it keeps its number of lines, so nothing in view
   *    moves.  The lightbox's copy of a caption is done as it opens.  Starts
   *    over when the width changes.
   * ------------------------------------------------------------------ */
  var JUSTIFIED = '.section-head .lead, .panel-intro, .figure > figcaption, .table-figure > figcaption, ' +
                  '.table-note, .abstract p, .keypoints li';
  var SPACINGS = [[0, -0.005], [0, 0.005], [-0.025, 0], [0.025, 0], [0, -0.01], [0, 0.01], [-0.05, 0], [0.05, 0],
                  [-0.05, -0.01], [0.05, 0.01], [0.08, 0], [0.08, 0.01]];   // [word, letter] spacing, em
  function spaceWidth(el) {
    var a = document.createElement('span'), b = document.createElement('span');
    a.style.cssText = b.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    a.textContent = 'x x'; b.textContent = 'xx';
    el.appendChild(a); el.appendChild(b);
    var w = a.getBoundingClientRect().width - b.getBoundingClientRect().width;
    el.removeChild(a); el.removeChild(b);
    return w;
  }
  // how far the stretched lines of a block are from even word spaces (px per space beyond the font's own)
  function looseness(el, sp) {
    var cs = getComputedStyle(el), box = el.getBoundingClientRect();
    var left = box.left + parseFloat(cs.paddingLeft), right = box.right - parseFloat(cs.paddingRight);
    var lines = [], r = document.createRange(), re = /[^\s ]+/g, node, m, k, j;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.closest('sub, sup')) continue;
      re.lastIndex = 0;
      while ((m = re.exec(node.data))) {
        r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
        var rects = r.getClientRects();
        for (k = 0; k < rects.length; k++) {
          var x = rects[k], line = null;
          if (x.width < 0.5) continue;
          for (j = 0; j < lines.length; j++) if (Math.abs(lines[j].top - x.top) < 4) { line = lines[j]; break; }
          if (!line) { line = { top: x.top, parts: [] }; lines.push(line); }
          line.parts.push([x.left, x.right]);
        }
      }
    }
    lines.sort(function (a, b) { return a.top - b.top; });
    var worst = 0, sum = 0, count = 0, stub = false;
    lines.forEach(function (line, i) {
      line.parts.sort(function (a, b) { return a[0] - b[0]; });
      var words = [];
      line.parts.forEach(function (p) {
        var w = words[words.length - 1];
        if (w && p[0] - w[1] < 1) w[1] = Math.max(w[1], p[1]); else words.push([p[0], p[1]]);
      });
      var last = words[words.length - 1];
      if (i === lines.length - 1) { stub = i > 0 && (last[1] - left) / (right - left) < 0.15; return; }
      if (words.length < 2 || Math.abs(last[1] - right) > 1.5) return;     // a line that is not stretched
      var ink = 0;
      words.forEach(function (w) { ink += w[1] - w[0]; });
      var extra = (last[1] - words[0][0] - ink) / (words.length - 1) - sp;
      worst = Math.max(worst, extra); sum += extra * extra; count++;
    });
    return 10 * Math.max(worst, stub ? 4 : 0) + (count ? Math.sqrt(sum / count) : 0);
  }
  function setSpacing(el, ws, ls) {
    el.style.wordSpacing = ws ? ws + 'em' : '';
    el.style.letterSpacing = ls ? ls + 'em' : '';
  }
  function tidyBlock(el) {
    setSpacing(el, 0, 0);
    if (!el.getClientRects().length) return;
    var sp = spaceWidth(el), h = el.getBoundingClientRect().height;
    var keepLines = el.getBoundingClientRect().top < window.innerHeight;   // on screen or above it
    var best = { ws: 0, ls: 0, score: looseness(el, sp) };
    for (var i = 0; i < SPACINGS.length && best.score > 30.5; i++) {    // stop once no line is 3 px loose
      var ws = SPACINGS[i][0], ls = SPACINGS[i][1];
      setSpacing(el, ws, ls);
      if (keepLines && Math.abs(el.getBoundingClientRect().height - h) > 1) continue;
      // a wider spacing costs as much as 1 px of loose line per 0.05 em of word space or 0.01 em of letter space
      var s = looseness(el, sp) + 10 * (ws > 0 ? ws / 0.05 : -0.6 * ws / 0.05) + 10 * Math.abs(ls) / 0.01;
      if (s < best.score - 0.01) best = { ws: ws, ls: ls, score: s };
    }
    setSpacing(el, best.ws, best.ls);
  }
  // the one-word method names: the hyphenation of narrow screens must not split them (Safari
  // hyphenates capitalised words too), so there they go into .nowrap spans, once
  var NAMES = /(GeoGrain|SiamLayout|AeroGen|Laytrol|SceneFID|SceneKID|TerraDiT)/;
  function keepNamesWhole(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false), nodes = [], node;
    while ((node = walker.nextNode())) {
      if (NAMES.test(node.data) && !(node.parentElement && node.parentElement.closest('.nowrap'))) nodes.push(node);
    }
    nodes.forEach(function (t) {
      var frag = document.createDocumentFragment();
      t.data.split(NAMES).forEach(function (part, i) {      // text, name, text, name, ...
        if (!part) return;
        if (i % 2) {
          var s = document.createElement('span');
          s.className = 'nowrap'; s.textContent = part;
          frag.appendChild(s);
        } else frag.appendChild(document.createTextNode(part));
      });
      t.parentNode.replaceChild(frag, t);
    });
  }
  function initJustify() {
    if (!('IntersectionObserver' in window) || !window.matchMedia) return;
    var narrow = window.matchMedia('(max-width: 1100px)'), io = null, namesKept = false;
    function start() {
      if (io) io.disconnect();
      io = null;
      var blocks = $$(JUSTIFIED);
      blocks.forEach(function (el) { setSpacing(el, 0, 0); });
      if (!narrow.matches) return;
      if (!namesKept) { blocks.forEach(keepNamesWhole); namesKept = true; }
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;     // hidden panels and closed disclosures wait until shown
          io.unobserve(e.target);
          tidyBlock(e.target);
        });
      }, { rootMargin: '600px 0px' });
      blocks.forEach(function (el) { io.observe(el); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
    // the lightbox's copy of a caption, each time it opens
    document.addEventListener('family:dialog', function (e) {
      if (!e.detail || !e.detail.open || !narrow.matches) return;
      var c = $('dialog[open] .lb-caption');
      if (c && c.textContent.trim()) { keepNamesWhole(c); tidyBlock(c); }
    });
    var w = window.innerWidth, t = null;
    window.addEventListener('resize', function () {
      if (window.innerWidth === w) return;
      w = window.innerWidth; clearTimeout(t); t = setTimeout(start, 150);
    });
  }

  /* ------------------------------------------------------------------
   * Input mode.  A pointer press (touch, pen or mouse) marks the page
   *    .pointer-input and a key press clears it, so a container that
   *    Safari focused on a tap, or that a closing dialog handed focus
   *    back to, shows no focus ring (style.css); the keyboard keeps every
   *    ring.  Modifier keys alone change nothing.
   * ------------------------------------------------------------------ */
  function initInputMode() {
    var html = document.documentElement;
    document.addEventListener('pointerdown', function () { html.classList.add('pointer-input'); }, true);
    document.addEventListener('keydown', function (e) {
      if (/^(Shift|Control|Alt|Meta|CapsLock|Fn)$/.test(e.key)) return;
      html.classList.remove('pointer-input');
    }, true);
  }

  F.onReady(function () {
    initInputMode();
    initDeferred();
    initCarousels();
    initStrips();
    initCaptions();
    initJustify();
  });
})();
