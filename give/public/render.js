import { icon } from './icons.js';
import {
  CATEGORIES,
  CHANGE_OPTIONS,
  SAMPLE_TODAY,
  TIME_SLOTS,
  boardColumns,
  dayTile,
  filterRequests,
  formatHours,
  goalPercent,
  endTime,
  goalSummary,
  longDate,
  monthLabel,
  peopleChips,
  periodDelta,
  personProfile,
  sessionHoursLabel,
  shortDate,
  upcomingSessions,
  weekdayStrip,
} from '/src/model.js';

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function avatar(initials, tone, size = 'md') {
  return `<span class="avatar ${size} tone-${esc(tone)}">${esc(initials)}</span>`;
}

function bar(percent, dark = false) {
  const width = Math.max(0, Math.min(100, percent));
  return `<div class="bar${dark ? ' dark' : ''}"><span style="width:${width}%"></span></div>`;
}

function header({ title, subtitle = '', right = '', align = 'center' }) {
  const side = right || (align === 'left' ? '' : '<span></span>');
  return `<div class="stack-head ${align}">
    <button class="round" type="button" data-action="back" aria-label="Back">${icon('back')}</button>
    <div>
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}
    </div>
    ${side}
  </div>`;
}

function samplePill() {
  return '<span class="sample">Sample data</span>';
}

export function renderTabs(route) {
  const discover = route.name === 'requests';
  if (discover) {
    return tabRow([
      ['requests', 'Home', icon('home'), '#/requests'],
      ['discover', 'Discover', icon('search'), '#/requests'],
      ['sessions', 'Sessions', icon('clock'), '#/sessions'],
      ['profile', 'Profile', 'emoji', '#/profile'],
    ], 'requests');
  }
  if (['feed', 'board', 'sessions', 'alerts', 'profile'].includes(route.name)) {
    const active = route.name === 'feed' ? 'home' : route.name;
    return tabRow([
      ['home', 'Home', icon('home'), '#/feed'],
      ['board', 'Board', icon('board'), '#/board'],
      ['sessions', 'Sessions', icon('clock'), '#/sessions'],
      ['alerts', 'Alerts', icon('bell'), '#/alerts'],
      ['profile', 'Profile', 'emoji', '#/profile'],
    ], active);
  }
  return '';
}

function tabRow(items, active) {
  return items.map(([id, label, glyph, href]) => {
    const on = id === active;
    const iconHtml = glyph === 'emoji'
      ? '<span class="emoji" aria-hidden="true">😐</span>'
      : glyph;
    return `<button class="tab${on ? ' on' : ''}" type="button" data-action="go" data-href="${href}" ${on ? 'aria-current="page"' : ''}>
      ${iconHtml}<span>${label}</span>
    </button>`;
  }).join('');
}

function requestCard(req) {
  return `<article class="card">
    <button class="card-main" type="button" data-action="go" data-href="#/requests/${esc(req.id)}">
      <div class="person">
        ${avatar(req.initials, req.tone)}
        <div>
          <h3>${esc(req.name)}</h3>
          <p>${esc(req.listMeta)}</p>
        </div>
        <span class="match">${req.match}% match</span>
      </div>
      <p class="quote">“${esc(req.quote)}”</p>
    </button>
    <div class="card-foot">
      <div class="tags">
        ${req.cardTags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}
        <span class="tag plain">${req.duration} min · ${esc(req.format)}</span>
      </div>
      <button class="btn btn-sm" type="button" data-action="go" data-href="#/requests/${esc(req.id)}">Give time</button>
    </div>
  </article>`;
}

