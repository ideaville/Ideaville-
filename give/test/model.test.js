import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMessage,
  addStatusNote,
  boardColumns,
  confirmSession,
  createInitialState,
  endTime,
  filterRequests,
  goalPercent,
  markSessionDone,
  parseRoute,
  suggestAnother,
  toggleSaved,
  upcomingSessions,
  weekdayStrip,
} from '../src/model.js';

test('sample snapshot matches the giving mocks', () => {
  const state = createInitialState();
  assert.equal(state.browse.hours, 18);
  assert.equal(state.feed.hours, 18.5);
  assert.equal(goalPercent(state.feed.hours, state.feed.goal), 77);
  assert.equal(state.packages.length, 8);
  assert.equal(filterRequests(state.requests, 'All')[0].id, 'amara');
  const upcoming = upcomingSessions(state);
  assert.equal(upcoming[0].name, 'Amara Okafor');
  assert.equal(upcoming[0].cta, 'Join');
  assert.equal(upcoming[1].cta, 'Prep');
});

test('filters requests by category', () => {
  const { requests } = createInitialState();
  assert.equal(filterRequests(requests, 'Leadership')[0].id, 'ifeoma');
  assert.ok(filterRequests(requests, 'Tech').every((req) => req.categories.includes('Tech')));
  assert.equal(filterRequests(requests, 'All').length, requests.length);
});

test('5 October 2026 week is Monday to Friday', () => {
  const days = weekdayStrip('2026-10-06');
  assert.deepEqual(days.map((day) => day.num), [5, 6, 7, 8, 9]);
  assert.equal(days[0].dow, 'Mon');
  assert.equal(days[1].iso, '2026-10-06');
});

test('session end time rolls forward', () => {
  assert.equal(endTime('18:00', 30), '18:30');
  assert.equal(endTime('12:00', 45), '12:45');
  assert.equal(endTime('21:00', 60), '22:00');
});

test('reconfirming the same slot does not double-count hours', () => {
  const state = createInitialState();
  const next = confirmSession(state, {
    requestId: 'amara',
    date: '2026-10-06',
    time: '18:00',
    minutes: 30,
    note: 'Updated note',
  });
  assert.equal(next.feed.hours, 18.5);
  assert.equal(next.browse.hours, 18);
  assert.equal(next.sessions.filter((session) => session.requestId === 'amara' && session.status === 'booked').length, 1);
  assert.equal(next.sessions.find((session) => session.id === 'amara-oct6').note, 'Updated note');
});

test('lengthening a booked session adds only the difference', () => {
  const state = createInitialState();
  const next = confirmSession(state, {
    requestId: 'amara',
    date: '2026-10-06',
    time: '18:00',
    minutes: 60,
    note: 'Longer',
  });
  assert.equal(next.feed.hours, 19);
  assert.equal(next.browse.hours, 18.5);
});

test('booking a new mentee opens a package and adds half an hour', () => {
  const state = createInitialState();
  const next = confirmSession(state, {
    requestId: 'kwame',
    date: '2026-10-09',
    time: '09:30',
    minutes: 30,
    note: 'Hi Kwame',
  });
  assert.equal(next.feed.hours, 19);
  assert.equal(next.feed.people, 7);
  assert.equal(next.feed.activePackages, 5);
  assert.ok(next.packages.some((pkg) => pkg.personId === 'kwame' && pkg.status === 'progress'));
  assert.equal(upcomingSessions(next)[0].personId, 'amara');
});

test('marking a session done keeps the package open while a goal remains', () => {
  const state = createInitialState();
  const result = markSessionDone(state, {
    sessionId: 'amara-oct6',
    packageId: 'pkg-amara',
    changes: ['cv', 'confidence'],
    words: 'Clear structure',
    goals: [
      { id: 'cv', label: 'Honest feedback on CV', done: true },
      { id: 'mock', label: 'One mock technical question', done: true },
      { id: 'uk', label: 'Approach to UK & remote roles', done: false },
    ],
    followUp: false,
  });
  const pkg = result.state.packages.find((item) => item.id === 'pkg-amara');
  assert.equal(result.closed, false);
  assert.equal(pkg.status, 'progress');
  assert.equal(pkg.sessionsDone, 2);
  assert.equal(result.state.sessions.find((session) => session.id === 'amara-oct6').status, 'done');
  assert.equal(result.state.feed.activePackages, 4);

  const again = markSessionDone(result.state, {
    sessionId: 'amara-oct6',
    packageId: 'pkg-amara',
    changes: ['cv'],
    words: 'Clear structure',
    goals: pkg.goals,
    followUp: false,
  });
  assert.equal(again.state.packages.find((item) => item.id === 'pkg-amara').sessionsDone, 2);
});

