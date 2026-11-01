/* حاسبة صافي الراتب بعد التأمينات — صمّم لي. 100% client-side. */
(function (root) {
  'use strict';
  var CAP = 45000;            // maximum contributory wage
  var SAUDI_RATE = 9.75;      // employee share: 9% annuities + 0.75% SANED
  // rate in percent. Non-Saudis default to 0 employee deduction.
  function net(basic, housing, other, saudi, rate) {
    basic = +basic || 0; housing = +housing || 0; other = +other || 0;
    if (rate == null || rate === '') rate = saudi ? SAUDI_RATE : 0;
    rate = +rate || 0;
    var gross = basic + housing + other;
    var base = Math.min(basic + housing, CAP);
    var ded = r2(base * rate / 100);
    return { gross: r2(gross), base: r2(base), capped: basic + housing > CAP, rate: rate, deduction: ded, net: r2(gross - ded) };
  }
  function r2(x) { return Math.round(x * 100) / 100; }
  var api = { net: net, CAP: CAP, SAUDI_RATE: SAUDI_RATE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Rateb = api;
})(this);

(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var R = window.Rateb, $ = function (id) { return document.getElementById(id); };
  var form = $('rForm'); if (!form) return;
  function gc(p, t) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: p, title: t, event: true }); } catch (e) {} }
  function num(v) { v = String(v || '').replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; }).replace(/٫/g, '.').replace(/[,،٬\s٪%]/g, ''); return v === '' ? 0 : parseFloat(v); }
  function money(x) { return Number(x).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ريال'; }
  var rateIn = $('rRate'), touched = false;
  function nat() { var el = form.querySelector('input[name="nat"]:checked'); return el ? el.value : 'sa'; }
  function syncRate() { if (!touched) rateIn.value = nat() === 'sa' ? R.SAUDI_RATE : 0; $('rSaNote').hidden = nat() !== 'sa'; $('rNonNote').hidden = nat() === 'sa'; }
  Array.prototype.forEach.call(form.querySelectorAll('input[name="nat"]'), function (r) { r.addEventListener('change', function () { touched = false; syncRate(); }); });
  rateIn.addEventListener('input', function () { touched = true; });
  syncRate();

  var err = $('rErr');
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.hidden = true;
    var b = num($('rBasic').value), h = num($('rHousing').value), o = num($('rOther').value), rate = num(rateIn.value);
    if (!(b > 0) || isNaN(h) || isNaN(o) || h < 0 || o < 0) { err.textContent = 'اكتب الراتب الأساسي (رقم أكبر من صفر)، والبدلات أرقام أو خلّها فاضية.'; err.hidden = false; $('rOut').hidden = true; $('rBasic').focus(); return; }
    if (isNaN(rate) || rate < 0 || rate > 30) { err.textContent = 'نسبة الاستقطاع لازم تكون بين 0 و 30٪.'; err.hidden = false; $('rOut').hidden = true; rateIn.focus(); return; }
    var r = R.net(b, h, o, nat() === 'sa', rate);
    $('rNet').textContent = money(r.net);
    var tb = $('rTable'); tb.innerHTML = '';
    function row(a, v, cls) { var tr = document.createElement('tr'); if (cls) tr.className = cls; var th = document.createElement('th'); th.scope = 'row'; th.textContent = a; var td = document.createElement('td'); td.textContent = v; tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr); }
    row('إجمالي الراتب', money(r.gross));
    row('الأجر الخاضع للاشتراك (الأساسي + السكن)' + (r.capped ? '، بحد أعلى 45,000' : ''), money(r.base));
    row('استقطاع التأمينات ' + r.rate + '٪', r.deduction ? '- ' + money(r.deduction) : '0');
    row('صافي الراتب', money(r.net), 'total');
    var out = $('rOut'); out.hidden = false; out.setAttribute('data-net', r.net);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    gc('rateb-calc-' + nat(), 'حساب صافي الراتب');
  });
})();
