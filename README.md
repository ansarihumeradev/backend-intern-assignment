# Secure REST API with JWT Auth & Role-Based Access Control

A scalable REST API (Node.js + Express + MongoDB) with user authentication,
role-based access control (user/admin), and full CRUD for a `tasks` entity —
plus a minimal frontend to exercise the API.

Built for the Backend Developer Intern assignment.

---

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** MongoDB (via Mongoose ODM) — works with local MongoDB or MongoDB Atlas
- **Auth:** JWT (access + refresh tokens), bcrypt password hashing
- **Validation:** express-validator
- **Docs:** Swagger UI (auto-generated) + Postman collection
- **Security:** helmet, rate limiting on auth routes, CORS, Mongoose schema validation
- **Frontend:** Vanilla HTML/CSS/JS (served statically by Express) — register, login, dashboard, task CRUD

---

## Project Structure

```
src/
  config/       # DB connection (Mongoose), swagger config
  models/       # User, Task (Mongoose schemas)
  controllers/  # business logic per route group
  routes/       # authRoutes, taskRoutes, adminRoutes
  middleware/   # auth (JWT verify), role (RBAC), validate, errorHandler
  utils/        # token signing/verification, ApiError class
  app.js        # express app assembly
  server.js     # entrypoint (connects DB, then starts server)
public/
  index.html    # frontend demo console
docs/
  postman_collection.json
Dockerfile
docker-compose.yml
.env.example
```

This layout keeps route → controller → model separated so new entities
(e.g. "projects", "comments") can be added as new folders/files without
touching existing modules — see the **Scalability Note** below.

---

## Setup

### 1. Requirements
- Node.js 18+
- A MongoDB database — either:
  - **MongoDB Atlas** (cloud, free tier) — recommended, no local install needed, or
  - a local MongoDB instance, or
  - Docker (see below)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Then edit `.env`:
- `MONGODB_URI` — your connection string (see below)
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — two different long random strings

**Getting your MongoDB Atlas connection string:**
1. Log into [MongoDB Atlas](https://cloud.mongodb.com)
2. Open your cluster → **Connect** → **Drivers**
3. Copy the connection string, it looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with your Atlas database user credentials (Database Access tab — not your Atlas login email/password, a separate DB user)
5. Add a database name before the `?`, e.g. `.../rbac_api_db?retryWrites=true...`
6. **Network Access** tab in Atlas → add your current IP (or `0.0.0.0/0` for quick testing, not recommended for production)
7. Paste the finished string into `MONGODB_URI` in your `.env`

No schema/migration step is needed — Mongoose creates collections automatically on first write.

### 4. Run the server
```bash
npm run dev     # with nodemon, auto-reload
# or
npm start
```

Server runs at `http://localhost:5000`.
- Frontend demo: `http://localhost:5000`
- Swagger docs: `http://localhost:5000/api-docs`

### Option: Run everything with Docker (local MongoDB, no Atlas needed)
```bash
docker compose up --build
```
This spins up a local MongoDB container + the API together, and exposes the
app on `http://localhost:5000`. Useful if you don't want to touch Atlas at all.

---

## API Reference (base path `/api/v1`)

| Method | Endpoint            | Auth         | Description                          |
|--------|----------------------|--------------|---------------------------------------|
| POST   | `/auth/register`     | Public       | Register a new user (role always `user`) |
| POST   | `/auth/login`         | Public       | Login, returns access + refresh JWT   |
| POST   | `/auth/refresh`       | Public       | Exchange refresh token for new access token |
| GET    | `/auth/me`             | JWT          | Get current user profile              |
| POST   | `/tasks`               | JWT          | Create a task                         |
| GET    | `/tasks`               | JWT          | List tasks (own tasks; admin sees all)|
| GET    | `/tasks/:id`           | JWT          | Get one task (owner or admin only)    |
| PUT    | `/tasks/:id`           | JWT          | Update a task (owner or admin only)   |
| DELETE | `/tasks/:id`           | JWT          | Delete a task (owner or admin only)   |
| GET    | `/admin/users`         | JWT + admin  | List all users (admin-only route)     |
| GET    | `/health`              | Public       | Health check                          |

Full request/response schemas: import `docs/postman_collection.json` into
Postman, or open `/api-docs` while the server is running.

### Example: Register
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"password123"}'
```

### Example: Authenticated request
```bash
curl http://localhost:5000/api/v1/tasks \
  -H "Authorization: Bearer <accessToken>"
