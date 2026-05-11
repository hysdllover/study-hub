/* ============================================
   Study Hub — Shared Data Layer
   ============================================ */

const STORAGE_KEY = 'studyHubData_v1';

const DEFAULT_DATA = {
  subjects: [
    { id: 's1', name: '국어', color: 'navy',   createdAt: Date.now() },
    { id: 's2', name: '영어', color: 'olive',  createdAt: Date.now() },
    { id: 's3', name: '수학', color: 'violet', createdAt: Date.now() },
    { id: 's4', name: '사회문화', color: 'rose', createdAt: Date.now() }
  ],
  notes: [],        // { id, subjectId, title, content, tags[], createdAt, updatedAt }
  wrongs: [],       // { id, subjectId, source, question, myAnswer, correctAnswer, reason, retry, createdAt }
  cards: [],        // { id, subjectId, front, back, known, createdAt }
  checklist: [],    // { id, subjectId, text, done, createdAt }
  planner: [],      // { id, date(YYYY-MM-DD), subjectId, text, done }
  mocks: [],        // { id, subjectId, date, name, score, total, grade, weakAreas, notes }
  ddays: [          // { id, name, date(YYYY-MM-DD), pinned }
    { id: 'd1', name: '2027학년도 수능', date: '2026-11-12', pinned: true }
  ]
};

// ---------- Storage ----------

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    // merge with defaults to handle new fields
    return { ...structuredClone(DEFAULT_DATA), ...parsed };
  } catch (e) {
    console.error('Failed to load data', e);
    return structuredClone(DEFAULT_DATA);
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    alert('저장에 실패했습니다. 브라우저 저장공간을 확인해 주세요.');
    return false;
  }
}

let DATA = loadData();

function getData() { return DATA; }
function setData(newData) { DATA = newData; saveData(DATA); }
function commit() { saveData(DATA); }

// ---------- ID generator ----------

function newId(prefix = 'x') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---------- Subjects ----------

function getSubjects() { return DATA.subjects; }
function getSubject(id) { return DATA.subjects.find(s => s.id === id); }

function addSubject(name, color = 'navy') {
  const s = { id: newId('s'), name: name.trim(), color, createdAt: Date.now() };
  DATA.subjects.push(s);
  commit();
  return s;
}

function updateSubject(id, patch) {
  const s = getSubject(id);
  if (!s) return;
  Object.assign(s, patch);
  commit();
}

function deleteSubject(id) {
  DATA.subjects = DATA.subjects.filter(s => s.id !== id);
  // cascade: items keep their subjectId but become orphan (shown as "기타")
  commit();
}

function subjectName(id) {
  const s = getSubject(id);
  return s ? s.name : '기타';
}

function subjectColor(id) {
  const s = getSubject(id);
  return s ? s.color : 'navy';
}

// ---------- JSON I/O ----------

function exportJSON() {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `study-hub-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importJSON(file, onDone) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.subjects) throw new Error('Invalid file');
      if (!confirm('현재 데이터가 모두 덮어쓰여집니다. 계속할까요?')) return;
      DATA = { ...structuredClone(DEFAULT_DATA), ...parsed };
      commit();
      if (onDone) onDone();
      else location.reload();
    } catch (err) {
      alert('파일 형식이 올바르지 않습니다.');
    }
  };
  reader.readAsText(file);
}

// ---------- D-day ----------

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDDay(dateStr) {
  const d = daysUntil(dateStr);
  if (d === 0) return 'D-DAY';
  if (d > 0) return `D-${d}`;
  return `D+${-d}`;
}

// ---------- Nav builder ----------

function renderNav(activePage) {
  const nav = document.querySelector('.nav-links');
  if (!nav) return;
  const links = [
    { href: 'index.html',     label: '대시보드',  key: 'home' },
    { href: 'subjects.html',  label: '과목',     key: 'subjects' },
    { href: 'note.html',      label: '개념노트',  key: 'note' },
    { href: 'wrong.html',     label: '오답노트',  key: 'wrong' },
    { href: 'flashcard.html', label: '암기카드',  key: 'flashcard' },
    { href: 'checklist.html', label: '체크리스트', key: 'checklist' },
    { href: 'planner.html',   label: '플래너',    key: 'planner' },
    { href: 'mock.html',      label: '모의고사',  key: 'mock' }
  ];
  nav.innerHTML = links.map(l =>
    `<a href="${l.href}" class="nav-link ${l.key === activePage ? 'active' : ''}">${l.label}</a>`
  ).join('');
}

// ---------- Date helpers ----------

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ---------- Common UI: page shell ----------

function pageShell(activeKey, title, eyebrow, subtitle) {
  return `
    <nav class="top-nav no-print">
      <a href="index.html" class="brand"><span class="brand-mark"></span>Study Hub</a>
      <div class="nav-links"></div>
    </nav>
    <main class="container">
      <header class="page-header">
        <div class="page-eyebrow">${eyebrow}</div>
        <h1 class="page-title">${title}</h1>
        ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
      </header>
      <div id="page-body"></div>
    </main>
  `;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