function sessionCard(session) {
  const tile = dayTile(session.date);
  const href = `#/mentees/${esc(session.personId)}`;
  const ghost = session.cta === 'Prep' ? ' btn-ghost' : '';
  return `<article class="session">
    <button class="date-tile" type="button" data-action="go" data-href="${href}" aria-label="${esc(shortDate(session.date))}">
      <span>${esc(tile.dow)}</span><strong>${tile.num}</strong>
    </button>
    <button class="session-copy" type="button" data-action="go" data-href="${href}">
      <strong>${esc(session.name)}</strong>
      <span>${esc(session.title)}</span>
      <span>${esc(session.time)}–${esc(session.end)} · ${esc(session.format)}</span>
    </button>
    <button class="btn btn-sm${ghost}" type="button" data-action="go" data-href="${href}">${esc(session.cta)}</button>
  </article>`;
}

function badge(item) {
  const kind = item.badge?.kind || 'logged';
  const label = item.badge?.label || '';
  const prefix = kind === 'done' ? '✓ ' : '';
  return `<span class="badge ${esc(kind)}">${prefix}${esc(label)}</span>`;
}

function activityRow(item, flat = false) {
  return `<button class="activity${flat ? ' flat' : ''}" type="button" data-action="go" data-href="#/mentees/${esc(item.menteeId || item.personId)}">
    ${avatar(item.initials, item.tone, 'sm')}
    <span class="activity-copy">
      <strong>${esc(item.title)}</strong>
      <em>${esc(item.detail)}</em>
    </span>
    ${badge(item)}
  </button>`;
}

export function renderView(state, ui, route) {
  switch (route.name) {
    case 'detail': return renderDetail(state, route.id);
    case 'schedule': return renderSchedule(state, ui);
    case 'feed': return renderFeed(state);
    case 'board': return renderBoard(state, ui);
    case 'sessions': return renderSessions(state);
    case 'alerts': return renderAlerts(state);
    case 'profile': return renderProfile(state);
    case 'thread': return renderThread(state, ui, route.id);
    case 'outcome': return renderOutcome(state, ui);
    default: return renderRequests(state, ui);
  }
}

function renderRequests(state, ui) {
  const list = filterRequests(state.requests, ui.requestFilter);
  const { browse } = state;
  const cards = list.length
    ? list.map(requestCard).join('')
    : `<div class="card"><p class="prose">No sample requests in ${esc(ui.requestFilter)} right now.</p></div>`;
  return `<div class="view">
    <div class="browse-head">
      <div>
        <p class="greet">${esc(state.viewer.greeting)},</p>
        <h1>${esc(state.viewer.firstName)}</h1>
      </div>
      <button class="avatar me" type="button" data-action="go" data-href="#/profile" aria-label="Profile">${esc(state.viewer.initials)}</button>
    </div>
    <button class="hero" type="button" data-action="go" data-href="#/feed" aria-label="Open your giving">
      <div class="hero-top">
        <span class="hero-kicker">Time given in 2026</span>
        <span class="delta">${esc(periodDelta(browse.monthHours, 'this month'))}</span>
      </div>
      <div class="hero-hours">
        <span class="hero-num">${esc(formatHours(browse.hours))}</span>
        <span class="hero-of">of ${browse.goal} hours</span>
      </div>
      ${bar(goalPercent(browse.hours, browse.goal))}
      <div class="hero-foot"><span>${browse.people} people mentored · ${browse.sessions} sessions · ${browse.rating} ★ avg rating</span></div>
    </button>
    <div class="section-row">
      <h2>Mentees looking for you</h2>
      <button class="linkish" type="button" data-action="filter" data-category="All">See all</button>
    </div>
    <div class="chips" id="filters">
      ${CATEGORIES.map((category) => `<button class="chip${category === ui.requestFilter ? ' on' : ''}" type="button" data-action="filter" data-category="${esc(category)}">${esc(category)}</button>`).join('')}
    </div>
    <div class="stack" style="margin-top:14px">${cards}</div>
  </div>`;
}

