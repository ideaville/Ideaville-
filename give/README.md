# Give

Mobile-first sample of a giving and mentoring home. Givers give time and tokens. Tokens are bought in a sample checkout, then given to a mentee, a support package, or a cause.

This repo did not have a web app. The slice stays on the existing Node style: no framework and no extra dependencies. Illustrative data only — checkout does not charge a card, and nothing is paid, sent, or signed in.

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
| `#/feed` | Your giving: hours, token balance, upcoming sessions, activity |
| `#/wallet` | Token balance, buy, and gifts |
| `#/wallet/buy` | Sample checkout for a token pack. No charge is made |
| `#/wallet/give` | Give tokens to a mentee, package, or cause |
| `#/board` | Open / In progress / Done, plus token gifts on each card |
| `#/mentees/amara` | Conversation, status notes, and token gifts |
| `#/sessions/amara-oct6/outcome` | After-session outcome, then mark done |
| `#/alerts`, `#/profile` | Sample notifications, token balance, and the giver profile |

Tap the green hours card on the requests home to open Your giving. The token pill opens the wallet. From a thread, **Log session outcome** opens the form and **Give tokens** opens the gift screen. A package stays in progress until every goal is checked.
