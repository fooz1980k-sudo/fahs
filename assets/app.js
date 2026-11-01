/* افحص سيرتك مجاناً — صمّم لي
 * 100% client-side: the file is read with FileReader/arrayBuffer and parsed in this tab.
 * No network requests are made with the CV content. */
(function () {
  'use strict';

  var MAX_BYTES = 10 * 1024 * 1024;
  // Vendor files sit next to this script (assets/), whichever page folder loads it.
  var BASE = ((document.currentScript && document.currentScript.src) || 'assets/app.js').replace(/[^\/]*$/, '');
  var MAMMOTH_SRC = BASE + 'vendor/mammoth/mammoth.browser.min.js'; // mammoth 1.8.0
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + 'vendor/pdfjs/pdf.worker.min.js'; // pdf.js 3.11.174
  }

  var $ = function (id) { return document.getElementById(id); };
  var input = $('cv'), drop = $('drop'), goBtn = $('go'), errEl = $('error');
  var results = $('results'), loading = $('loading'), report = $('report');
  var currentFile = null;

  /* ---------- text helpers ---------- */
  function norm(s) {
    return (s || '')
      .normalize('NFKC')
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); })
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[‌-‏‪-‮⁦-⁩]/g, '')
      .toLowerCase();
  }
  function words(s) { return s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.+#-]*/gu) || []; }
  function isArabic(s) { return /[؀-ۿ]/.test(s); }
  function stem(w) {
    if (isArabic(w)) {
      var p = w.replace(/^(وال|بال|كال|فال|لل|ال)/, '');
      if (p.length >= 3) w = p;
      else { p = w.replace(/^[وب]/, ''); if (p.length >= 4) w = p; }
      if (p === w && /^[وب]/.test(w) && w.length >= 5) w = w.slice(1);
      var q = w.replace(/(ات|ون|ين|يه|ه)$/, function (m) { return m === 'يه' ? 'ي' : ''; });
      if (q.length >= 3) w = q;
      return w;
    }
    w = w.replace(/[.'’]+$/, '');
    if (w.length > 4 && /s$/.test(w) && !/ss$/.test(w)) w = w.slice(0, -1);
    return w;
  }
  // Many Arabic PDFs (e.g. exported from browsers/design apps) map ligature glyphs to letters in
  // reversed order ("الخبرة" -> "الخربة"). Matching Arabic words by their sorted letters tolerates that.
  function akey(w) { return isArabic(w) ? w.split('').sort().join('') : w; }
  function setOf(list) { var o = Object.create(null); list.forEach(function (w) { o[norm(w)] = 1; }); return o; }
  function keySet(list) { var o = Object.create(null); list.forEach(function (w) { o[akey(norm(w))] = 1; }); return o; }

  /* ---------- PDF extraction ---------- */
  async function readPdf(buf) {
    var pdf = await pdfjsLib.getDocument({ data: buf, isEvalSupported: false, disableFontFace: true }).promise;
    var lines = [], gapLines = 0;
    for (var p = 1; p <= pdf.numPages; p++) {
      var page = await pdf.getPage(p);
      var vw = page.getViewport({ scale: 1 }).width;
      var tc = await page.getTextContent();
      var rows = [];
      tc.items.forEach(function (it) {
        if (typeof it.str !== 'string' || !it.str) return;
        var y = it.transform[5], x = it.transform[4];
        var row = null;
        for (var i = 0; i < rows.length; i++) { if (Math.abs(rows[i].y - y) <= 3) { row = rows[i]; break; } }
        if (!row) { row = { y: y, items: [] }; rows.push(row); }
        row.items.push({ x: x, w: it.width || 0, s: it.str });
      });
      rows.sort(function (a, b) { return b.y - a.y; });
      rows.forEach(function (row) {
        row.items.sort(function (a, b) { return a.x - b.x; });
        var bigGap = false, solid = row.items.filter(function (t) { return t.s.trim(); });
        for (var i = 1; i < solid.length; i++) {
          var prev = solid[i - 1];
          if (solid[i].x - (prev.x + prev.w) > vw * 0.12) bigGap = true;
        }
        if (bigGap) gapLines++;
        var all = row.items.map(function (t) { return t.s; }).join('');
        var ar = (all.match(/[؀-ۿ]/g) || []).length;
        var la = (all.match(/[A-Za-z]/g) || []).length;
        var ordered = ar > la ? row.items.slice().reverse() : row.items;
        var text = '';
        ordered.forEach(function (t, i) {
          if (i > 0 && !/\s$/.test(text) && !/^\s/.test(t.s)) {
            var a = ordered[i - 1], gap = ar > la ? a.x - (t.x + t.w) : t.x - (a.x + a.w);
            if (gap > 1.5) text += ' ';
          }
          text += t.s;
        });
        text = text.replace(/\s+/g, ' ').trim();
        if (text) lines.push(text);
      });
    }
    return { lines: lines, pages: pdf.numPages, gapLines: gapLines, tables: 0, kind: 'pdf' };
  }

  /* ---------- DOCX extraction (optional, lazy) ---------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.mammoth) return res();
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('mammoth')); };
      document.head.appendChild(s);
    });
  }
  async function readDocx(buf) {
    await loadScript(MAMMOTH_SRC);
    var out = await window.mammoth.convertToHtml({ arrayBuffer: buf });
    var doc = new DOMParser().parseFromString(out.value, 'text/html');
    var lines = [];
    doc.body.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th').forEach(function (el) {
      if (el.querySelector('p,li')) return;
      var t = el.textContent.replace(/\s+/g, ' ').trim();
      if (t) lines.push((el.tagName === 'LI' ? '• ' : '') + t);
    });
    return { lines: lines, pages: null, gapLines: 0, tables: doc.querySelectorAll('table').length, kind: 'docx' };
  }

  /* ---------- dictionaries ---------- */
  var SECTIONS = [
    { id: 'exp', name: 'الخبرات', pts: 5, terms: ['الخبرات', 'الخبره', 'الخبره العمليه', 'الخبرات العمليه', 'الخبرات المهنيه', 'الخبره المهنيه', 'السجل المهني', 'الخبرات الوظيفيه', 'experience', 'work experience', 'professional experience', 'employment', 'work history', 'career history'] },
    { id: 'edu', name: 'التعليم', pts: 4, terms: ['التعليم', 'المؤهلات', 'المؤهل العلمي', 'المؤهلات العلميه', 'المؤهلات الاكاديميه', 'الدراسه', 'education', 'academic', 'qualifications'] },
    { id: 'skills', name: 'المهارات', pts: 4, terms: ['المهارات', 'مهارات', 'skills', 'competencies', 'technical skills', 'core skills'] },
    { id: 'sum', name: 'النبذة / الملخص', pts: 3, terms: ['نبذه', 'الملخص', 'ملخص', 'الهدف الوظيفي', 'نبذه عني', 'الملف الشخصي', 'summary', 'profile', 'objective', 'about me', 'professional summary'] },
    { id: 'cert', name: 'الدورات / الشهادات', pts: 2, terms: ['الدورات', 'الشهادات', 'الدورات التدريبيه', 'الشهادات المهنيه', 'دورات', 'certifications', 'certificates', 'courses', 'training', 'licenses'] },
    { id: 'lang', name: 'اللغات', pts: 2, terms: ['اللغات', 'اللغه', 'languages'] }
  ];
  SECTIONS.forEach(function (sec) { sec.keys = sec.terms.map(function (t) { return words(norm(t)).map(akey); }); });
  var VERBS = keySet([
    'قمت', 'أدرت', 'ادرت', 'طورت', 'صممت', 'قدت', 'أشرفت', 'حققت', 'رفعت', 'خفضت', 'نفذت', 'أنشأت', 'ساهمت', 'أعددت', 'نظمت', 'حسنت', 'دربت', 'بنيت', 'أطلقت', 'تابعت', 'أسست', 'قللت', 'زدت', 'عملت', 'توليت', 'شاركت', 'حللت', 'جهزت', 'راجعت',
    'إدارة', 'تطوير', 'تصميم', 'تنفيذ', 'إشراف', 'تحسين', 'إعداد', 'تنظيم', 'متابعة', 'تدريب', 'قيادة', 'تحليل', 'إطلاق', 'بناء', 'خفض', 'رفع', 'زيادة', 'تأسيس', 'تنسيق', 'مراجعة',
    'managed', 'led', 'developed', 'designed', 'built', 'created', 'improved', 'increased', 'reduced', 'implemented', 'launched', 'delivered', 'achieved', 'coordinated', 'analyzed', 'analysed', 'trained', 'supervised', 'optimized', 'organized', 'prepared', 'handled', 'supported', 'established', 'negotiated', 'streamlined', 'automated', 'generated', 'drove', 'owned', 'mentored', 'executed', 'planned'
  ]);
  var MONTHS = /(يناير|فبراير|مارس|ابريل|إبريل|مايو|يونيو|يوليو|اغسطس|أغسطس|سبتمبر|اكتوبر|أكتوبر|نوفمبر|ديسمبر|محرم|صفر|ربيع|جماد|رجب|شعبان|رمضان|شوال|ذو القعد|ذو الحج|كانون|شباط|اذار|آذار|نيسان|ايار|أيار|حزيران|تموز|ايلول|أيلول|تشرين|\bjan(uary)?\b|\bfeb(ruary)?\b|\bmar(ch)?\b|\bapr(il)?\b|\bmay\b|\bjune?\b|\bjuly?\b|\baug(ust)?\b|\bsep(t|tember)?\b|\boct(ober)?\b|\bnov(ember)?\b|\bdec(ember)?\b)/i;
  var AR_MONTHS = keySet(['يناير', 'فبراير', 'مارس', 'ابريل', 'مايو', 'يونيو', 'يوليو', 'اغسطس', 'سبتمبر', 'اكتوبر', 'نوفمبر', 'ديسمبر', 'محرم', 'صفر', 'ربيع', 'رجب', 'شعبان', 'رمضان', 'شوال', 'كانون', 'شباط', 'اذار', 'نيسان', 'ايار', 'حزيران', 'تموز', 'ايلول', 'تشرين', 'الان', 'حاليا', 'للان', 'الحالي']);
  var PRESENT = /(present|current|now|to date)/i;
  var STOP = setOf(('من في على علي إلى الى عن مع هذا هذه ذلك تلك التي الذي الذين اللذين و او أو ثم كما أن ان إن كان كانت تكون يكون لدى لدي لديه لديها لدينا نحن هو هي هم انت أنت عند كل أي اي بعض غير بين حتى قد لا لم لن ما ماذا متى أين اين كيف هل ايضا أيضا بشكل خلال حول ضمن فقط جدا عبر وفق مثل منها منه فيها فيه عليها عليه به بها له لها نبحث يبحث نبحث مطلوب المطلوب مطلوبه وظيفة وظيفه الوظيفة الوظيفه المرشح المتقدم المتقدمين شركة الشركة شركه شركتنا سنوات سنة سنه خبرة خبره الخبرة القدرة القدره قدره العمل عمل يجب يفضل الأفضلية ممتاز ممتازة جيد جيدة عالية عالي مهارات مهارة المهارات مجال المجال ذات ذو اقل أقل اكثر أكثر الأقل عن الى حيث او وغيرها وغيره مع اخرى أخرى جميع يتم تتم ' +
    'اجاده معرفه اول ادني ممارسه الماما المام قوي قويه متميز متميزه مناسب مناسبه سعودي الجنسيه دوام كامل ' +
    'the and or to of in for with a an on at by is are be as we you your our will from this that have has had who must should can ability able strong excellent good great experience years year work working job role team candidate candidates required requirements requirement preferred plus etc including include such related knowledge skills skill using use within across into per new looking seeking join company responsibilities responsible position minimum least well other others any all its their they them more than also not about').split(/\s+/));

  /* ---------- analysis ---------- */
  function analyze(ex, jdText) {
    var lines = ex.lines.filter(Boolean);
    var raw = lines.join('\n');
    var text = norm(raw);
    var normLines = lines.map(norm);
    var toks = words(text);
    var wc = toks.length;
    var checks = [];
    function add(c) { checks.push(c); return c; }

    var imageOnly = ex.kind === 'pdf' && wc < 25;
    var partialImage = ex.kind === 'pdf' && !imageOnly && ex.pages >= 2 && wc / ex.pages < 50;

    add({
      id: 'text', name: 'النص يطلع من الملف (مو صورة)', max: 24,
      got: imageOnly ? 0 : partialImage ? 12 : 24,
      det: imageOnly ? 'ما قدرنا نقرأ أي نص تقريباً (' + wc + ' كلمة) — غالباً الملف صورة.' :
        partialImage ? 'النص قليل مرّة مقارنة بعدد الصفحات (' + wc + ' كلمة) — ممكن جزء منه صورة.' : 'تمام، قرينا ' + wc + ' كلمة من الملف.',
      t: imageOnly ? 'سيرتك صورة وأنظمة الفرز ما تقدر تقرأها' : 'جزء من سيرتك غالباً صورة',
      fix: 'سوّ سيرتك بقالب نصّي وصدّرها PDF من Word أو Google Docs بدل الصورة أو برامج التصميم.'
    });

    if (imageOnly) {
      // Nothing else can be evaluated reliably.
      var skip = [
        ['contact', 'بيانات التواصل', 12], ['sections', 'العناوين الأساسية', 20], ['length', 'طول السيرة', 8],
        ['dates', 'تواريخ الخبرات', 8], ['verbs', 'نقاط وأفعال قوية', 8], ['nums', 'إنجازات بالأرقام', 8], ['layout', 'تنسيق بسيط بدون أعمدة', 8]
      ];
      skip.forEach(function (s) { add({ id: s[0], name: s[1], max: s[2], got: 0, det: 'ما نقدر نفحصه لأن النص ما ينقرأ.', skipped: true }); });
      add(pagesCheck(ex));
      return finish(checks, ex, wc, null, true);
    }

    // 2. contact
    var compact = raw.replace(/[\s\-(). ]/g, '').replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
    var hasEmail = /[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}/i.test(raw.replace(/\s*@\s*/g, '@'));
    var saPhone = /(?:\+|00)?9665\d{8}(?!\d)|(?:^|\D)05\d{8}(?!\d)/.test(compact);
    var anyPhone = saPhone || /\+\d{10,14}/.test(compact);
    var hasLinked = /linkedin|لينكد ?ان|لينكدان/i.test(text);
    var cGot = (hasEmail ? 5 : 0) + (saPhone ? 4 : anyPhone ? 3 : 0) + (hasLinked ? 3 : 0);
    var missC = [];
    if (!hasEmail) missC.push('الإيميل');
    if (!anyPhone) missC.push('رقم الجوال');
    if (!hasLinked) missC.push('رابط لينكدإن');
    add({
      id: 'contact', name: 'بيانات التواصل (إيميل، جوال، لينكدإن)', max: 12, got: cGot,
      det: missC.length ? 'ناقص: ' + missC.join('، ') : 'كاملة 👍',
      t: missC.length >= 2 ? 'بيانات التواصل ناقصة' : 'ناقص ' + (missC[0] || ''),
      fix: 'حط في أعلى السيرة كنص عادي (مو صورة): الإيميل، الجوال بصيغة 05xxxxxxxx، ورابط لينكدإن.'
    });

    // 3. sections
    var found = [], missing = [], sGot = 0;
    SECTIONS.forEach(function (sec) {
      var ok = normLines.some(function (l) {
        var lw = words(l).length;
        if (lw === 0 || lw > 6) return false;
        var lk = words(l).map(akey);
        return sec.keys.some(function (tk) {
          for (var i = 0; i + tk.length <= lk.length; i++) {
            var ok2 = true;
            for (var j = 0; j < tk.length; j++) if (lk[i + j] !== tk[j] && lk[i + j] !== akey('و' + tk[j]) && lk[i + j] !== akey(tk[j] + ':')) { ok2 = false; break; }
            if (ok2) return true;
          }
          return false;
        });
      });
      if (ok) { found.push(sec.name); sGot += sec.pts; } else missing.push(sec.name);
    });
    add({
      id: 'sections', name: 'العناوين الأساسية واضحة', max: 20, got: sGot,
      det: (found.length ? 'موجود: ' + found.join('، ') : 'ما لقينا عناوين أساسية') + (missing.length ? ' — ناقص: ' + missing.join('، ') : ''),
      t: missing.length > 3 ? 'العناوين الأساسية مو واضحة' : 'ناقص عناوين: ' + missing.join('، '),
      fix: 'حط كل قسم تحت عنوان معروف بسطر مستقل: «الخبرات العملية»، «التعليم»، «المهارات»، «نبذة» (أو بالإنجليزي: Experience, Education, Skills, Summary).'
    });

    // 4. length
    var lGot = wc < 100 ? 0 : wc < 150 ? 3 : wc <= 1200 ? 8 : wc <= 1600 ? 4 : 0;
    add({
      id: 'length', name: 'طول السيرة مناسب', max: 8, got: lGot,
      det: wc + ' كلمة' + (wc < 150 ? ' — قصيرة مرّة' : wc > 1200 ? ' — طويلة' : ' — مناسب'),
      t: wc < 150 ? 'سيرتك قصيرة مرّة (' + wc + ' كلمة)' : 'سيرتك طويلة (' + wc + ' كلمة)',
      fix: wc < 150 ? 'وسّع وصف خبراتك ومهاراتك؛ الطول المناسب تقريباً بين 300 و800 كلمة.' : 'اختصر للأهم والأحدث، وخلّها صفحة أو صفحتين بالكثير.'
    });

    // 5. dates
    var years = {}; (text.match(/(?:^|\D)(19[6-9]\d|20[0-4]\d)(?!\d)/g) || []).forEach(function (y) { years[y.replace(/\D/g, '')] = 1; });
    var hijri = (text.match(/(?:^|\D)(1[34]\d\d)\s*(ه|هـ)/g) || []).length;
    var yc = Object.keys(years).length + (hijri ? 1 : 0);
    var arMonth = toks.some(function (w) { return AR_MONTHS[akey(w)] || (w[0] === 'و' && AR_MONTHS[akey(w.slice(1))]); });
    var extra = arMonth || MONTHS.test(text) || PRESENT.test(text) || yc >= 3;
    var dGot = yc >= 2 ? (extra ? 8 : 6) : yc === 1 ? 3 : 0;
    add({
      id: 'dates', name: 'تواريخ واضحة للخبرات', max: 8, got: dGot,
      det: yc ? 'سنوات واضحة: ' + yc + (extra ? '، مع أشهر أو «حتى الآن»' : '') : 'ما لقينا تواريخ',
      t: 'تواريخ الخبرات ناقصة أو مو واضحة',
      fix: 'اكتب لكل خبرة من/إلى بصيغة واضحة مثل «مارس 2021 – حتى الآن» أو «03/2021 – 2024».'
    });

    // 6. bullets / action verbs
    var bullets = lines.filter(function (l) { return /^\s*([•●▪■◦‣∙·\-–—*✓✔➤►]|\d{1,2}[.)])\s*\S/.test(l); }).length;
    var verbHits = 0;
    function isVerb(w) { return VERBS[akey(w)] || (w.length > 3 && w[0] === 'و' && VERBS[akey(w.slice(1))]); }
    toks.forEach(function (w) { if (isVerb(w)) verbHits++; });
    // Lines that start with an action verb count as bullet-like (list markers are often not real text in PDFs).
    var verbLines = normLines.filter(function (l) { var f = words(l)[0]; return f && words(l).length >= 4 && isVerb(f); }).length;
    var bulletLike = Math.max(bullets, verbLines);
    var bGot = (bulletLike >= 4 ? 4 : bulletLike >= 1 ? 2 : 0) + (verbHits >= 5 ? 4 : verbHits >= 2 ? 2 : 0);
    add({
      id: 'verbs', name: 'نقاط مختصرة وأفعال قوية', max: 8, got: bGot,
      det: 'أسطر على شكل نقاط: ' + bulletLike + ' — أفعال إنجاز (مثل: طوّرت، أدرت، Led): ' + verbHits,
      t: verbHits < 2 ? 'خبراتك بدون أفعال إنجاز واضحة' : 'الخبرات مكتوبة كفقرات مو نقاط',
      fix: 'قسّم كل خبرة لنقاط تبدأ بفعل قوي: «أدرت…»، «طوّرت…»، «Led…»، «Improved…».'
    });

    // 7. quantified
    var nums = (text.match(/\d+(?:[.,]\d+)?\s*(?:%|٪|\+)/g) || []).length +
      (text.match(/\d[\d,.]*\s*(?:ريال|ر\.س|sar|\$|usd|مليون|الف|million|k\b|عميل|موظف|مشروع|متدرب|طالب|مستخدم|فرع|clients?|projects?|employees|users|customers|staff|branches)/g) || []).length +
      (text.match(/(?:sar|\$)\s*\d/g) || []).length;
    var nGot = nums >= 3 ? 8 : nums >= 1 ? 4 : 0;
    add({
      id: 'nums', name: 'إنجازات بالأرقام والنسب', max: 8, got: nGot,
      det: nums ? 'أرقام ونسب في إنجازاتك: ' + nums : 'ما فيه أرقام أو نسب',
      t: 'إنجازاتك بدون أرقام',
      fix: 'أضف أرقام لإنجازاتك: «رفعت المبيعات 25٪»، «خدمت +300 عميل»، «وفّرت 50 ألف ريال».'
    });

    // 8. layout risk
    var nl = lines.length || 1;
    var shortR = lines.filter(function (l) { return words(l).length < 3; }).length / nl;
    var gapR = ex.gapLines / nl;
    var layGot, layDet;
    if (ex.kind === 'docx') {
      layGot = ex.tables ? (ex.tables > 2 ? 0 : 4) : 8;
      layDet = ex.tables ? 'فيها ' + ex.tables + ' جدول — الجداول ممكن تلخبط القراءة' : 'ما فيه جداول 👍';
    } else {
      var enough = lines.length >= 15;
      var high = gapR > 0.25 || (enough && shortR > 0.5), mid = gapR > 0.12 || (enough && shortR > 0.38);
      layGot = high ? 0 : mid ? 4 : 8;
      layDet = 'أسطر قصيرة جداً: ' + Math.round(shortR * 100) + '٪، أسطر فيها فراغات أعمدة: ' + Math.round(gapR * 100) + '٪' + (high ? ' — احتمال كبير أعمدة/جداول' : mid ? ' — احتمال أعمدة' : ' — تنسيق بسيط 👍');
    }
    add({
      id: 'layout', name: 'تنسيق بسيط (بدون أعمدة أو جداول)', max: 8, got: layGot, det: layDet,
      t: 'شكلها مقسومة أعمدة أو جداول',
      fix: 'خلّ التصميم عمود واحد بدون جداول أو مربعات نص، عشان النظام يقرأ الترتيب صح.'
    });

    // 9. pages
    add(pagesCheck(ex));

    // 10. job description match (separate, not in score)
    var jd = jdText && jdText.trim() ? matchJD(jdText, toks) : null;
    return finish(checks, ex, wc, jd, false);
  }

  function pagesCheck(ex) {
    if (!ex.pages) return { id: 'pages', name: 'عدد الصفحات', max: 4, got: 4, det: 'ملفات Word ما نقدر نعرف عدد صفحاتها بدقة — تأكد إنها صفحتين بالكثير.' };
    var g = ex.pages <= 2 ? 4 : ex.pages === 3 ? 2 : 0;
    return {
      id: 'pages', name: 'عدد الصفحات (صفحتين بالكثير)', max: 4, got: g,
      det: ex.pages + (ex.pages === 1 ? ' صفحة' : ex.pages === 2 ? ' صفحتين' : ' صفحات'),
      t: 'سيرتك ' + ex.pages + ' صفحات', fix: 'اختصرها لصفحة أو صفحتين؛ المسؤول يقرأها بثواني.'
    };
  }

  function matchJD(jdText, cvToks) {
    var cvSet = Object.create(null);
    cvToks.forEach(function (w) { cvSet[akey(stem(w))] = 1; cvSet[akey(w)] = 1; });
    var freq = Object.create(null), order = [], display = Object.create(null), full = Object.create(null);
    var rawWords = (jdText.normalize('NFKC').match(/[\p{L}\p{N}][\p{L}\p{N}'’.+#-]*/gu) || []);
    rawWords.forEach(function (orig) {
      var w = norm(orig).replace(/[.\-]+$/, '');
      if (/^[وب]\S{4,}$/.test(w) && isArabic(w) && !/^(وال|بال)/.test(w)) { w = w.slice(1); orig = orig.replace(/^[وب]/, ''); }
      else if (/^(وال|بال)/.test(w)) { w = w.slice(1); orig = orig.replace(/^[وب]/, ''); }
      if (w.length < 3 && !/^[a-z]{2}$/.test(w)) return;
      if (/^\d+$/.test(w)) return;
      if (STOP[w]) return;
      var s = stem(w);
      if (STOP[s] || s.length < 2) return;
      if (!freq[s]) { freq[s] = 0; order.push(s); display[s] = orig.replace(/[.\-]+$/, ''); full[s] = w; }
      freq[s]++;
    });
    var top = order.slice().sort(function (a, b) { return (freq[b] - freq[a]) || (order.indexOf(a) - order.indexOf(b)); }).slice(0, 20);
    var matched = [], missing = [];
    top.forEach(function (k) { (cvSet[akey(k)] || cvSet[akey(full[k])] ? matched : missing).push(display[k]); });
    return { total: top.length, matched: matched, missing: missing, pct: top.length ? Math.round(matched.length / top.length * 100) : 0 };
  }

  function finish(checks, ex, wc, jd, imageOnly) {
    var score = checks.reduce(function (s, c) { return s + c.got; }, 0);
    score = Math.max(0, Math.min(95, Math.round(score)));
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: 'fahs-check', title: 'فحص سيرة', event: true }); } catch (e) {}
    return { checks: checks, score: score, words: wc, jd: jd, imageOnly: imageOnly, ex: ex };
  }

  /* ---------- rendering ---------- */
  function band(score) {
    if (score >= 85) return { cls: 'great', label: 'ممتازة', sum: 'سيرتك جاهزة بشكل ممتاز، باقي لمسات بسيطة.', color: '#e7c36a' };
    if (score >= 70) return { cls: 'good', label: 'جيدة', sum: 'سيرتك جيدة، لكن فيه نقاط لو صلحتها ترفع فرصتك.', color: '#3cc4a6' };
    if (score >= 50) return { cls: 'mid', label: 'متوسطة', sum: 'فيه ملاحظات مهمة ممكن تخلي النظام يتجاوز سيرتك.', color: '#e7a23a' };
    return { cls: 'bad', label: 'ضعيفة', sum: 'سيرتك غالباً بتواجه صعوبة مع أنظمة الفرز. تحتاج تعديلات أساسية.', color: '#e56b66' };
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function render(r) {
    var b = band(r.score);
    $('scoreNum').textContent = r.score + '٪';
    var lab = $('scoreLabel'); lab.textContent = 'الجاهزية: ' + b.label; lab.className = 'score-label ' + b.cls;
    $('scoreSummary').textContent = b.sum;
    var ring = $('ringFg'), C = 2 * Math.PI * 52;
    ring.style.stroke = b.color;
    ring.style.strokeDashoffset = C;
    requestAnimationFrame(function () { requestAnimationFrame(function () { ring.style.strokeDashoffset = C * (1 - r.score / 100); }); });
    report.setAttribute('data-score', r.score);

    $('imageWarn').hidden = !r.imageOnly;

    var issues = $('issues'); issues.innerHTML = '';
    var bad = r.checks.filter(function (c) { return c.got < c.max && !c.skipped && c.t; })
      .sort(function (a, b) { return (b.max - b.got) - (a.max - a.got); }).slice(0, 3);
    if (!bad.length) {
      var li = el('li', 'ok-item');
      li.appendChild(el('span', 'issue-t', 'ما لقينا مشاكل كبيرة 👏'));
      li.appendChild(el('span', 'issue-f', 'تقدر تزيد فرصتك بمطابقة كلمات وصف الوظيفة اللي تقدم عليها.'));
      issues.appendChild(li);
    }
    bad.forEach(function (c) {
      var li = el('li');
      li.appendChild(el('span', 'issue-t', c.t));
      li.appendChild(el('span', 'issue-f', 'الحل: ' + c.fix));
      issues.appendChild(li);
    });

    var ul = $('checks'); ul.innerHTML = '';
    var pass = 0;
    r.checks.forEach(function (c) {
      var st = c.got >= c.max ? 'y' : c.got > 0 ? 'p' : 'n';
      if (st === 'y') pass++;
      var li = el('li');
      var ck = el('span', 'ck ' + st, st === 'y' ? '✓' : st === 'p' ? '!' : '✗');
      ck.setAttribute('aria-label', st === 'y' ? 'ناجح' : st === 'p' ? 'جزئي' : 'غير ناجح');
      li.appendChild(ck);
      var mid = el('div');
      mid.appendChild(el('span', 'ck-name', c.name));
      mid.appendChild(el('span', 'ck-det', c.det));
      li.appendChild(mid);
      li.appendChild(el('span', 'ck-pts', c.got + '/' + c.max));
      ul.appendChild(li);
    });
    $('passCount').textContent = pass + ' من ' + r.checks.length + ' ناجحة';

    var jc = $('jdCard');
    if (r.jd && r.jd.total) {
      jc.hidden = false;
      $('jdPct').textContent = r.jd.pct + '٪';
      $('jdNote').textContent = 'قارنّا أهم ' + r.jd.total + ' كلمة في وصف الوظيفة بسيرتك. هذي النسبة منفصلة عن نتيجة الجاهزية.';
      fillChips($('jdMatched'), r.jd.matched.slice(0, 10), 'ولا كلمة للأسف');
      fillChips($('jdMissing'), r.jd.missing.slice(0, 10), 'ما فيه كلمات ناقصة 👏');
    } else if (r.jd && !r.jd.total) {
      jc.hidden = true;
    } else jc.hidden = true;
  }
  function fillChips(ul, list, empty) {
    ul.innerHTML = '';
    if (!list.length) { ul.appendChild(el('li', 'none', empty)); return; }
    list.forEach(function (w) { var li = el('li', null, w); li.setAttribute('dir', 'auto'); ul.appendChild(li); });
  }

  /* ---------- flow ---------- */
  function showError(msg) { errEl.textContent = msg; errEl.hidden = !msg; }
  function setFile(f) {
    showError('');
    currentFile = null;
    var fn = $('fileName');
    if (!f) { fn.hidden = true; goBtn.disabled = true; return; }
    var name = (f.name || '').toLowerCase();
    var isPdf = /\.pdf$/.test(name) || f.type === 'application/pdf';
    var isDocx = /\.docx$/.test(name);
    if (!isPdf && !isDocx) { showError('الملف لازم يكون PDF أو Word (.docx). ملفات .doc القديمة احفظها كـ PDF أول.'); goBtn.disabled = true; fn.hidden = true; return; }
    if (f.size > MAX_BYTES) { showError('الملف أكبر من 10 ميجا. صغّره أو صدّره PDF من جديد.'); goBtn.disabled = true; fn.hidden = true; return; }
    currentFile = f;
    fn.textContent = f.name; fn.hidden = false;
    goBtn.disabled = false;
  }

  async function run() {
    if (!currentFile) return;
    showError('');
    goBtn.disabled = true;
    report.hidden = true;
    loading.hidden = false;
    results.setAttribute('aria-busy', 'true');
    try {
      var buf = await currentFile.arrayBuffer();
      var isDocx = /\.docx$/i.test(currentFile.name);
      if (!isDocx && !window.pdfjsLib) throw new Error('pdfjs');
      var ex = isDocx ? await readDocx(buf) : await readPdf(buf);
      var r = analyze(ex, $('jd').value);
      render(r);
      loading.hidden = true;
      report.hidden = false;
      results.setAttribute('aria-busy', 'false');
      results.focus({ preventScroll: true });
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      loading.hidden = true;
      results.setAttribute('aria-busy', 'false');
      var m = (e && (e.name || '') + ' ' + (e.message || '')) || '';
      showError(/password/i.test(m) ? 'الملف محمي بكلمة مرور. شيل الحماية وجرّب مرة ثانية.' :
        /mammoth/.test(m) ? 'ما قدرنا نفتح ملف Word. جرّب تحفظه PDF وترفعه.' :
        'ما قدرنا نقرأ الملف. تأكد إنه PDF سليم أو جرّب تصدّره من جديد.');
      if (window.console) console.error(e);
    } finally {
      goBtn.disabled = !currentFile;
    }
  }

  input.addEventListener('change', function () { setFile(input.files && input.files[0]); });
  goBtn.addEventListener('click', run);
  $('again').addEventListener('click', function () {
    input.value = ''; setFile(null); report.hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    input.click();
  });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); }); });
  drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) setFile(f); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  drop.setAttribute('tabindex', '0');
  drop.setAttribute('role', 'button');
  drop.setAttribute('aria-controls', 'cv');
  input.setAttribute('tabindex', '-1');

  // test hook (no data leaves the page)
  window.__atsAnalyze = analyze;
})();