function renderDetail(state, id) {
  const req = state.requests.find((item) => item.id === id);
  if (!req) {
    return `<div class="view">${header({ back: true, title: 'Request' })}<div class="card"><p class="prose">That sample request is not in this slice.</p></div></div>`;
  }
  const saved = state.saved.includes(req.id);
  return `<div class="view">
    ${header({
      title: 'Mentorship request',
      right: `<button class="round${saved ? ' on' : ''}" type="button" data-action="save" data-id="${esc(req.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Saved' : 'Save request'}">${icon(saved ? 'heart-on' : 'heart')}</button>`,
    })}
    <article class="card center-card">
      ${avatar(req.initials, req.tone, 'lg')}
      <h2>${esc(req.name)}</h2>
      <p class="muted">${esc(req.detailMeta)}</p>
      <div class="stat-grid">
        <div class="stat-box"><b>${req.match}%</b><span>match</span></div>
        <div class="stat-box"><b>${req.pastMentors}</b><span>past mentors</span></div>
        <div class="stat-box"><b>${esc(req.posted)}</b><span>posted</span></div>
      </div>
    </article>
    <article class="card" style="margin-top:14px">
      <h2 style="font-size:18px">What I need help with</h2>
      <p class="prose">${esc(req.need)}</p>
      <div class="tags" style="margin-top:12px">${req.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div>
    </article>
    <article class="card" style="margin-top:14px">
      <h2 style="font-size:18px">Goals for our session</h2>
      <ol class="goals">
        ${req.goals.map((goal, index) => `<li><span class="num">${index + 1}</span><span>${esc(goal)}</span></li>`).join('')}
      </ol>
    </article>
    <div style="margin-top:16px">
      <button class="btn btn-block" type="button" data-action="go" data-href="#/requests/${esc(req.id)}/schedule">Give ${req.duration} minutes</button>
      <button class="btn-line" type="button" data-action="suggest" data-id="${esc(req.id)}">Not a fit? Suggest another mentor</button>
    </div>
  </div>`;
}

function renderSchedule(state, ui) {
  const draft = ui.schedule;
  const req = state.requests.find((item) => item.id === draft?.requestId);
  if (!draft || !req) {
    return `<div class="view">${header({ title: 'Give your time', align: 'left' })}<div class="card"><p class="prose">Choose a mentee first.</p></div></div>`;
  }
  const days = weekdayStrip(draft.weekAnchor);
  const end = endTime(draft.time, draft.minutes);
  return `<div class="view">
    ${header({ title: 'Give your time', subtitle: `to ${req.name}`, align: 'left' })}
    <div class="month-row">
      <h2>${esc(monthLabel(draft.weekAnchor))}</h2>
      <div>
        <button class="icon-btn" type="button" data-action="week" data-dir="-1" aria-label="Previous week">${icon('chevronLeft')}</button>
        <button class="icon-btn" type="button" data-action="week" data-dir="1" aria-label="Next week">${icon('chevronRight')}</button>
      </div>
    </div>
    <div class="days">
      ${days.map((day) => `<button class="day${day.iso === draft.date ? ' on' : ''}" type="button" data-action="pick-day" data-date="${day.iso}"><span class="dow">${esc(day.dow)}</span><span class="num">${day.num}</span></button>`).join('')}
    </div>
    <h2 class="section-label">Available times (BST)</h2>
    <div class="times">
      ${TIME_SLOTS.map((slot) => `<button class="slot${slot === draft.time ? ' on' : ''}" type="button" data-action="pick-time" data-time="${slot}">${slot}</button>`).join('')}
    </div>
    <h2 class="section-label">Session length</h2>
    <div class="lengths">
      ${[15, 30, 45, 60].map((minutes) => `<button class="${minutes === draft.minutes ? 'on' : ''}" type="button" data-action="pick-length" data-minutes="${minutes}">${minutes} min</button>`).join('')}
    </div>
    <article class="card" style="margin-top:16px">
      <p class="field-label">Note to ${esc(req.firstName)} (optional)</p>
      <textarea data-field="note" rows="3">${esc(draft.note)}</textarea>
    </article>
    <div class="summary">
      ${avatar(req.initials, req.tone, 'sm')}
      <div>
        <p>${esc(shortDate(draft.date))} · ${esc(draft.time)}–${esc(end)}</p>
        <span>Video call · link sent to you both</span>
      </div>
      <span class="plus">${esc(sessionHoursLabel(draft.minutes))}</span>
    </div>
    <div style="margin-top:16px">
      <button class="btn btn-block" type="button" data-action="confirm">Confirm &amp; give ${draft.minutes} minutes</button>
      <p class="footnote">Free to reschedule up to 2 hours before</p>
    </div>
  </div>`;
}

