# FreshFold Laundry API

Node.js REST API with **PostgreSQL** (Prisma ORM).

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)

## Quick start

### 1. Start PostgreSQL (Docker)

From project root:

```bash
docker compose up -d
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` if needed. Default `DATABASE_URL`:

```
postgresql://laundry:laundry_secret@localhost:5432/laundry_db?schema=public
```

### 3. Install & sync database

```bash
npm install
npx prisma db push    # creates tables (use migrate deploy in production)
npm run db:seed
```

**Local PostgreSQL without Docker:** If your user cannot create databases, point `DATABASE_URL` at an existing database and use a dedicated schema, for example:

```
DATABASE_URL="postgresql://YOUR_USER@localhost/flocklink?host=/var/run/postgresql&schema=laundry"
```

Then run `npx prisma db push` and `npm run db:seed`.

### 4. Run API

```bash
npm run dev
```

API base: **http://localhost:3000/api/v1**

Health check: `GET /api/v1/health`

## Seed accounts

| Role     | Email                    | Password      |
|----------|--------------------------|---------------|
| Admin    | admin@freshfold.local    | Admin@123     |
| Customer | anita@email.com          | Customer@123  |
| Staff    | pickup@freshfold.local   | Staff@123     |

## Main endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Customer signup (+ optional address lat/lng) |
| POST | `/auth/login` | Login → JWT |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Current user (Bearer token) |
| CRUD | `/me/addresses` | Customer addresses |
| POST | `/hubs/resolve-nearest` | Nearest branch for lat/lng |
| GET | `/categories`, `/products` | Public catalog |
| POST | `/orders/draft` | Create order draft |
| PATCH | `/orders/:id` | Update pickup details / line items |
| POST | `/orders/:id/estimate` | Recompute estimate + hub |
| POST | `/orders/:id/confirm` | Confirm order |
| GET | `/orders`, `/orders/:id` | Customer orders |
| GET | `/admin/*` | Admin hubs, catalog, orders, reports |
| GET | `/staff/assignments` | Staff task list |

Authorization header: `Authorization: Bearer <accessToken>`

## Example: register with location

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new@example.com",
    "password": "SecurePass1",
    "fullName": "New User",
    "phone": "+919999999998",
    "address": {
      "line1": "42, 5th Cross",
      "city": "Bangalore",
      "postalCode": "560034",
      "latitude": 12.9352,
      "longitude": 77.6245
    }
  }'
```

## Project structure

```
backend/
  prisma/schema.prisma   # PostgreSQL schema
  prisma/seed.js         # Sample hubs, catalog, users
  src/
    index.js             # Entry point
    app.js               # Express app
    routes/              # API routes
    services/            # Business logic
    middleware/          # Auth, errors, validation
```
