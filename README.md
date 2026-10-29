# CampusBites — video-inspired campus canteen ordering app

A fresh standalone project inspired by the supplied video: red-and-white campus food site, horizontal category filters, photo menu cards, cart drawer, manual delivery address and mobile number, live order tracking, delivery OTP confirmation, student login/register, order history, and a separate admin role/API.

## Stack
- React + Vite frontend
- Node.js + Express API
- MySQL database
- bcrypt password hashing and JWT authentication

## 1. Database
Open MySQL Workbench and execute `database/schema.sql`. It creates `campusbites`, its tables, and starter menu items. Do not run this on a production database without reviewing it first.

## 2. Backend setup
Open a terminal in `backend`:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `backend/.env`: set your MySQL password and a random JWT secret at least 32 characters long. Set a strong `ADMIN_PASSWORD` of at least 12 characters.

```powershell
npm run create-admin
npm run dev
```

Health check: `http://localhost:5000/api/health` should return `{"status":"ok","database":"connected"}`.

## 3. Existing database migration (only if you already created the database)
If you already ran the earlier `schema.sql`, do NOT run the new schema file over the old database. Instead, run `database/migration_delivery_tracking.sql` once in MySQL Workbench. It adds the delivery address, mobile, OTP fields, and new tracking statuses. If this is a brand-new database, the updated `database/schema.sql` already includes these fields and you do not need the migration.

## 4. Delivery SMS / OTP
- Student chooses **Delivery**, enters a full manual address and mobile number, then places the order.
- Admin moves the order through `PLACED` → `PREPARING` → `ALMOST_DONE` → `OUT_FOR_DELIVERY`.
- When admin selects `OUT_FOR_DELIVERY`, the backend creates a 6-digit OTP. The customer enters it in **My Orders** after receiving the food; only successful OTP verification changes the order to `DELIVERED`.
- For local testing without an SMS provider, the demo OTP is shown in the admin page and printed in the backend terminal.
- For real SMS, configure Twilio credentials in `backend/.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`. The Twilio account must be allowed to send to the customer's number. Never commit these credentials.

## 5. Frontend setup
Open a second terminal in `frontend`:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## 6. Sign in
- Student: use **Login → Create account**, then sign in with that email/password.
- Admin: use **Login → Admin** with the values in `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `backend/.env`.
- Admin user creation is not exposed through public registration. The `npm run create-admin` command creates/updates the configured admin account.

## Notes / current demo limits
- The supplied video is a screen recording, so this project recreates its overall visual direction and visible interaction patterns, not a pixel-perfect clone of every screen.
- Menu photo images use remote Unsplash URLs and need internet access to load.
- Cart and catalogue display are frontend-driven. The API persists orders and exposes protected admin APIs. The admin session exposes a dashboard modal with summary stats, order status controls, and menu availability toggles.
- Real SMS requires Twilio credentials; without them, the app uses a local demo OTP for testing. No payment gateway or live driver GPS tracking is included.
- Use HTTPS and rotate secrets before deployment. Do not commit `.env` files.
