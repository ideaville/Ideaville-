/** Sample-data model for the give + mentoring prototype. */

export const SAMPLE_TODAY = '2026-10-05';

export const CATEGORIES = ['All', 'Career', 'Tech', 'Business', 'Leadership'];

export const CHANGE_OPTIONS = [
  { id: 'cv', label: 'CV stronger' },
  { id: 'confidence', label: 'Interview confidence' },
  { id: 'plan', label: 'Clear job plan' },
  { id: 'contacts', label: 'New contacts' },
  { id: 'applied', label: 'Applied to roles' },
];

export const SESSION_LENGTHS = [15, 30, 45, 60];

export const TOKEN_PACKS = [
  { id: 'starter', tokens: 25, price: 25, name: 'Starter', note: 'Enough for one small gift' },
  { id: 'regular', tokens: 50, price: 50, name: 'Regular', note: 'A typical month of giving' },
  { id: 'plus', tokens: 120, price: 100, name: 'Plus', note: '20 extra tokens at the sample rate' },
];

export const GIFT_AMOUNTS = [10, 25, 40, 100];

export const TIME_SLOTS = ['08:00', '09:30', '12:00', '18:00', '19:30', '21:00'];

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOW_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CHIP_ORDER = ['amara', 'james', 'sade', 'tunde', 'ngozi', 'kofi', 'chidi', 'lola'];

function parseISO(iso) {
  return new Date(`${iso}T12:00:00Z`);
}

export function roundHours(n) {
  return Math.round(n * 100) / 100;
}

export function formatHours(n) {
  const rounded = roundHours(n);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function sessionHoursLabel(minutes) {
  return `+${formatHours(minutes / 60)} hr`;
}

export function periodDelta(hours, period) {
  return `+${formatHours(hours)} hrs ${period}`;
}

export function goalPercent(hours, goal) {
  if (!goal) return 0;
  return Math.round((hours / goal) * 100);
}

export function endTime(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function shiftDays(iso, days) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function longDate(iso) {
  const d = parseISO(iso);
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}

export function monthLabel(iso) {
  const d = parseISO(iso);
  return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function shortDate(iso) {
  const d = parseISO(iso);
  return `${DOW_S[d.getUTCDay()]} ${d.getUTCDate()} ${MON_S[d.getUTCMonth()]}`;
}

export function dayTile(iso) {
  const d = parseISO(iso);
  return { dow: DOW_S[d.getUTCDay()].toUpperCase(), num: d.getUTCDate() };
}

export function weekdayStrip(anchorIso) {
  const anchor = parseISO(anchorIso);
  const day = anchor.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = parseISO(anchorIso);
  monday.setUTCDate(anchor.getUTCDate() + mondayOffset);
  const out = [];
  for (let i = 0; i < 5; i += 1) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      dow: DOW_S[d.getUTCDay()],
      num: d.getUTCDate(),
    });
  }
  return out;
}

export function filterRequests(requests, category) {
  if (!category || category === 'All') return requests.slice();
  return requests.filter((req) => req.categories.includes(category));
}

export function suggestAnother(requests, requestId) {
  if (!requests.length) return null;
  const index = requests.findIndex((req) => req.id === requestId);
  return requests[(index + 1) % requests.length].id;
}

export function boardColumns(packages, { mode = 'person', filter = 'all' } = {}) {
  let list = packages;
  if (filter && filter !== 'all') {
    list = packages.filter((pkg) => (mode === 'package' ? pkg.theme === filter : pkg.personId === filter));
  }
  return {
    open: list.filter((pkg) => pkg.status === 'open'),
    progress: list.filter((pkg) => pkg.status === 'progress'),
    done: list.filter((pkg) => pkg.status === 'done'),
  };
}