test('all goals done closes the package and skips a follow-up', () => {
  const state = createInitialState();
  const result = markSessionDone(state, {
    sessionId: 'amara-oct6',
    packageId: 'pkg-amara',
    changes: ['cv', 'confidence', 'plan'],
    words: 'Ready to apply',
    goals: [
      { id: 'cv', label: 'Honest feedback on CV', done: true },
      { id: 'mock', label: 'One mock technical question', done: true },
      { id: 'uk', label: 'Approach to UK & remote roles', done: true },
    ],
    followUp: true,
  });
  const pkg = result.state.packages.find((item) => item.id === 'pkg-amara');
  assert.equal(result.closed, true);
  assert.equal(result.followUp, false);
  assert.equal(pkg.status, 'done');
  assert.equal(result.state.feed.activePackages, 3);
  assert.equal(result.state.sessions.some((session) => session.followUpOf === 'amara-oct6'), false);
});

test('follow-up books another session while goals remain', () => {
  const state = createInitialState();
  const result = markSessionDone(state, {
    sessionId: 'amara-oct6',
    packageId: 'pkg-amara',
    changes: ['confidence'],
    words: 'Needs another pass',
    goals: [
      { id: 'cv', label: 'Honest feedback on CV', done: true },
      { id: 'mock', label: 'One mock technical question', done: true },
      { id: 'uk', label: 'Approach to UK & remote roles', done: false },
    ],
    followUp: true,
  });
  assert.equal(result.followUp, true);
  assert.equal(result.state.packages.find((item) => item.id === 'pkg-amara').status, 'progress');
  assert.ok(result.state.sessions.some((session) => session.followUpOf === 'amara-oct6' && session.status === 'booked'));
  assert.equal(result.state.feed.hours, 19);
});

test('board filters by person and by package theme', () => {
  const { packages } = createInitialState();
  const amara = boardColumns(packages, { mode: 'person', filter: 'amara' });
  assert.equal(amara.progress.length, 1);
  assert.equal(amara.open.length, 0);
  const leadership = boardColumns(packages, { mode: 'package', filter: 'Leadership' });
  assert.equal(leadership.done.length, 1);
  assert.equal(leadership.done[0].personId, 'sade');
});

test('messages, notes, saved, and suggestions', () => {
  const state = createInitialState();
  const withMessage = addMessage(state, 'amara', '  See you Tuesday  ');
  assert.equal(withMessage.threads.amara.at(-1).text, 'See you Tuesday');
  assert.equal(addMessage(state, 'amara', '   '), state);
  const withNote = addStatusNote(state, 'james', 'Bring slide 4');
  assert.equal(withNote.threads.james.at(-1).type, 'status');
  const saved = toggleSaved(toggleSaved(state, 'james'), 'james');
  assert.deepEqual(saved.saved, []);
  const requests = state.requests;
  assert.equal(suggestAnother(requests, requests.at(-1).id), requests[0].id);
});

test('routes cover the prototype screens', () => {
  assert.equal(parseRoute('').name, 'requests');
  assert.equal(parseRoute('#/requests/amara').name, 'detail');
  assert.equal(parseRoute('#/requests/amara/schedule').name, 'schedule');
  assert.equal(parseRoute('#/feed').name, 'feed');
  assert.equal(parseRoute('#/board').name, 'board');
  assert.equal(parseRoute('#/mentees/amara').name, 'thread');
  assert.deepEqual(parseRoute('#/sessions/amara-oct6/outcome'), { name: 'outcome', id: 'amara-oct6' });
});
