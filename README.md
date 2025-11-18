# Key Token App

Hệ thống quản lý key và phát token an toàn với Next.js 14, Drizzle ORM, và Neon Postgres.

## 🚀 Tính năng

### User Features
- **Đăng nhập bằng key**: User nhập key để truy cập hệ thống
- **Lấy token từ pool**: Nhận token được admin upload trước, mỗi token chỉ cấp 1 lần
- **Rate limiting**: Mỗi key chỉ được lấy token 1 lần / 20 phút
- **Realtime countdown**: Hiển thị thời gian còn lại nếu đang trong cooldown
- **Session management**: JWT cookie an toàn với HTTPOnly

### Admin Features  
- **Admin dashboard**: Quản lý hệ thống với secret key riêng
- **Upload tokens**: Upload hàng loạt token vào pool (textarea hoặc file)
- **Thống kê realtime**: Tokens còn lại, đã cấp, users active/expired
- **Quản lý keys**: Tạo, vô hiệu/kích hoạt keys user
- **Audit trail**: Theo dõi lịch sử cấp phát token

## 🏗️ Kiến trúc

- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Backend**: API Routes với Edge/Node runtime
- **Database**: Neon Postgres + Drizzle ORM (neon-http driver)
- **Auth**: JWT với jose, HTTPOnly cookies
- **Deployment**: Vercel với edge optimization

## 📦 Cài đặt

### 1. Tạo project Neon Database

