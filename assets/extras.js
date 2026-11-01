/* صمّم لي — التقييم والمشاركة (مشتركة بين كل الأدوات).
 * <body data-tool="cv" data-url="..." data-share="..."> ; optional window.smmlyShareMsg() adds the result. */
(function () {
  var B = document.body;
  var TOOL = B.getAttribute('data-tool') || 'hub';
  var URL = B.getAttribute('data-url') || 'https://fooz1980k-sudo.github.io/fahs/';
  var BASE = B.getAttribute('data-share') || 'أدوات مجانية تفيدك في الوظيفة والدراسة:';
  function gc(path, title) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: path, title: title, event: true }); } catch (e) {} }
  window.smmlyGc = gc;
  function msg() { var p = ''; try { if (window.smmlyShareMsg) p = window.smmlyShareMsg() || ''; } catch (e) {} return p + BASE + ' ' + URL; }
  var NAME = B.getAttribute('data-tool-name') || 'أدوات صمّم لي';
  var MAIL = 'mailto:info@smmlystore.com';
  var stars = document.getElementById('stars'), rateMsg = document.getElementById('rateMsg'), rated = false, starV = 0;
  if (stars) stars.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-v]'); if (!b) return;
    starV = +b.getAttribute('data-v');
    Array.prototype.forEach.call(stars.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
    if (rvErr) rvErr.hidden = true;
    updateReview();
    if (rated) return;
    rated = true;
    gc('rate-' + TOOL + '-' + starV, 'تقييم ' + TOOL + ' ' + starV);
    if (rateMsg) rateMsg.textContent = starV >= 4 ? 'شكراً لك! 🌟 اكتب لنا كلمة تحت، أو شاركها مع ربعك.' : 'شكراً على صراحتك، قول لنا تحت وش نحسّن.';
  });

  /* ---- اكتب لنا رأيك: يفتح الإيميل برسالة جاهزة، وما ينحفظ أي شي في الموقع ---- */
  var rvName = document.getElementById('rvName'), rvCity = document.getElementById('rvCity'), rvMsg = document.getElementById('rvMsg'),
    rvOk = document.getElementById('rvOk'), rvSend = document.getElementById('rvSend'), rvErr = document.getElementById('rvErr'),
    rvThanks = document.getElementById('rvThanks'), rvCount = document.getElementById('rvCount');
  function clean(v, n) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, n); }
  function reviewText() {
    var who = [clean(rvName && rvName.value, 30), clean(rvCity && rvCity.value, 30)].filter(Boolean).join('، ');
    return 'رأي جديد عن ' + NAME + ': ⭐' + starV + '/5 — ' + clean(rvMsg.value, 300) + ' — ' + (who || 'بدون اسم') +
      ' (موافق على النشر: ' + (rvOk && rvOk.checked ? 'نعم' : 'لا') + ')';
  }
  function updateReview() { if (rvSend && rvMsg) rvSend.href = MAIL + '?subject=' + encodeURIComponent('رأي عن ' + NAME + ' ⭐' + starV + '/5') + '&body=' + encodeURIComponent(reviewText()); }
  if (rvSend && rvMsg) {
    [rvName, rvCity, rvMsg, rvOk].forEach(function (el) { if (el) el.addEventListener(el === rvOk ? 'change' : 'input', updateReview); });
    rvMsg.addEventListener('input', function () { if (rvCount) rvCount.textContent = rvMsg.value.length + ' / 300'; if (rvErr) rvErr.hidden = true; });
    rvSend.addEventListener('click', function (e) {
      updateReview();
      var err = !starV ? 'اختر عدد النجوم فوق أول.' : clean(rvMsg.value, 300).length < 3 ? 'اكتب رأيك في سطر قصير.' : '';
      if (err) { e.preventDefault(); rvErr.textContent = err; rvErr.hidden = false; (starV ? rvMsg : stars).scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      gc('review-' + TOOL + '-' + starV, 'رأي ' + TOOL);
      if (rvThanks) rvThanks.hidden = false;
    });
    updateReview();
  }

  /* ---- آراء عائلة صمّم لي (من assets/reviews.json، وتنضاف يدوياً بعد المراجعة والموافقة) ---- */
  var list = document.getElementById('reviewsList');
  if (list && window.fetch) {
    var TOOLN = { cv: 'فحص السيرة', mukafaa: 'حاسبة نهاية الخدمة', mawzoona: 'النسبة الموزونة', rateb: 'صافي الراتب', khitab: 'إيميل التقديم', dareeba: 'حاسبة الضريبة', hub: 'أدوات صمّم لي', store: 'متجر صمّم لي' };
    fetch(list.getAttribute('data-src') || 'assets/reviews.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (arr) {
      if (!Array.isArray(arr)) return;
      arr = arr.filter(function (x) { return x && typeof x.text === 'string' && x.text.trim(); })
        .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
      if (!arr.length) return;
      var mk = function (t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
      arr.forEach(function (x, i) {
        var n = Math.max(1, Math.min(5, parseInt(x.stars, 10) || 5));
        var card = mk('figure', 'rv-card' + (i >= 6 ? ' rv-extra' : ''));
        if (i >= 6) card.hidden = true;
        var st = mk('div', 'rv-stars', '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n)); st.setAttribute('aria-label', n + ' من 5');
        card.appendChild(st);
        card.appendChild(mk('blockquote', 'rv-text', String(x.text).slice(0, 300)));
        var who = [x.name, x.city].filter(Boolean).join('، ') || 'من عائلة صمّم لي';
        var cap = mk('figcaption', 'rv-who', who);
        var tl = TOOLN[x.tool] || x.tool; if (tl) cap.appendChild(mk('span', 'rv-tool', tl));
        card.appendChild(cap);
        list.appendChild(card);
      });
      list.hidden = false;
      var empty = document.getElementById('reviewsEmpty'); if (empty) empty.hidden = true;
      var more = document.getElementById('reviewsMore');
      if (more && arr.length > 6) {
        more.hidden = false;
        more.addEventListener('click', function () {
          var open = more.getAttribute('aria-expanded') === 'true';
          Array.prototype.forEach.call(list.querySelectorAll('.rv-extra'), function (c) { c.hidden = open; });
          more.setAttribute('aria-expanded', open ? 'false' : 'true');
          more.textContent = open ? 'عرض الكل' : 'عرض أقل';
        });
      }
    }).catch(function () {});
  }

  var wa = document.getElementById('shareWa'), x = document.getElementById('shareX'), cp = document.getElementById('shareCopy');
  function refresh() { if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent(msg()); if (x) x.href = 'https://x.com/intent/post?text=' + encodeURIComponent(msg()); }
  [wa, x].forEach(function (a) {
    if (!a) return;
    ['pointerdown', 'focus'].forEach(function (ev) { a.addEventListener(ev, refresh); });
    a.addEventListener('click', function () { refresh(); gc('share-' + TOOL + '-' + (a === wa ? 'wa' : 'x'), 'مشاركة ' + TOOL); });
  });
  if (cp) cp.addEventListener('click', function () {
    var done = function () { cp.textContent = 'انسخ ✓'; setTimeout(function () { cp.textContent = 'نسخ الرابط'; }, 2000); };
    gc('share-' + TOOL + '-copy', 'نسخ الرابط ' + TOOL);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(URL).then(done, done); else done();
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-cta]'); if (a) gc('cta-' + TOOL + '-' + a.getAttribute('data-cta'), 'زر خدمة');
    var t = e.target.closest && e.target.closest('[data-tool-link]'); if (t) gc('hub-open-' + t.getAttribute('data-tool-link'), 'فتح أداة');
  });
  try { var cur = document.querySelector('.topnav [aria-current]'); if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) cur.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {}
  refresh();
  window.smmlyShare = { refresh: refresh, msg: msg };
})();