function renderFeed(state) {
  const { feed, viewer } = state;
  const upcoming = upcomingSessions(state);
  return `<div class="view">
    <p class="date-line">${esc(longDate(SAMPLE_TODAY))}</p>
    <div class="feed-head">
      <h1>Your giving</h1>
      <div class="feed-head-side">
        ${samplePill()}
        <button class="avatar me" type="button" data-action="go" data-href="#/profile" aria-label="Profile">${esc(viewer.initials)}</button>
      </div>
    </div>
    <section class="hero">
      <div class="hero-top">
        <span class="hero-kicker">Hours given in 2026</span>
        <span class="delta">${esc(periodDelta(feed.weekHours, 'this week'))}</span>
      </div>
      <div class="stats">
        <div><b>${esc(formatHours(feed.hours))}</b><span>hours given</span></div>
        <div><b>${feed.people}</b><span>people mentored</span></div>
        <div><b>${feed.activePackages}</b><span>active packages</span></div>
      </div>
      ${bar(goalPercent(feed.hours, feed.goal))}
      <p class="hero-note">${goalPercent(feed.hours, feed.goal)}% of your ${feed.goal}-hour goal · on track for December</p>
    </section>
    <div class="section-row">
      <h2>Upcoming sessions</h2>
      <button class="linkish" type="button" data-action="go" data-href="#/sessions">See all</button>
    </div>
    <div class="stack">${upcoming.length ? upcoming.map(sessionCard).join('') : '<div class="card"><p class="prose">No sessions booked in this sample yet.</p></div>'}</div>
    <h2 class="section-label">Giving &amp; mentoring activity</h2>
    <div class="panel">${state.activity.map((item) => activityRow(item, true)).join('')}</div>
  </div>`;
}

function renderBoard(state, ui) {
  const columns = boardColumns(state.packages, { mode: ui.boardMode, filter: ui.boardFilter });
  const chips = ui.boardMode === 'package'
    ? [{ id: 'all', name: `All packages · ${state.packages.length}` }, ...['Career', 'Business', 'Leadership', 'Tech'].map((theme) => ({ id: theme, name: theme }))]
    : [{ id: 'all', name: `Everyone · ${state.packages.length}` }, ...peopleChips(state.packages)];
  const card = (pkg) => {
    const title = ui.boardMode === 'package' ? pkg.packageName : pkg.shortName;
    const detail = ui.boardMode === 'package' ? `${pkg.chipName} · ${pkg.theme}` : pkg.title;
    let foot = '';
    if (pkg.status === 'open') foot = `<div class="wait">${esc(pkg.waitingLabel)}</div>`;
    if (pkg.status === 'progress') {
      const pct = Math.round((pkg.sessionNumber / pkg.sessionsTotal) * 100);
      const next = pkg.nextDate
        ? `Next · ${esc(shortDate(pkg.nextDate).split(' ')[0])}<br>${esc(pkg.nextTime)}`
        : 'No next session yet';
      foot = `${bar(pct, true)}<div class="next">Session ${pkg.sessionNumber} of ${pkg.sessionsTotal}<br>${next}</div>`;
    }
    if (pkg.status === 'done') foot = `<div class="ok">✓ ${pkg.sessionsDone} session${pkg.sessionsDone === 1 ? '' : 's'}</div>`;
    return `<button class="board-card" type="button" data-action="go" data-href="#/mentees/${esc(pkg.personId)}">
      ${avatar(pkg.initials, pkg.tone, 'sm')}
      <h3>${esc(title)}</h3>
      <p>${esc(detail)}</p>
      ${foot}
    </button>`;
  };
  const column = (key, label, count, items) => `<section class="column">
    <div class="col-head"><i class="dot ${key}"></i><div><strong>${label}</strong><span>${count}</span></div></div>
    ${items.length ? items.map(card).join('') : '<p class="empty-col">Nothing in this lane.</p>'}
  </section>`;
  return `<div class="view view-board">
    <div class="page-head">
      <div>
        <h1>Monitor board</h1>
        <p class="sub">${state.packages.length} support packages · October</p>
      </div>
      ${samplePill()}
    </div>
    <div class="segment">
      <button class="${ui.boardMode === 'person' ? 'on' : ''}" type="button" data-action="board-mode" data-mode="person">By person</button>
      <button class="${ui.boardMode === 'package' ? 'on' : ''}" type="button" data-action="board-mode" data-mode="package">By package</button>
    </div>
    <div class="chips">
      ${chips.map((chip) => `<button class="chip${chip.id === ui.boardFilter ? ' on' : ''}" type="button" data-action="board-filter" data-filter="${esc(chip.id)}">${chip.initials ? avatar(chip.initials, chip.tone, 'xs') : ''}${esc(chip.name)}</button>`).join('')}
    </div>
    <div class="columns" style="margin-top:12px">
      ${column('open', 'Open', `${columns.open.length} waiting`, columns.open)}
      ${column('progress', 'In progress', `${columns.progress.length} active`, columns.progress)}
      ${column('done', 'Done', `${columns.done.length} this month`, columns.done)}
    </div>
  </div>`;
}

