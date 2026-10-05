import {
  addMessage,
  addStatusNote,
  confirmSession,
  createInitialState,
  markSessionDone,
  outcomeDraft,
  parseRoute,
  scheduleDraft,
  shiftDays,
  suggestAnother,
  toggleSaved,
} from '/src/model.js';
import { renderTabs, renderView } from './render.js';

const STORAGE_KEY = 'give-mentor-sample-v1';

let state = loadState();
let ui = freshUi();
let historyStack = [];
let toastTimer = 0;
let lastKey = '';
let stickToBottom = false;

function freshUi() {
  return {
    requestFilter: 'All',
    boardMode: 'person',
    boardFilter: 'all',
    schedule: null,
    outcome: null,
    threadPerson: '',
    threadTab: 'conversation',
    composer: '',
    noteMode: false,
  };
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !parsed.requests || !parsed.packages) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

function persist() {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function captureFields() {
  const note = document.querySelector('[data-field="note"]');
  if (note && ui.schedule) ui.schedule.note = note.value;
  const words = document.querySelector('[data-field="words"]');
  if (words && ui.outcome) ui.outcome.words = words.value;
  const composer = document.querySelector('[data-field="composer"]');
  if (composer) ui.composer = composer.value;
}

function syncDrafts(route) {
  if (route.name === 'schedule' && (!ui.schedule || ui.schedule.requestId !== route.id)) {
    ui.schedule = scheduleDraft(state, route.id);
  }
  if (route.name === 'outcome' && (!ui.outcome || ui.outcome.sessionId !== route.id)) {
    ui.outcome = outcomeDraft(state, route.id);
  }
  if (route.name === 'thread' && ui.threadPerson !== route.id) {
    ui.threadPerson = route.id;
    ui.threadTab = 'conversation';
    ui.composer = '';
    ui.noteMode = false;
  }
}

const TITLES = {
  requests: 'Mentees looking for you',
  detail: 'Mentorship request',
  schedule: 'Give your time',
  feed: 'Your giving',
  board: 'Monitor board',
  sessions: 'Sessions',
  alerts: 'Alerts',
  profile: 'Profile',
  thread: 'Support package',
  outcome: 'Session outcome',
};

function render() {
  const route = parseRoute(location.hash);
  syncDrafts(route);
  const main = document.getElementById('screen');
  const key = `${route.name}:${route.id || ''}`;
  const keep = key === lastKey;
  const y = keep ? main.scrollTop : 0;
  main.innerHTML = renderView(state, ui, route);
  const tabs = document.getElementById('tabbar');
  const tabHtml = renderTabs(route);
  tabs.innerHTML = tabHtml;
  tabs.hidden = !tabHtml;
  document.getElementById('app').classList.toggle('has-tabs', Boolean(tabHtml));
  if (stickToBottom) {
    main.scrollTop = main.scrollHeight;
    stickToBottom = false;
  } else if (keep) {
    main.scrollTop = y;
  } else {
    main.scrollTop = 0;
  }
  lastKey = key;
  document.title = `${TITLES[route.name] || 'Give'} · Give`;
}

function showToast(text) {
  const toast = document.getElementById('toast');
  toast.hidden = false;
  toast.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
    toast.textContent = '';
  }, 2800);
}

function navigate(href) {
  const next = href.startsWith('#') ? href : `#${href}`;
  const current = location.hash || '#/requests';
  if (current === next) {
    if (next === '#/requests') document.getElementById('filters')?.scrollIntoView({ block: 'nearest' });
    return;
  }
  historyStack.push(current);
  location.hash = next;
}

function back() {
  const prev = historyStack.pop();
  if (!prev) {
    location.hash = '#/requests';
    return;
  }
  location.hash = prev;
}

