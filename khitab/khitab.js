/* مولّد إيميل التقديم على وظيفة — صمّم لي. قوالب ثابتة (بدون ذكاء اصطناعي)، وكل شي داخل الجهاز. */
(function (root) {
  'use strict';
  function arYears(n) { n = +n; return n === 1 ? 'سنة واحدة' : n === 2 ? 'سنتين' : n <= 10 ? n + ' سنوات' : n + ' سنة'; }
  function enYears(n) { n = +n; return n + (n === 1 ? ' year' : ' years'); }
  function arList(a) { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join('، ') + ' و' + a[a.length - 1]; }
  function enList(a) { return a.length <= 1 ? (a[0] || '') : a.length === 2 ? a[0] + ' and ' + a[1] : a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1]; }

  // d: {name, title, company, years, skills[]}, lang: 'ar'|'en', tone: 'formal'|'short'|'bold'
  function build(d, lang, tone) {
    var y = Math.max(0, parseInt(d.years, 10) || 0);
    var sk = (d.skills || []).map(function (s) { return String(s).trim(); }).filter(Boolean).slice(0, 3);
    var N = d.name.trim(), T = d.title.trim(), C = d.company.trim(), s, b;
    if (lang === 'en') {
      var S = enList(sk);
      if (tone === 'short') {
        s = T + ' application – ' + N;
        b = 'Hello ' + C + ' team,\n\n' +
          "I'd like to apply for the " + T + ' role. ' + (y ? 'I have ' + enYears(y) + ' of experience' : "I'm a recent graduate") + ', and my top skills are ' + S + '.\n\n' +
          "My CV is attached. I'd be glad to talk at your convenience.\n\n" +
          'Best regards,\n' + N;
      } else if (tone === 'bold') {
        s = 'Excited to apply: ' + T + ' at ' + C;
        b = 'Dear ' + C + ' team,\n\n' +
          'Your opening for the ' + T + ' role caught my attention right away, and I would love to bring my energy to ' + C + '. ' +
          (y ? 'Over ' + enYears(y) + ' of work, I have built solid, practical experience' : 'As a recent graduate, I bring fresh energy and a strong drive to learn') + ', with particular strengths in ' + S + '.\n\n' +
          'I would welcome the chance to show you in an interview how I can make an impact from day one. My CV is attached.\n\n' +
          'Warm regards,\n' + N;
      } else {
        s = 'Application for ' + T + ' – ' + N;
        b = 'Dear Hiring Team at ' + C + ',\n\n' +
          'I am writing to apply for the ' + T + ' position at ' + C + '. ' +
          (y ? 'I bring ' + enYears(y) + ' of hands-on experience. ' : 'As a recent graduate, I am eager to start my career with a company like yours. ') +
          'My key strengths include ' + S + ', which I am confident will add real value to your team.\n\n' +
          "I have attached my CV for your review and would welcome the opportunity to discuss how I can contribute to " + C + "'s success.\n\n" +
          'Thank you for your time and consideration.\n\n' +
          'Kind regards,\n' + N;
      }
    } else {
      var A = arList(sk);
      if (tone === 'short') {
        s = 'التقديم على وظيفة ' + T + ' – ' + N;
        b = 'السلام عليكم،\n\n' +
          'أتقدم لوظيفة ' + T + ' في ' + C + '. ' + (y ? 'لدي خبرة عملية لمدة ' + arYears(y) + '، ' : 'تخرجت حديثاً، ') + 'وأبرز مهاراتي: ' + A + '.\n\n' +
          'أرفقت سيرتي الذاتية، وأرحب بأي فرصة للمقابلة.\n\n' +
          'مع التحية،\n' + N;
      } else if (tone === 'bold') {
        s = 'وظيفة ' + T + ' في ' + C + ' – ' + N;
        b = 'مرحباً فريق ' + C + '،\n\n' +
          'شدّني إعلانكم عن وظيفة ' + T + '، وأتطلع بحماس للانضمام إلى ' + C + '. ' +
          (y ? 'خلال ' + arYears(y) + ' من العمل بنيت خبرة عملية حقيقية' : 'تخرجت حديثاً ولدي شغف كبير بالتعلم والإنجاز') + '، وأبرز ما أقدمه: ' + A + '.\n\n' +
          'يسعدني أن أوضح لكم في مقابلة كيف يمكنني أن أضيف لفريقكم من اليوم الأول. سيرتي الذاتية مرفقة.\n\n' +
          'مع أطيب التحيات،\n' + N;
      } else {
        s = 'طلب التقدم لوظيفة ' + T + ' – ' + N;
        b = 'السلام عليكم ورحمة الله وبركاته،\n\n' +
          'فريق التوظيف في ' + C + ' المحترمين،\n\n' +
          'يسعدني التقدم لوظيفة ' + T + ' لديكم. ' +
          (y ? 'لدي خبرة عملية لمدة ' + arYears(y) + '، ' : 'تخرجت حديثاً وأتطلع إلى بدء مسيرتي المهنية معكم، ') +
          'وأمتلك مهارات في ' + A + '، وأثق بأنها ستضيف قيمة حقيقية لفريقكم.\n\n' +
          'أرفقت لكم سيرتي الذاتية، ويسعدني ترتيب مقابلة في الوقت الذي يناسبكم لمناقشة كيف يمكنني الإسهام في نجاح ' + C + '.\n\n' +
          'مع خالص الشكر والتقدير،\n' + N;
      }
    }
    return { subject: s, body: b };
  }
  function mailto(to, subject, body) {
    return 'mailto:' + encodeURIComponent((to || '').trim()) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  var api = { build: build, mailto: mailto, arYears: arYears };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Khitab = api;
})(this);

