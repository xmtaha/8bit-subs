'use strict';
/* 8-BIT SUBS · görünüm render + akıllı bildirimler */

  /* ---------------- navigasyon ---------------- */
  function buildNav() {
    $('nav').innerHTML = VIEWS.map(function (v) {
      return '<button class="navbtn' + (v[0] === curView ? ' on' : '') + '" data-view="' + v[0] + '">' + v[1] + '</button>';
    }).join('');
  }
  function show(v) {
    curView = v;
    document.querySelectorAll('.view').forEach(function (el) { el.hidden = el.id !== 'view-' + v; });
    document.querySelectorAll('.navbtn').forEach(function (b) { b.classList.toggle('on', b.dataset.view === v); });
    renderView(v);
  }
  function render() { renderView(curView); }
  function renderView(v) {
    var today = todayStr();
    if (v === 'dash') renderDashboard(today);
    else if (v === 'subs') renderSubs();
    else if (v === 'cal') renderCalendar();
    else if (v === 'stats') renderStatsView();
    else if (v === 'budget') renderBudgetView();
    else if (v === 'settings') renderSettingsView();
  }

  /* ---------------- DASHBOARD ---------------- */
  function renderDashboard(today) {
    var inC = inCur(), act = activeInCur();
    var month = plannedMonthly();
    var daily = month * 12 / 365;
    var soonItems = act.filter(function (s) {
      var d = daysUntil(s.nextDate);
      return d >= 0 && d <= 30;
    });
    var soonSum = soonItems.reduce(function (sum, s) { return sum + s.amount; }, 0);
    var top3 = act.slice().sort(function (a, b) {
      return monthlyOf(b.amount, b.period) - monthlyOf(a.amount, a.period);
    }).slice(0, 3);
    var now = new Date();
    var cur = monthSpend(now.getFullYear(), now.getMonth());
    var prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var prev = monthSpend(prevD.getFullYear(), prevD.getMonth());
    var mom;
    if (prev > 0) {
      var pct = Math.round((cur - prev) / prev * 100);
      mom = (cur >= prev ? '▲' : '▼') + ' %' + Math.abs(pct) + ' GEÇEN AYA GÖRE';
    } else mom = cur > 0 ? 'GEÇEN AY VERİ YOK' : 'HİÇ ÖDEME YOK';
    var overBudget = state.settings.budget && cur > state.settings.budget;
    var budget = state.settings.budget;
    var budgetPct = budget ? Math.min(100, Math.round(cur / budget * 100)) : 0;
    var unusedList = state.subs.filter(function (s) { return s.unused && s.status === 'active' && s.currency === state.currency; });
    var unusedCost = unusedList.reduce(function (sum, s) { return sum + monthlyOf(s.amount, s.period); }, 0);

    statsEl.innerHTML =
      '<div class="stat"><span class="label">AYLIK GİDER · PLANLANAN</span>' +
        '<span class="val">' + money(month, state.currency) + '</span>' +
        '<span class="note' + (overBudget ? ' up' : '') + '">' +
        (overBudget ? '⚠ BÜTÇE AŞILDI' : state.currency + ' · AKTİF KAYITLAR') + '</span></div>' +
      '<div class="stat"><span class="label">YILLIK GİDER</span>' +
        '<span class="val">' + money(month * 12, state.currency) + '</span>' +
        '<span class="note">' + state.currency + ' · TAHMİNİ</span></div>' +
      '<div class="stat"><span class="label">GÜNLÜK ORTALAMA</span>' +
        '<span class="val">' + money(daily, state.currency) + '</span>' +
        '<span class="note">365 GÜN BAZI</span></div>' +
      '<div class="stat"><span class="label">AKTİF ABONELİK</span>' +
        '<span class="val small">' + act.length + ' KAYIT</span>' +
        '<span class="note">' + new Set(act.map(function (s) { return s.category; })).size + ' KATEGORİ' +
        (inC.length !== act.length ? ' · ' + (inC.length - act.length) + ' İPTAL' : '') + '</span></div>' +
      '<div class="stat"><span class="label">YAKLAŞAN ÖDEMELER · 30 GÜN</span>' +
        '<span class="val">' + money(soonSum, state.currency) + '</span>' +
        '<span class="note">' + soonItems.length + ' ÖDEME · BUGÜN DAHİL</span></div>' +
      '<div class="stat"><span class="label">BU AY ÖDENEN</span>' +
        '<span class="val">' + money(cur, state.currency) + '</span>' +
        '<span class="note' + (cur > prev && prev > 0 ? ' up' : (prev > 0 ? ' down' : '')) + '">' + mom + '</span></div>' +
      '<div class="stat"><span class="label">EN PAHALI 3 · AYLIK KARŞILIK</span>' +
        '<ul class="vlist">' + (top3.length ? top3.map(function (s) {
          return '<li><b>' + subIcon(s) + ' ' + esc(s.name) + '</b><span>' +
            money(monthlyOf(s.amount, s.period), s.currency) + '</span></li>';
        }).join('') : '<li class="none">Kayıt yok</li>') + '</ul></div>' +
      '<div class="stat"><span class="label">DENEME TAKİBİ</span>' +
        '<span class="val small">' + act.filter(function (s) { return s.trial; }).length + ' DENEME</span>' +
        '<span class="note">' + act.filter(function (s) {
          return s.trial && daysUntil(s.trial.endDate) <= 3;
        }).length + ' YAKINDA BİTECEK</span></div>' +
      '<div class="stat"><span class="label">KULLANILMAYAN ABONELİKLER</span>' +
        '<span class="val small">' + unusedList.length + ' KAYIT</span>' +
        '<span class="note">BOŞA AKAN: ' + money(unusedCost, state.currency) + '/AY · ' + money(unusedCost * 12, state.currency) + '/YIL</span></div>' +
      '<div class="stat"><span class="label">BÜTÇE DURUMU' + (budget ? ' · ' + state.currency : '') + '</span>' +
        (budget
          ? '<div class="pbar' + (cur > budget ? ' over' : (budgetPct >= 80 ? ' warn' : '')) + '" style="margin:0 0 6px"><div class="fill" style="width:' + budgetPct + '%"></div></div>' +
            '<span class="note' + (cur > budget ? ' up' : '') + '">' +
            (cur > budget ? '⚠ AŞIM: ' + money(cur - budget, state.currency)
              : 'KALAN: ' + money(budget - cur, state.currency)) + '</span>'
          : '<span class="val small">AYARLANMADI</span><span class="note">AYARLAR > BÜTÇE</span>') + '</div>';

    renderUpcoming(today);
  }

  function renderUpcoming(today) {
    var items = state.subs.filter(function (s) {
      if (s.status === 'cancelled') return false;
      return daysUntil(s.nextDate) <= 30;
    }).sort(function (a, b) { return a.nextDate.localeCompare(b.nextDate); }).slice(0, 6);

    var pushed = state.subs.filter(function (s) { return s.status === 'active' && s.nextDate < today; }).length;
    upcomingHint.textContent = pushed
      ? pushed + ' GECİKMİŞ KAYIT'
      : items.length + ' YAKLAŞAN KAYIT';

    if (!items.length) {
      upcomingEl.innerHTML = '<p class="empty-row">30 gün içinde ödeme yok. Rahat ol.</p>';
      return;
    }
    upcomingEl.innerHTML = items.map(function (s) {
      var d = daysUntil(s.nextDate);
      var p = dayParts(s.nextDate);
      var st = statusOf(s, today);
      return '<div class="urow" data-id="' + s.id + '">' +
        '<div class="uday' + (st === 'overdue' ? ' overdue' : '') + '"><b>' + p.day + '</b><span>' + p.month + '</span></div>' +
        '<div class="uinfo"><b>' + subIcon(s) + ' ' + esc(s.name) + '</b>' +
          '<span>' + esc(CAT[s.category].name) + ' · ' + PERIOD[s.period].label + ' · ' + relLabel(d) + '</span></div>' +
        '<div class="uamt">' + money(s.amount, s.currency) + '</div>' +
        '<button class="btn mini" data-act="pay"' + (st === 'paid' || st === 'cancelled' ? ' disabled' : '') + '>Öde</button>' +
      '</div>';
    }).join('');
  }

  /* ---------------- ABONELİKLER ---------------- */
  function renderSubs() {
    var today = todayStr();
    var counts = {};
    var unusedCount = 0;
    state.subs.forEach(function (s) {
      counts[s.category] = (counts[s.category] || 0) + 1;
      if (s.unused) unusedCount++;
    });
    if (filterCat !== 'all' && filterCat !== 'unused' && !counts[filterCat]) filterCat = 'all';
    var items = [['all', 'Tümü', state.subs.length]].concat(
      CATS.filter(function (c) { return counts[c[0]]; }).map(function (c) { return [c[0], c[1], counts[c[0]]]; })
    );
    if (unusedCount) items.push(['unused', 'Kullanılmıyor', unusedCount]);
    chipsEl.innerHTML = items.map(function (c) {
      return '<button class="chip' + (filterCat === c[0] ? ' on' : '') + '" data-cat="' + c[0] + '">' +
        c[1] + ' <span>' + c[2] + '</span></button>';
    }).join('');

    if (filterCat === 'unused') {
      var unusedInC = inCur().filter(function (s) { return s.unused; });
      var um = unusedInC.reduce(function (sum, s) { return sum + monthlyOf(s.amount, s.period); }, 0);
      unusedSumEl.hidden = false;
      unusedSumEl.textContent = 'KULLANILMAYANLAR: ' + unusedInC.length + ' KAYIT · AYLIK ~' +
        money(um, state.currency) + ' · YILLIK ~' + money(um * 12, state.currency);
    } else unusedSumEl.hidden = true;

    var list = visibleSubs().slice();
    if (sortBy === 'amount') {
      list.sort(function (a, b) {
        return monthlyOf(b.amount, b.period) - monthlyOf(a.amount, a.period);
      });
    } else if (sortBy === 'name') {
      list.sort(function (a, b) { return a.name.localeCompare(b.name, 'tr'); });
    } else {
      list.sort(function (a, b) { return a.nextDate.localeCompare(b.nextDate); });
    }

    cardsEl.innerHTML = list.map(function (s) { return cardHTML(s, today); }).join('');

    if (!state.subs.length) {
      emptyEl.hidden = false;
      emptyEl.innerHTML = '<b>HENÜZ ABONELİK YOK</b>' +
        'İlk kaydı ekle, ödemeleri buradan takip et.' +
        '<br><button class="btn primary" data-new>+ İlk Aboneliği Ekle</button>';
    } else if (!list.length) {
      emptyEl.hidden = false;
      emptyEl.innerHTML = '<b>BU FİLTREDE KAYIT YOK</b>Farklı bir filtre seç ya da yeni abonelik ekle.';
    } else {
      emptyEl.hidden = true;
      emptyEl.innerHTML = '';
    }
  }

  function cardHTML(s, today) {
    var st = statusOf(s, today);
    var cat = CAT[s.category];
    var d = daysUntil(s.nextDate);
    var spent = spentOf(s);
    var h = s.history;
    var open = !!expanded[s.id];
    var histRows = h.length
      ? h.slice().reverse().slice(0, 12).map(function (x) {
          return '<li><span>' + dateLabel(x.date) + '</span><span>' + money(x.amount, s.currency) + '</span></li>';
        }).join('') + (h.length > 12 ? '<li><span>…</span><span>+' + (h.length - 12) + ' kayıt</span></li>' : '')
      : '<li class="none">Henüz ödeme kaydı yok.</li>';

    var trialTxt = '';
    if (s.trial && s.trial.endDate) {
      var td = daysUntil(s.trial.endDate);
      trialTxt = '<span class="trialtxt">DENEME · ' +
        (td >= 0 ? td + ' GÜN KALDI · DÖNÜŞÜM ' + dateLabel(s.trial.endDate) : 'BİTTİ · ' + dateLabel(s.trial.endDate)) +
        '</span>';
    }
    var badges = '';
    if (s.unused && st !== 'cancelled') {
      badges += '<button class="badge" data-act="unused" title="Kullanılıyor olarak işaretle">KULLANILMIYOR</button>';
    }
    if (st === 'cancelled') badges += '<span class="badge cancelled">' + STATUS.cancelled + '</span>';
    else badges += '<span class="badge ' + st + '">' + STATUS[st] + '</span>';
    if (s.trial) badges += '<span class="badge trial">DENEME</span>';

    var cancelLink = s.cancelUrl
      ? '<a class="btn mini" href="' + esc(s.cancelUrl) + '" target="_blank" rel="noopener" title="' + esc(s.cancelUrl) + '">İptal Linki ↗</a>'
      : '';

    return '<article class="card ' + st + '" data-id="' + s.id + '">' +
      '<div class="card-top">' +
        '<span class="ico" title="' + esc(cat.name) + '">' + subIcon(s) + '</span>' +
        '<h3 title="' + esc(s.name) + (s.notes ? ' — ' + esc(s.notes) : '') + '">' + esc(s.name) + '</h3>' +
        badges +
      '</div>' +
      '<div class="amt">' + money(s.amount, s.currency) + '<small>' + PERIOD[s.period].short + '</small></div>' +
      '<div class="meta">' +
        '<span>SIRADAKİ · ' + dateLabel(s.nextDate) + '</span>' +
        '<span class="rel' + (st === 'overdue' ? ' overdue' : '') + '">' + relLabel(d) + '</span>' +
        (s.payMethod ? '<span>' + esc(s.payMethod) + '</span>' : '') +
        trialTxt +
        (s.notes ? '<span title="' + esc(s.notes) + '">📝 NOT</span>' : '') +
      '</div>' +
      '<div class="card-foot">' +
        '<span class="spent">' + (h.length ? h.length + ' ÖDEME · ' + money(spent, s.currency) : 'KAYIT YOK') + '</span>' +
        '<div class="acts">' +
          '<button class="btn mini" data-act="pay"' + (st === 'paid' || st === 'cancelled' ? ' disabled' : '') + '>✓ Öde</button>' +
          '<button class="btn mini" data-act="hist" aria-expanded="' + open + '">Geçmiş</button>' +
          (st === 'cancelled' ? '' :
            '<button class="btn mini" data-act="unused" title="Kullanım işaretini değiştir">' +
            (s.unused ? '✓ Kullanılıyor' : '○ Kullanılmıyor') + '</button>') +
          '<button class="btn mini" data-act="edit" aria-label="Düzenle">✎</button>' +
          cancelLink +
          '<button class="btn mini danger" data-act="del" aria-label="Sil">✕</button>' +
        '</div>' +
      '</div>' +
      '<ul class="hist"' + (open ? '' : ' hidden') + '>' + histRows + '</ul>' +
    '</article>';
  }

  /* ---------------- ÖDEME TAKVİMİ ---------------- */
  function renderCalendar() {
    var today = todayStr();
    var y = calY, m = calM;
    calTitle.textContent = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' })
      .format(new Date(y, m, 1)).toLocaleUpperCase('tr-TR');

    var byDate = {};
    function add(date, ent) { (byDate[date] = byDate[date] || []).push(ent); }
    state.subs.forEach(function (s) {
      if (s.status === 'cancelled') return;
      if (s.nextDate) add(s.nextDate, { id: s.id, kind: 'pay' });
      if (s.trial && s.trial.endDate) add(s.trial.endDate, { id: s.id, kind: 'trial' });
    });

    var startIdx = (new Date(y, m, 1).getDay() + 6) % 7; // pazartesi başlangıç
    var dim = daysInMonth(y, m);
    var html = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'].map(function (d) {
      return '<div class="calh">' + d + '</div>';
    }).join('');
    for (var i = 0; i < startIdx; i++) html += '<div class="calcell off"></div>';
    for (var day = 1; day <= dim; day++) {
      var ds = y + '-' + pad(m + 1) + '-' + pad(day);
      var cell = '<div class="calcell' + (ds === today ? ' today' : '') + '"><span class="cday">' + day + '</span>';
      var ents = (byDate[ds] || []).slice(0, 3);
      ents.forEach(function (e) {
        var s = state.subs.find(function (x) { return x.id === e.id; });
        if (!s) return;
        var cls = 'calitem' + (e.kind === 'trial' ? ' trial' : '') +
          (e.kind === 'pay' && s.lastPaid === ds ? ' paid' : '') +
          (e.kind === 'pay' && ds < today && s.lastPaid !== ds ? ' overdue' : '');
        cell += '<button type="button" class="' + cls + '" data-id="' + s.id +
          '" title="' + esc(s.name) + ' · ' + money(s.amount, s.currency) + '">' +
          subIcon(s) + ' ' + esc(s.name) + '</button>';
      });
      var extra = (byDate[ds] || []).length - ents.length;
      if (extra > 0) cell += '<span class="cmore">+' + extra + ' daha</span>';
      cell += '</div>';
      html += cell;
    }
    calGrid.innerHTML = html;

    renderCalLists(today);
  }
  function calRow(s, today) {
    var d = daysUntil(s.nextDate);
    var p = dayParts(s.nextDate);
    var st = statusOf(s, today);
    return '<div class="urow" data-id="' + s.id + '">' +
      '<div class="uday' + (st === 'overdue' ? ' overdue' : '') + '"><b>' + p.day + '</b><span>' + p.month + '</span></div>' +
      '<div class="uinfo"><b>' + subIcon(s) + ' ' + esc(s.name) + '</b>' +
        '<span>' + (s.trial ? 'DENEME · ' : '') + esc(CAT[s.category].name) + ' · ' + PERIOD[s.period].label + ' · ' + relLabel(d) + '</span></div>' +
      '<div class="uamt">' + money(s.amount, s.currency) + '</div>' +
      '<div class="acts">' +
        '<button class="btn mini" data-act="edit" aria-label="Detay">✎</button>' +
        '<button class="btn mini" data-act="pay"' + (st === 'paid' || st === 'cancelled' ? ' disabled' : '') + '>' +
        (st === 'overdue' ? 'Öde (Gecikmiş)' : 'Öde') + '</button>' +
      '</div>' +
    '</div>';
  }
  function renderCalLists(today) {
    var overdue = state.subs.filter(function (s) {
      return s.status === 'active' && s.nextDate < today && s.lastPaid !== today;
    }).sort(function (a, b) { return a.nextDate.localeCompare(b.nextDate); });
    var week = state.subs.filter(function (s) {
      var d = daysUntil(s.nextDate);
      return s.status === 'active' && d >= 0 && d <= 7 && s.lastPaid !== today;
    }).sort(function (a, b) { return a.nextDate.localeCompare(b.nextDate); });

    $('overdueHint').textContent = overdue.length + ' KAYIT';
    $('weekHint').textContent = week.length + ' ÖDEME';
    overdueListEl.innerHTML = overdue.length
      ? overdue.map(function (s) { return calRow(s, today); }).join('')
      : '<p class="empty-row">Gecikmiş ödeme yok. 🎉</p>';
    weekListEl.innerHTML = week.length
      ? week.map(function (s) { return calRow(s, today); }).join('')
      : '<p class="empty-row">7 gün içinde ödeme yok.</p>';
  }

  /* ---------------- İSTATİSTİKLER ---------------- */
  function renderStatsView() {
    var now = new Date();
    var pts = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      pts.push({
        y: d.getFullYear(), m: d.getMonth(),
        sum: monthSpend(d.getFullYear(), d.getMonth()),
        label: MONTHS_TR[d.getMonth()],
        cur: i === 0
      });
    }
    var max = 1;
    pts.forEach(function (p) { if (p.sum > max) max = p.sum; });
    $('chartBars').innerHTML = pts.map(function (p) {
      return '<div class="bcol"><div class="b' + (p.cur ? ' cur' : '') + '" style="height:' +
        Math.max(2, Math.round(p.sum / max * 100)) + '%"><i>' +
        (p.sum ? money(Math.round(p.sum), state.currency) : '') + '</i></div>' +
        '<div class="bm">' + p.label + '</div></div>';
    }).join('');
    var anyHist = pts.some(function (p) { return p.sum > 0; });
    $('chartHint').textContent = anyHist
      ? state.currency + ' · GERÇEKLEŞEN ÖDEMELER'
      : 'GRAFİK İÇİN ÖDEME KAYDI GEREKLİ';

    // yıllık özet: gerçekleşen + planlanan tahmin
    var yearAct = 0;
    state.subs.forEach(function (s) {
      if (s.currency !== state.currency) return;
      s.history.forEach(function (h) {
        if (parseDate(h.date).getFullYear() === now.getFullYear()) yearAct += h.amount;
      });
    });
    var plan = plannedMonthly();
    $('yearSummary').innerHTML =
      '<div class="stat"><span class="label">BU YIL ÖDENEN · GERÇEKLEŞEN</span>' +
        '<span class="val">' + money(yearAct, state.currency) + '</span></div>' +
      '<div class="stat"><span class="label">BU YIL TAHMİNİ · PLANLANAN</span>' +
        '<span class="val">' + money(plan * 12, state.currency) + '</span>' +
        '<span class="note">AKTİF KAYITLARDAN HESAPLANIR</span></div>';

    // kategori dağılımı (planlanan aylık, aktif)
    var byCat = {};
    activeInCur().forEach(function (s) {
      byCat[s.category] = (byCat[s.category] || 0) + monthlyOf(s.amount, s.period);
    });
    var catMax = 1;
    CATS.forEach(function (c) { if (byCat[c[0]] > catMax) catMax = byCat[c[0]]; });
    var catRows = CATS.filter(function (c) { return byCat[c[0]]; }).map(function (c) {
      var v = byCat[c[0]];
      var limit = state.settings.catLimits[c[0]];
      var over = limit && v > limit;
      return '<div class="cbar' + (over ? ' over' : '') + '"><div class="clabel"><b>' + c[3] + ' ' +
        esc(c[1]) + (over ? ' ⚠ SINIR AŞILDI' : '') + '</b><span>' + money(v, state.currency) + '/ay</span></div>' +
        '<div class="track"><div class="fill" style="width:' + Math.round(v / catMax * 100) + '%"></div></div></div>';
    }).join('');
    $('catDist').innerHTML = catRows || '<p class="empty-row">Aktif abonelik yok.</p>';

    // en pahalılar
    var top = activeInCur().slice().sort(function (a, b) {
      return monthlyOf(b.amount, b.period) - monthlyOf(a.amount, a.period);
    }).slice(0, 5);
    $('topList').innerHTML = top.length
      ? '<ul class="vlist">' + top.map(function (s) {
          return '<li><b>' + subIcon(s) + ' ' + esc(s.name) + '</b><span>' +
            money(monthlyOf(s.amount, s.period), s.currency) + '/ay</span></li>';
        }).join('') + '</ul>'
      : '<p class="empty-row">Aktif abonelik yok.</p>';

    // aktif vs iptal karşılaştırma + tasarruf
    var cancelled = inCur().filter(function (s) { return s.status === 'cancelled'; });
    var act = activeInCur();
    var actM = plan, canM = cancelled.reduce(function (sum, s) { return sum + monthlyOf(s.amount, s.period); }, 0);
    $('cmpList').innerHTML =
      '<div class="stat"><span class="label">AKTİF</span><span class="val small">' + act.length + ' KAYIT</span>' +
        '<span class="note">' + money(actM, state.currency) + '/ay planlanan</span></div>' +
      '<div class="stat"><span class="label">İPTAL EDİLMİŞ</span><span class="val small">' + cancelled.length + ' KAYIT</span>' +
        '<span class="note">' + money(canM, state.currency) + '/ay eski yük</span></div>';
    $('savingsBox').innerHTML = cancelled.length
      ? '<div class="stat"><span class="label">İPTALLERDEN SAĞLANAN TASARRUF</span>' +
        '<span class="val">' + money(canM, state.currency) + '<small>/ay</small></span>' +
        '<span class="val small">' + money(canM * 12, state.currency) + '<small>/yıl</small></span>' +
        '<span class="note">BU ABONELİKLERİ SÜRDÜRSEYDİN ÖDEYECEKTİN</span></div>'
      : '<p class="empty-row">İptal edilmiş abonelik yok.</p>';

    // geçmiş ödemeler
    var all = [];
    state.subs.forEach(function (s) {
      s.history.forEach(function (h) { all.push({ date: h.date, name: s.name, amount: h.amount, cur: s.currency }); });
    });
    all.sort(function (a, b) { return b.date.localeCompare(a.date); });
    $('histHint').textContent = all.length + ' KAYIT';
    $('allHistory').innerHTML = all.length
      ? '<ul class="hist">' + all.slice(0, 60).map(function (x) {
          return '<li><span>' + dateLabel(x.date) + ' · ' + esc(x.name) + '</span><span>' +
            money(x.amount, x.cur) + '</span></li>';
        }).join('') + '</ul>' + (all.length > 60 ? '<p class="hint">En yeni 60 kayıt gösteriliyor.</p>' : '')
      : '<p class="empty-row">Henüz ödeme kaydı yok.</p>';
  }

  /* ---------------- BÜTÇE ---------------- */
  function renderBudgetView() {
    var now = new Date();
    var budget = state.settings.budget;
    var spent = monthSpend(now.getFullYear(), now.getMonth());
    var plan = plannedMonthly();
    $('budgetCur').textContent = state.currency;
    $('budgetInp').value = budget || '';

    var bar = $('budgetBar'), fill = $('budgetFill'), note = $('budgetNote');
    if (budget) {
      var pct = Math.min(100, Math.round(spent / budget * 100));
      bar.classList.remove('warn', 'over');
      if (spent > budget) bar.classList.add('over');
      else if (pct >= 80) bar.classList.add('warn');
      fill.style.width = pct + '%';
      var remain = budget - spent;
      note.className = 'bnote ' + (spent > budget ? 'over' : (pct >= 80 ? 'warn' : 'ok'));
      note.textContent = spent > budget
        ? '⚠ BÜTÇE AŞILDI · ' + money(spent - budget, state.currency) + ' fazla harcandı (planlanan ' + money(plan, state.currency) + '/ay)'
        : 'HARCAMA ' + pct + '% · KALAN ' + money(remain, state.currency) +
          ' (planlanan ' + money(plan, state.currency) + '/ay)';
    } else {
      fill.style.width = '0%';
      note.className = 'bnote';
      note.textContent = 'Bütçe belirlenmedi — yukarıya aylık tutar gir.';
    }
    $('budgetRows').innerHTML =
      '<ul class="vlist">' +
        '<li><b>Bu ay gerçekleşen</b><span>' + money(spent, state.currency) + '</span></li>' +
        '<li><b>Planlanan aylık toplam</b><span>' + money(plan, state.currency) + '</span></li>' +
      '</ul>';

    // kategori sınırları
    var byCat = {};
    activeInCur().forEach(function (s) {
      byCat[s.category] = (byCat[s.category] || 0) + monthlyOf(s.amount, s.period);
    });
    var rows = CATS.map(function (c) {
      var planV = byCat[c[0]] || 0;
      var limit = state.settings.catLimits[c[0]];
      var over = limit && planV > limit;
      return '<div class="limitrow' + (over ? '" style="color:var(--red)' : '') + '">' +
        '<div class="ltxt">' + c[3] + ' ' + esc(c[1]) +
        '<small>' + (planV ? 'planlanan ' + money(planV, state.currency) + '/ay' : 'aktif kayıt yok') +
        (over ? ' · ⚠ SINIR AŞILDI' : '') + '</small></div>' +
        '<input class="inp-mini" type="number" min="0" step="1" data-limit="' + c[0] +
        '" value="' + (limit || '') + '" placeholder="sınırsız" aria-label="' + esc(c[1]) + ' sınırı">' +
        '<span style="font-size:9px;color:var(--dim)">' + state.currency + '</span>' +
      '</div>';
    }).join('');
    $('catLimits').innerHTML = rows;
  }

  /* ---------------- AYARLAR ---------------- */
  function renderSettingsView() {
    $('curSet').innerHTML = CURRENCIES.map(function (c) {
      return '<option value="' + c + '"' + (c === state.currency ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
    var n = state.settings.notif;
    $('nEnabled').checked = n.enabled;
    $('nD3').checked = n.d3;
    $('nD0').checked = n.d0;
    $('nTrial').checked = n.trial;
    updateNpStatus();

    var ab = loadJSON(AUTO_KEY);
    $('autoInfo').textContent = ab && ab.ts
      ? 'OTOMATİK YEDEK · ' + new Date(ab.ts).toLocaleString('tr-TR')
      : 'OTOMATİK YEDEK YOK';
  }
  function updateNpStatus() {
    var el = $('npStatus');
    if (!('Notification' in window)) { el.textContent = 'TARAYICI DESTEKLEMİYOR'; return; }
    var p = Notification.permission;
    el.textContent = p === 'granted' ? 'İZİN VERİLDİ' : (p === 'denied' ? 'İZİN REDDEDİLDİ' : 'İZİN BEKLENİYOR');
  }

  /* ---------------- akıllı bildirimler ---------------- */
  function loadNotifSent() {
    var j = loadJSON(NOTIF_KEY);
    return j && typeof j.sent === 'object' ? j.sent : {};
  }
  function fireNotification(key, title, body, sent, fresh) {
    if (sent[key] || fresh[key]) return;
    fresh[key] = 1;
    try {
      new Notification('8-BIT SUBS · ' + title, { body: body });
    } catch (e) { /* izin aniden kalktıysa sessiz geç */ }
  }
  function notifyCheck() {
    var n = state.settings.notif;
    if (!n.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    var today = todayStr();
    var sent = loadNotifSent();
    var fresh = {};
    state.subs.forEach(function (s) {
      if (s.status !== 'active') return;
      var d = daysUntil(s.nextDate);
      if (d === 3 && n.d3) {
        fireNotification('d3:' + s.id + ':' + s.nextDate, s.name,
          '3 gün sonra ödeme: ' + money(s.amount, s.currency) + ' (' + dateLabel(s.nextDate) + ')', sent, fresh);
      }
      if (d === 0 && n.d0) {
        fireNotification('d0:' + s.id + ':' + s.nextDate, s.name,
          'Bugün ödenecek: ' + money(s.amount, s.currency), sent, fresh);
      }
      if (s.trial && s.trial.endDate && n.trial) {
        var t = daysUntil(s.trial.endDate);
        if (t === 3) fireNotification('t3:' + s.id + ':' + s.trial.endDate, s.name + ' (DENEME)',
          'Ücretsiz deneme 3 gün içinde bitiyor', sent, fresh);
        if (t === 0) fireNotification('t0:' + s.id + ':' + s.trial.endDate, s.name + ' (DENEME)',
          'Deneme bugün bitiyor — ücretliye dönecek', sent, fresh);
      }
    });
    var keys = Object.keys(fresh);
    if (keys.length) {
      Object.keys(sent).forEach(function (k) { fresh[k] = 1; }); // eski + yeni birleştir
      var all = Object.keys(fresh);
      if (all.length > 300) all = all.slice(-300); // liste şişmesin
      try {
        localStorage.setItem(NOTIF_KEY, JSON.stringify({ sent: all.reduce(function (o, k) { o[k] = 1; return o; }, {}) }));
      } catch (e) { /* yoksay */ }
    }
  }


