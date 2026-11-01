/* حاسبة ضريبة القيمة المضافة 15٪ — صمّم لي. 100% client-side. */
(function (root) {
  'use strict';
  var RATE = 15;
  // mode 'add': amount is before VAT. mode 'remove': amount already includes VAT.
  function vat(amount, mode, rate) {
    amount = +amount || 0; rate = rate == null ? RATE : +rate;
    var net, tax, total;
    if (mode === 'remove') { total = amount; net = amount / (1 + rate / 100); tax = total - net; }
    else { net = amount; tax = amount * rate / 100; total = net + tax; }
    return { net: r2(net), vat: r2(tax), total: r2(total), rate: rate, mode: mode === 'remove' ? 'remove' : 'add' };
  }
  function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  var api = { vat: vat, RATE: RATE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Dareeba = api;
})(this);

(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var D = window.Dareeba, $ = function (id) { return document.getElementById(id); };
  var form = $('vForm'); if (!form) return;
  function gc(p, t) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: p, title: t, event: true }); } catch (e) {} }
  function num(v) { v = String(v || '').replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; }).replace(/٫/g, '.').replace(/[,،٬\s]/g, ''); return v === '' ? NaN : parseFloat(v); }
  function money(x) { return Number(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ريال'; }
  var err = $('vErr');
  form.addEventListener('submit', function (e) {
    e.preventDefault(); err.hidden = true;
    var a = num($('vAmount').value);
    if (!(a > 0)) { err.textContent = 'اكتب المبلغ (رقم أكبر من صفر).'; err.hidden = false; $('vOut').hidden = true; $('vAmount').focus(); return; }
    var mode = form.querySelector('input[name="vmode"]:checked').value;
    var r = D.vat(a, mode);
    $('vMain').textContent = money(mode === 'add' ? r.total : r.net);
    $('vMainLbl').textContent = mode === 'add' ? 'السعر شامل الضريبة' : 'السعر قبل الضريبة';
    var tb = $('vTable'); tb.innerHTML = '';
    function row(x, v, cls) { var tr = document.createElement('tr'); if (cls) tr.className = cls; var th = document.createElement('th'); th.scope = 'row'; th.textContent = x; var td = document.createElement('td'); td.textContent = v; tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr); }
    row('المبلغ قبل الضريبة', money(r.net));
    row('ضريبة القيمة المضافة 15٪', money(r.vat));
    row('المبلغ شامل الضريبة', money(r.total), 'total');
    var out = $('vOut'); out.hidden = false; out.setAttribute('data-vat', r.vat);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    gc('dareeba-calc-' + mode, 'حساب ضريبة');
  });
})();
