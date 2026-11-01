/* افحص سيرتك — ربط النتيجة بالمشاركة وبطاقة نتيجتي. البطاقة فيها النسبة والتصنيف بس. */
(function () {
  'use strict';
  function score() { var r = document.getElementById('report'); if (!r || r.hidden) return null; var s = parseInt(r.getAttribute('data-score'), 10); return isNaN(s) ? null : s; }
  function band(s) {
    if (s >= 85) return { label: 'ممتازة', color: '#e7c36a', ink: '#141e38' };
    if (s >= 70) return { label: 'جيدة', color: '#3cc4a6', ink: '#ffffff' };
    if (s >= 50) return { label: 'متوسطة', color: '#e7a23a', ink: '#2a1e05' };
    return { label: 'ضعيفة', color: '#e56b66', ink: '#ffffff' };
  }
  window.smmlyShareMsg = function () { var s = score(); return s === null ? '' : 'فحصت سيرتي الذاتية وطلعت جاهزيتها لأنظمة الفرز ' + s + '٪. '; };
  window.smmlyCardData = function () {
    var s = score(); if (s === null) return null; var b = band(s);
    return {
      l1: 'فحصت سيرتي الذاتية', l2: 'لأنظمة الفرز ATS', value: s + '٪', ring: s / 100, sub: 'جاهزية تقديرية',
      pill: 'الجاهزية: ' + b.label, color: b.color, ink: b.ink,
      cta: 'افحص سيرتك مجاناً', url: 'fooz1980k-sudo.github.io/fahs', foot: 'خلال ثواني، والفحص كله داخل جوالك',
      file: 'smmly-ats-' + s + '.png'
    };
  };
  // Situation-based CTA heading.
  var rep = document.getElementById('report'), h = document.getElementById('ctaHead');
  if (rep && h && window.MutationObserver) new MutationObserver(function () {
    var s = score(); if (s === null) return;
    h.textContent = s < 70 ? 'سيرتك تحتاج تعديلات عشان تعدّي الفرز، نصلحها لك؟' : 'سيرتك زينة، تبيها تتميّز أكثر وتوصل للمقابلة؟';
  }).observe(rep, { attributes: true, attributeFilter: ['data-score', 'hidden'] });
})();