function renderSessions(state) {
  const upcoming = upcomingSessions(state);
  return `<div class="view">
    <div class="page-head">
      <div>
        <h1>Sessions</h1>
        <p class="sub">${esc(longDate(SAMPLE_TODAY))}</p>
      </div>
      ${samplePill()}
    </div>
    <div class="stack">${upcoming.length ? upcoming.map(sessionCard).join('') : '<div class="card"><p class="prose">No upcoming sample sessions.</p></div>'}</div>
    <button class="btn btn-block" style="margin-top:16px" type="button" data-action="go" data-href="#/requests">Give time</button>
    <p class="footnote">Opens mentees looking for you. Sample requests only.</p>
  </div>`;
}

function renderAlerts(state) {
  return `<div class="view">
    <div class="page-head">
      <div>
        <h1>Alerts</h1>
        <p class="sub">Sample notifications</p>
      </div>
      ${samplePill()}
    </div>
    <div class="panel">${state.activity.map((item) => activityRow(item, true)).join('')}</div>
    <p class="fine">Nothing here is delivered to a phone or inbox. It mirrors the sample activity feed.</p>
  </div>`;
}

function renderProfile(state) {
  const saved = state.requests.filter((req) => state.saved.includes(req.id));
  return `<div class="view">
    <div class="page-head">
      <div>
        <h1>Profile</h1>
        <p class="sub">${esc(state.viewer.role)} · ${esc(state.viewer.place)}</p>
      </div>
      ${samplePill()}
    </div>
    <article class="card center-card">
      <span class="avatar lg tone-orange">${esc(state.viewer.initials)}</span>
      <h2>${esc(state.viewer.name)}</h2>
      <p class="muted">Sample giver · no sign-in in this slice</p>
      <div class="stat-grid">
        <div class="stat-box"><b>${esc(formatHours(state.feed.hours))}</b><span>hours</span></div>
        <div class="stat-box"><b>${state.feed.people}</b><span>people</span></div>
        <div class="stat-box"><b>${state.feed.activePackages}</b><span>active</span></div>
      </div>
    </article>
    <div class="menu">
      <button type="button" data-action="go" data-href="#/requests">Mentees looking for you <span>›</span></button>
      <button type="button" data-action="go" data-href="#/feed">Your giving <span>›</span></button>
      <button type="button" data-action="go" data-href="#/board">Monitor board <span>›</span></button>
    </div>
    ${saved.length ? `<h2 class="section-label">Saved</h2><div class="stack">${saved.map(requestCard).join('')}</div>` : ''}
    <button class="btn btn-light btn-block" style="margin-top:16px" type="button" data-action="reset">Reset sample data</button>
    <p class="fine">Hours, messages, and bookings stay in this browser tab until you reset them. There is no payment, calendar, or messaging provider.</p>
  </div>`;
}

