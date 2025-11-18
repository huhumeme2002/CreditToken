# Key Token App - Codebase Index

## 📋 Project Overview
**Project Name:** Key Token App  
**Version:** 0.1.0  
**Description:** Hệ thống quản lý key và phát token an toàn với Next.js 14, Drizzle ORM, và Neon Postgres  
**Tech Stack:** Next.js 14 + TypeScript + Tailwind CSS + Drizzle ORM + Neon Postgres

---

## 🏗️ Directory Structure

```
backup-master/
├── api/                    # API Route Handlers
│   ├── login/             # User authentication endpoints
│   ├── logout/            # User logout endpoints  
│   ├── me/                # User profile endpoints
│   └── token/             # Token generation endpoints
├── app/                   # Next.js App Router pages
│   ├── admin/             # Admin dashboard pages
│   ├── app/               # User application pages
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout component
├── db/                    # Database configuration and utilities
│   ├── client.ts          # Database client setup
│   ├── migrate.ts         # Migration runner
│   ├── schema.ts          # Database schema definitions
│   └── seed.ts            # Database seeding script
├── lib/                   # Shared utilities and libraries
│   ├── auth.ts            # Authentication utilities
│   ├── env.ts             # Environment variable validation
│   ├── rateLimit.ts       # Rate limiting logic
│   ├── responses.ts       # API response utilities
│   └── utils.ts           # General utility functions
├── tests/                 # Test files
│   ├── api.admin.test.ts  # Admin API tests
│   ├── api.login.test.ts  # Login API tests
│   ├── api.token.test.ts  # Token API tests
│   └── concurrency.test.ts# Concurrency tests
└── [config files]        # Various configuration files
```

---

## 🔌 API Endpoints

### User APIs (`/api/`)
- **POST `/api/login`** - User authentication with key
- **POST `/api/logout`** - User session termination
- **GET `/api/me`** - Get current user information
- **POST `/api/token`** - Generate token (rate limited)

### Admin APIs (`/api/admin/`)
- **POST `/api/admin/login`** - Admin authentication
- **POST `/api/admin/logout`** - Admin session termination
- **GET `/api/admin/stats`** - System statistics
- **POST `/api/admin/upload-tokens`** - Bulk token upload
- **GET `/api/admin/keys`** - List user keys
- **POST `/api/admin/keys`** - Create new user key
- **PATCH `/api/admin/keys/[id]/toggle`** - Toggle key status

---

## 🗄️ Database Schema

### Tables Overview
1. **keys** - User authentication keys management
2. **token_pool** - Pre-uploaded tokens for distribution  
3. **deliveries** - Audit log of token distribution

### Schema Details
```typescript
// Keys Table
keys {
  id: UUID (PK, auto-generated)
  key: TEXT UNIQUE (user login key)
  expires_at: TIMESTAMPTZ (key expiration)
  is_active: BOOLEAN (key status)
  last_token_at: TIMESTAMPTZ (last token request time)
  created_at: TIMESTAMPTZ (creation timestamp)
}

// Token Pool Table  
token_pool {
  id: UUID (PK, auto-generated)
  value: TEXT UNIQUE (token value)
  assigned_to: UUID (FK to keys.id)
  assigned_at: TIMESTAMPTZ (assignment timestamp)
  created_at: TIMESTAMPTZ (creation timestamp)
}

// Deliveries Table (Audit Trail)
deliveries {
  id: UUID (PK, auto-generated) 
  key_id: UUID (FK to keys.id)
  token_id: UUID (FK to token_pool.id)
  delivered_at: TIMESTAMPTZ (delivery timestamp)
}
```

---

## 🎯 Key Components

### Core Pages
- **`app/layout.tsx`** - Root layout with header/footer
- **`app/app/page.tsx`** - User dashboard page
- **`app/admin/page.tsx`** - Admin dashboard page

### Authentication System
- **`lib/auth.ts`** - JWT token management, session verification
- **`middleware.ts`** - Route protection and session handling

### Database Layer
- **`db/schema.ts`** - Drizzle ORM schema definitions
- **`db/client.ts`** - Database connection setup
- **`db/migrate.ts`** - Migration execution
- **`db/seed.ts`** - Demo data seeding

