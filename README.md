# QueueLess client (Person B)

    cd client
    npm install
    npm run dev        # http://localhost:5173

Backend must be running on http://localhost:5000 (change in src/config.js).

Make a staff account: register in the UI, then in MySQL run
    UPDATE users SET role='ADMIN' WHERE email='you@example.com';
and log in again.
