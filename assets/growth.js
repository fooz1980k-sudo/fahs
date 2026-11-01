/* صمّم لي — بطاقة النتيجة + تنبيهات التقديم
 * The share card only contains the score and its label. No CV text, no file name. */
(function () {
  'use strict';
  var WA_NUM = '';
  var FONT = '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, "Noto Naskh Arabic", "Geeza Pro", Arial, sans-serif';
  function gc(path, title) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: path, title: title, event: true }); } catch (e) {} }
  var $ = function (id) { return document.getElementById(id); };

  /* ================= 1) بطاقة نتيجتي ================= */
  var fontsP = null;
  function fontsReady() {
    if (fontsP) return fontsP;
    var f = document.fonts;
    var wait = !f ? Promise.resolve() : Promise.all([
      f.load('700 80px "IBM Plex Sans Arabic"', 'صمّم لي افحص'),
      f.load('500 40px "IBM Plex Sans Arabic"', 'جاهزية تقديرية'),
      f.load('400 40px "IBM Plex Sans Arabic"', 'سيرتك')
    ]).then(function () { return f.ready; });
    // If the web font is blocked, draw with system fonts after a short wait (canvas shapes Arabic natively).
    fontsP = Promise.race([wait.catch(function () {}), new Promise(function (r) { setTimeout(r, 3000); })]);
    return fontsP;
  }


  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function text(ctx, s, x, y, size, weight, color, align, dir) {
    ctx.font = weight + ' ' + size + 'px ' + FONT;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'center';
    ctx.direction = dir || 'rtl';
    ctx.fillText(s, x, y);
  }

  // d: {l1, l2, value, ring (0..1), sub, pill, color, ink, cta, url, foot}
  function drawCard(d) {
    var W = 1080, H = 1920, cx = W / 2;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    c.setAttribute('dir', 'rtl');
    var ctx = c.getContext('2d');
    ctx.direction = 'rtl';
    ctx.textBaseline = 'alphabetic';

    // background
    var g = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, H * 0.95);
    g.addColorStop(0, '#2a3e6c'); g.addColorStop(0.45, '#1a2747'); g.addColorStop(1, '#141e38');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var gl = ctx.createRadialGradient(80, H - 260, 0, 80, H - 260, 560);
    gl.addColorStop(0, 'rgba(60,196,166,.30)'); gl.addColorStop(1, 'rgba(60,196,166,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    var gl2 = ctx.createRadialGradient(W - 40, 640, 0, W - 40, 640, 420);
    gl2.addColorStop(0, 'rgba(231,195,106,.12)'); gl2.addColorStop(1, 'rgba(231,195,106,0)');
    ctx.fillStyle = gl2; ctx.fillRect(0, 0, W, H);

    // brand (mark on the right, name to its left)
    ctx.font = '700 58px ' + FONT; ctx.direction = 'rtl';
    var nameW = ctx.measureText('صمّم لي').width, mark = 104, gap = 26, tw = mark + gap + nameW;
    var right = cx + tw / 2, top = 150;
    ctx.fillStyle = '#ffffff'; rr(ctx, right - mark, top, mark, mark, 26); ctx.fill();
    text(ctx, 'ص', right - mark / 2, top + 74, 64, '700', '#141e38', 'center');
    text(ctx, 'صمّم لي', right - mark - gap, top + 72, 58, '700', '#ffffff', 'right');

    // headline
    text(ctx, d.l1, cx, 470, 80, '700', '#ffffff');
    text(ctx, d.l2, cx, 580, 80, '700', '#3cc4a6');

    // ring
    var ry = 990, R = 270, lw = 46, f = Math.max(0, Math.min(1, d.ring || 0));
    ctx.lineCap = 'round'; ctx.lineWidth = lw;
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.arc(cx, ry, R, 0, Math.PI * 2); ctx.stroke();
    if (f > 0) {
      ctx.strokeStyle = d.color;
      ctx.beginPath(); ctx.arc(cx, ry, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
    }
    var vs = 200; ctx.font = '700 ' + vs + 'px ' + FONT;
    while (vs > 90 && ctx.measureText(d.value).width > R * 1.6) { vs -= 10; ctx.font = '700 ' + vs + 'px ' + FONT; }
    text(ctx, d.value, cx, ry + vs * 0.31, vs, '700', '#ffffff');
    text(ctx, d.sub, cx, ry + 140, 46, '500', '#c7d0e4');

    // label pill
    if (d.pill) {
      var ps = d.pillSize || 54;
      ctx.font = '700 ' + ps + 'px ' + FONT;
      var lw2 = Math.min(ctx.measureText(d.pill).width + 110, 960), py = 1350;
      ctx.fillStyle = d.color; rr(ctx, cx - lw2 / 2, py, lw2, 104, 52); ctx.fill();
      text(ctx, d.pill, cx, py + 52 + ps * 0.33, ps, '700', d.ink || '#ffffff');
    }

    // CTA block
    var by = 1540, bw = 900, bh = 250;
    var cg = ctx.createLinearGradient(cx + bw / 2, by, cx - bw / 2, by + bh);
    cg.addColorStop(0, '#2fae93'); cg.addColorStop(1, '#3cc4a6');
    ctx.fillStyle = cg; rr(ctx, cx - bw / 2, by, bw, bh, 40); ctx.fill();
    text(ctx, d.cta, cx, by + 108, 78, '700', '#ffffff');
    var us = 46; ctx.font = '600 ' + us + 'px ' + FONT; ctx.direction = 'ltr';
    while (us > 30 && ctx.measureText(d.url).width > bw - 60) { us -= 2; ctx.font = '600 ' + us + 'px ' + FONT; }
    text(ctx, d.url, cx, by + 192, us, '600', '#141e38', 'center', 'ltr');

    text(ctx, d.foot, cx, 1870, 38, '400', '#aab5cc');
    return c;
  }

  var cache = { key: null, blob: null, busy: null, busyKey: null, data: null };
  function cardData() { try { return window.smmlyCardData ? window.smmlyCardData() : null; } catch (e) { return null; } }
  function prepare() {
    var d = cardData();
    if (!d) return Promise.resolve(null);
    var key = JSON.stringify(d);
    if (cache.key === key && cache.blob) return Promise.resolve(cache.blob);
    if (cache.busy && cache.busyKey === key) return cache.busy;
    cache.busyKey = key;
    cache.busy = fontsReady().then(function () {
      return new Promise(function (res) {
        var c = drawCard(d);
        if (c.toBlob) c.toBlob(function (bl) { res(bl); }, 'image/png');
        else res(dataURLtoBlob(c.toDataURL('image/png')));
      });
    }).then(function (bl) { cache.key = key; cache.blob = bl; cache.data = d; cache.busy = null; return bl; });
    return cache.busy;
  }
  function dataURLtoBlob(u) {
    var p = u.split(','), bin = atob(p[1]), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: 'image/png' });
  }
  function download(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  var cardBtn = $('cardBtn'), cardMsg = $('cardMsg');
  if (cardBtn) {
    // Pre-render as soon as a result shows, so sharing happens inside the tap (needed on iPhone).
    var rep = $('report');
    if (rep && window.MutationObserver) new MutationObserver(function () { if (!rep.hidden) prepare(); })
      .observe(rep, { attributes: true, attributeFilter: ['data-score', 'hidden'] });
    fontsReady();

    cardBtn.addEventListener('click', function () {
      var lblEl = cardBtn.querySelector('span') || cardBtn, label = lblEl.textContent;
      cardBtn.disabled = true; lblEl.textContent = 'نجهّز البطاقة...';
      var done = function (msg) { cardBtn.disabled = false; lblEl.textContent = label; if (cardMsg && msg) cardMsg.textContent = msg; };
      prepare().then(function (blob) {
        if (!blob) return done('احسب نتيجتك أول عشان نطلع لك البطاقة.');
        var tool = document.body.getAttribute('data-tool') || 'cv';
        gc(tool === 'cv' ? 'share-card' : 'share-card-' + tool, 'بطاقة نتيجتي');
        var name = (cache.data && cache.data.file) || 'smmly-card.png';
        var file = null;
        try { file = new File([blob], name, { type: 'image/png' }); } catch (e) {}
        if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], text: (cache.data.cta || '') + ': https://' + cache.data.url + '/' })
            .then(function () { done('شكراً إنك شاركتها! 💚'); })
            .catch(function (e) {
              if (e && e.name === 'AbortError') return done('');
              download(blob, name); done('نزّلنا البطاقة على جهازك، شاركها في السناب أو الستوري.');
            });
        } else {
          download(blob, name);
          done('نزّلنا البطاقة على جهازك، شاركها في السناب أو الستوري.');
        }
      }).catch(function (e) { if (window.console) console.error(e); done('ما قدرنا نجهّز البطاقة، جرّب مرة ثانية.'); });
    });
  }
  window.smmlyCard = { draw: drawCard, prepare: prepare, fontsReady: fontsReady, refresh: function () { if (cardBtn) prepare(); } };

  /* ================= 2) تنبيهات التقديم ================= */
  var INTERESTS = {
    military: 'عسكري',
    jadarah: 'حكومي «جدارة»',
    grads: 'شركات وبرامج خريجين',
    scholar: 'ابتعاث وقبول جامعي',
    coop: 'تدريب تعاوني'
  };
  function waText(key, city) {
    var t = 'أبي أشترك في تنبيهات التقديم. اهتمامي: ' + INTERESTS[key] + '.';
    city = (city || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (city) t += ' مدينتي: ' + city;
    return t;
  }
  var CHANNEL = 'https://whatsapp.com/channel/0029VbE9THRBadmdqMmXtS2N';
  Array.prototype.forEach.call(document.querySelectorAll('.alerts-card .alerts-go'), function (a) {
    a.href = CHANNEL;
    a.addEventListener('click', function () { gc('alerts-channel', 'تنبيهات: قناة الواتساب'); });
  });
  // The landing copy hides while a result is on screen (the result has its own copy).
  var landing = $('alertsLanding'), report = $('report');
  if (landing && report && window.MutationObserver) {
    var sync = function () { landing.hidden = !report.hidden; };
    new MutationObserver(sync).observe(report, { attributes: true, attributeFilter: ['hidden'] });
    sync();
  }
  window.smmlyAlerts = { text: waText };
})();
