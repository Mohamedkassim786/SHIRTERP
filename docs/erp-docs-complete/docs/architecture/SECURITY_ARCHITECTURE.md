# Security Architecture

## Status: Phase 1 Hardening — COMPLETE (30 June 2026)

---

## Authentication
- **Method:** JWT (jsonwebtoken)
- **Storage:** HTTP Cookie (`token`, 1-day expiry) + Zustand persist
- **Password Hashing:** bcrypt (10 salt rounds)
- **Token Payload:** `{ id: userId, role: roleName }`

## Environment Variables (Required)
All required vars are validated at startup. Server refuses to start if any are missing.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 128-char hex string (generate with `crypto.randomBytes(64).toString('hex')`) |
| `JWT_EXPIRES_IN` | Token lifetime (default: `1d`) |
| `CORS_ORIGIN` | Allowed frontend origin (e.g., `http://localhost:5173`) |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default: `5000`) |

> Never commit `.env`. Always use `.env.example` as the template.

## CORS
- Restricted to `CORS_ORIGIN` env variable only
- No wildcard (`*`) origins allowed
- Credentials: enabled
- Allowed methods: GET, POST, PUT, DELETE, PATCH, OPTIONS

## Rate Limiting
- **General API** (`/api/*`): 200 requests / 15 minutes per IP
- **Login** (`/api/auth/login`): 10 attempts / 15 minutes per IP
- Returns `429 Too Many Requests` with clear message

## Authorization
- `authenticate` middleware: verifies JWT on every protected route
- `authorize(roles[])` middleware: checks `req.user.role` against allowed roles
- **Admin routes** (`/api/admin/*`): require `ADMIN` role — returns `403 Forbidden` otherwise

## Error Handling
- Stack traces are **never exposed in production** (`NODE_ENV=production`)
- Stack traces are shown in development for debugging
- All errors logged server-side with method and path context

## File Upload Security
- Handled by multer middleware
- **TODO (Phase 3):** Add file type and size validation