function renderThread(state, ui, personId) {
  const profile = personProfile(state, personId);
  if (!profile.package && !profile.request) {
    return `<div class="view">${header({ title: 'Thread' })}<div class="card"><p class="prose">No sample thread for that person.</p></div></div>`;
  }
  const pkg = profile.package;
  const entries = state.threads[personId] || [];
  const notes = entries.filter((entry) => entry.type === 'status' || entry.type === 'move');
  const visible = ui.threadTab === 'notes' ? notes : entries;
  let lastDay = '';
  const body = visible.map((entry) => {
    const split = entry.day && entry.day !== lastDay ? `<div class="day-split">${esc(entry.day)}</div>` : '';
    lastDay = entry.day || lastDay;
    if (entry.type === 'status' || entry.type === 'move') {
      const label = entry.type === 'status' ? `STATUS NOTE · ${entry.author || 'FEMI'}` : `STATUS → ${entry.label}`;
      return `${split}<article class="${entry.type === 'status' ? 'note' : 'move'}"><div class="label"><span>${esc(label)}</span><span>${esc(entry.time)}</span></div><p>${esc(entry.text)}</p></article>`;
    }
    if (entry.type === 'out') {
      return `${split}<div class="bubble out"><p>${esc(entry.text)}</p><span class="when">${esc(entry.time)}${entry.read ? ' · Read' : ''}</span></div>`;
    }
    return `${split}<div class="in-row">${avatar(profile.initials, profile.tone, 'xs')}<div class="bubble in"><p>${esc(entry.text)}</p><span class="when">${esc(entry.time)}</span></div></div>`;
  }).join('');
  const session = state.sessions.find((item) => item.personId === personId && (item.status === 'booked' || item.status === 'done'));
  const outcomeHref = session ? `#/sessions/${session.id}/outcome` : '';
  const pill = pkg?.status === 'done' ? '<span class="pill done">Done</span>' : '<span class="pill progress">In progress</span>';
  const pct = pkg ? Math.round((Math.max(pkg.sessionNumber, pkg.sessionsDone) / pkg.sessionsTotal) * 100) : 0;
  return `<div class="view">
    ${header({ title: profile.name, subtitle: profile.subtitle, right: samplePill() })}
    ${pkg ? `<article class="card">
      <div class="pkg-top">
        ${avatar(profile.initials, profile.tone)}
        <div style="flex:1">
          <h2>${esc(pkg.packageName)}</h2>
          <p class="muted">${pkg.sessionsTotal} sessions · ${esc(pkg.startedLabel)}</p>
        </div>
        ${pill}
      </div>
      <div style="margin-top:12px">${bar(pct, true)}</div>
      <div class="pkg-meta">
        <strong>${pkg.status === 'done' ? `${pkg.sessionsDone} of ${pkg.sessionsTotal}` : `Session ${pkg.sessionNumber || pkg.sessionsDone} of ${pkg.sessionsTotal}`}</strong>
        <span>${pkg.nextDate ? `Next · ${esc(shortDate(pkg.nextDate))}, ${esc(pkg.nextTime)}` : 'No upcoming session'}</span>
      </div>
      ${outcomeHref ? `<button class="btn-line" type="button" data-action="go" data-href="${outcomeHref}">Log session outcome</button>` : ''}
    </article>` : ''}
    <div class="segment" style="margin-top:14px">
      <button class="${ui.threadTab === 'conversation' ? 'on' : ''}" type="button" data-action="thread-tab" data-tab="conversation">Conversation</button>
      <button class="${ui.threadTab === 'notes' ? 'on' : ''}" type="button" data-action="thread-tab" data-tab="notes">Status notes · ${notes.length}</button>
    </div>
    <div id="thread">${body || '<p class="fine">No sample messages yet.</p>'}</div>
    <form class="composer" data-action="send">
      <button class="note-toggle${ui.noteMode ? ' on' : ''}" type="button" data-action="note-mode">${ui.noteMode ? 'Note' : '+ Note'}</button>
      <input data-field="composer" value="${esc(ui.composer)}" placeholder="${ui.noteMode ? `Status note for ${esc(profile.name.split(' ')[0])}...` : `Message ${esc(profile.name.split(' ')[0])}...`}" />
      <button class="send" type="submit" aria-label="Send">${icon('send')}</button>
    </form>
  </div>`;
}