### Utilities
- **`lib/env.ts`** - Environment variable validation with Zod
- **`lib/rateLimit.ts`** - Rate limiting implementation
- **`lib/responses.ts`** - Standardized API responses
- **`lib/utils.ts`** - General utility functions

---

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with jose library
- HTTPOnly cookies for secure token storage
- Separate user and admin authentication flows
- Session expiration handling

### Rate Limiting
- 20-minute cooldown between token requests per key
- Database-level race condition prevention
- FOR UPDATE SKIP LOCKED for token uniqueness

### Input Validation
- Zod schema validation for all API inputs
- SQL injection protection via Drizzle ORM
- XSS protection through proper escaping

### CSRF Protection
- Required `X-Requested-With` headers
- SameSite cookie configuration
- Origin validation

---

## 🧪 Testing Strategy

### Test Files
- **`api.admin.test.ts`** - Admin functionality tests
- **`api.login.test.ts`** - User authentication tests  
- **`api.token.test.ts`** - Token generation and rate limiting tests
- **`concurrency.test.ts`** - Race condition and concurrency tests

### Coverage Areas
- User login flows (valid/invalid/expired keys)
- Token generation with rate limiting
- Admin operations and authentication
- Concurrency handling and race conditions
- Session management

---

## 📦 Dependencies

### Production Dependencies
- **next**: 14.0.4 (React framework)
- **react**: ^18 (UI library)
- **drizzle-orm**: ^0.29.0 (ORM)
- **@neondatabase/serverless**: ^0.6.0 (Database driver)
- **jose**: ^5.1.3 (JWT handling)
- **zod**: ^3.22.4 (Schema validation)
- **xlsx**: ^0.18.5 (Excel file processing)
- **typescript**: ^5 (Type system)

### Development Dependencies
- **drizzle-kit**: ^0.20.7 (Database toolkit)
- **vitest**: ^1.0.4 (Testing framework)
- **tailwindcss**: ^3.3.0 (CSS framework)
- **eslint**: ^8 (Code linting)
- **tsx**: ^4.6.2 (TypeScript execution)

---

## 🚀 Build & Deployment

### Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run build            # Production build
npm run start            # Start production server

# Database Operations
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations  
npm run db:push          # Push schema changes
npm run seed             # Seed demo data

# Quality Assurance
npm run lint             # ESLint checking
npm run type-check       # TypeScript validation
npm run test             # Run test suite
npm run test:watch       # Run tests in watch mode
```

### Environment Variables
```bash
DATABASE_URL=              # Neon Postgres connection string
JWT_SECRET=                # 64-character hex string for JWT signing
ADMIN_SECRET=              # Admin authentication secret
RATE_LIMIT_MINUTES=20      # Token request cooldown period
ADMIN_SESSION_TTL_DAYS=7   # Admin session duration
NEXT_PUBLIC_APP_NAME=      # Application display name
```

### Deployment Configuration
- **`vercel.json`** - Vercel deployment settings
- **`next.config.js`** - Next.js configuration
- **`drizzle.config.ts`** - Database toolkit configuration
- **Edge runtime optimization** for serverless deployment

---

## 🔄 Data Flow

### User Token Request Flow
1. User authenticates with key via `/api/login`
2. JWT session created and stored as HTTPOnly cookie
3. User requests token via `/api/token`
4. System checks rate limiting (20-minute cooldown)
5. If allowed, assigns next available token from pool
6. Creates delivery audit record
7. Returns token to user

### Admin Token Upload Flow
1. Admin authenticates with secret via `/api/admin/login`
2. Admin uploads tokens via `/api/admin/upload-tokens`
3. System validates and processes token list
4. Tokens added to pool for distribution
5. Statistics updated in real-time

---

## 📈 System Architecture

### Database Design Patterns
- **UUID primary keys** for distributed system compatibility
- **Soft deletion** via is_active flags
- **Audit trails** via deliveries table
- **Optimistic locking** for race condition prevention
- **Database indexes** for performance optimization

### API Design Patterns
- **RESTful endpoints** with consistent naming
- **Standardized error responses** via response utilities
- **Request validation** with Zod schemas
- **Middleware-based authentication** for route protection

### Frontend Patterns
- **App Router** with server-side rendering
- **Component composition** with TypeScript
- **Responsive design** with Tailwind CSS
- **Progressive enhancement** for better UX

---

*Generated on: 2025-10-02*  
*Project: Key Token App v0.1.0*
