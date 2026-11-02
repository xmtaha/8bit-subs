  /* ---------------- eylemler ---------------- */
  function openForm(sub) {
    editingId = sub ? sub.id : null;
    dlgTitle.textContent = sub ? 'ABONELİĞİ DÜZENLE' : 'YENİ ABONELİK';
    form.reset();
    form.elements.currency.value = sub ? sub.currency : state.currency;
    form.elements.category.value = sub ? sub.category : 'ent';
    form.elements.period.value = sub ? sub.period : 'monthly';
    form.elements.nextDate.value = sub ? sub.nextDate : todayStr();
    form.elements.startDate.value = sub ? sub.startDate : '';
    form.elements.payMethod.value = sub ? sub.payMethod : '';
    form.elements.status.value = sub ? sub.status : 'active';
    form.elements.icon.value = sub ? sub.icon : '';
    form.elements.cancelUrl.value = sub ? sub.cancelUrl : '';
    form.elements.notes.value = sub ? sub.notes : '';
    form.elements.isTrial.checked = !!(sub && sub.trial);
    form.elements.trialEnd.value = sub && sub.trial ? sub.trial.endDate : '';
    $('trialRow').hidden = !form.elements.isTrial.checked;
    dlg.showModal();
    form.elements.name.focus();
  }

  function pay(id) {
    var s = state.subs.find(function (x) { return x.id === id; });
    if (!s || s.status === 'cancelled') return;
    var today = todayStr();
    if (s.lastPaid === today) return;
    s.history.push({ date: today, amount: s.amount, currency: s.currency });
    s.lastPaid = today;
    s.nextDate = nextDateAfter(s.nextDate, s.period, today);
    save();
    render();
    toast(s.name.toLocaleUpperCase('tr-TR') + ' ÖDENDİ · SIRADAKİ ' + dateLabel(s.nextDate));
  }

  function remove(id) {
    var s = state.subs.find(function (x) { return x.id === id; });
    if (!s) return;
    if (!confirm('"' + s.name + '" silinsin mi? Ödeme geçmişi de silinir.')) return;
    state.subs = state.subs.filter(function (x) { return x.id !== id; });
    save();
    render();
    toast('SİLİNDİ');
  }

  function toggleHist(id) {
    expanded[id] = !expanded[id];
    render();
  }

  function toggleUnused(id) {
    var s = state.subs.find(function (x) { return x.id === id; });
    if (!s) return;
    s.unused = !s.unused;
    save();
    render();
    toast(s.unused ? 'KULLANILMIYOR İŞARETLENDİ' : 'KULLANILIYOR İŞARETLENDİ');
  }

  /* ---------------- olaylar ---------------- */
  $('nav').addEventListener('click', function (e) {
    var b = e.target.closest('[data-view]');
    if (b) show(b.dataset.view);
  });

  $('btnNew').addEventListener('click', function () { openForm(null); });
  $('btnCancel').addEventListener('click', function () { dlg.close(); });
  $('form').elements.isTrial.addEventListener('change', function () {
    $('trialRow').hidden = !this.checked;
  });

  function download(name, mime, content) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  $('btnExport').addEventListener('click', function () {
    var payload = {
      app: '8bit-subs', version: 2,
      exportedAt: new Date().toISOString(),
      currency: state.currency,
      settings: state.settings,
      subscriptions: state.subs
    };
    download('8bit-subs-' + todayStr() + '.json', 'application/json', JSON.stringify(payload, null, 2));
    toast('JSON İNDİRİLDİ');
  });
  $('btnCsv').addEventListener('click', function () {
    var rows = [['Ad', 'Tutar', 'Para Birimi', 'Periyot', 'Kategori', 'Durum', 'Sonraki Ödeme',
                 'Başlangıç', 'Ödeme Yöntemi', 'Ödeme Sayısı', 'Toplam Ödenen', 'Deneme Bitiş', 'Notlar']];
    state.subs.forEach(function (s) {
      rows.push([s.name, s.amount, s.currency, PERIOD[s.period].label, CAT[s.category].name,
        s.status === 'cancelled' ? 'İptal Edildi' : 'Aktif', s.nextDate, s.startDate || '', s.payMethod || '',
        s.history.length, spentOf(s), s.trial ? s.trial.endDate : '', s.notes]);
    });
    // BOM: Excel Türkçe karakterleri doğru okusun; ; ayraç: tr-TR ondalık/liste bölgesi uyumu
    var csv = '\uFEFF' + rows.map(function (r) {
      return r.map(function (c) {
        c = String(c == null ? '' : c);
        return /[",;\r\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(';');
    }).join('\r\n');
    download('8bit-subs-' + todayStr() + '.csv', 'text/csv;charset=utf-8', csv);
    toast('CSV İNDİRİLDİ');
  });
  $('btnImport').addEventListener('click', function () { fileInput.click(); });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    file.text().then(function (txt) {
      var j = JSON.parse(txt); // bozuk JSON burada reddedilir
      var arr = Array.isArray(j) ? j : (j && Array.isArray(j.subscriptions) ? j.subscriptions : null);
      if (!arr) throw new Error('JSON içinde "subscriptions" dizisi yok');
      var subs = arr.map(normalize).filter(Boolean);
      if (!subs.length) throw new Error('geçerli abonelik kaydı bulunamadı');
      if (!confirm(subs.length + ' abonelik içe aktarılacak. Mevcut ' + state.subs.length +
                   ' kayıt değiştirilecek. Devam edilsin mi?')) return;
      // içe aktarma öncesi mevcut veriyi yedekle
      try {
        localStorage.setItem(SNAP_KEY, JSON.stringify({
          ts: Date.now(), exportedAt: new Date().toISOString(),
          currency: state.currency, settings: state.settings, subscriptions: state.subs
        }));
      } catch (e) { /* depo doluysa içe aktarmayı engelleme */ }
      state.subs = subs;
      if (!Array.isArray(j) && j && CURRENCIES.indexOf(j.currency) >= 0) state.currency = j.currency;
      state.settings = normalizeSettings(j && j.settings);
      save();
      render();
      toast(subs.length + ' ABONELİK YÜKLENDİ · ÖNCEKİ VERİ YEDEKLENDİ');
    }).catch(function (err) {
      alert('İçe aktarma başarısız: ' + err.message);
    }).finally(function () {
      fileInput.value = '';
    });
  });

  function restoreFrom(key, label) {
    var j = loadJSON(key);
    if (!j || !Array.isArray(j.subscriptions)) { alert(label + ': yedek bulunamadı.'); return; }
    if (!confirm('Son yedek (' + (j.exportedAt ? new Date(j.exportedAt).toLocaleString('tr-TR') : '?') +
                 ') geri yüklenecek. Mevcut ' + state.subs.length + ' kayıt değişecek. Devam edilsin mi?')) return;
    state.subs = j.subscriptions.map(normalize).filter(Boolean);
    if (CURRENCIES.indexOf(j.currency) >= 0) state.currency = j.currency;
    state.settings = normalizeSettings(j.settings);
    save();
    render();
    toast(label + ' GERİ YÜKLENDİ');
  }
  $('btnRestoreSnap').addEventListener('click', function () { restoreFrom(SNAP_KEY, 'İÇE AKTARMA YEDEĞİ'); });
  $('btnRestoreAuto').addEventListener('click', function () { restoreFrom(AUTO_KEY, 'OTOMATİK YEDEK'); });

  $('btnReset').addEventListener('click', function () {
    if (!resetArmed) {
      resetArmed = true;
      this.textContent = 'EMİN MİSİN? TEKRAR BAS';
      var self = this;
      setTimeout(function () {
        resetArmed = false;
        self.textContent = 'TÜM VERİYİ SIFIRLA';
      }, 4000);
      return;
    }
    resetArmed = false;
    this.textContent = 'TÜM VERİYİ SIFIRLA';
    if (!confirm('TÜM abonelikler, geçmiş, bütçe ve ayarlar silinecek. Bu işlem geri alınamaz. Devam edilsin mi?')) return;
    [LS_KEY, SET_KEY, NOTIF_KEY].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    state = load();
    filterCat = 'all';
    render();
    toast('TÜM VERİ SIFIRLANDI');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    var name = f.name.value.trim();
    var amount = Number(f.amount.value);
    var nextDate = f.nextDate.value;
    if (!name) { f.name.focus(); return; }
    if (!isFinite(amount) || amount <= 0) { f.amount.focus(); return; }
    if (!validDate(nextDate)) { f.nextDate.focus(); return; }
    if (f.isTrial.checked && !validDate(f.trialEnd.value)) { f.trialEnd.focus(); return; }

    var patch = {
      name: name.slice(0, 40),
      amount: amount,
      currency: f.currency.value,
      category: f.category.value,
      period: f.period.value,
      nextDate: nextDate,
      icon: f.icon.value.trim(),
      payMethod: f.payMethod.value,
      status: f.status.value,
      cancelUrl: f.cancelUrl.value.trim(),
      notes: f.notes.value.trim(),
      startDate: validDate(f.startDate.value) ? f.startDate.value : '',
      unused: false
    };

    if (editingId) {
      var s = state.subs.find(function (x) { return x.id === editingId; });
      if (s) {
        patch.unused = s.unused;
        Object.assign(s, patch);
        s.trial = f.isTrial.checked ? { endDate: f.trialEnd.value } : null;
      }
      toast('GÜNCELLENDİ');
    } else {
      var row = normalize(patch);
      row.lastPaid = null;
      row.history = [];
      row.trial = f.isTrial.checked ? { endDate: f.trialEnd.value } : null;
      state.subs.push(row);
      toast('ABONELİK EKLENDİ');
    }
    save();
    dlg.close();
    render();
  });

  $('curSet').addEventListener('change', function () {
    state.currency = this.value;
    save();
    render();
  });

  $('nEnabled').addEventListener('change', function () {
    var self = this;
    state.settings.notif.enabled = self.checked;
    if (self.checked && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(function (p) {
        updateNpStatus();
        if (p !== 'granted') {
          state.settings.notif.enabled = false;
          self.checked = false;
          save();
          toast('BİLDİRİM İZNİ VERİLMEDİ');
        }
      });
    }
    save();
    renderSettingsView();
  });
  ['nD3', 'nD0', 'nTrial'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      state.settings.notif[id.slice(1).toLowerCase()] = this.checked;
      save();
    });
  });
  $('npBtn').addEventListener('click', function () {
    if (!('Notification' in window)) { toast('TARAYICI BİLDİRİM DESTEKLEMİYOR'); return; }
    Notification.requestPermission().then(function (p) {
      updateNpStatus();
      toast(p === 'granted' ? 'İZİN VERİLDİ' : 'İZİN VERİLMEDİ');
    });
  });

  $('budgetInp').addEventListener('change', function () {
    var v = Number(this.value);
    state.settings.budget = isFinite(v) && v > 0 ? v : null;
    save();
    renderBudgetView();
  });
  $('catLimits').addEventListener('change', function (e) {
    var inp = e.target.closest('[data-limit]');
    if (!inp) return;
    var v = Number(inp.value);
    if (isFinite(v) && v > 0) state.settings.catLimits[inp.dataset.limit] = v;
    else delete state.settings.catLimits[inp.dataset.limit];
    save();
    renderBudgetView();
  });

  chipsEl.addEventListener('click', function (e) {
    var chip = e.target.closest('[data-cat]');
    if (!chip) return;
    filterCat = chip.dataset.cat;
    render();
  });

  sortSel.addEventListener('change', function () {
    sortBy = sortSel.value;
    render();
  });

  $('q').addEventListener('input', function () {
    searchQ = this.value.trim();
    render();
  });

  // PWA: https/localhost dışında (file://) sessizce atlanır
  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* file:// vb. */ });
  }

  function handleAct(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var card = btn.closest('[data-id]');
    if (!card) return;
    var id = card.dataset.id;
    var act = btn.dataset.act;
    if (act === 'pay') pay(id);
    else if (act === 'edit') openForm(state.subs.find(function (x) { return x.id === id; }));
    else if (act === 'del') remove(id);
    else if (act === 'hist') toggleHist(id);
    else if (act === 'unused') toggleUnused(id);
  }
  cardsEl.addEventListener('click', handleAct);
  upcomingEl.addEventListener('click', handleAct);
  overdueListEl.addEventListener('click', handleAct);
  weekListEl.addEventListener('click', handleAct);

  calGrid.addEventListener('click', function (e) {
    var item = e.target.closest('.calitem');
    if (!item) return;
    openForm(state.subs.find(function (x) { return x.id === item.dataset.id; }));
  });
  $('calPrev').addEventListener('click', function () {
    calM--; if (calM < 0) { calM = 11; calY--; }
    renderCalendar();
  });
  $('calNext').addEventListener('click', function () {
    calM++; if (calM > 11) { calM = 0; calY++; }
    renderCalendar();
  });
  $('calToday').addEventListener('click', function () {
    var n = new Date();
    calY = n.getFullYear(); calM = n.getMonth();
    renderCalendar();
  });

  emptyEl.addEventListener('click', function (e) {
    if (e.target.closest('[data-new]')) openForm(null);
  });

  // Başka sekmede değişiklik olursa yakala
  window.addEventListener('storage', function (e) {
    if (e.key !== LS_KEY && e.key !== SET_KEY) return;
    state = load();
    render();
  });

  /* ---------------- seçenekleri doldur ---------------- */
  $('curOptions').innerHTML = CURRENCIES.map(function (c) {
    return '<option value="' + c + '">' + c + '</option>';
  }).join('');
  $('catOptions').innerHTML = CATS.map(function (c) {
    return '<option value="' + c[0] + '">' + c[1] + '</option>';
  }).join('');
  $('payOptions').innerHTML = '<option value="">Belirtilmedi</option>' + METHODS.map(function (m) {
    return '<option value="' + m + '">' + m + '</option>';
  }).join('');

  buildNav();
  show('dash');

  notifyCheck();
  setInterval(notifyCheck, 60000); // uygulama/sekme açıkken dakikada bir kontrol

  /* ---------------- tarih matematiği öz-testi (?/#selftest) ---------------- */
  if (location.hash === '#selftest' || location.search.indexOf('selftest') >= 0) {
    var checks = [];
    function eq(actual, expected, label) {
      checks.push({ ok: actual === expected, label: label, actual: actual, expected: expected });
    }
    eq(addPeriod('2026-01-31', 'monthly'), '2026-02-28', 'ay sonu kırpma');
    eq(addPeriod('2026-01-31', 'monthly', 2), '2026-03-31', 'iki ay ileri');
    eq(addPeriod('2026-12-15', 'yearly'), '2027-12-15', 'yıllık');
    eq(addPeriod('2026-10-28', 'weekly'), '2026-11-04', 'haftalık');
    eq(addPeriod('2028-02-29', 'yearly'), '2029-02-28', 'artık yıl');
    eq(addPeriod('2026-01-31', 'quarterly'), '2026-04-30', 'üç aylık kırpma');
    eq(addPeriod('2026-01-31', 'semiannual'), '2026-07-31', 'altı aylık');
    eq(nextDateAfter('2026-01-10', 'monthly', '2026-03-15'), '2026-04-10', 'gecikmiş ödeme ileri taşınır');
    eq(nextDateAfter('2026-10-01', 'monthly', '2026-10-15'), '2026-11-01', 'tek periyot ileri');
    eq(Math.round(monthlyOf(120, 'yearly') * 100) / 100, 10, 'yıllık aylık karşılığı');
    eq(Math.round(monthlyOf(300, 'quarterly') * 100) / 100, 100, 'üç aylık aylık karşılığı');
    eq(Math.round(monthlyOf(600, 'semiannual') * 100) / 100, 100, 'altı aylık aylık karşılığı');
    eq(validDate('2026-02-30'), false, 'geçersiz tarih');
    eq(normalize({ name: 'X', amount: 5 }).period, 'monthly', 'v1 verisi normalize');
    eq(normalize({ name: 'X', amount: 5, history: [{ date: '2026-01-01', amount: 2 }] }).history[0].currency,
       'TRY', 'geçmiş kuru varsayılan');
    eq(normalize({ name: 'X', amount: 5, currency: 'USD', history: [{ date: '2026-01-01', amount: 2, currency: 'EUR' }] })
       .history[0].currency, 'EUR', 'geçmiş kuru saklanır');
    var bad = checks.filter(function (c) { return !c.ok; });
    if (bad.length) {
      console.error('SELFTEST FAIL', bad);
      checks.forEach(function (c) { if (!c.ok) console.log('✕', c.label, c.actual, '≠', c.expected); });
    } else {
      console.log('SELFTEST OK (' + checks.length + ' kontrol)');
    }
  }

