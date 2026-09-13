const answerKey = "CDDADAAACABBCABCCDCA" +
  "DDCACBAABCDBCADBDDDA" +
  "ACABCACCBAADBBCBDADC" +
  "DBAABCCADACACCADBADB" +
  "ACDCDBDDBAAAAADBBCBD" +
  "DBACAABDCCDABDCBBBCB" +
  "DBDBABCCDDCBBCBCDAADBBABABCDDD";

const sections = [
  { id: 'gi', name: 'General Information', start: 1, end: 30, color: '#1a73e8' },
  { id: 'cs', name: 'Communication Skills', start: 31, end: 70, color: '#188038' },
  { id: 'qr', name: 'Quantitative Reasoning', start: 71, end: 110, color: '#b06000' },
  { id: 'ct', name: 'Critical Thinking', start: 111, end: 150, color: '#9334e6' }
];
const total = 150;
const STORAGE_KEY = 'napolcomExamV2';

let state = loadState() || {
  view: 'home',
  current: 1,
  answers: {},
  flags: {},
  remaining: 150 * 60,
  status: 'not_started',
  startedAt: null,
  submittedAt: null
};
let timerInterval = null;

function getSection(n) { return sections.find(s => n >= s.start && n <= s.end); }
function formatTime(sec) { const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60); const s = sec%60; return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

function loadState() { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    state.remaining--;
    updateTimerDisplay();
    if (state.remaining <= 0) { autoSubmit(); }
    saveState();
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (!el) return;
  el.textContent = formatTime(state.remaining);
  if (state.remaining < 600) el.classList.add('low');
}

function stopTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = null; }

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  if (state.view === 'home') renderHome(app);
  else if (state.view === 'instructions') renderInstructions(app);
  else if (state.view === 'exam') renderExam(app);
  else if (state.view === 'section_transition') renderSectionTransition(app);
  else if (state.view === 'submit_confirm') renderSubmitConfirm(app);
  else if (state.view === 'cancel_confirm') renderCancelConfirm(app);
  else if (state.view === 'reset_confirm') renderResetConfirm(app);
  else if (state.view === 'results') renderResults(app);
  else if (state.view === 'review') renderReview(app);
  saveState();
}

function renderHome(root) {
  const hasProgress = state.status === 'in_progress' && Object.keys(state.answers).length > 0;
  root.innerHTML = `
    <div class="header">
      <h1>PNP Entrance Examination Practice</h1>
      <p>150-Item Practice Simulation · NAPOLCOM</p>
    </div>
    <div class="container">
      <div class="hero">
        <h2>Test your readiness for the PNP Entrance Exam</h2>
        <p>Practice against 150 real NAPOLCOM simulation items across four sections. Questions, answer key, and explanations are included in the app.</p>
        <button class="btn btn-primary" onclick="startExam(true)">Start Practice Exam</button>
        ${hasProgress ? `<button class="btn btn-secondary" style="margin-left:12px" onclick="resumeExam()">Resume Attempt</button>` : ''}
      </div>
      <div class="coverage">
        ${sections.map(s => `
          <div class="section-card" style="border-left:4px solid ${s.color}">
            <h3>${s.name}</h3>
            <p>Items ${s.start}–${s.end} · ${s.end-s.start+1} Questions</p>
          </div>
        `).join('')}
      </div>
      <div class="section-card" style="text-align:center">
        <p style="font-size:1.1rem;margin:0"><b>150</b> Total Items · <b>150</b> Minutes</p>
      </div>
    </div>`;
}

function renderInstructions(root) {
  root.innerHTML = `
    <div class="header">
      <h1>Before You Begin</h1>
      <p>Read the instructions carefully.</p>
    </div>
    <div class="container">
      <div class="card instructions">
        <ul>
          <li>The examination contains 150 practice items.</li>
          <li>Each question has four choices: A, B, C, and D.</li>
          <li>Select the best answer for each question.</li>
          <li>You may navigate between questions.</li>
          <li>Unanswered questions are clearly identified in the navigator.</li>
          <li>Review your answers before submitting.</li>
          <li>Your score will be calculated automatically after submission.</li>
          <li>Explanations are shown after you submit the exam.</li>
        </ul>
        <div style="margin-top:24px;display:flex;gap:12px">
          <button class="btn btn-secondary" onclick="goHome()">Back to Home</button>
          <button class="btn btn-primary" onclick="enterExam()">Start Examination</button>
        </div>
      </div>
    </div>`;
}