function renderOutcome(state, ui) {
  const draft = ui.outcome;
  const session = state.sessions.find((item) => item.id === draft?.sessionId);
  const pkg = state.packages.find((item) => item.id === draft?.packageId);
  if (!draft || !session || !pkg) {
    return `<div class="view">${header({ title: 'Session outcome' })}<div class="card"><p class="prose">No sample session to close.</p></div></div>`;
  }
  const summary = goalSummary(draft.goals);
  return `<div class="view">
    ${header({ title: 'Session outcome', subtitle: `${pkg.name} · ${pkg.theme}`, right: samplePill() })}
    <article class="card">
      <div class="person">
        ${avatar(pkg.initials, pkg.tone)}
        <div>
          <h3>${esc(shortDate(session.date))} · ${esc(session.time)}–${esc(session.end)}</h3>
          <p>${session.minutes} min video · Session ${pkg.sessionNumber} of ${pkg.sessionsTotal}</p>
        </div>
        <span class="plus" style="color:#C4842A;font-weight:800">${esc(sessionHoursLabel(session.minutes))}</span>
      </div>
    </article>
    <div class="choice-head" style="margin-top:18px">
      <h2 class="section-label" style="margin:0">What changed?</h2>
      <span>Pick all that apply</span>
    </div>
    <div class="choices" style="margin-top:10px">
      ${CHANGE_OPTIONS.map((option) => {
        const on = draft.changes.includes(option.id);
        return `<button class="choice${on ? ' on' : ''}" type="button" data-action="toggle-change" data-id="${option.id}">${on ? '✓ ' : ''}${esc(option.label)}</button>`;
      }).join('')}
    </div>
    <article class="card" style="margin-top:14px">
      <p class="field-label">In your words</p>
      <textarea data-field="words" rows="3">${esc(draft.words)}</textarea>
    </article>
    <div class="choice-head">
      <h2 class="section-label">Package goals</h2>
      <span>${esc(summary.label)}</span>
    </div>
    <article class="card">
      ${draft.goals.map((goal) => `<button class="check-row" type="button" data-action="toggle-goal" data-id="${esc(goal.id)}">
        <span class="tick${goal.done ? ' on' : ''}">✓</span>
        <span style="flex:1">${esc(goal.label)}</span>
        ${goal.next && !goal.done ? '<span class="pill next">Next session</span>' : ''}
      </button>`).join('')}
    </article>
    <h2 class="section-label">Next step</h2>
    <article class="card">
      <strong>${esc(pkg.nextStep)}</strong>
      <div style="margin-top:8px">
        <span class="mini">Owner · ${esc(pkg.nextStepOwner)}</span>
        <span class="mini">Due ${esc(pkg.nextStepDue)}</span>
      </div>
      <div class="between" style="margin-top:14px">
        <div class="${draft.followUp ? '' : 'dim'}">
          <strong>Book follow-up session</strong>
          <p class="muted">${esc(pkg.followUpWhen)}</p>
        </div>
        <button class="switch${draft.followUp ? ' on' : ''}" type="button" data-action="toggle-followup" aria-pressed="${draft.followUp}" aria-label="Book follow-up session"></button>
      </div>
    </article>
    <div style="margin-top:16px">
      <button class="btn btn-block" type="button" data-action="mark-done">✓ Mark session done</button>
      <p class="footnote">Package stays open until every goal is done</p>
    </div>
  </div>`;
}