export function peopleChips(packages) {
  const seen = new Map();
  for (const pkg of packages) {
    if (!seen.has(pkg.personId)) {
      seen.set(pkg.personId, {
        id: pkg.personId,
        initials: pkg.initials,
        name: pkg.chipName,
        tone: pkg.tone,
      });
    }
  }
  return [...seen.values()].sort((a, b) => {
    const ai = CHIP_ORDER.indexOf(a.id);
    const bi = CHIP_ORDER.indexOf(b.id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function upcomingSessions(state) {
  return state.sessions
    .filter((session) => session.status === 'booked')
    .slice()
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .map((session, index) => ({ ...session, cta: index === 0 ? 'Join' : 'Prep' }));
}

export function personProfile(state, personId) {
  const request = state.requests.find((req) => req.personId === personId) || null;
  const pkg = state.packages.find((item) => item.personId === personId) || null;
  return {
    personId,
    name: request?.name || pkg?.name || 'Mentee',
    initials: request?.initials || pkg?.initials || '·',
    tone: request?.tone || pkg?.tone || 'sand',
    subtitle: pkg ? `${pkg.theme} · Support package` : (request?.detailMeta || ''),
    request,
    package: pkg,
  };
}

export function goalSummary(goals) {
  const done = goals.filter((goal) => goal.done).length;
  return { done, total: goals.length, label: `${done} of ${goals.length} done` };
}

export function scheduleDraft(state, requestId) {
  const request = state.requests.find((req) => req.id === requestId);
  if (!request) return null;
  const existing = state.sessions.find((session) => session.requestId === requestId && session.status === 'booked');
  const date = existing?.date || request.preferredDate;
  return {
    requestId,
    date,
    time: existing?.time || request.preferredTime,
    minutes: existing?.minutes || request.duration,
    note: existing?.note || request.note,
    weekAnchor: date,
  };
}

export function outcomeDraft(state, sessionId) {
  const saved = state.outcomes[sessionId];
  if (saved) return structuredClone(saved);
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  const pkg = state.packages.find((item) => item.id === session.packageId);
  if (!pkg) return null;
  return {
    sessionId,
    packageId: pkg.id,
    changes: [...(pkg.presetChanges || [])],
    words: pkg.presetWords || '',
    goals: pkg.goals.map((goal) => ({ ...goal })),
    followUp: true,
  };
}

export function parseRoute(hash) {
  const path = (hash || '').replace(/^#/, '') || '/requests';
  const parts = path.split('?')[0].split('/').filter(Boolean);
  const [a, b, c] = parts;
  if (!a || (a === 'requests' && !b)) return { name: 'requests' };
  if (a === 'requests' && b && c === 'schedule') return { name: 'schedule', id: b };
  if (a === 'requests' && b) return { name: 'detail', id: b };
  if (a === 'feed') return { name: 'feed' };
  if (a === 'board') return { name: 'board' };
  if (a === 'sessions' && b && c === 'outcome') return { name: 'outcome', id: b };
  if (a === 'sessions') return { name: 'sessions' };
  if (a === 'alerts') return { name: 'alerts' };
  if (a === 'profile') return { name: 'profile' };
  if (a === 'mentees' && b) return { name: 'thread', id: b };
  if (a === 'wallet' && b === 'buy') return { name: 'buy' };
  if (a === 'wallet' && b === 'give') {
    return { name: 'give', targetType: c || 'mentee', id: parts[3] || '' };
  }
  if (a === 'wallet') return { name: 'wallet' };
  return { name: 'requests' };
}

function activityItem(next, fields) {
  next.nextId += 1;
  next.activity.unshift({ id: `act-${next.nextId}`, ...fields });
}

function pushEntry(next, personId, entry) {
  if (!next.threads[personId]) next.threads[personId] = [];
  next.nextId += 1;
  next.threads[personId].push({ id: `e${next.nextId}`, ...entry });
}

export function toggleSaved(state, requestId) {
  const next = structuredClone(state);
  const index = next.saved.indexOf(requestId);
  if (index >= 0) next.saved.splice(index, 1);
  else next.saved.push(requestId);
  return next;
}

export function confirmSession(state, input) {
  const request = state.requests.find((req) => req.id === input.requestId);
  if (!request) throw new Error('Unknown request');
  if (!SESSION_LENGTHS.includes(input.minutes)) throw new Error('Unsupported length');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Invalid date');
  if (!/^\d{2}:\d{2}$/.test(input.time)) throw new Error('Invalid time');

  const next = structuredClone(state);
  const req = next.requests.find((item) => item.id === input.requestId);
  const end = endTime(input.time, input.minutes);
  const hours = input.minutes / 60;
  const existing = next.sessions.find((session) => session.requestId === req.id && session.status === 'booked');

  if (existing) {
    const delta = roundHours(hours - existing.minutes / 60);
    const moved = existing.date !== input.date || existing.time !== input.time || existing.minutes !== input.minutes;
    existing.date = input.date;
    existing.time = input.time;
    existing.end = end;
    existing.minutes = input.minutes;
    existing.note = input.note || '';
    if (delta) {
      next.feed.hours = roundHours(next.feed.hours + delta);
      next.browse.hours = roundHours(next.browse.hours + delta);
      next.feed.weekHours = roundHours(next.feed.weekHours + delta);
      next.browse.monthHours = roundHours(next.browse.monthHours + delta);
    }
    if (moved) {
      activityItem(next, {
        personId: req.personId,
        initials: req.initials,
        tone: req.tone,
        title: `You moved ${req.firstName} to ${shortDate(input.date)}`,
        detail: `${req.categories[0]} · ${input.time}–${end} · Just now`,
        badge: { kind: 'hours', label: sessionHoursLabel(input.minutes) },
        menteeId: req.personId,
      });
    }
  } else {
    next.nextId += 1;
    const sessionId = `sess-${next.nextId}`;
    let pkg = next.packages.find((item) => item.personId === req.personId);
    if (!pkg) {
      pkg = {
        id: `pkg-${req.id}`,
        personId: req.personId,
        name: req.name,
        shortName: req.shortName,
        chipName: req.chipName,
        initials: req.initials,
        tone: req.tone,
        title: req.packageTitle,
        packageName: req.packageTitle,
        theme: req.categories[0],
        status: 'progress',
        sessionNumber: 1,
        sessionsDone: 0,
        sessionsTotal: Math.max(req.goals.length, 1),
        startedLabel: 'started today',
        nextDate: input.date,
        nextTime: input.time,
        waitingLabel: '',
        goals: req.goals.map((label, index) => ({ id: `g${index}`, label, done: false })),
        presetChanges: ['plan'],
        presetWords: '',
        nextStep: `Agree a next step with ${req.firstName}`,
        nextStepOwner: req.firstName,
        nextStepDue: 'Fri 16 Oct',
        followUpWhen: 'Thu 15 Oct · 18:00 · 30 min',
        tokensGiven: 0,
      };
      next.packages.unshift(pkg);
      next.feed.activePackages += 1;
      next.feed.people += 1;
      next.browse.people += 1;
    } else if (pkg.status === 'open') {
      pkg.status = 'progress';
      pkg.sessionNumber = 1;
    }
    pkg.nextDate = input.date;
    pkg.nextTime = input.time;

    next.sessions.push({
      id: sessionId,
      requestId: req.id,
      packageId: pkg.id,
      personId: req.personId,
      name: req.name,
      initials: req.initials,
      tone: req.tone,
      title: req.packageTitle,
      date: input.date,
      time: input.time,
      end,
      minutes: input.minutes,
      format: 'Video',
      note: input.note || '',
      status: 'booked',
    });
    next.feed.hours = roundHours(next.feed.hours + hours);
    next.browse.hours = roundHours(next.browse.hours + hours);
    next.feed.weekHours = roundHours(next.feed.weekHours + hours);
    next.browse.monthHours = roundHours(next.browse.monthHours + hours);
    next.browse.sessions += 1;
    activityItem(next, {
      personId: req.personId,
      initials: req.initials,
      tone: req.tone,
      title: `You gave ${input.minutes} min to ${req.firstName}`,
      detail: `${req.categories[0]} · Session booked · Just now`,
      badge: { kind: 'hours', label: sessionHoursLabel(input.minutes) },
      menteeId: req.personId,
    });
    pushEntry(next, req.personId, {
      type: 'move',
      label: 'IN PROGRESS',
      text: `Session booked for ${shortDate(input.date)}, ${input.time}–${end} · Video`,
      time: 'Now',
      day: 'Today',
    });
  }

  const pkg = next.packages.find((item) => item.personId === req.personId);
  if (pkg && pkg.status !== 'done') {
    pkg.nextDate = input.date;
    pkg.nextTime = input.time;
  }
  return next;
}

export function addMessage(state, personId, text) {
  const trimmed = text.trim();
  if (!trimmed) return state;
  const next = structuredClone(state);
  pushEntry(next, personId, {
    type: 'out',
    text: trimmed,
    time: 'Now',
    day: 'Today',
    read: false,
  });
  return next;
}

export function addStatusNote(state, personId, text) {
  const trimmed = text.trim();
  if (!trimmed) return state;
  const next = structuredClone(state);
  pushEntry(next, personId, {
    type: 'status',
    author: 'FEMI',
    text: trimmed,
    time: 'Now',
    day: 'Today',
  });
  return next;
}

export function markSessionDone(state, input) {
  const next = structuredClone(state);
  const session = next.sessions.find((item) => item.id === input.sessionId);
  const pkg = next.packages.find((item) => item.id === input.packageId);
  if (!session || !pkg) throw new Error('Unknown session');

  if (session.status === 'booked') {
    session.status = 'done';
    pkg.sessionsDone += 1;
  }

  pkg.goals = input.goals.map((goal) => ({ ...goal }));
  const allDone = pkg.goals.length > 0 && pkg.goals.every((goal) => goal.done);
  const wasDone = pkg.status === 'done';

  let createdFollowUp = false;
  if (allDone) {
    if (!wasDone) next.feed.activePackages = Math.max(0, next.feed.activePackages - 1);
    pkg.status = 'done';
    pkg.nextDate = null;
    pkg.nextTime = null;
  } else if (input.followUp && !next.sessions.some((item) => item.followUpOf === session.id)) {
    const followDate = '2026-10-15';
    next.nextId += 1;
    next.sessions.push({
      id: `follow-${next.nextId}`,
      requestId: session.requestId,
      packageId: pkg.id,
      personId: pkg.personId,
      name: pkg.name,
      initials: pkg.initials,
      tone: pkg.tone,
      title: 'Follow-up',
      date: followDate,
      time: '18:00',
      end: endTime('18:00', 30),
      minutes: 30,
      format: 'Video',
      note: '',
      status: 'booked',
      followUpOf: session.id,
    });
    pkg.status = 'progress';
    pkg.sessionNumber = pkg.sessionsDone + 1;
    pkg.sessionsTotal = Math.max(pkg.sessionsTotal, pkg.sessionNumber);
    pkg.nextDate = followDate;
    pkg.nextTime = '18:00';
    next.feed.hours = roundHours(next.feed.hours + 0.5);
    next.browse.hours = roundHours(next.browse.hours + 0.5);
    next.feed.weekHours = roundHours(next.feed.weekHours + 0.5);
    next.browse.monthHours = roundHours(next.browse.monthHours + 0.5);
    next.browse.sessions += 1;
    createdFollowUp = true;
  } else {
    pkg.status = 'progress';
    pkg.nextDate = null;
    pkg.nextTime = null;
  }

  next.outcomes[input.sessionId] = {
    sessionId: input.sessionId,
    packageId: pkg.id,
    changes: [...input.changes],
    words: input.words || '',
    goals: pkg.goals.map((goal) => ({ ...goal })),
    followUp: Boolean(input.followUp) && !allDone,
  };

  activityItem(next, {
    personId: pkg.personId,
    initials: pkg.initials,
    tone: pkg.tone,
    title: allDone ? `${pkg.chipName}'s package is done` : `You logged a session with ${pkg.chipName}`,
    detail: `${pkg.theme} · Just now`,
    badge: allDone
      ? { kind: 'done', label: 'Done' }
      : { kind: 'hours', label: createdFollowUp ? '+0.5 hr' : 'Logged' },
    menteeId: pkg.personId,
  });

  pushEntry(next, pkg.personId, {
    type: 'move',
    label: allDone ? 'DONE' : 'IN PROGRESS',
    text: allDone
      ? 'Every package goal is done. This support package is closed in the sample board.'
      : 'Session marked done. The package stays open until every goal is done.',
    time: 'Now',
    day: 'Today',
  });

  return { state: next, closed: allDone, followUp: createdFollowUp };
}

function buildState() {
  const requests = [
    {
      id: 'amara',
      personId: 'amara',
      name: 'Amara Okafor',
      firstName: 'Amara',
      shortName: 'Amara O.',
      chipName: 'Amara',
      initials: 'AO',
      tone: 'peach',
      listMeta: 'Final-year CS student · Lagos',
      detailMeta: 'Final-year Computer Science · UNILAG, Lagos',
      match: 92,
      pastMentors: 2,
      posted: 'Today',
      quote: 'Landing my first software engineering role',
      need: 'I graduate in June and want to land my first software engineering role. I have two React projects but freeze in technical interviews and I\'m not sure my CV tells the right story.',
      cardTags: ['Career', 'Tech'],
      tags: ['Career', 'Tech', 'Interviews', 'CV review'],
      categories: ['Career', 'Tech'],
      duration: 30,
      format: 'Video',
      goals: [
        'Get honest feedback on my CV',
        'Practise one mock technical interview question',
        'Learn how to approach UK & remote roles',
      ],
      packageTitle: 'CV review + mock interview',
      preferredDate: '2026-10-06',
      preferredTime: '18:00',
      note: 'Hi Amara — send your CV over before we meet and we\'ll do one mock question together.',
    },
    {
      id: 'james',
      personId: 'james',
      name: 'James Mensah',
      firstName: 'James',
      shortName: 'James M.',
      chipName: 'James',
      initials: 'JM',
      tone: 'blue',
      listMeta: 'Agritech founder · Accra',
      detailMeta: 'Agritech founder · Accra',
      match: 88,
      pastMentors: 1,
      posted: 'Yesterday',
      quote: 'Pricing and pitching to first investors',
      need: 'We are pricing a first agritech pilot and I lose the thread when an investor asks about margins. I want one honest pass on the story before meetings in Accra and London.',
      cardTags: ['Business'],
      tags: ['Business', 'Pitch', 'Fundraising'],
      categories: ['Business'],
      duration: 45,
      format: 'Video',
      goals: [
        'Pressure-test the pricing story',
        'Practise the investor pitch once out loud',
        'Leave with the three slides to fix first',
      ],
      packageTitle: 'Investor pitch walkthrough',
      preferredDate: '2026-10-08',
      preferredTime: '12:00',
      note: 'Hi James — bring the latest deck and we will pressure-test pricing for the first ten minutes.',
    },
    {
      id: 'ifeoma',
      personId: 'ifeoma',
      name: 'Ifeoma Diallo',
      firstName: 'Ifeoma',
      shortName: 'Ifeoma D.',
      chipName: 'Ifeoma',
      initials: 'ID',
      tone: 'lavender',
      listMeta: 'New engineering manager · Abuja',
      detailMeta: 'New engineering manager · Abuja',
      match: 84,
      pastMentors: 1,
      posted: 'Today',
      quote: 'Stepping into a head-of-team role',
      need: 'I start leading four engineers next month. I can still review code, but I have not run 1:1s or a hiring loop and I do not want to invent it badly.',
      cardTags: ['Leadership'],
      tags: ['Leadership', 'Management', 'First 90 days'],
      categories: ['Leadership'],
      duration: 60,
      format: 'Video',
      goals: [
        'Sketch the first month of 1:1s',
        'Decide what to stop doing myself',
        'Practise a hard feedback conversation',
      ],
      packageTitle: 'First month as a manager',
      preferredDate: '2026-10-07',
      preferredTime: '09:30',
      note: 'Hi Ifeoma — jot the four people you will manage and we will shape the first month.',
    },
    {
      id: 'zainab',
      personId: 'zainab',
      name: 'Zainab Yusuf',
      firstName: 'Zainab',
      shortName: 'Zainab Y.',
      chipName: 'Zainab',
      initials: 'ZY',
      tone: 'sand',
      listMeta: 'Career switcher · London',
      detailMeta: 'Career switcher · London',
      match: 79,
      pastMentors: 0,
      posted: 'Mon',
      quote: 'Returning to work after a master\'s',
      need: 'I taught secondary science, then did a master\'s in HCI. I need help telling that as a product story for junior roles in the UK, without hiding the teaching.',
      cardTags: ['Career'],
      tags: ['Career', 'CV review', 'UK roles'],
      categories: ['Career'],
      duration: 30,
      format: 'Video',
      goals: [
        'Rewrite the top third of my CV',
        'Pick two roles to apply for this month',
        'Practise a two-minute introduction',
      ],
      packageTitle: 'Return-to-work CV',
      preferredDate: '2026-10-09',
      preferredTime: '12:00',
      note: 'Hi Zainab — send the current CV and the two roles you like most.',
    },
    {
      id: 'kwame',
      personId: 'kwame',
      name: 'Kwame Boateng',
      firstName: 'Kwame',
      shortName: 'Kwame B.',
      chipName: 'Kwame',
      initials: 'KB',
      tone: 'lime',
      listMeta: 'Backend engineer · Kumasi',
      detailMeta: 'Backend engineer · Kumasi',
      match: 91,
      pastMentors: 3,
      posted: 'Today',
      quote: 'Shipping a payments API without freezing',
      need: 'I can build the endpoint, but design reviews stall me. I want to talk through one payments flow out loud before I present it to the team on Friday.',
      cardTags: ['Tech'],
      tags: ['Tech', 'System design', 'Payments'],
      categories: ['Tech'],
      duration: 45,
      format: 'Video',
      goals: [
        'Walk through one payments flow',
        'Name the failure cases out loud',
        'Leave with a diagram I can reuse',
      ],
      packageTitle: 'Payments API review',
      preferredDate: '2026-10-09',
      preferredTime: '19:30',
      note: 'Hi Kwame — sketch the happy path before we meet and we will attack the edge cases.',
    },
    {
      id: 'yewande',
      personId: 'yewande',
      name: 'Yewande Cole',
      firstName: 'Yewande',
      shortName: 'Yewande C.',
      chipName: 'Yewande',
      initials: 'YC',
      tone: 'coral',
      listMeta: 'Clinic founder · Nairobi',
      detailMeta: 'Clinic founder · Nairobi',
      match: 86,
      pastMentors: 2,
      posted: 'Sun',
      quote: 'Raising a pre-seed for a clinic chain',
      need: 'I am raising a small pre-seed to open a second clinic. I know the operations and I do not yet know how to talk about the raise without apologising for the size.',
      cardTags: ['Business'],
      tags: ['Business', 'Fundraising', 'Story'],
      categories: ['Business'],
      duration: 45,
      format: 'Video',
      goals: [
        'Set a number I can say out loud',
        'Cut the story to five minutes',
        'List who I will write to next week',
      ],
      packageTitle: 'Pre-seed story',
      preferredDate: '2026-10-08',
      preferredTime: '08:00',
      note: 'Hi Yewande — bring the one-pager, even if it is rough.',
    },
  ];

  const packages = [
    {
      id: 'pkg-tunde',
      personId: 'tunde',
      name: 'Tunde Adeyemi',
      shortName: 'Tunde A.',
      chipName: 'Tunde',
      initials: 'TA',
      tone: 'sand',
      title: 'Product design portfolio',
      packageName: 'Portfolio review',
      theme: 'Career',
      status: 'open',
      sessionNumber: 0,
      sessionsDone: 0,
      sessionsTotal: 2,
      startedLabel: 'requested today',
      nextDate: null,
      nextTime: null,
      waitingLabel: 'Requested today',
      goals: [
        { id: 'case', label: 'One case study in the portfolio', done: false },
        { id: 'narrative', label: 'A short spoken walkthrough', done: false },
      ],
      presetChanges: [],
      presetWords: '',
      nextStep: 'Tunde sends two case-study links',
      nextStepOwner: 'Tunde',
      nextStepDue: 'Fri 9 Oct',
      followUpWhen: 'Thu 15 Oct · 18:00 · 30 min',
    },
    {
      id: 'pkg-ngozi',
      personId: 'ngozi',
      name: 'Ngozi Eze',
      shortName: 'Ngozi E.',
      chipName: 'Ngozi',
      initials: 'NE',
      tone: 'rose',
      title: 'Grant application review',
      packageName: 'Grant application',
      theme: 'Business',
      status: 'open',
      sessionNumber: 0,
      sessionsDone: 0,
      sessionsTotal: 2,
      startedLabel: 'waiting 2 days',
      nextDate: null,
      nextTime: null,
      waitingLabel: 'Waiting 2 days',
      goals: [
        { id: 'draft', label: 'First draft of the grant answers', done: false },
        { id: 'budget', label: 'A one-page budget', done: false },
      ],
      presetChanges: [],
      presetWords: '',
      nextStep: 'Ngozi shares the draft answers',
      nextStepOwner: 'Ngozi',
      nextStepDue: 'Wed 14 Oct',
      followUpWhen: 'Thu 15 Oct · 18:00 · 30 min',
    },
    {
      id: 'pkg-kofi',
      personId: 'kofi',
      name: 'Kofi Boateng',
      shortName: 'Kofi B.',
      chipName: 'Kofi',
      initials: 'KB',
      tone: 'lime',
      title: 'Moving into data roles',
      packageName: 'Data role switch',
      theme: 'Tech',
      status: 'open',
      sessionNumber: 0,
      sessionsDone: 0,
      sessionsTotal: 3,
      startedLabel: 'waiting 3 days',
      nextDate: null,
      nextTime: null,
      waitingLabel: 'Waiting 3 days',
      goals: [
        { id: 'cv', label: 'CV aimed at data roles', done: false },
        { id: 'project', label: 'One project to talk about', done: false },
        { id: 'apply', label: 'Three applications sent', done: false },
      ],
      presetChanges: [],
      presetWords: '',
      nextStep: 'Kofi picks the project to present',
      nextStepOwner: 'Kofi',
      nextStepDue: 'Mon 12 Oct',
      followUpWhen: 'Thu 15 Oct · 18:00 · 30 min',
    },
    {
      id: 'pkg-amara',
      personId: 'amara',
      name: 'Amara Okafor',
      shortName: 'Amara O.',
      chipName: 'Amara',
      initials: 'AO',
      tone: 'peach',
      title: 'CV + mock interview',
      packageName: 'Land my first SWE role',
      theme: 'Career',
      status: 'progress',
      sessionNumber: 2,
      sessionsDone: 1,
      sessionsTotal: 3,
      startedLabel: 'started Sat 3 Oct',
      nextDate: '2026-10-06',
      nextTime: '18:00',
      waitingLabel: '',
      goals: [
        { id: 'cv', label: 'Honest feedback on CV', done: true },
        { id: 'mock', label: 'One mock technical question', done: true },
        { id: 'uk', label: 'Approach to UK & remote roles', done: false, next: true },
      ],
      presetChanges: ['cv', 'confidence'],
      presetWords: 'Talked through a two-sum variant out loud. Clear structure — needs to state complexity earlier.',
      nextStep: 'Amara applies to 3 graduate roles',
      nextStepOwner: 'Amara',
      nextStepDue: 'Fri 16 Oct',
      followUpWhen: 'Thu 15 Oct · 18:00 · 30 min',
    },
    {
      id: 'pkg-james',
      personId: 'james',
      name: 'James Mensah',
      shortName: 'James M.',
      chipName: 'James',
      initials: 'JM',
      tone: 'blue',
      title: 'Investor readiness',
      packageName: 'Investor readiness',
      theme: 'Business',
      status: 'progress',
      sessionNumber: 1,
      sessionsDone: 0,
      sessionsTotal: 3,
      startedLabel: 'started Mon 28 Sep',
      nextDate: '2026-10-08',
      nextTime: '12:00',
      waitingLabel: '',
      goals: [
        { id: 'pricing', label: 'Pricing story for first investors', done: false },
        { id: 'pitch', label: 'One practice pitch', done: false },
        { id: 'intros', label: 'Warm intro list', done: false },
      ],
      presetChanges: ['plan'],
      presetWords: 'Walked the pricing slide. The ask is clearer when he says the pilot margin before the vision.',
      nextStep: 'James sends the revised pricing slide',
      nextStepOwner: 'James',
      nextStepDue: 'Mon 12 Oct',
      followUpWhen: 'Thu 15 Oct · 12:00 · 45 min',
    },
    {
      id: 'pkg-sade',
      personId: 'sade',
      name: 'Sade Bello',
      shortName: 'Sade B.',
      chipName: 'Sade',
      initials: 'SB',
      tone: 'lavender',
      title: 'First 90 days as a manager',
      packageName: 'First 90 days',
      theme: 'Leadership',
      status: 'done',
      sessionNumber: 3,
      sessionsDone: 3,
      sessionsTotal: 3,
      startedLabel: 'started Aug 2026',
      nextDate: null,
      nextTime: null,
      waitingLabel: '',
      goals: [
        { id: 'plan', label: 'First 90 days plan', done: true },
        { id: 'one', label: 'Weekly 1:1 rhythm', done: true },
        { id: 'feedback', label: 'One hard conversation done', done: true },
      ],
      presetChanges: ['confidence', 'plan'],
      presetWords: 'She ran the Monday staff meeting from her own plan. The 1:1 notes are short enough to keep.',
      nextStep: 'Sade keeps the Monday rhythm',
      nextStepOwner: 'Sade',
      nextStepDue: 'Done',
      followUpWhen: 'No follow-up booked',
    },
    {
      id: 'pkg-chidi',
      personId: 'chidi',
      name: 'Chidi Nwosu',
      shortName: 'Chidi N.',
      chipName: 'Chidi',
      initials: 'CN',
      tone: 'mint',
      title: 'Salary negotiation',
      packageName: 'Salary negotiation',
      theme: 'Career',
      status: 'done',
      sessionNumber: 1,
      sessionsDone: 1,
      sessionsTotal: 1,
      startedLabel: 'started Sep 2026',
      nextDate: null,
      nextTime: null,
      waitingLabel: '',
      goals: [
        { id: 'number', label: 'A number he can say', done: true },
        { id: 'script', label: 'A short script', done: true },
      ],
      presetChanges: ['confidence'],
      presetWords: 'He practised the number out loud until it stopped sounding like an apology.',
      nextStep: 'Chidi has the conversation with his manager',
      nextStepOwner: 'Chidi',
      nextStepDue: 'Done',
      followUpWhen: 'No follow-up booked',
    },
    {
      id: 'pkg-lola',
      personId: 'lola',
      name: 'Lola Adeyemi',
      shortName: 'Lola A.',
      chipName: 'Lola',
      initials: 'LA',
      tone: 'coral',
      title: 'Freelance pricing',
      packageName: 'Freelance pricing',
      theme: 'Business',
      status: 'done',
      sessionNumber: 2,
      sessionsDone: 2,
      sessionsTotal: 2,
      startedLabel: 'started Sep 2026',
      nextDate: null,
      nextTime: null,
      waitingLabel: '',
      goals: [
        { id: 'rate', label: 'A day rate she will quote', done: true },
        { id: 'scope', label: 'A scope note for new clients', done: true },
      ],
      presetChanges: ['plan'],
      presetWords: 'She quoted the new rate on a live call and did not discount it in the same breath.',
      nextStep: 'Lola uses the scope note on the next enquiry',
      nextStepOwner: 'Lola',
      nextStepDue: 'Done',
      followUpWhen: 'No follow-up booked',
    },
  ];

  const tokenSeed = {
    'pkg-amara': 40,
    'pkg-james': 25,
    'pkg-sade': 60,
  };
  for (const pkg of packages) pkg.tokensGiven = tokenSeed[pkg.id] || 0;

  return {
    version: 2,
    viewer: {
      name: 'Femi Adeyemi',
      firstName: 'Femi',
      initials: 'FA',
      greeting: 'Good evening',
      place: 'London',
      role: 'Giver and mentor',
    },
    browse: {
      hours: 18,
      goal: 24,
      monthHours: 3,
      people: 6,
      sessions: 11,
      rating: 4.9,
    },
    feed: {
      hours: 18.5,
      goal: 24,
      weekHours: 2.5,
      people: 6,
      activePackages: 4,
    },
    wallet: {
      balance: 180,
      purchased: 350,
      spent: 170,
    },
    causes: [
      {
        id: 'first-role',
        name: 'First-role application fund',
        detail: 'Application fees, data, and travel for final-year candidates.',
        place: 'Lagos & London',
        tokens: 30,
        initials: 'FF',
        tone: 'peach',
      },
      {
        id: 'founder',
        name: 'Founder pitch stipend',
        detail: 'Travel and a day of prep before first investor meetings.',
        place: 'Accra & Nairobi',
        tokens: 0,
        initials: 'PS',
        tone: 'blue',
      },
      {
        id: 'learning',
        name: 'Community learning pot',
        detail: 'Shared materials for open study groups.',
        place: 'All cities',
        tokens: 15,
        initials: 'CL',
        tone: 'mint',
      },
    ],
    gifts: [
      { id: 'gift-amara', targetType: 'mentee', targetId: 'amara', name: 'Amara Okafor', amount: 40, note: 'For the two applications she is about to send.', when: '2 days ago' },
      { id: 'gift-james', targetType: 'package', targetId: 'pkg-james', name: 'Investor readiness', amount: 25, note: '', when: '3 days ago' },
      { id: 'gift-sade', targetType: 'package', targetId: 'pkg-sade', name: 'First 90 days', amount: 60, note: 'Closing gift.', when: '1 day ago' },
      { id: 'gift-fund', targetType: 'cause', targetId: 'first-role', name: 'First-role application fund', amount: 30, note: '', when: '4 days ago' },
      { id: 'gift-learn', targetType: 'cause', targetId: 'learning', name: 'Community learning pot', amount: 15, note: '', when: 'Last week' },
    ],
    purchases: [],
    requests,
    packages,
    sessions: [
      {
        id: 'amara-oct6',
        requestId: 'amara',
        packageId: 'pkg-amara',
        personId: 'amara',
        name: 'Amara Okafor',
        initials: 'AO',
        tone: 'peach',
        title: 'CV review + mock interview',
        date: '2026-10-06',
        time: '18:00',
        end: '18:30',
        minutes: 30,
        format: 'Video',
        note: 'Hi Amara — send your CV over before we meet and we\'ll do one mock question together.',
        status: 'booked',
      },
      {
        id: 'james-oct8',
        requestId: 'james',
        packageId: 'pkg-james',
        personId: 'james',
        name: 'James Mensah',
        initials: 'JM',
        tone: 'blue',
        title: 'Investor pitch walkthrough',
        date: '2026-10-08',
        time: '12:00',
        end: '12:45',
        minutes: 45,
        format: 'Video',
        note: 'Hi James — bring the latest deck and we will pressure-test pricing for the first ten minutes.',
        status: 'booked',
      },
    ],
    threads: {
      amara: [
        {
          id: 'a1',
          type: 'status',
          author: 'FEMI',
          text: 'Session 1 done. CV restructured around her two React projects. Next: one mock technical question.',
          time: '17:40',
          day: 'Sat 3 Oct',
        },
        {
          id: 'a2',
          type: 'in',
          text: 'Thanks Femi! Updated CV sent — projects are at the top now.',
          time: 'Sun 10:14',
          day: 'Sun 4 Oct',
        },
        {
          id: 'a3',
          type: 'out',
          text: 'Much stronger. For Tuesday, pick one problem and talk me through it out loud.',
          time: 'Sun 10:32',
          day: 'Sun 4 Oct',
          read: true,
        },
        {
          id: 'a4',
          type: 'in',
          text: 'Will do — JavaScript or Python?',
          time: 'Sun 10:35',
          day: 'Sun 4 Oct',
        },
        {
          id: 'a5',
          type: 'move',
          label: 'IN PROGRESS',
          text: 'Session 2 booked for Tue 6 Oct, 18:00–18:30 · Video',
          time: 'Sun 10:40',
          day: 'Sun 4 Oct',
        },
      ],
      james: [
        {
          id: 'j1',
          type: 'status',
          author: 'FEMI',
          text: 'Deck received. Pricing slide still leads with the vision. Ask him for the pilot margin first.',
          time: 'Mon 09:12',
          day: 'Mon 5 Oct',
        },
        {
          id: 'j2',
          type: 'in',
          text: 'Shared the latest pitch deck — slide 4 is the one I am unsure about.',
          time: 'Mon 09:40',
          day: 'Mon 5 Oct',
        },
      ],
      sade: [
        {
          id: 's1',
          type: 'status',
          author: 'FEMI',
          text: 'Goal marked done: the first 90 days plan is in motion and the Monday meeting is hers.',
          time: 'Sun 18:05',
          day: 'Sun 4 Oct',
        },
        {
          id: 's2',
          type: 'in',
          text: 'Thank you — the Monday staff meeting felt different. I kept it to twenty minutes.',
          time: 'Sun 18:22',
          day: 'Sun 4 Oct',
        },
      ],
      tunde: [
        {
          id: 't1',
          type: 'status',
          author: 'FEMI',
          text: 'Portfolio request came in today. Waiting on two case-study links before a time is booked.',
          time: '09:05',
          day: 'Mon 5 Oct',
        },
      ],
      ngozi: [
        {
          id: 'n1',
          type: 'status',
          author: 'FEMI',
          text: 'Grant draft is two days old. Nudge if it is still quiet tomorrow.',
          time: 'Sat 11:20',
          day: 'Sat 3 Oct',
        },
      ],
      kofi: [
        {
          id: 'k1',
          type: 'status',
          author: 'FEMI',
          text: 'Asked Kofi which data project he wants to talk through. Waiting three days.',
          time: 'Fri 16:00',
          day: 'Fri 2 Oct',
        },
      ],
      chidi: [
        {
          id: 'c1',
          type: 'move',
          label: 'DONE',
          text: 'Salary conversation done. He used the number without discounting it.',
          time: 'Sep 22',
          day: 'Tue 22 Sep',
        },
      ],
      lola: [
        {
          id: 'l1',
          type: 'move',
          label: 'DONE',
          text: 'Freelance rate agreed and quoted on a live call.',
          time: 'Sep 18',
          day: 'Fri 18 Sep',
        },
      ],
    },
    activity: [
      {
        id: 'act-tokens-amara',
        personId: 'amara',
        initials: 'AO',
        tone: 'peach',
        title: 'You sent 40 tokens to Amara',
        detail: 'Token gift · Career · 2 days ago',
        badge: { kind: 'tokens', label: '40 tokens' },
        menteeId: 'amara',
      },
      {
        id: 'act-sade',
        personId: 'sade',
        initials: 'SB',
        tone: 'lavender',
        title: 'Sade Bello marked her goal done',
        detail: 'Leadership · First 90 days · 1 day ago',
        badge: { kind: 'done', label: 'Done' },
        menteeId: 'sade',
      },
      {
        id: 'act-amara',
        personId: 'amara',
        initials: 'AO',
        tone: 'peach',
        title: 'You gave 30 min to Amara',
        detail: 'Career · Session booked · 2 days ago',
        badge: { kind: 'hours', label: '+0.5 hr' },
        menteeId: 'amara',
      },
      {
        id: 'act-james',
        personId: 'james',
        initials: 'JM',
        tone: 'blue',
        title: 'James shared his pitch deck',
        detail: 'Business · Investor readiness · 3 days ago',
        badge: { kind: 'new', label: 'New' },
        menteeId: 'james',
      },
    ],
    saved: [],
    outcomes: {},
    nextId: 100,
  };
}

export function giftOptions(state, targetType) {
  if (targetType === 'cause') {
    return state.causes.map((cause) => ({
      id: cause.id,
      name: cause.name,
      meta: cause.place,
      initials: cause.initials,
      tone: cause.tone,
      tokens: cause.tokens,
    }));
  }
  if (targetType === 'package') {
    return state.packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.packageName,
      meta: pkg.name,
      initials: pkg.initials,
      tone: pkg.tone,
      tokens: pkg.tokensGiven || 0,
    }));
  }
  return state.requests.map((req) => ({
    id: req.personId,
    name: req.name,
    meta: req.listMeta,
    initials: req.initials,
    tone: req.tone,
    tokens: state.packages.find((pkg) => pkg.personId === req.personId)?.tokensGiven || 0,
  }));
}

export function giftDraft(state, { targetType = 'mentee', id = '' } = {}) {
  const type = ['mentee', 'package', 'cause'].includes(targetType) ? targetType : 'mentee';
  const options = giftOptions(state, type);
  const match = options.find((option) => option.id === id);
  return {
    targetType: type,
    targetId: match?.id || options[0]?.id || '',
    amount: 25,
    note: '',
  };
}

export function buyTokens(state, { packId } = {}) {
  const pack = TOKEN_PACKS.find((item) => item.id === packId);
  if (!pack) throw new Error('Unknown token pack');
  const next = structuredClone(state);
  next.wallet.balance += pack.tokens;
  next.wallet.purchased += pack.tokens;
  next.nextId += 1;
  next.purchases.unshift({
    id: `buy-${next.nextId}`,
    packId: pack.id,
    tokens: pack.tokens,
    price: pack.price,
    sample: true,
    label: 'Sample checkout · no charge',
  });
  activityItem(next, {
    personId: 'femi',
    initials: 'FA',
    tone: 'orange',
    title: `You bought ${pack.tokens} tokens`,
    detail: `Sample checkout · £${pack.price} shown · not charged`,
    badge: { kind: 'tokens', label: `+${pack.tokens}` },
    href: '#/wallet',
  });
  return next;
}

export function giveTokens(state, { targetType, targetId, amount, note } = {}) {
  const qty = Number(amount);
  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, error: 'Choose how many tokens to give.', state };
  }
  if (state.wallet.balance < qty) {
    return { ok: false, error: 'Not enough tokens. Buy more in the sample wallet.', state };
  }

  const next = structuredClone(state);
  let name = '';
  let initials = '•';
  let tone = 'sand';
  let href = '#/board';
  let personId = '';

  if (targetType === 'mentee') {
    const req = next.requests.find((item) => item.personId === targetId || item.id === targetId);
    if (!req) return { ok: false, error: 'Choose a mentee.', state };
    const pkg = next.packages.find((item) => item.personId === req.personId);
    if (pkg) pkg.tokensGiven = (pkg.tokensGiven || 0) + qty;
    name = req.name;
    initials = req.initials;
    tone = req.tone;
    personId = req.personId;
    href = `#/mentees/${req.personId}`;
  } else if (targetType === 'package') {
    const pkg = next.packages.find((item) => item.id === targetId);
    if (!pkg) return { ok: false, error: 'Choose a support package.', state };
    pkg.tokensGiven = (pkg.tokensGiven || 0) + qty;
    name = pkg.packageName;
    initials = pkg.initials;
    tone = pkg.tone;
    personId = pkg.personId;
    href = `#/mentees/${pkg.personId}`;
  } else if (targetType === 'cause') {
    const cause = next.causes.find((item) => item.id === targetId);
    if (!cause) return { ok: false, error: 'Choose a cause.', state };
    cause.tokens += qty;
    name = cause.name;
    initials = cause.initials;
    tone = cause.tone;
    href = '#/board';
  } else {
    return { ok: false, error: 'Choose a mentee, package, or cause.', state };
  }

  next.wallet.balance -= qty;
  next.wallet.spent += qty;
  next.nextId += 1;
  const giftNote = (note || '').trim();
  next.gifts.unshift({
    id: `gift-${next.nextId}`,
    targetType,
    targetId,
    name,
    amount: qty,
    note: giftNote,
    when: 'Just now',
  });
  activityItem(next, {
    personId,
    initials,
    tone,
    title: `You sent ${qty} tokens to ${name}`,
    detail: `${targetType === 'cause' ? 'Cause' : 'Token gift'} · Just now`,
    badge: { kind: 'tokens', label: `${qty} tokens` },
    href,
    menteeId: personId || undefined,
  });
  if (personId) {
    pushEntry(next, personId, {
      type: 'status',
      author: 'FEMI',
      text: giftNote ? `Sent ${qty} tokens. ${giftNote}` : `Sent ${qty} tokens.`,
      time: 'Now',
      day: 'Today',
    });
  }
  return { ok: true, state: next };
}

export function createInitialState() {
  return buildState();
}
