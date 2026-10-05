# Give

Mobile-first sample of a giving and mentoring home: browse requests, book a session, see hours given, monitor support packages, keep a mentee thread, and log a session outcome.

This repo did not have a web app. The slice stays on the existing Node style: no framework and no extra dependencies. Illustrative data only — nothing is paid, sent, or signed in.

## Run

```bash
cd give
npm start
```

Open http://127.0.0.1:4173

```bash
npm test
```

The sample clock is Monday 5 October 2026, matching the screens. Edits stay in the browser tab until **Profile → Reset sample data**.

## Screens

| Route | What it is |
| --- | --- |
| `#/requests` | Mentees looking for you, with filters and Give time |
| `#/requests/amara` | Request, goals, and preferences |
| `#/requests/amara/schedule` | Pick a day, time, and length, then confirm |
| `#/feed` | Your giving: hours, upcoming sessions, activity |
| `#/board` | Open / In progress / Done, by person or package |
| `#/mentees/amara` | Conversation and status notes |
| `#/sessions/amara-oct6/outcome` | After-session outcome, then mark done |
| `#/alerts`, `#/profile` | Sample notifications and the giver profile |

Tap the green hours card on the requests home to open Your giving. From a thread, **Log session outcome** opens the form. A package stays in progress until every goal is checked.
