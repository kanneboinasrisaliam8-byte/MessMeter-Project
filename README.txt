MESSMETER — ZEROWASTE MESS HACK (FULL-STACK VERSION)
====================================================

WHAT THIS VERSION ADDS
- Node.js + Express REST API
- MongoDB persistence shared by users and devices
- Student registration and password-hashed login (bcrypt)
- Admin login and role-based API authorization
- Server-enforced 6-hour meal selection cutoff
- Automatic meal-wise headcount from registered students and saved opt-outs
- Food-waste logging and dish ratings stored in MongoDB
- Dashboard aggregation and JSON export
- Input validation, security headers, login rate limiting and error handling
- Jest tests for cutoff and headcount business rules

REQUIREMENTS
- Node.js 18 or newer
- MongoDB Community Server running locally OR a MongoDB Atlas connection string
- VS Code (recommended)

SETUP (WINDOWS)
1. Extract the ZIP.
2. Open the MessMeter_Complete folder in VS Code.
3. Open Terminal > New Terminal.
4. Install dependencies:
      npm install
5. Create your environment file:
      copy .env.example .env
6. Open .env and configure:
   - MONGODB_URI (local MongoDB or your Atlas connection string)
   - JWT_SECRET (a long random value, at least 32 characters)
   - ADMIN_EMAIL and ADMIN_PASSWORD (choose your own strong admin credentials)
   - MEAL_CUTOFF_HOURS=6
7. Start MongoDB if using a local installation.
8. Start the application:
      npm start
9. Open http://localhost:3000 in your browser.

LOGIN
- Student: On first use, fill in the Student Login form. It creates a student account.
  Use the same email and password next time to log in. Student passwords must be
  at least 8 characters. Each student ID and email must be unique.
- Admin: Use the ADMIN_EMAIL and ADMIN_PASSWORD values configured in .env.
  The server creates this admin account on first startup. Do not share credentials.

HOW TO DEMONSTRATE
1. Register at least two student accounts in separate browsers/incognito sessions.
2. Submit tomorrow's meal selections from each student account.
3. Log in as admin and select a meal in Daily Headcount Predictor.
4. Click Calculate Headcount. The server derives the expected count from saved
   student responses; students with no response are counted as attending.
5. Record food waste and review the dashboard.
6. Log in as a student and submit a dish rating; return to admin dashboard.
7. Demonstrate that data remains after restarting the server (MongoDB persistence).
8. Try a meal selection within six hours of its service time to demonstrate that
   the server rejects late changes.

TESTS
Run:
      npm test
The Jest suite tests headcount validation/calculation and the six-hour cutoff.

API OVERVIEW
POST /api/auth/register       Student registration
POST /api/auth/login          Student/admin login
GET  /api/me                  Current authenticated user
POST /api/meals               Save/update a student's meal selection
GET  /api/meals/headcount     Admin meal-wise headcount
POST /api/waste               Admin creates a waste record
POST /api/ratings             Student creates a dish rating
GET  /api/dashboard           Admin dashboard aggregates
GET  /api/health              API health check

IMPORTANT DESIGN NOTES
- All meal, waste and rating records are stored in MongoDB, not browser localStorage.
- Meal service time is currently set by the demo UI to tomorrow at 12:00 local time.
  For a real institution, configure service times per meal in an admin menu/calendar.
- The cutoff is checked by the server using MEAL_CUTOFF_HOURS, so changing browser
  code cannot bypass it.
- For headcount, registered students without a saved response are conservatively
  counted as attending. This avoids underestimating food preparation.
- JWT tokens are stored in sessionStorage in this classroom demo. For production,
  consider secure HttpOnly cookies, HTTPS, audit logs, backups and stronger controls.
- Do not commit .env or real passwords to GitHub. .gitignore excludes .env.
- The college's evaluator has final authority over marks; this package cannot
  guarantee a particular score. Review the exact SRS and demonstrate every feature.

PROJECT STRUCTURE
index.html, style.css, script.js      Frontend
server.js                             Express application entry point
server/routes/                        Authentication and application API
server/models/                        MongoDB data models
server/middleware/auth.js             JWT authentication and role checks
server/utils/mealRules.js              Cutoff/headcount business rules
tests/                                Jest tests
.env.example                          Environment variable template