(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var K = window.Khitab, $ = function (id) { return document.getElementById(id); };
  var form = $('kForm'); if (!form) return;
  function gc(p, t) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: p, title: t, event: true }); } catch (e) {} }
  function val(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  var err = $('kErr'), out = $('kOut');
  function data() {
    return { name: $('kName').value, title: $('kTitle').value, company: $('kCompany').value, years: String($('kYears').value).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; }), skills: [$('kS1').value, $('kS2').value, $('kS3').value] };
  }
  function gen(track) {
    err.hidden = true;
    var d = data();
    var miss = [['kName', d.name, 'اسمك'], ['kTitle', d.title, 'المسمى الوظيفي'], ['kCompany', d.company, 'اسم الشركة'], ['kS1', d.skills.join(''), 'مهارة وحدة على الأقل']]
      .filter(function (x) { return !String(x[1]).trim(); });
    if (miss.length) { err.textContent = 'اكتب ' + miss[0][2] + '.'; err.hidden = false; out.hidden = true; $(miss[0][0]).focus(); return false; }
    var lang = val('klang') || 'ar', tone = val('ktone') || 'formal';
    var r = K.build(d, lang, tone);
    $('kSubject').value = r.subject; $('kBody').value = r.body;
    $('kSubject').dir = $('kBody').dir = lang === 'en' ? 'ltr' : 'rtl';
    out.hidden = false;
    updateMail();
    if (track) { gc('khitab-' + lang + '-' + tone, 'توليد إيميل تقديم'); out.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    return true;
  }
  function updateMail() { $('kMail').href = K.mailto($('kTo').value, $('kSubject').value, $('kBody').value); }
  form.addEventListener('submit', function (e) { e.preventDefault(); gen(true); });
  Array.prototype.forEach.call(form.querySelectorAll('input[name="klang"],input[name="ktone"]'), function (r) {
    r.addEventListener('change', function () { if (!out.hidden) gen(false); });
  });
  ['kTo', 'kSubject', 'kBody'].forEach(function (id) { $(id).addEventListener('input', updateMail); });
  $('kMail').addEventListener('click', function () { updateMail(); gc('khitab-mailto', 'فتح في الإيميل'); });
  $('kCopy').addEventListener('click', function () {
    var t = $('kSubject').value + '\n\n' + $('kBody').value, btn = this;
    var ok = function () { btn.textContent = 'انسخ ✓'; setTimeout(function () { btn.textContent = 'انسخ الإيميل'; }, 2000); };
    gc('khitab-copy', 'نسخ الإيميل');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { fallback(t); ok(); });
    else { fallback(t); ok(); }
  });
  function fallback(t) { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
})();
