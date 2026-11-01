/* حاسبة مكافأة نهاية الخدمة — صمّم لي
 * نظام العمل السعودي: المادة 84 (طريقة الحساب) والمادة 85 (الاستقالة).
 * 100% client-side. Pure functions are exported for node unit tests. */
(function (root) {
  'use strict';

  function daysInMonth(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); } // m: 0-11

  // Calendar difference between two ISO dates (yyyy-mm-dd). Returns null if invalid or end <= start.
  function diffDates(startISO, endISO) {
    var s = parseISO(startISO), e = parseISO(endISO);
    if (!s || !e) return null;
    if (Date.UTC(e.y, e.m, e.d) <= Date.UTC(s.y, s.m, s.d)) return null;
    // Whole months first (start day clamped to month length), then the remaining days.
    var total = (e.y - s.y) * 12 + (e.m - s.m);
    if (addMonths(s, total) > Date.UTC(e.y, e.m, e.d)) total--;
    var y = Math.floor(total / 12), m = total % 12;
    var d = Math.round((Date.UTC(e.y, e.m, e.d) - addMonths(s, total)) / 864e5);
    return { years: y, months: m, days: d };
  }
  function addMonths(s, k) {
    var mi = s.m + k, y = s.y + Math.floor(mi / 12), m = ((mi % 12) + 12) % 12;
    return Date.UTC(y, m, Math.min(s.d, daysInMonth(y, m)));
  }
  function parseISO(v) {
    var mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    if (!mm) return null;
    var y = +mm[1], m = +mm[2] - 1, d = +mm[3];
    if (m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m)) return null;
    return { y: y, m: m, d: d };
  }

  // Service length in years: fractions of a year are pro-rated by months (/12) and days (/365).
  function serviceYears(years, months, days) {
    return (+years || 0) + (+months || 0) / 12 + (+days || 0) / 365;
  }

  // Article 85: share of the award on resignation.
  function resignationFactor(t) {
    if (t < 2) return 0;
    if (t < 5) return 1 / 3;
    if (t < 10) return 2 / 3;
    return 1;
  }

  /* wage: last monthly wage. reason: 'resign' | 'end' (contract end / termination by employer). */
  function calc(wage, years, months, days, reason) {
    wage = +wage || 0;
    var t = serviceYears(years, months, days);
    var first = Math.min(t, 5), rest = Math.max(t - 5, 0);
    var firstAmt = wage / 2 * first, restAmt = wage * rest;
    var full = firstAmt + restAmt;
    var factor = reason === 'resign' ? resignationFactor(t) : 1;
    return {
      wage: wage, years: t, firstYears: first, restYears: rest,
      firstAmt: round2(firstAmt), restAmt: round2(restAmt), full: round2(full),
      factor: factor, award: round2(full * factor), reason: reason
    };
  }
  function round2(x) { return Math.round(x * 100) / 100; }

  var api = { calc: calc, diffDates: diffDates, serviceYears: serviceYears, resignationFactor: resignationFactor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Mukafaa = api;
})(this);

