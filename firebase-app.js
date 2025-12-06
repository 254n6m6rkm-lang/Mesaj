// firebase-app.js
import { firebaseConfig } from './firebase-config.js';

// **DÜZELTME: Firebase modül importları kaldırıldı ve global 'firebase' nesnesinden erişiliyor.**
// Bu, bir önceki adımda yapılmıştı. Kontrol amaçlı tekrar ekleniyor.
/*
import {
  initializeApp
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
*/

// Global olarak yüklenen Firebase nesnesinden fonksiyonları alıyoruz (index.html'deki script etiketleri sayesinde)
const initializeApp = firebase.initializeApp;
const getFirestore = firebase.firestore.getFirestore;
const doc = firebase.firestore.doc;
const getDoc = firebase.firestore.getDoc;
const setDoc = firebase.firestore.setDoc;
const onSnapshot = firebase.firestore.onSnapshot;


// structuredClone polyfill (Safari uyumu için)
if (typeof structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const DATA_DOC_PATH = { collection: 'taseronApps', docId: 'adnanTatliMain' };
const STORAGE_KEY = 'adnanTatliTaseronData_backup';

const defaultData = {
  workers: [
    { id: 'w1', name: 'İşçi 1', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
    { id: 'w2', name: 'İşçi 2', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
    { id: 'w3', name: 'İşçi 3', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
    { id: 'w4', name: 'İşçi 4', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
    { id: 'w5', name: 'İşçi 5', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
    { id: 'w6', name: 'İşçi 6', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
    { id: 'w7', name: 'İşçi 7', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
    { id: 'w8', name: 'İşçi 8', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
    { id: 'w9', name: 'İşçi 9', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
    { id: 'w10', name: 'İşçi 10', daily8: 1000, deductions: { percent: [], fixed: [], bonus: [] } },
  ],
  logs: []
};


function pruneOldLogsInPlace(logs) {
  if (!Array.isArray(logs)) return [];
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const threshold = threeMonthsAgo.toISOString().slice(0, 10); // YYYY-MM-DD
  return logs.filter(l => {
    if (!l || !l.date) return true;
    return l.date >= threshold;
  });
}

let currentMode = 'none';
let appData = structuredClone(defaultData);

function cloneDefault() {
  return structuredClone(defaultData);
}

function ensureShape(data) {
  if (!data || typeof data !== 'object') return cloneDefault();
  data.workers = Array.isArray(data.workers) ? data.workers : [];
  data.logs = Array.isArray(data.logs) ? data.logs : [];
  data.logs = pruneOldLogsInPlace(data.logs);
  data.workers.forEach(w => {
    if (!w.deductions) w.deductions = {};
    w.deductions.percent = Array.isArray(w.deductions.percent) ? w.deductions.percent : [];
    w.deductions.fixed = Array.isArray(w.deductions.fixed) ? w.deductions.fixed : [];
    w.deductions.bonus = Array.isArray(w.deductions.bonus) ? w.deductions.bonus : [];
  });
  return data;
}


function setFirebaseStatus(ok) {
  const dot = document.getElementById('firebase-status-dot');
  if (!dot) return;
  dot.classList.remove('status-ok', 'status-error');
  dot.classList.add(ok ? 'status-ok' : 'status-error');
}

async function loadInitialData() {
  const ref = doc(db, DATA_DOC_PATH.collection, DATA_DOC_PATH.docId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      appData = ensureShape(snap.data());
      setFirebaseStatus(true);
    } else {
      appData = cloneDefault();
      await setDoc(ref, appData);
      setFirebaseStatus(true); // Veri yazıldıktan sonra başarılı say
    }
  } catch (e) {
    console.error('Firestore okunamadı, localStorage yedeğine dönülüyor:', e);
    setFirebaseStatus(false); // Bağlantı başarısız
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) appData = ensureShape(JSON.parse(raw));
      else appData = cloneDefault();
    } catch (e2) {
      console.error('localStorage okunamadı:', e2);
      appData = cloneDefault();
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e3) {
    console.warn('localStorage yazılamadı:', e3);
  }
}

async function saveData() {
  const ref = doc(db, DATA_DOC_PATH.collection, DATA_DOC_PATH.docId);
  try {
    await setDoc(ref, appData);
    setFirebaseStatus(true);
  } catch (e) {
    console.error('Firestore\'a kaydedilemedi:', e);
    setFirebaseStatus(false);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e2) {
    console.warn('localStorage\'a kaydedilemedi:', e2);
  }
}

function subscribeRealtime() {
  const ref = doc(db, DATA_DOC_PATH.collection, DATA_DOC_PATH.docId);
  onSnapshot(ref, snap => {
    if (snap.exists()) {
      appData = ensureShape(snap.data());
      setFirebaseStatus(true);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      } catch {}
      renderAll();
    }
  }, err => {
    console.error('Realtime dinleme hatası:', err);
    setFirebaseStatus(false);
  });
}

function formatTL(value) {
  const num = isNaN(value) ? 0 : Number(value);
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
}

function formatNumber(value, digits = 2) {
  const num = isNaN(value) ? 0 : Number(value);
  return num.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function renderWorkerSelects() {
  const selects = [
    document.getElementById('daily-worker'),
    document.getElementById('ded-worker'),
    document.getElementById('emp-worker')
  ];
  selects.forEach(sel => {
    if (!sel) return;
    sel.innerHTML = '';
    appData.workers.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = w.name;
      sel.appendChild(opt);
    });
  });
  updateDaily8WageDisplay();
  renderDeductionsUI();
}

function renderWorkersTable() {
  const tbody = document.getElementById('workers-table');
  tbody.innerHTML = '';

  if (appData.workers.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.textContent = 'Henüz işçi yok.';
    td.className = 'text-center';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  appData.workers.forEach(w => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    const inputName = document.createElement('input');
    inputName.type = 'text';
    inputName.value = w.name;
    inputName.dataset.workerId = w.id;
    inputName.className = 'worker-name-input';
    tdName.appendChild(inputName);

    const tdWage = document.createElement('td');
    const inputWage = document.createElement('input');
    inputWage.type = 'number';
    inputWage.step = '0.01';
    inputWage.min = '0';
    inputWage.value = w.daily8 || 0;
    inputWage.dataset.workerId = w.id;
    inputWage.className = 'worker-wage-input';
    tdWage.appendChild(inputWage);

    const tdAction = document.createElement('td');
    tdAction.className = 'text-center no-print';
    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'btn btn-danger btn-sm';
    btnDel.textContent = 'Sil';
    btnDel.onclick = async () => {
      if (!confirm('Bu işçiyi ve ona ait tüm kayıtları silmek istediğinize emin misiniz?')) return;
      appData.workers = appData.workers.filter(x => x.id !== w.id);
      appData.logs = appData.logs.filter(l => l.workerId !== w.id);
      await saveData();
    };
    tdAction.appendChild(btnDel);

    tr.appendChild(tdName);
    tr.appendChild(tdWage);
    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  });
}

function updateDaily8WageDisplay() {
  const sel = document.getElementById('daily-worker');
  const span = document.getElementById('daily-8wage-value');
  if (!sel || !span) return;
  const worker = appData.workers.find(w => w.id === sel.value);
  const value = worker ? worker.daily8 : 0;
  span.textContent = formatNumber(value) + ' TL';
  updateDailyCalculatedWage();
}

function updateDailyCalculatedWage() {
  const sel = document.getElementById('daily-worker');
  const hoursInput = document.getElementById('daily-hours');
  const out = document.getElementById('daily-calculated-wage');
  if (!sel || !hoursInput || !out) return;

  const worker = appData.workers.find(w => w.id === sel.value);
  const daily8 = worker ? Number(worker.daily8) : 0;
  const hours = parseFloat(hoursInput.value);
  if (!worker || isNaN(hours)) {
    out.textContent = '0,00 TL';
    return;
  }
  const hourly = daily8 / 8;
  const wage = hourly * hours;
  out.textContent = formatTL(wage);
}

function renderDailyLogsTable() {
  const tbody = document.getElementById('daily-logs-table');
  tbody.innerHTML = '';

  if (appData.logs.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = 'Henüz kayıt yok.';
    td.className = 'text-center';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  // Sadece son 3 ayı göster. Daha fazlası için Raporlama ekranı kullanılmalı.
  const latestLogs = appData.logs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  latestLogs.forEach(l => {
    const worker = appData.workers.find(w => w.id === l.workerId);
    if (!worker) return;

    const tr = document.createElement('tr');
    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(l.date);
    const tdWorker = document.createElement('td');
    tdWorker.textContent = worker.name;
    const tdHours = document.createElement('td');
    tdHours.className = 'text-center';
    tdHours.textContent = formatNumber(l.hours, 2);
    const tdWage = document.createElement('td');
    tdWage.className = 'text-right';
    tdWage.textContent = formatTL(l.wage);

    tr.appendChild(tdDate);
    tr.appendChild(tdWorker);
    tr.appendChild(tdHours);
    tr.appendChild(tdWage);
    tbody.appendChild(tr);
  });
}

function setupDailyEvents() {
  const dateInput = document.getElementById('daily-date');
  const workerSelect = document.getElementById('daily-worker');
  const hoursInput = document.getElementById('daily-hours');
  const btnSave = document.getElementById('btn-save-daily');
  const status = document.getElementById('daily-status');

  // Bugünün tarihini varsayılan olarak ayarla
  dateInput.value = new Date().toISOString().slice(0, 10);

  if (workerSelect) workerSelect.addEventListener('change', updateDaily8WageDisplay);
  if (hoursInput) hoursInput.addEventListener('input', updateDailyCalculatedWage);

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const date = dateInput.value;
      const workerId = workerSelect.value;
      const hours = parseFloat(hoursInput.value);
      const worker = appData.workers.find(w => w.id === workerId);

      if (!date || !workerId || isNaN(hours) || hours <= 0) {
        status.textContent = 'Lütfen tüm alanları doğru doldurun.';
        status.className = 'status-msg status-error';
        return;
      }

      const daily8 = worker ? Number(worker.daily8) : 0;
      const hourly = daily8 / 8;
      const wage = hourly * hours;

      const newLog = {
        date: date,
        workerId: workerId,
        hours: hours,
        wage: wage
      };

      // Kaydı güncelle veya ekle
      const existingIndex = appData.logs.findIndex(l => l.date === date && l.workerId === workerId);
      if (existingIndex > -1) {
        appData.logs[existingIndex] = newLog;
      } else {
        appData.logs.push(newLog);
      }

      // Tarihe göre sırala
      appData.logs.sort((a, b) => a.date.localeCompare(b.date));

      await saveData();
      renderDailyLogsTable();
      status.textContent = 'Günlük kayıt başarıyla kaydedildi.';
      status.className = 'status-msg status-ok';
      setTimeout(() => { status.textContent = ''; }, 2500);
    });
  }
}

function setupWorkerEvents() {
  const btnAdd = document.getElementById('btn-add-worker');
  const btnSave = document.getElementById('btn-save-workers');
  const status = document.getElementById('workers-status');

  if (btnAdd) {
    btnAdd.addEventListener('click', async () => {
      const newId = 'w' + Date.now();
      appData.workers.push({
        id: newId,
        name: 'Yeni İşçi',
        daily8: 1000,
        deductions: { percent: [], fixed: [], bonus: [] }
      });
      await saveData();
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const nameInputs = document.querySelectorAll('.worker-name-input');
      const wageInputs = document.querySelectorAll('.worker-wage-input');

      nameInputs.forEach(inp => {
        const id = inp.dataset.workerId;
        const worker = appData.workers.find(w => w.id === id);
        if (worker) {
          worker.name = inp.value || worker.name;
        }
      });

      wageInputs.forEach(inp => {
        const id = inp.dataset.workerId;
        const worker = appData.workers.find(w => w.id === id);
        if (worker) {
          const v = parseFloat(inp.value);
          worker.daily8 = isNaN(v) ? 0 : v;
        }
      });

      await saveData();
      status.textContent = 'İşçi ayarları kaydedildi.';
      status.className = 'status-msg status-ok';
      setTimeout(() => { status.textContent = ''; }, 2500);
    });
  }
}

function renderDeductionsUI() {
  const sel = document.getElementById('ded-worker');
  const worker = appData.workers.find(w => w.id === sel.value);

  const percentDiv = document.getElementById('percent-list');
  const fixedDiv = document.getElementById('fixed-list');
  const bonusDiv = document.getElementById('bonus-list');

  percentDiv.innerHTML = '';
  fixedDiv.innerHTML = '';
  bonusDiv.innerHTML = '';

  if (!worker) return;

  worker.deductions.percent.forEach((item, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<strong>${item.name || 'Kesinti'}</strong> • %${formatNumber(item.value, 1)} `;
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.title = 'Sil';
    btn.onclick = async () => {
      worker.deductions.percent.splice(idx, 1);
      await saveData();
    };
    chip.appendChild(btn);
    percentDiv.appendChild(chip);
  });

  worker.deductions.fixed.forEach((item, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<strong>${item.name || 'Kesinti'}</strong> • ${formatTL(item.value)} `;
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.title = 'Sil';
    btn.onclick = async () => {
      worker.deductions.fixed.splice(idx, 1);
      await saveData();
    };
    chip.appendChild(btn);
    fixedDiv.appendChild(chip);
  });

  worker.deductions.bonus.forEach((item, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<strong>${item.name || 'Ödül'}</strong> • ${formatTL(item.value)} `;
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.title = 'Sil';
    btn.onclick = async () => {
      worker.deductions.bonus.splice(idx, 1);
      await saveData();
    };
    chip.appendChild(btn);
    bonusDiv.appendChild(chip);
  });
}

function setupDeductionEvents() {
  const sel = document.getElementById('ded-worker');
  const btnAddPercent = document.getElementById('btn-add-percent');
  const btnAddFixed = document.getElementById('btn-add-fixed');
  const btnAddBonus = document.getElementById('btn-add-bonus');

  if (sel) sel.addEventListener('change', renderDeductionsUI);

  if (btnAddPercent) {
    btnAddPercent.addEventListener('click', async () => {
      const worker = appData.workers.find(w => w.id === sel.value);
      const name = document.getElementById('ded-percent-name').value.trim();
      const value = parseFloat(document.getElementById('ded-percent-value').value);

      if (!worker || isNaN(value) || value <= 0) return;

      worker.deductions.percent.push({ name: name || 'Yüzdelik Kesinti', value: value });
      document.getElementById('ded-percent-name').value = '';
      document.getElementById('ded-percent-value').value = '';
      await saveData();
    });
  }

  if (btnAddFixed) {
    btnAddFixed.addEventListener('click', async () => {
      const worker = appData.workers.find(w => w.id === sel.value);
      const name = document.getElementById('ded-fixed-name').value.trim();
      const value = parseFloat(document.getElementById('ded-fixed-value').value);

      if (!worker || isNaN(value) || value <= 0) return;

      worker.deductions.fixed.push({ name: name || 'Sabit Kesinti', value: value });
      document.getElementById('ded-fixed-name').value = '';
      document.getElementById('ded-fixed-value').value = '';
      await saveData();
    });
  }

  if (btnAddBonus) {
    btnAddBonus.addEventListener('click', async () => {
      const worker = appData.workers.find(w => w.id === sel.value);
      const name = document.getElementById('ded-bonus-name').value.trim();
      const value = parseFloat(document.getElementById('ded-bonus-value').value);

      if (!worker || isNaN(value) || value <= 0) return;

      worker.deductions.bonus.push({ name: name || 'Ek Ödül', value: value });
      document.getElementById('ded-bonus-name').value = '';
      document.getElementById('ded-bonus-value').value = '';
      await saveData();
    });
  }
}

function renderEmployeeReport() {
  const sel = document.getElementById('emp-worker');
  const monthInput = document.getElementById('emp-month');
  const reportDiv = document.getElementById('employee-report-content');

  const worker = appData.workers.find(w => w.id === sel.value);
  const selectedMonth = monthInput.value; // YYYY-MM

  if (!worker || !selectedMonth) {
    reportDiv.style.display = 'none';
    return;
  }

  reportDiv.style.display = 'block';

  // Başlıkları güncelle
  document.getElementById('report-title-name').textContent = worker.name;
  const [year, month] = selectedMonth.split('-');
  // Ay adını ve yılı Türkçe olarak al
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  document.getElementById('report-title-month').textContent = `${monthName} Maaş Raporu`;

  // Seçilen aya ait kayıtları filtrele
  const logs = appData.logs.filter(l => l.workerId === worker.id && l.date.startsWith(selectedMonth));

  // Hesaplamalar
  const totalHours = logs.reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
  const totalGross = logs.reduce((sum, l) => sum + (Number(l.wage) || 0), 0);
  const d = worker.deductions;

  // Yüzdelik kesinti hesaplama
  const totalPercent = (d.percent || []).reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const percentAmount = totalGross * (totalPercent / 100);

  // Sabit kesinti ve ödül toplamları
  const fixedTotal = (d.fixed || []).reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const bonusTotal = (d.bonus || []).reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  // Net maaş hesaplama
  const net = totalGross - percentAmount - fixedTotal + bonusTotal;
  const dayCount = logs.length;

  // Özet UI güncelleme
  updateEmployeeSummary(totalGross, percentAmount, fixedTotal, bonusTotal, net, totalHours, dayCount);

  // Detay tablosu güncelleme
  const tbody = document.getElementById('emp-table-body');
  tbody.innerHTML = '';
  if (logs.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.textContent = 'Seçilen ay için kayıt yok.';
    td.className = 'text-center';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  logs.sort((a, b) => a.date.localeCompare(b.date)).forEach(l => {
    const tr = document.createElement('tr');
    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(l.date);
    const tdHours = document.createElement('td');
    tdHours.className = 'text-center';
    tdHours.textContent = formatNumber(l.hours, 2);
    const tdWage = document.createElement('td');
    tdWage.className = 'text-right';
    tdWage.textContent = formatTL(l.wage);

    tr.appendChild(tdDate);
    tr.appendChild(tdHours);
    tr.appendChild(tdWage);
    tbody.appendChild(tr);
  });
}

function updateEmployeeSummary(gross, percent, fixed, bonus, net, hours, days) {
  document.getElementById('sum-gross').textContent = formatTL(gross || 0);
  document.getElementById('sum-percent').textContent = '-' + formatTL(percent || 0);
  document.getElementById('sum-fixed').textContent = '-' + formatTL(fixed || 0);
  document.getElementById('sum-bonus').textContent = '+' + formatTL(bonus || 0);
  document.getElementById('sum-net').textContent = formatTL(net || 0);
  document.getElementById('sum-hours').textContent = formatNumber(hours || 0, 2) + ' saat';
  document.getElementById('sum-days').textContent = (days || 0) + ' gün';
}


function renderAll() {
  renderWorkerSelects();
  renderWorkersTable();
  renderDailyLogsTable();
  if (currentMode === 'employee') {
    renderEmployeeReport();
  }
}

function setupNav() {
  const sections = {
    'nav-daily': 'section-daily',
    'nav-workers': 'section-workers',
    'nav-deductions': 'section-deductions',
    'nav-employee': 'section-employee'
  };

  Object.keys(sections).forEach(navId => {
    const btn = document.getElementById(navId);
    if (btn) {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(sections[navId]).classList.add('active');
        renderAll();
      });
    }
  });
}

function setupEmployeeReportEvents() {
  const btnShow = document.getElementById('btn-show-report');
  const btnPrint = document.getElementById('btn-print-report');
  const monthInput = document.getElementById('emp-month');
  const btnBackHome = document.getElementById('btn-back-home');
  const reportBackButton = document.getElementById('report-back-button');

  // Varsayılan olarak bu ayı seç
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0'); // Düzeltme: padStart için String'e çevrildi
  if (monthInput) monthInput.value = `${yyyy}-${mm}`;

  if (btnShow) {
    btnShow.addEventListener('click', () => {
      document.getElementById('employee-report-content').style.display = 'block';
      renderEmployeeReport();
    });
  }

  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  if (reportBackButton) {
    reportBackButton.addEventListener('click', () => {
      document.getElementById('employee-report-content').style.display = 'none';
    });
  }

  const empWorker = document.getElementById('emp-worker');
  if (empWorker) empWorker.addEventListener('change', () => {
    document.getElementById('employee-report-content').style.display = 'none';
  });
  if (monthInput) monthInput.addEventListener('change', () => {
    document.getElementById('employee-report-content').style.display = 'none';
  });

  if (btnBackHome) {
    btnBackHome.addEventListener('click', () => {
      goHome();
    });
  }
}

function goHome() {
  const authSection = document.getElementById('section-auth');
  const nav = document.getElementById('main-nav');
  currentMode = 'none';

  document.body.classList.remove('employee-view');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  
  // Düzeltme: Eğer ana sayfa butonu tıklanırsa giriş alanını temizle ve göster
  const adminPass = document.getElementById('admin-pass');
  if (adminPass) adminPass.value = ''; 

  if (authSection) authSection.classList.add('active');
  if (nav) nav.style.display = 'none';
}

function setupAuth() {
  const form = document.getElementById('auth-form');
  const btnEmployee = document.getElementById('btn-employee-view');
  const authSection = document.getElementById('section-auth');
  const nav = document.getElementById('main-nav');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = document.getElementById('admin-pass').value;

      // **DÜZELTME: Yönetici şifresi '830844' olarak değiştirildi.**
      if (password === '830844') { 
        currentMode = 'admin';
        document.body.classList.remove('employee-view');
        if (authSection) authSection.classList.remove('active');
        if (nav) nav.style.display = 'flex';
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('section-daily').classList.add('active');
        renderAll(); // Verilerin yüklenmesini sağlamak için
      } else {
        alert('Hatalı şifre');
      }
    });
  }

  if (btnEmployee) {
    btnEmployee.addEventListener('click', () => {
      currentMode = 'employee';
      document.body.classList.add('employee-view');
      if (nav) nav.style.display = 'none';
      if (authSection) authSection.classList.remove('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-employee').classList.add('active');
      // **DÜZELTME: Personel görünümüne girince raporu yüklemesi eklendi.**
      renderEmployeeReport(); 
    });
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(err => {
      console.warn('Service worker kaydı başarısız:', err);
    });
  }
}

async function initApp() {
  registerServiceWorker();
  await loadInitialData();
  setupAuth();
  const homeBadge = document.getElementById('btn-home-badge');
  if (homeBadge) {
    homeBadge.addEventListener('click', () => {
      goHome();
    });
  }
  setupNav();
  setupDailyEvents();
  setupWorkerEvents();
  setupDeductionEvents();
  setupEmployeeReportEvents();

  // İlk yüklemede, eğer yönetici şifresi girilmemişse, Giriş ekranını göster.
  goHome();
  
  // Firebase bağlantısı başarılıysa ve yönetici modunda değilse, giriş ekranını göster
  // Başarılı veya başarısız olsun, initApp sonunda renderAll() çağrılır.
  renderAll(); 
  
  // Realtime dinlemeyi başlat
  subscribeRealtime();
}

initApp();