1. Đăng ký tại [neon.tech](https://neon.tech)
2. Tạo database mới
3. Copy connection string (có dạng: `postgres://user:pass@host/db?sslmode=require`)

### 2. Setup Environment Variables

Tạo file `.env.local`:

```bash
DATABASE_URL="postgres://user:password@host/database?sslmode=require"
JWT_SECRET="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
ADMIN_SECRET="your-very-secure-admin-secret-here"
RATE_LIMIT_MINUTES="20"
ADMIN_SESSION_TTL_DAYS="7"
NEXT_PUBLIC_APP_NAME="Key Token App"
```

**Tạo JWT_SECRET**: Dùng lệnh sau để tạo hex 64 ký tự:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Cài đặt Dependencies

```bash
pnpm install
```

### 4. Database Setup

```bash
# Generate migration files
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed demo data
pnpm seed
```

### 5. Run Development Server

```bash
pnpm dev
```

Truy cập: http://localhost:3000

## 🧪 Demo Data

Sau khi seed, bạn có thể test với:

### User Login
- **Key hợp lệ**: `DEMO-KEY-VALID-1` (hết hạn sau 90 ngày)
- **Key hết hạn**: `DEMO-KEY-EXPIRED` (để test trường hợp expired)

### Admin Login
- **Admin Secret**: Sử dụng giá trị `ADMIN_SECRET` trong `.env.local`

### Demo Tokens
- Hệ thống được seed với 10 tokens mẫu (POOL-TOK-0001 đến POOL-TOK-0010)

## 🚀 Deploy lên Vercel

### 1. Kết nối Repository

1. Push code lên GitHub/GitLab
2. Import project vào Vercel
3. Chọn Next.js framework preset

### 2. Environment Variables

Trong Vercel Project Settings → Environment Variables, thêm:

```
DATABASE_URL=postgres://user:password@host/database?sslmode=require
JWT_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
ADMIN_SECRET=your-very-secure-admin-secret-here
RATE_LIMIT_MINUTES=20
ADMIN_SESSION_TTL_DAYS=7
NEXT_PUBLIC_APP_NAME=Key Token App
```

### 3. Deploy

1. Click **Deploy**
2. Sau khi deploy xong, chạy migration:
   - Vào Vercel Functions tab
   - Hoặc run locally: `pnpm db:migrate` với DATABASE_URL production
3. Seed data nếu cần: `pnpm seed`

### 4. Custom Domain (Optional)

1. Vào Domains tab trong Vercel project
2. Thêm custom domain
3. Cấu hình DNS theo hướng dẫn

## 📋 Database Schema

### Keys Table
```sql
CREATE TABLE keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_token_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Token Pool Table
```sql
CREATE TABLE token_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  assigned_to UUID REFERENCES keys(id),
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Deliveries Table (Audit)
```sql
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES keys(id),
  token_id UUID NOT NULL REFERENCES token_pool(id),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(token_id)
);
```

## 🔒 Bảo mật

### Rate Limiting
- Mỗi key có cooldown 20 phút giữa các lần lấy token
- Sử dụng database transaction để tránh race condition
- FOR UPDATE SKIP LOCKED để đảm bảo token uniqueness

### Authentication
- JWT tokens ký bằng HS256
- HTTPOnly cookies không thể truy cập từ JavaScript
- Secure + SameSite=Lax trong production
- Session timeout: 7 ngày (user), configurable (admin)

### CSRF Protection
- Yêu cầu header `X-Requested-With: XMLHttpRequest`
- Origin checking qua SameSite cookies
- No inline scripts (CSP)

### Input Validation
- Zod schema validation cho tất cả API inputs
- SQL injection protection qua Drizzle ORM
- XSS protection qua HTML escaping

## 🧪 Testing

```bash
# Run tất cả tests
pnpm test

# Run tests với watch mode
pnpm test:watch

# Type checking
pnpm type-check
```

### Test Coverage
- ✅ User login (valid/invalid/expired keys)
- ✅ Token generation (rate limiting, out of stock)
- ✅ Admin authentication & operations
- ✅ Concurrency/race conditions
- ✅ Session management

## 📡 API Endpoints

### User APIs
- `POST /api/login` - User đăng nhập
- `POST /api/logout` - User đăng xuất  
- `GET /api/me` - Thông tin user hiện tại
- `POST /api/token` - Lấy token (có rate limit)

### Admin APIs
- `POST /api/admin/login` - Admin đăng nhập
- `POST /api/admin/logout` - Admin đăng xuất
- `GET /api/admin/stats` - Thống kê hệ thống
- `POST /api/admin/upload-tokens` - Upload tokens hàng loạt
- `GET /api/admin/keys` - Danh sách keys
- `POST /api/admin/keys` - Tạo key mới
- `PATCH /api/admin/keys/[id]/toggle` - Bật/tắt key

## 🛠️ Scripts

```bash
# Development
pnpm dev              # Chạy dev server
pnpm build            # Build production
pnpm start            # Start production server

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Chạy migrations
pnpm db:push          # Push schema changes (dev only)
pnpm seed             # Seed demo data

# Quality
pnpm lint             # ESLint
pnpm type-check       # TypeScript checking
pnpm test             # Run tests
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test kết nối database
node -e "const { neon } = require('@neondatabase/serverless'); const sql = neon('YOUR_DATABASE_URL'); sql\`SELECT 1\`.then(console.log)"
```

### JWT Secret Issues
- Đảm bảo JWT_SECRET đúng 64 ký tự hex
- Regenerate nếu cần: `openssl rand -hex 32`

### Migration Issues
```bash
# Reset migrations (cẩn thận - mất data!)
rm -rf drizzle/
pnpm db:generate
pnpm db:migrate
```

### Rate Limiting Test
```bash
# Kiểm tra cooldown working
curl -X POST http://localhost:3000/api/token \
  -H "Content-Type: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

## 📝 Changelog

### v1.0.0
- ✨ User authentication với key-based login
- ✨ Token pool system với FIFO distribution  
- ✨ Rate limiting 20 phút với realtime countdown
- ✨ Admin dashboard với stats và key management
- ✨ Bulk token upload functionality
- ✨ Edge-optimized deployment cho Vercel
- ✨ Comprehensive test suite
- ✅ Production-ready security features

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết.

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

## 📞 Support

Nếu gặp vấn đề, hãy tạo issue trên GitHub repository này.

---

**Made with ❤️ using Next.js 14, Drizzle ORM, and Neon Postgres**
