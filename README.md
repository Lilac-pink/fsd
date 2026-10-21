# QueueLess: Smart Queue Management System

Students take digital tokens for campus counters (Accounts, Library, Medical Room, Canteen)
and see their live position and estimated wait. Staff call, complete or skip tokens from a dashboard.
Updates are pushed in real time with Socket.IO.

**Stack:** React + Vite + Tailwind, Node.js + Express, MySQL, Socket.IO, JWT auth.

```
queueless/
├── server/   Node + Express + Socket.IO + MySQL (port 5000)
└── client/   React + Vite + Tailwind (port 5173)
```

## Run it (first time)

Prerequisites: Node.js LTS, MySQL Server (+ MySQL Workbench).

1. **Database.** In MySQL Workbench, open `server/schema.sql` and run it
   (creates the `queueless` database, tables, and the 4 services).
2. **Backend config.** In `server/`, copy `.env.example` to `.env` and put your MySQL password in `DB_PASSWORD`.
3. **Backend.**
   ```
   cd server
   npm install
   node server.js        # Server running on http://localhost:5000
   ```
4. **Frontend** (second terminal).
   ```
   cd client
   npm install
   npm run dev           # http://localhost:5173
   ```

Every run after that: start MySQL, `node server.js` in `server/`, `npm run dev` in `client/`.

## Create a staff (admin) account

Registration always creates a student. Register in the UI, then in MySQL Workbench:

```sql
UPDATE users SET role='ADMIN' WHERE email='your@email.com';
```

Log out and log in again.

## Demo flow

1. Normal window: register/log in as a student, pick a service, **Get a token**.
2. Incognito window: log in as admin, pick the same service, **Call next**.
3. The student screen switches to "It's your turn" instantly, with no refresh.
4. Admin clicks **Mark done**. Student returns to the "Get a token" screen.

## API summary

| Method | Route | Who |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | all |
| GET | /api/services | logged in |
| POST | /api/tokens | student |
| GET | /api/tokens/status?serviceId= | student |
| PATCH | /api/tokens/:tokenId/cancel | student |
| GET | /api/admin/queue/:serviceId | admin |
| POST | /api/admin/call-next, /skip, /complete | admin |

Socket.IO: client emits `join_room {serviceId, userId}`; server emits `queue_updated` and `your_turn`.