```

### Making a user an admin
Public registration always creates `role = 'user'` by design (a real signup
endpoint should never let a client grant itself admin). To test admin-only
routes, promote a user directly in the database — in MongoDB Atlas, open
**Browse Collections** → `users` → edit the document and change `role` to
`"admin"`, or via `mongosh`:
```js
db.users.updateOne({ email: "alice@example.com" }, { $set: { role: "admin" } })
```
Then log in again to get a token carrying the `admin` role.

---

## Security Practices Implemented

- Passwords hashed with **bcrypt** (12 salt rounds), never stored/logged in plaintext
- **JWT** access tokens (short-lived, 30 min default) + refresh tokens (7 days), both signed with separate secrets from `.env`
- **RBAC** middleware (`requireRole`) protecting admin-only routes, plus per-resource ownership checks on tasks (a `user` can only touch their own tasks; `admin` can touch all)
- **Input validation & sanitization** on every write endpoint (`express-validator`) plus Mongoose schema-level constraints (string lengths, enums)
- **Mongoose queries** (no raw string-built queries), which avoids NoSQL injection via object-operator payloads
- **Central error handler** — consistent JSON error shape, stack traces logged server-side only, never leaked to the client
- **Rate limiting** on `/auth/register` and `/auth/login` (20 requests / 15 min) to slow brute-force attempts
- **Helmet** for secure HTTP headers, **CORS** enabled, JSON body size capped at 10kb to reduce payload-based abuse
- Correct HTTP status codes throughout: `400/422` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict (duplicate email)

---

## Scalability Note

The current structure is a modular monolith, which is the right starting
point for this scale, but every layer is already cut along lines that make
it easy to scale further without a rewrite:

- **Horizontal scaling:** the app is stateless (no server-side sessions —
  auth state lives entirely in the JWT), so it can run as multiple
  container replicas behind a load balancer (e.g. Nginx, AWS ALB) with no
  sticky-session requirement.
- **Database:** MongoDB scales horizontally via sharding, and Atlas manages
  replica sets out of the box for read scaling and failover; the next step
  under real load would be routing read-heavy endpoints (task listing) to
  secondary replicas.
- **Caching:** a Redis layer in front of read-heavy, rarely-changing data
  (e.g. user profile lookups, task lists) would cut DB load significantly;
  cache invalidation on writes is straightforward since all writes already
  go through the model layer.
- **Microservices path:** because auth, tasks, and admin are already
  separated into distinct routes/controllers with no cross-imports, `auth`
  could be extracted into its own service (issuing JWTs that other services
  simply verify) if the system grows past a single team/deploy unit.
- **New modules:** adding a new entity (e.g. "projects") means adding a
  model + controller + route file and mounting it in `app.js` — no changes
  to existing auth/task code, which is what "scalable project structure"
  means in practice here.
- **Observability:** structured logging (e.g. `pino`) and a `/metrics`
  endpoint (Prometheus) would be the next additions before a production
  deploy, so scaling decisions are based on real traffic data rather than
  guesses.

---

## What I'd Add With More Time

- Automated tests (Jest + Supertest) for auth and task endpoints
- Refresh token revocation/rotation (store refresh tokens server-side or in Redis, so `/auth/logout` can actually invalidate them)
- httpOnly cookie storage for tokens instead of `localStorage`/in-memory on the frontend (mitigates XSS token theft)
- Pagination on `GET /tasks` for large datasets