/* ---------- UI (browser only) ---------- */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var M = window.Mukafaa;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('calcForm');
  if (!form) return;

  function gc(path, title) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: path, title: title, event: true }); } catch (e) {} }
  function toLatin(s) { return String(s == null ? '' : s).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; }).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x06F0; }).replace(/[,،٬\s]/g, '').replace(/٫/g, '.'); }
  function money(x) { return Number(x).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ريال'; }
  function yrs(x) { return (Math.round(x * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function plural(n, one, two, few, many) { n = +n; return n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? n + ' ' + few : n + ' ' + many; }
  function durText(y, m, d) {
    var parts = [];
    if (y) parts.push(plural(y, 'سنة', 'سنتين', 'سنوات', 'سنة'));
    if (m) parts.push(plural(m, 'شهر', 'شهرين', 'شهور', 'شهر'));
    if (d) parts.push(plural(d, 'يوم', 'يومين', 'أيام', 'يوم'));
    return parts.join(' و') || '0';
  }

  var modeBtns = form.querySelectorAll('[data-mode]');
  var mode = 'dates';
  Array.prototype.forEach.call(modeBtns, function (b) {
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-mode');
      Array.prototype.forEach.call(modeBtns, function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      $('byDates').hidden = mode !== 'dates';
      $('byDur').hidden = mode !== 'dur';
    });
  });

  var err = $('calcErr');
  function fail(msg, el) { err.textContent = msg; err.hidden = false; $('calcOut').hidden = true; if (el) el.focus(); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var wage = parseFloat(toLatin($('wage').value));
    if (!(wage > 0)) return fail('اكتب الأجر الشهري بالريال (رقم أكبر من صفر).', $('wage'));
    var y, m, d;
    if (mode === 'dates') {
      var r = M.diffDates($('start').value, $('end').value);
      if (!$('start').value || !$('end').value) return fail('حدد تاريخ بداية الخدمة وتاريخ نهايتها.', $('start'));
      if (!r) return fail('تاريخ النهاية لازم يكون بعد تاريخ البداية.', $('end'));
      y = r.years; m = r.months; d = r.days;
    } else {
      y = parseInt(toLatin($('yy').value), 10) || 0;
      m = parseInt(toLatin($('mm').value), 10) || 0;
      d = parseInt(toLatin($('dd').value), 10) || 0;
      if (y < 0 || m < 0 || d < 0 || m > 11 || d > 30) return fail('الشهور من 0 إلى 11، والأيام من 0 إلى 30.', $('mm'));
      if (!y && !m && !d) return fail('اكتب مدة الخدمة (سنوات أو شهور أو أيام).', $('yy'));
    }
    var reasonEl = form.querySelector('input[name="reason"]:checked');
    if (!reasonEl) return fail('اختر سبب انتهاء العلاقة.', form.querySelector('input[name="reason"]'));
    var reason = reasonEl.value;
    var res = M.calc(wage, y, m, d, reason);
    show(res, y, m, d);
    gc('mukafaa-calc-' + reason, 'حساب مكافأة');
  });

  function row(tbody, label, val, cls) {
    var tr = document.createElement('tr'); if (cls) tr.className = cls;
    var th = document.createElement('th'); th.scope = 'row'; th.textContent = label;
    var td = document.createElement('td'); td.textContent = val;
    tr.appendChild(th); tr.appendChild(td); tbody.appendChild(tr);
  }

  function show(r, y, m, d) {
    $('outAmount').textContent = money(r.award);
    var note;
    if (r.reason === 'resign') {
      if (r.factor === 0) note = 'بالاستقالة قبل ما تكمّل سنتين ما تستحق مكافأة (المادة 85).';
      else if (r.factor === 1) note = 'خدمتك 10 سنوات أو أكثر، فتستحق المكافأة كاملة حتى مع الاستقالة.';
      else note = 'بالاستقالة تستحق ' + (r.factor < 0.5 ? 'ثلث' : 'ثلثين') + ' المكافأة لأن خدمتك ' + (r.factor < 0.5 ? 'من سنتين لأقل من 5 سنوات.' : 'من 5 لأقل من 10 سنوات.');
    } else note = 'بانتهاء العقد أو الفصل من صاحب العمل تستحق المكافأة كاملة (المادة 84).';
    $('outNote').textContent = note;

    var tb = $('outTable'); tb.innerHTML = '';
    row(tb, 'مدة الخدمة', durText(y, m, d) + ' (' + yrs(r.years) + ' سنة)');
    row(tb, 'الأجر الشهري المعتمد', money(r.wage));
    row(tb, 'أول 5 سنوات: نص راتب × ' + yrs(r.firstYears), money(r.firstAmt));
    if (r.restYears > 0) row(tb, 'بعد 5 سنوات: راتب كامل × ' + yrs(r.restYears), money(r.restAmt));
    row(tb, 'المكافأة الكاملة', money(r.full));
    if (r.reason === 'resign') row(tb, 'نسبة الاستحقاق بالاستقالة', r.factor === 0 ? '0' : r.factor === 1 ? 'كاملة' : r.factor < 0.5 ? 'الثلث (1/3)' : 'الثلثين (2/3)');
    row(tb, 'المكافأة المستحقة', money(r.award), 'total');

    var out = $('calcOut'); out.hidden = false;
    out.setAttribute('data-award', r.award);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var cv = $('mkCtaCv'); if (cv) cv.addEventListener('click', function () { gc('mukafaa-cta-cv', 'مكافأة ← السير'); });
  var at = $('mkCtaAts'); if (at) at.addEventListener('click', function () { gc('mukafaa-cta-ats', 'مكافأة ← الفحص'); });
})();
