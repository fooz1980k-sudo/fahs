/* حاسبة النسبة الموزونة — صمّم لي. 100% client-side. */
(function (root) {
  'use strict';
  var PRESETS = {
    p334: { hs: 30, q: 30, t: 40 },
    p433: { hs: 40, q: 30, t: 30 },
    p55: { hs: 50, q: 50, t: 0 }
  };
  // scores and weights in percent. Returns null when weights do not add up to 100.
  function weighted(s, w) {
    var sum = (+w.hs || 0) + (+w.q || 0) + (+w.t || 0);
    if (Math.abs(sum - 100) > 1e-9) return null;
    var parts = {
      hs: (+s.hs || 0) * (+w.hs || 0) / 100,
      q: (+s.q || 0) * (+w.q || 0) / 100,
      t: (+w.t ? (+s.t || 0) * w.t / 100 : 0)
    };
    var total = parts.hs + parts.q + parts.t;
    return { parts: { hs: r2(parts.hs), q: r2(parts.q), t: r2(parts.t) }, total: r2(total) };
  }
  function r2(x) { return Math.round(x * 100) / 100; }
  var api = { weighted: weighted, PRESETS: PRESETS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Mawzoona = api;
})(this);

(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var M = window.Mawzoona, $ = function (id) { return document.getElementById(id); };
  var form = $('wForm'); if (!form) return;
  function gc(p, t) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: p, title: t, event: true }); } catch (e) {} }
  function num(v) { v = String(v || '').replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; }).replace(/٫/g, '.').replace(/[\s٪%]/g, ''); return v === '' ? NaN : parseFloat(v); }
  function fmt(x) { return (Math.round(x * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }); }

  var preset = 'p334';
  var wIn = { hs: $('wHs'), q: $('wQ'), t: $('wT') };
  function setW(p) { Object.keys(wIn).forEach(function (k) { wIn[k].value = p[k]; }); }
  function syncT() { var noT = (num(wIn.t.value) || 0) === 0; $('tWrap').classList.toggle('dim', noT); $('tHint').hidden = !noT; }
  Array.prototype.forEach.call(form.querySelectorAll('[data-preset]'), function (b) {
    b.addEventListener('click', function () {
      preset = b.getAttribute('data-preset');
      Array.prototype.forEach.call(form.querySelectorAll('[data-preset]'), function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      $('wCustom').hidden = preset !== 'custom';
      if (M.PRESETS[preset]) setW(M.PRESETS[preset]);
      syncT();
    });
  });
  Object.keys(wIn).forEach(function (k) { wIn[k].addEventListener('input', syncT); });
  setW(M.PRESETS.p334); syncT();

  var err = $('wErr');
  function fail(m, el) { err.textContent = m; err.hidden = false; $('wOut').hidden = true; if (el) el.focus(); }
  var last = null;
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.hidden = true;
    var w = { hs: num(wIn.hs.value), q: num(wIn.q.value), t: num(wIn.t.value) || 0 };
    if (isNaN(w.hs) || isNaN(w.q) || w.hs < 0 || w.q < 0 || w.t < 0) return fail('الأوزان لازم تكون أرقام من 0 إلى 100.', wIn.hs);
    if (Math.abs(w.hs + w.q + w.t - 100) > 1e-9) return fail('مجموع الأوزان لازم يكون 100٪ (الحين ' + fmt(w.hs + w.q + w.t) + '٪).', wIn.hs);
    var s = { hs: num($('sHs').value), q: num($('sQ').value), t: num($('sT').value) };
    var chk = [['hs', 'نسبة الثانوي'], ['q', 'درجة القدرات']];
    if (w.t > 0) chk.push(['t', 'درجة التحصيلي']);
    for (var i = 0; i < chk.length; i++) {
      var v = s[chk[i][0]];
      if (isNaN(v) || v < 0 || v > 100) return fail('اكتب ' + chk[i][1] + ' (من 0 إلى 100).', $({ hs: 'sHs', q: 'sQ', t: 'sT' }[chk[i][0]]));
    }
    var r = M.weighted(s, w);
    last = { r: r, w: w };
    $('wTotal').textContent = fmt(r.total) + '٪';
    var tb = $('wTable'); tb.innerHTML = '';
    function row(a, b, cls) { var tr = document.createElement('tr'); if (cls) tr.className = cls; var th = document.createElement('th'); th.scope = 'row'; th.textContent = a; var td = document.createElement('td'); td.textContent = b; tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr); }
    row('الثانوي: ' + fmt(s.hs) + ' × ' + w.hs + '٪', fmt(r.parts.hs));
    row('القدرات: ' + fmt(s.q) + ' × ' + w.q + '٪', fmt(r.parts.q));
    if (w.t > 0) row('التحصيلي: ' + fmt(s.t) + ' × ' + w.t + '٪', fmt(r.parts.t));
    row('النسبة الموزونة', fmt(r.total) + '٪', 'total');
    $('wExplain').textContent = 'ضربنا كل درجة في وزنها وجمعناها. أعلى جزء ساهم في نسبتك هو ' +
      ({ hs: 'الثانوي', q: 'القدرات', t: 'التحصيلي' })[Object.keys(r.parts).sort(function (a, b) { return r.parts[b] - r.parts[a]; })[0]] + '.';
    var out = $('wOut'); out.hidden = false; out.setAttribute('data-total', r.total);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    gc('mawzoona-calc', 'حساب نسبة موزونة');
    if (window.smmlyCard) window.smmlyCard.refresh();
  });

  window.smmlyShareMsg = function () { return last ? 'حسبت نسبتي الموزونة وطلعت ' + fmt(last.r.total) + '٪. ' : ''; };
  window.smmlyCardData = function () {
    if (!last) return null;
    var w = last.w, t = last.r.total;
    return {
      l1: 'حسبت نسبتي الموزونة', l2: 'للقبول الجامعي',
      value: fmt(t) + '٪', ring: t / 100, sub: 'نسبة موزونة تقديرية',
      pill: 'ثانوي ' + w.hs + ' · قدرات ' + w.q + (w.t ? ' · تحصيلي ' + w.t : ''), color: '#3cc4a6', ink: '#ffffff', pillSize: 44,
      cta: 'احسب نسبتك مجاناً', url: 'fooz1980k-sudo.github.io/fahs/mawzoona', foot: 'أدوات مجانية من صمّم لي',
      file: 'smmly-mawzoona.png'
    };
  };
})();
