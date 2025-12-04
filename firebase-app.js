// firebase-app.js
import { firebaseConfig } from './firebase-config.js';
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

let appData = structuredClone(defaultData);

function cloneDefault() {
  return structuredClone(defaultData);
}

function ensureShape(data) {
  if (!data || typeof data !== 'object') return cloneDefault();
  data.workers = Array.isArray(data.workers) ? data.workers : [];
  data.logs = Array.isArray(data.logs) ? data.logs : [];
  data.workers.forEach(w => {
    if (!w.deductions) w.deductions = {};
    w.deductions.percent = Array.isArray(w.deductions.percent) ? w.deductions.percent : [];
    w.deductions.fixed = Array.isArray(w.deductions.fixed) ? w.deductions.fixed : [];
    w.deductions.bonus = Array.isArray(w.deductions.bonus) ? w.deductions.bonus : [];
  });
  return data;
}

async function loadInitialData() {
  const ref = doc(db, DATA_DOC_PATH.collection, DATA_DOC_PATH.docId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      appData = ensureShape(snap.data());
    } else {
      appData = cloneDefault();
      await setDoc(ref, appData);
    }
  } catch (e) {
    console.error('Firestore okunamadı, localStorage yedeğine dönülüyor:', e);
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
  } catch (e) {
    console.error('Firestore\'a kaydedilemedi:', e);
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      } catch {}
      renderAll();
    }
  }, err => {
    console.error('Realtime dinleme hatası:', err);
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

  const sorted = [...appData.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  sorted.forEach(log => {
    const worker = appData.workers.find(w => w.id === log.workerId);
    const daily8 = worker ? Number(worker.daily8) : 0;
    const hourly = daily8 / 8;
    const wage = hourly * (log.hours || 0);

    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(log.date);

    const tdWorker = document.createElement('td');
    tdWorker.textContent = worker ? worker.name : '-';

    const tdHours = document.createElement('td');
    tdHours.className = 'text-center';
    tdHours.textContent = formatNumber(log.hours || 0, 2);

    const tdWage = document.createElement('td');
    tdWage.className = 'text-right';
    tdWage.textContent = formatNumber(wage) + ' TL';

    tr.appendChild(tdDate);
    tr.appendChild(tdWorker);
    tr.appendChild(tdHours);
    tr.appendChild(tdWage);
    tbody.appendChild(tr);
  });
}

function renderDeductionsUI() {
  const sel = document.getElementById('ded-worker');
  if (!sel) return;
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

function renderEmployeeReport() {
  const selWorker = document.getElementById('emp-worker');
  const inputMonth = document.getElementById('emp-month');
  const tbody = document.getElementById('emp-table-body');

  if (!selWorker || !inputMonth || !tbody) return;

  const worker = appData.workers.find(w => w.id === selWorker.value);
  const monthVal = inputMonth.value;
  tbody.innerHTML = '';

  if (!worker || !monthVal) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'text-center';
    td.textContent = 'Lütfen işçi ve ay seçin.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    updateEmployeeSummary(0, 0, 0, 0, 0, 0, 0);
    return;
  }

  const logs = appData.logs.filter(l => l.workerId === worker.id && l.date && l.date.startsWith(monthVal));

  if (logs.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'text-center';
    td.textContent = 'Seçilen ay için kayıt yok.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    updateEmployeeSummary(0, 0, 0, 0, 0, 0, 0);
    return;
  }

  logs.sort((a, b) => a.date.localeCompare(b.date));

  let totalGross = 0;
  let totalHours = 0;

  logs.forEach(log => {
    const daily8 = Number(worker.daily8) || 0;
    const hourly = daily8 / 8;
    const hours = log.hours || 0;
    const wage = hourly * hours;

    totalGross += wage;
    totalHours += hours;

    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = formatDate(log.date);

    const tdHours = document.createElement('td');
    tdHours.className = 'text-center';
    tdHours.textContent = formatNumber(hours, 2);

    const tdWage = document.createElement('td');
    tdWage.className = 'text-right';
    tdWage.textContent = formatNumber(wage) + ' TL';

    tr.appendChild(tdDate);
    tr.appendChild(tdHours);
    tr.appendChild(tdWage);
    tbody.appendChild(tr);
  });

  const d = worker.deductions;
  const totalPercent = (d.percent || []).reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const fixedTotal = (d.fixed || []).reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const bonusTotal = (d.bonus || []).reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const percentAmount = totalGross * (totalPercent / 100);
  const net = totalGross - percentAmount - fixedTotal + bonusTotal;
  const dayCount = logs.length;

  updateEmployeeSummary(totalGross, percentAmount, fixedTotal, bonusTotal, net, totalHours, dayCount);
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
  renderEmployeeReport();
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
    const secId = sections[navId];
    if (!btn) return;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(secId).classList.add('active');
    });
  });
}