function renderExam(root) {
  const n = state.current;
  const sec = getSection(n);
  const ans = state.answers[n] || '';
  const isFlagged = !!state.flags[n];
  const answeredCount = Object.keys(state.answers).length;
  const pct = (answeredCount / total) * 100;
  const q = (typeof examQuestions !== 'undefined' && examQuestions[n - 1]) ? examQuestions[n - 1] : null;
  const hasQ = q && q.q;
  const questionText = hasQ ? '<div style="font-size:1.05rem;line-height:1.5;margin:0 0 20px;white-space:pre-wrap">' + q.q + '</div>' : '<p style="color:var(--muted);font-size:.9rem;margin:-12px 0 20px">Question ' + n + ' text is not available. Please choose your best answer below.</p>';
  let passageText = '';
  if (q && q.passage) passageText = '<div style="background:#f8f9fa;border:1px solid #dadce0;border-radius:8px;padding:16px;margin:0 0 20px;font-size:.95rem;line-height:1.5;white-space:pre-wrap">' + q.passage + '</div>';
  else if (q && q.passageRef) {
    const p = (typeof examQuestions !== 'undefined' && examQuestions[q.passageRef - 1] && examQuestions[q.passageRef - 1].passage) ? examQuestions[q.passageRef - 1].passage : null;
    if (p) passageText = '<div style="background:#f8f9fa;border:1px solid #dadce0;border-radius:8px;padding:16px;margin:0 0 20px;font-size:.95rem;line-height:1.5;white-space:pre-wrap"><b>Passage</b><br>' + p + '</div>';
  }
  let tableText = '';
  if (q && q.table) tableText = '<div style="background:#fff;border:1px solid #dadce0;border-radius:8px;padding:16px;margin:0 0 20px;font-size:.9rem;line-height:1.5;white-space:pre-wrap;overflow-x:auto">' + q.table + '</div>';
  else if (q && q.tableRef) {
    const t = (typeof examQuestions !== 'undefined' && examQuestions[q.tableRef - 1] && examQuestions[q.tableRef - 1].table) ? examQuestions[q.tableRef - 1].table : null;
    if (t) tableText = '<div style="background:#fff;border:1px solid #dadce0;border-radius:8px;padding:16px;margin:0 0 20px;font-size:.9rem;line-height:1.5;white-space:pre-wrap;overflow-x:auto"><b>Table</b><br>' + t + '</div>';
  }
  let figureText = '';
  if (q && q.figure) figureText = '<pre style="background:#fff;border:1px solid #dadce0;border-radius:8px;padding:16px;margin:0 0 20px;font-size:1.05rem;line-height:1.2;white-space:pre;overflow-x:auto;font-family:Consolas,Monaco,monospace">' + q.figure + '</pre>';
  else if (q && q.figureRef) {
    const f = (typeof examQuestions !== 'undefined' && examQuestions[q.figureRef - 1] && examQuestions[q.figureRef - 1].figure) ? examQuestions[q.figureRef - 1].figure : null;
    if (f) figureText = '<pre style="background:#fff;border:1px solid #dadce0;border-radius:8px;padding:16px;margin:0 0 20px;font-size:1.05rem;line-height:1.2;white-space:pre;overflow-x:auto;font-family:Consolas,Monaco,monospace"><b>Figure</b>\n' + f + '</pre>';
  }
  root.innerHTML = `
    <div class="exam-toolbar">
      <div><b>PNP Entrance Exam</b> · ${sec.name}</div>
      <div class="timer ${state.remaining < 600 ? 'low' : ''}" id="timer">${formatTime(state.remaining)}</div>
      <div class="toolbar-actions">
        <button class="btn btn-sm btn-secondary" onclick="cancelExam()">Cancel</button>
        <button class="btn btn-sm btn-primary" onclick="showSubmitConfirm()">Submit</button>
      </div>
    </div>
    <div class="progress-wrap">
      <div class="progress-info">
        <span>Question ${n} of ${total}</span>
        <span>Answered: ${answeredCount} / ${total}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="exam-layout">
      <div class="question-panel card" style="flex:1">
        <div class="question-card">
          <div class="question-meta">${sec.name} · Questions ${sec.start}–${sec.end}</div>
          <div class="question-number">Question ${n}</div>
          ${passageText}
          ${tableText}
          ${questionText}
          ${figureText}
          <div class="choices">
            ${['A','B','C','D'].map(c => {
              const choice = (q && q[c.toLowerCase()]) ? q[c.toLowerCase()].replace(/^[A-Da-d][.]\\s*/, '') : '';
              return `<div class="choice-card ${ans === c ? 'selected' : ''}" onclick="selectAnswer('${c}')">
                <div class="choice-letter">${c}</div>
                <span>${choice ? choice : 'Answer ' + c}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="exam-controls">
          <button class="btn btn-secondary" ${n === 1 ? 'disabled' : ''} onclick="prevQuestion()">Previous</button>
          <button class="btn ${isFlagged ? 'btn-danger' : 'btn-secondary'}" onclick="toggleFlag()">${isFlagged ? 'Remove Flag' : 'Flag for Review'}</button>
          <button class="btn btn-primary" ${n === total ? 'disabled' : ''} onclick="nextQuestion()">Next</button>
        </div>
        <div class="navigator" id="navigator"></div>
      </div>
    </div>`;
  renderNavigator();
  startTimer();
}

function renderNavigator() {
  const nav = document.getElementById('navigator');
  if (!nav) return;
  const current = state.current;
  let html = '';
  for (let i = 1; i <= total; i++) {
    const cl = [];
    if (i === current) cl.push('current');
    if (state.answers[i]) cl.push('answered');
    if (state.flags[i]) cl.push('flagged');
    html += `<button class="${cl.join(' ')}" title="Question ${i}" onclick="goToQuestion(${i})">${i}</button>`;
  }
  nav.innerHTML = html;
}

function renderSectionTransition(root) {
  const sec = getSection(state.current);
  root.innerHTML = `
    <div class="section-transition">
      <div class="dialog-card">
        <h3>Section Transition</h3>
        <p>You have completed <b>${sections.find(s => s.id === state.transitionFrom).name}</b>.<br>Next section: <b>${sec.name}</b> (Questions ${sec.start}–${sec.end}).</p>
        <div class="dialog-actions">
          <button class="btn btn-primary" onclick="continueSection()">Continue</button>
        </div>
      </div>
    </div>`;
}

function renderSubmitConfirm(root) {
  const answered = Object.keys(state.answers).length;
  const unanswered = total - answered;
  const flagged = Object.keys(state.flags).length;
  root.innerHTML = `
    <div class="submit-dialog">
      <div class="dialog-card">
        <h3>Submit your examination?</h3>
        <p>You have answered <b>${answered}</b> of <b>${total}</b> questions.<br><b>${unanswered}</b> unanswered · <b>${flagged}</b> flagged for review.</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" onclick="closeDialog()">Continue Reviewing</button>
          <button class="btn btn-primary" onclick="submitExam()">Submit Exam</button>
        </div>
      </div>
    </div>`;
}

function renderCancelConfirm(root) {
  root.innerHTML = `
    <div class="cancel-dialog">
      <div class="dialog-card">
        <h3>Cancel exam?</h3>
        <p>Your progress is saved and you can resume later. Are you sure you want to leave?</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" onclick="closeDialog()">Keep Exam</button>
          <button class="btn btn-danger" onclick="confirmCancel()">Cancel Exam</button>
        </div>
      </div>
    </div>`;
}

function renderResetConfirm(root) {
  root.innerHTML = `
    <div class="reset-dialog">
      <div class="dialog-card">
        <h3>Start a new attempt?</h3>
        <p>Your current answers and progress will be cleared. This cannot be undone.</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" onclick="closeDialog()">Keep Attempt</button>
          <button class="btn btn-danger" onclick="confirmReset()">Restart Exam</button>
        </div>
      </div>
    </div>`;
}

function computeResults() {
  const perSection = sections.map(s => ({ ...s, correct: 0, count: s.end - s.start + 1 }));
  let totalCorrect = 0, totalAnswered = 0, totalUnanswered = 0;
  for (let i = 1; i <= total; i++) {
    const sec = getSection(i);
    const sObj = perSection.find(s => s.id === sec.id);
    if (state.answers[i]) {
      totalAnswered++;
      if (state.answers[i] === answerKey[i - 1]) { sObj.correct++; totalCorrect++; }
    } else { totalUnanswered++; }
  }
  return { perSection, totalCorrect, totalAnswered, totalUnanswered, percentage: ((totalCorrect/total)*100).toFixed(2) };
}

function renderResults(root) {
  const res = computeResults();
  root.innerHTML = `
    <div class="header">
      <h1>Examination Complete</h1>
      <p>Your PNP Entrance Examination practice results</p>
    </div>
    <div class="container">
      <div class="card results">
        <div class="footer-actions" style="padding-bottom:0">
          <button class="btn btn-primary" onclick="renderReview()">Review Answers</button>
          <button class="btn btn-secondary" onclick="resetExam()">Retake Exam</button>
        </div>
        <div class="score-ring">
          <span>${res.percentage}%</span>
          <small>${res.totalCorrect} / ${total}</small>
        </div>
        <div class="stats-grid">
          <div class="stat"><b>${total}</b><span>Total Questions</span></div>
          <div class="stat"><b>${res.totalCorrect}</b><span>Correct</span></div>
          <div class="stat"><b>${res.totalAnswered - res.totalCorrect}</b><span>Incorrect</span></div>
          <div class="stat"><b>${res.totalUnanswered}</b><span>Unanswered</span></div>
        </div>
        <h3>Section Performance</h3>
        <table class="section-table">
          <tr><th>Section</th><th>Score</th><th>Percentage</th></tr>
          ${res.perSection.map(s => {
            const pct = ((s.correct/s.count)*100).toFixed(2);
            return `<tr><td>${s.name}</td><td>${s.correct}/${s.count}</td><td>${pct}%</td></tr>`;
          }).join('')}
        </table>
      </div>
    </div>`;
}

let reviewFilter = 'all';
function renderReview(root) {
  const container = root || document.getElementById('app');
  const res = computeResults();
  const filters = { all:'All', correct:'Correct', incorrect:'Incorrect', unanswered:'Unanswered', flagged:'Flagged' };
  container.innerHTML = `
    <div class="header">
      <h1>Answer Review</h1>
      <p>Review your responses against the answer key.</p>
    </div>
    <div class="container">
      <div class="card results">
        <div class="footer-actions" style="padding-bottom:0">
          <button class="btn btn-secondary" onclick="resetExam()">Retake Exam</button>
          <button class="btn btn-secondary" onclick="goHome()">Home</button>
        </div>
        <div class="review-filters">
          ${Object.entries(filters).map(([k,v]) => `<button class="${reviewFilter === k ? 'active' : ''}" onclick="setReviewFilter('${k}')">${v}</button>`).join('')}
        </div>
        <div class="review-list" id="reviewList"></div>
      </div>
    </div>`;
  renderReviewList();
}

function setReviewFilter(f) { reviewFilter = f; renderReview(); }

function renderReviewList() {
  const list = document.getElementById('reviewList');
  if (!list) return;
  let html = '';
  for (let i = 1; i <= total; i++) {
    const correct = answerKey[i - 1];
    const yours = state.answers[i] || '';
    const flagged = state.flags[i];
    const status = !yours ? 'unanswered' : (yours === correct ? 'correct' : 'wrong');
    if (reviewFilter === 'correct' && status !== 'correct') continue;
    if (reviewFilter === 'incorrect' && status !== 'wrong') continue;
    if (reviewFilter === 'unanswered' && status !== 'unanswered') continue;
    if (reviewFilter === 'flagged' && !flagged) continue;
    const sec = getSection(i);
    const q = (typeof examQuestions !== 'undefined' && examQuestions[i - 1]) ? examQuestions[i - 1] : null;
    const explanation = (q && q.explanation) ? q.explanation : (typeof explanations !== 'undefined' && explanations[i]) ? explanations[i] : null;
    html += `
      <div class="review-item ${status}">
        <h4>Question ${i} · ${sec.name}</h4>
        <p><b>Your Answer:</b> ${yours || '—'} &nbsp; <b>Correct Answer:</b> ${correct} &nbsp; ${flagged ? '· ⚑ Flagged' : ''}</p>
        ${explanation ? '<p style="margin-top:6px;white-space:pre-wrap"><b>Explanation:</b> ' + explanation + '</p>' : '<p style="margin-top:6px">Status: ' + (status === 'correct' ? 'Correct' : status === 'wrong' ? 'Incorrect' : 'Unanswered') + '. No explanation is available for this item.</p>'}
      </div>`;
  }
  list.innerHTML = html || '<p style="color:var(--muted)">No questions match this filter.</p>';
}

function startExam(newAttempt) {
  if (newAttempt) { state = { view:'instructions', current:1, answers:{}, flags:{}, remaining:150*60, status:'not_started', startedAt:null, submittedAt:null }; }
  saveState();
  render();
}

function enterExam() {
  state.view = 'exam';
  state.status = 'in_progress';
  state.startedAt = new Date().toISOString();
  state.current = 1;
  saveState();
  render();
  startTimer();
}

function resumeExam() {
  if (state.status === 'in_progress') {
    state.view = 'exam';
    saveState();
    render();
    startTimer();
  } else { enterExam(); }
}

function goHome() { state.view = 'home'; stopTimer(); saveState(); render(); }
function goToQuestion(n) { state.current = n; saveState(); render(); }
function prevQuestion() { if (state.current > 1) { state.current--; saveState(); render(); } }

function nextQuestion() {
  if (state.current < total) {
    const oldSec = getSection(state.current).id;
    state.current++;
    const newSec = getSection(state.current).id;
    if (oldSec !== newSec) {
      state.transitionFrom = oldSec;
      state.view = 'section_transition';
      saveState();
      render();
      return;
    }
    saveState();
    render();
  }
}

function continueSection() {
  state.view = 'exam';
  delete state.transitionFrom;
  saveState();
  render();
}

function selectAnswer(c) { state.answers[state.current] = c; saveState(); render(); }
function toggleFlag() { state.flags[state.current] = !state.flags[state.current]; saveState(); render(); }

function showSubmitConfirm() { state.view = 'submit_confirm'; saveState(); render(); }
function closeDialog() { state.view = 'exam'; saveState(); render(); }
function cancelExam() { state.view = 'cancel_confirm'; saveState(); render(); }
function confirmCancel() { stopTimer(); state.view = 'home'; saveState(); render(); }

function autoSubmit() { submitExam(true); }

function submitExam(auto) {
  stopTimer();
  state.status = 'completed';
  state.submittedAt = new Date().toISOString();
  state.view = 'results';
  saveState();
  render();
}

function resetExam() { state.view = 'reset_confirm'; saveState(); render(); }
function confirmReset() {
  stopTimer();
  localStorage.removeItem(STORAGE_KEY);
  state = { view:'home', current:1, answers:{}, flags:{}, remaining:150*60, status:'not_started', startedAt:null, submittedAt:null };
  saveState();
  render();
}

if (state.status === 'in_progress') state.view = 'exam';
render();
