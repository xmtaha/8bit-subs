
'use strict';
/* 8-BIT SUBS · çekirdek: sabitler, tarih matematiği, veri saklama */

  /* ---------------- sabitler ---------------- */
  var LS_KEY = '8bit-subs.v1';           // abonelik + para birimi (v1 uyumlu)
  var SET_KEY = '8bit-subs.settings';    // tema, bütçe, kategori sınırları, bildirimler
  var AUTO_KEY = '8bit-subs.autobackup'; // otomatik yerel yedek
  var SNAP_KEY = '8bit-subs.snapshot';   // içe aktarma öncesi yedek
  var NOTIF_KEY = '8bit-subs.notifs';    // gönderilen bildirim anahtarları (tekrar önleme)
  var LASTBK_KEY = '8bit-subs.lastbackup'; // son JSON dışa aktarma zamanı
  var CATS = [
    ['ent', 'Eğlence', 'ENT', '🎬'],
    ['muz', 'Müzik', 'MZK', '🎵'],
    ['yaz', 'Yazılım', 'YZM', '💻'],
    ['oyn', 'Oyun', 'OYN', '🎮'],
    ['egt', 'Eğitim', 'EGT', '📚'],
    ['spr', 'Spor', 'SPR', '🏋️'],
    ['dgr', 'Diğer', 'DGR', '📦']
  ];
  var CAT = {};
  CATS.forEach(function (c) { CAT[c[0]] = { name: c[1], tag: c[2], icon: c[3] }; });
  var CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
  var PERIOD = {
    weekly:     { label: 'Haftalık',   short: '/hafta' },
    monthly:    { label: 'Aylık',      short: '/ay' },
    quarterly:  { label: 'Üç Aylık',   short: '/3 ay' },
    semiannual: { label: 'Altı Aylık', short: '/6 ay' },
    yearly:     { label: 'Yıllık',     short: '/yıl' }
  };
  var METHODS = ['Kredi Kartı', 'Banka Kartı', 'Havale/EFT', 'Nakit', 'PayPal', 'Diğer'];
  var STATUS = { paid: 'ÖDENDİ', overdue: 'GECİKMİŞ', due: 'BUGÜN', pending: 'BEKLİYOR', cancelled: 'İPTAL' };
  var VIEWS = [
    ['dash', 'Dashboard'], ['subs', 'Abonelikler'], ['cal', 'Ödeme Takvimi'],
    ['stats', 'İstatistikler'], ['budget', 'Bütçe'], ['settings', 'Ayarlar']
  ];
  var MONTHS_TR = ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'];

  /* ---------------- tarih yardımcıları ---------------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return fmtDate(new Date()); }
  function parseDate(s) {
    var p = s.split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    return fmtDate(parseDate(s)) === s;
  }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

  // Ay sonu 31 -> 30 günlük aya kırpılır (31 Ocak -> 28 Şubat); sonrasında ayın 28'i baz alınır.
  // shortcut: kırpma kalıcıdır, ayın son günü takibi gerekiyorsa kural değiştirilmeli.
  function addPeriod(dateStr, period, times) {
    times = times || 1;
    var d = parseDate(dateStr);
    if (period === 'weekly') {
      d.setDate(d.getDate() + 7 * times);
      return fmtDate(d);
    }
    var months = { monthly: 1, quarterly: 3, semiannual: 6, yearly: 12 }[period] || 1;
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months * times);
    d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
    return fmtDate(d);
  }
  function daysUntil(dateStr) {
    return Math.round((parseDate(dateStr) - parseDate(todayStr())) / 86400000);
  }
  // Önümüzdeki 12 ayın aylık planlanan ödeme dizisi; gecikmiş vadeler bu aya biner.
  function plan12Monthly(subs, today) {
    var t = parseDate(today);
    var months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var horizon = addPeriod(today, 'monthly', 12);
    subs.forEach(function (s) {
      var d = s.nextDate;
      var guard = 0;
      while (d < horizon && guard++ < 200) {
        var dt = parseDate(d);
        var idx = (dt.getFullYear() - t.getFullYear()) * 12 + (dt.getMonth() - t.getMonth());
        if (idx < 12) months[Math.max(0, idx)] += s.amount;
        d = addPeriod(d, s.period);
      }
    });
    return months;
  }
  // Ödeme yapıldığında sıradaki tarih: bir periyot ilerlet, geçmişte kalırsa bugünü geçene kadar ilerlet.
  function nextDateAfter(nextDate, period, today) {
    var n = addPeriod(nextDate, period);
    var guard = 0;
    while (n <= today && guard++ < 2000) n = addPeriod(n, period);
    return n;
  }
  function monthlyOf(amount, period) {
    if (period === 'weekly') return amount * 52 / 12;
    if (period === 'quarterly') return amount / 3;
    if (period === 'semiannual') return amount / 6;
    if (period === 'yearly') return amount / 12;
    return amount;
  }
  function money(n, cur) {
    try {
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2
      }).format(n);
    } catch (e) { return n.toFixed(2) + ' ' + cur; }
  }
  function dateLabel(s) {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
      .format(parseDate(s)).replace('.', '');
  }
  function dayParts(s) {
    var d = parseDate(s);
    var month = new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(d).replace('.', '');
    return { day: pad(d.getDate()), month: month.toLocaleUpperCase('tr-TR') };
  }
  function relLabel(days) {
    if (days === 0) return 'bugün';
    if (days === 1) return 'yarın';
    if (days === -1) return 'dün';
    return days > 0 ? days + ' gün sonra' : (-days) + ' gün gecikti';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function subIcon(s) { return s.icon || CAT[s.category].icon; }

  /* ---------------- durum ---------------- */
  function normalize(v) {
    if (!v || typeof v !== 'object') return null;
    var name = typeof v.name === 'string' ? v.name.trim().slice(0, 40) : '';
    var amount = Number(v.amount);
    if (!name || !isFinite(amount) || amount < 0) return null;
    var cur = CURRENCIES.indexOf(v.currency) >= 0 ? v.currency : 'TRY';
    var history = Array.isArray(v.history) ? v.history.filter(function (h) {
      return h && validDate(h.date) && isFinite(Number(h.amount));
    }).map(function (h) {
      // geçmiş ödemenin kuru nerede varsa onu sakla; yoksa aboneliğin (şimdiki) kuru
      return { date: h.date, amount: Number(h.amount),
               currency: CURRENCIES.indexOf(h.currency) >= 0 ? h.currency : cur };
    }).slice(-500) : [];
    var trial = (v.trial && typeof v.trial === 'object' && validDate(v.trial.endDate))
      ? { endDate: v.trial.endDate } : null;
    return {
      id: typeof v.id === 'string' && v.id ? v.id : uid(),
      name: name,
      amount: amount,
      currency: CURRENCIES.indexOf(v.currency) >= 0 ? v.currency : 'TRY',
      category: CAT[v.category] ? v.category : 'dgr',
      period: PERIOD[v.period] ? v.period : 'monthly',
      nextDate: validDate(v.nextDate) ? v.nextDate : todayStr(),
      lastPaid: validDate(v.lastPaid) ? v.lastPaid : null,
      history: history,
      // v2 alanları — v1 verisinde yoksa güvenli varsayılana düşer
      icon: typeof v.icon === 'string' ? v.icon.slice(0, 4) : '',
      payMethod: METHODS.indexOf(v.payMethod) >= 0 ? v.payMethod : '',
      status: v.status === 'cancelled' ? 'cancelled' : 'active',
      cancelUrl: typeof v.cancelUrl === 'string' ? v.cancelUrl.trim().slice(0, 300) : '',
      notes: typeof v.notes === 'string' ? v.notes.trim().slice(0, 300) : '',
      startDate: validDate(v.startDate) ? v.startDate : '',
      trial: trial,
      unused: !!v.unused
    };
  }

  function defaultSettings() {
    return { budget: null, catLimits: {}, notif: { enabled: false, d3: true, d0: true, trial: true, budgetw: true, overdue: true } };
  }
  function normalizeSettings(s) {
    var d = defaultSettings();
    if (!s || typeof s !== 'object') return d;
    if (isFinite(Number(s.budget)) && Number(s.budget) > 0) d.budget = Number(s.budget);
    if (s.catLimits && typeof s.catLimits === 'object') {
      CATS.forEach(function (c) {
        var n = Number(s.catLimits[c[0]]);
        if (isFinite(n) && n > 0) d.catLimits[c[0]] = n;
      });
    }
    if (s.notif && typeof s.notif === 'object') {
      d.notif.enabled = !!s.notif.enabled;
      d.notif.d3 = !!s.notif.d3;
      d.notif.d0 = !!s.notif.d0;
      d.notif.trial = !!s.notif.trial;
      // yeni alanlar: eski kayıtta yoksa açık varsay
      d.notif.budgetw = s.notif.budgetw !== undefined ? !!s.notif.budgetw : true;
      d.notif.overdue = s.notif.overdue !== undefined ? !!s.notif.overdue : true;
    }
    return d;
  }
  function loadJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function load() {
    var base = { currency: 'TRY', subs: [] };
    var j = loadJSON(LS_KEY);
    if (j) {
      base.currency = CURRENCIES.indexOf(j.currency) >= 0 ? j.currency : 'TRY';
      base.subs = (Array.isArray(j.subs) ? j.subs : Array.isArray(j.subscriptions) ? j.subscriptions : [])
        .map(normalize).filter(Boolean);
    }
    base.settings = normalizeSettings(loadJSON(SET_KEY));
    return base;
  }
  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ currency: state.currency, subs: state.subs }));
      localStorage.setItem(SET_KEY, JSON.stringify(state.settings));
      // otomatik yerel yedek: en fazla 10 dakikada bir tazelenir
      var now = Date.now();
      var ab = loadJSON(AUTO_KEY);
      if (!ab || !ab.ts || now - ab.ts > 600000) {
        localStorage.setItem(AUTO_KEY, JSON.stringify({
          ts: now, exportedAt: new Date(now).toISOString(),
          currency: state.currency, settings: state.settings, subscriptions: state.subs
        }));
      }
    } catch (e) {
      toast('KAYDEDİLEMEDİ · DEPOLAMA DOLU OLABİLİR');
    }
  }

  var state = load();
  var filterCat = 'all';
  var searchQ = '';
  var sortBy = 'date';
  var editingId = null;
  var expanded = {};
  var curView = 'dash';
  var calY = 0, calM = 0;
  var resetArmed = false;
  var toastTimer = null;

  /* ---------------- DOM ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var statsEl = $('stats'), upcomingEl = $('upcoming'), upcomingHint = $('upcomingHint');
  var chipsEl = $('chips'), cardsEl = $('cards'), emptyEl = $('empty'), unusedSumEl = $('unusedSum');
  var dlg = $('dlg'), form = $('form'), dlgTitle = $('dlgTitle');
  var sortSel = $('sortSel'), fileInput = $('fileInput');
  var calGrid = $('calGrid'), calTitle = $('calTitle');
  var overdueListEl = $('overdueList'), weekListEl = $('weekList');

  /* ---------------- yardımcılar ---------------- */
  function toast(msg, undoFn) {
    var t = $('toast');
    if (undoFn) {
      t.innerHTML = esc(msg) + ' <button type="button" class="btn mini" id="toastUndo">GERİ AL</button>';
      $('toastUndo').addEventListener('click', function () {
        clearTimeout(toastTimer);
        t.classList.remove('on');
        undoFn();
      });
    } else {
      t.textContent = msg;
    }
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, undoFn ? 6000 : 2400);
  }
  function statusOf(s, today) {
    if (s.status === 'cancelled') return 'cancelled';
    if (s.lastPaid === today) return 'paid';
    if (s.nextDate < today) return 'overdue';
    if (s.nextDate === today) return 'due';
    return 'pending';
  }
  function spentOf(s) {
    return s.history.reduce(function (sum, h) { return sum + h.amount; }, 0);
  }
  // shortcut: geçmiş kaydı anlık kuru saklamaz; aboneliğin para birimi değişirse eski ödemeler yeni birimle gösterilir.
  function inCur() {
    return state.subs.filter(function (s) { return s.currency === state.currency; });
  }
  function activeInCur() {
    return inCur().filter(function (s) { return s.status === 'active'; });
  }
  function plannedMonthly() {
    return activeInCur().reduce(function (sum, s) { return sum + monthlyOf(s.amount, s.period); }, 0);
  }
  // Gerçekleşen ödemeler: sadece tarihi geçmiş kayıtlar, gelecek ödemeler sayılmaz.
  function monthSpend(y, m) {
    var sum = 0;
    state.subs.forEach(function (s) {
      if (s.currency !== state.currency) return;
      s.history.forEach(function (h) {
        var d = parseDate(h.date);
        if (d.getFullYear() === y && d.getMonth() === m) sum += h.amount;
      });
    });
    return sum;
  }
  function visibleSubs() {
    var q = searchQ.toLowerCase();
    return state.subs.filter(function (s) {
      if (filterCat === 'unused' ? !s.unused : filterCat !== 'all' && s.category !== filterCat) return false;
      if (q && s.name.toLowerCase().indexOf(q) < 0 &&
          (s.notes || '').toLowerCase().indexOf(q) < 0 &&
          CAT[s.category].name.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }


