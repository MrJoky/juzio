# Juze Theke

Local web app for visitor-room entries and a simple protected cashier counter.

The public form stores visit entries with date, time, room type, main visitor and guests. The protected team area shows those entries and a separate cashier counter.

## Start

1. Copy `.env.example` to `.env`.
2. Change `STAFF_PASSWORD` and `SESSION_SECRET`.
3. Run:

```sh
npm start
```

Open `http://localhost:3000`.

## Data

The app stores local JSON files in `data/`. Those files are ignored by Git so real entries and cashier counts stay local.