function setupDailyEvents() {
  const selWorker = document.getElementById('daily-worker');
  const hoursInput = document.getElementById('daily-hours');
  const dateInput = document.getElementById('daily-date');
  const btnSave = document.getElementById('btn-save-daily');
  const status = document.getElementById('daily-status');

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  if (dateInput) dateInput.value = `${yyyy}-${mm}-${dd}`;

  if (selWorker) {
    selWorker.addEventListener('change', () => {
      updateDaily8WageDisplay();
    });
  }
  if (hoursInput) {
    hoursInput.addEventListener('input', updateDailyCalculatedWage);
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const workerId = selWorker.value;
      const date = dateInput.value;
      const hours = parseFloat(hoursInput.value);

      if (!workerId || !date || isNaN(hours)) {
        status.textContent = 'Lütfen tarih, işçi ve saat bilgisini doldurun.';
        status.className = 'status-msg status-error';
        return;
      }

      let existing = appData.logs.find(l => l.workerId === workerId && l.date === date);
      if (existing) {
        existing.hours = hours;
      } else {
        appData.logs.push({
          id: 'log_' + Date.now() + '_' + Math.random().toString(16).slice(2),
          workerId,
          date,
          hours
        });
      }

      await saveData();

      status.textContent = 'Kayıt başarıyla kaydedildi.';
      status.className = 'status-msg status-ok';

      setTimeout(() => {
        status.textContent = '';
      }, 2500);
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
      setTimeout(() => {
        status.textContent = '';
      }, 2500);
    });
  }
}

function setupDeductionEvents() {
  const sel = document.getElementById('ded-worker');
  const btnAddPercent = document.getElementById('btn-add-percent');
  const btnAddFixed = document.getElementById('btn-add-fixed');
  const btnAddBonus = document.getElementById('btn-add-bonus');

  if (sel) {
    sel.addEventListener('change', renderDeductionsUI);
  }

  if (btnAddPercent) {
    btnAddPercent.addEventListener('click', async () => {
      const worker = appData.workers.find(w => w.id === sel.value);
      if (!worker) return;
      const nameInput = document.getElementById('ded-percent-name');
      const valueInput = document.getElementById('ded-percent-value');
      const name = nameInput.value.trim() || 'Kesinti';
      const val = parseFloat(valueInput.value);
      if (isNaN(val)) return;
      worker.deductions.percent.push({ name, value: val });
      nameInput.value = '';
      valueInput.value = '';
      await saveData();
    });
  }

  if (btnAddFixed) {
    btnAddFixed.addEventListener('click', async () => {
      const worker = appData.workers.find(w => w.id === sel.value);
      if (!worker) return;
      const nameInput = document.getElementById('ded-fixed-name');
      const valueInput = document.getElementById('ded-fixed-value');
      const name = nameInput.value.trim() || 'Kesinti';
      const val = parseFloat(valueInput.value);
      if (isNaN(val)) return;
      worker.deductions.fixed.push({ name, value: val });
      nameInput.value = '';
      valueInput.value = '';
      await saveData();
    });
  }

  if (btnAddBonus) {
    btnAddBonus.addEventListener('click', async () => {
      const worker = appData.workers.find(w => w.id === sel.value);
      if (!worker) return;
      const nameInput = document.getElementById('bonus-name');
      const valueInput = document.getElementById('bonus-value');
      const name = nameInput.value.trim() || 'Ödül';
      const val = parseFloat(valueInput.value);
      if (isNaN(val)) return;
      worker.deductions.bonus.push({ name, value: val });
      nameInput.value = '';
      valueInput.value = '';
      await saveData();
    });
  }
}

function setupEmployeeEvents() {
  const btnShow = document.getElementById('btn-show-report');
  const btnPrint = document.getElementById('btn-print');
  const monthInput = document.getElementById('emp-month');
  const btnBackHome = document.getElementById('btn-back-home');

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  if (monthInput) monthInput.value = `${yyyy}-${mm}`;

  if (btnShow) {
    btnShow.addEventListener('click', () => {
      renderEmployeeReport();
    });
  }
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  const empWorker = document.getElementById('emp-worker');
  if (empWorker) empWorker.addEventListener('change', renderEmployeeReport);
  if (monthInput) monthInput.addEventListener('change', renderEmployeeReport);

  if (btnBackHome) {
    btnBackHome.addEventListener('click', () => {
      goHome();
    });
  }
}

function goHome() {
  const authSection = document.getElementById('section-auth');
  const nav = document.getElementById('main-nav');
  if (authSection) {
    authSection.style.display = 'block';
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    authSection.classList.add('active');
  }
  if (nav) nav.style.display = 'none';
}

function setupAuth() {
  const btnAdmin = document.getElementById('btn-enter-admin');
  const btnEmployee = document.getElementById('btn-enter-employee');
  const authSection = document.getElementById('section-auth');
  const nav = document.getElementById('main-nav');

  if (btnAdmin) {
    btnAdmin.addEventListener('click', () => {
      let pwd = prompt('Yönetici şifresini girin:');
      if (pwd === null) return;
      pwd = pwd.trim();
      if (pwd === '844830') {
        if (authSection) authSection.style.display = 'none';
        if (nav) nav.style.display = 'flex';
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById('section-daily').classList.add('active');
      } else {
        alert('Hatalı şifre');
      }
    });
  }

  if (btnEmployee) {
    btnEmployee.addEventListener('click', () => {
      if (authSection) authSection.style.display = 'none';
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-employee').classList.add('active');
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
  setupNav();
  setupDailyEvents();
  setupWorkerEvents();
  setupDeductionEvents();
  setupEmployeeEvents();
  renderAll();
  subscribeRealtime();
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