function onClick(event) {
  const el = event.target.closest('[data-action]');
  if (!el || el.tagName === 'FORM') return;
  const action = el.dataset.action;
  if (action === 'go') {
    navigate(el.dataset.href);
    return;
  }
  if (action === 'back') {
    back();
    return;
  }
  captureFields();
  if (action === 'filter') {
    ui.requestFilter = el.dataset.category;
    render();
    return;
  }
  if (action === 'save') {
    state = toggleSaved(state, el.dataset.id);
    persist();
    render();
    return;
  }
  if (action === 'suggest') {
    const id = suggestAnother(state.requests, el.dataset.id);
    showToast('Sample suggestion — another mentee');
    navigate(`#/requests/${id}`);
    return;
  }
  if (action === 'week') {
    ui.schedule.weekAnchor = shiftDays(ui.schedule.weekAnchor, Number(el.dataset.dir) * 7);
    render();
    return;
  }
  if (action === 'pick-day') {
    ui.schedule.date = el.dataset.date;
    render();
    return;
  }
  if (action === 'pick-time') {
    ui.schedule.time = el.dataset.time;
    render();
    return;
  }
  if (action === 'pick-length') {
    ui.schedule.minutes = Number(el.dataset.minutes);
    render();
    return;
  }
  if (action === 'confirm') {
    const before = state.feed.hours;
    state = confirmSession(state, {
      requestId: ui.schedule.requestId,
      date: ui.schedule.date,
      time: ui.schedule.time,
      minutes: ui.schedule.minutes,
      note: ui.schedule.note,
    });
    persist();
    navigate('#/feed');
    showToast(state.feed.hours === before
      ? 'Session confirmed · sample only, nothing was sent'
      : 'Session saved in this sample · nothing was sent');
    return;
  }
  if (action === 'board-mode') {
    ui.boardMode = el.dataset.mode;
    ui.boardFilter = 'all';
    render();
    return;
  }
  if (action === 'board-filter') {
    ui.boardFilter = el.dataset.filter;
    render();
    return;
  }
  if (action === 'thread-tab') {
    ui.threadTab = el.dataset.tab;
    render();
    return;
  }
  if (action === 'note-mode') {
    ui.noteMode = !ui.noteMode;
    render();
    return;
  }
  if (action === 'toggle-change') {
    const id = el.dataset.id;
    ui.outcome.changes = ui.outcome.changes.includes(id)
      ? ui.outcome.changes.filter((item) => item !== id)
      : [...ui.outcome.changes, id];
    render();
    return;
  }
  if (action === 'toggle-goal') {
    ui.outcome.goals = ui.outcome.goals.map((goal) => (
      goal.id === el.dataset.id ? { ...goal, done: !goal.done } : goal
    ));
    render();
    return;
  }
  if (action === 'toggle-followup') {
    ui.outcome.followUp = !ui.outcome.followUp;
    render();
    return;
  }
  if (action === 'mark-done') {
    const result = markSessionDone(state, {
      sessionId: ui.outcome.sessionId,
      packageId: ui.outcome.packageId,
      changes: ui.outcome.changes,
      words: ui.outcome.words,
      goals: ui.outcome.goals,
      followUp: ui.outcome.followUp,
    });
    state = result.state;
    persist();
    ui.outcome = null;
    navigate('#/board');
    showToast(result.closed
      ? 'Package marked done · sample only'
      : 'Session saved · package stays open until every goal is done');
    return;
  }
  if (action === 'reset') {
    state = createInitialState();
    sessionStorage.removeItem(STORAGE_KEY);
    ui = freshUi();
    historyStack = [];
    lastKey = '';
    if ((location.hash || '#/requests') !== '#/requests') location.hash = '#/requests';
    else render();
    showToast('Sample data reset');
  }
}

function onSubmit(event) {
  const form = event.target.closest('[data-action="send"]');
  if (!form) return;
  event.preventDefault();
  captureFields();
  const route = parseRoute(location.hash);
  const previous = state;
  state = ui.noteMode
    ? addStatusNote(state, route.id, ui.composer)
    : addMessage(state, route.id, ui.composer);
  if (state === previous) return;
  persist();
  ui.composer = '';
  ui.noteMode = false;
  stickToBottom = true;
  render();
}

function onInput(event) {
  const field = event.target.dataset.field;
  if (field === 'composer') ui.composer = event.target.value;
  if (field === 'note' && ui.schedule) ui.schedule.note = event.target.value;
  if (field === 'words' && ui.outcome) ui.outcome.words = event.target.value;
}

const screen = document.getElementById('screen');
screen.addEventListener('click', onClick);
document.getElementById('tabbar').addEventListener('click', onClick);
screen.addEventListener('submit', onSubmit);
screen.addEventListener('input', onInput);

window.addEventListener('hashchange', () => render());
if (!location.hash) location.hash = '#/requests';
else render();
