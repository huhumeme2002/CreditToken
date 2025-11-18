# 🌐 Domain Setup Guide: tokencursor.io.vn

## 📋 Overview
This guide helps you set up the custom domain `tokencursor.io.vn` for your Key Token application.

## 🚀 Step 1: Vercel Domain Configuration

### 1.1 Access Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and login
2. Select your **backup** project
3. Navigate to **Settings** → **Domains**

### 1.2 Add Custom Domain
1. Click **Add Domain**
2. Enter: `tokencursor.io.vn`
3. Click **Add**
4. Optionally add `www.tokencursor.io.vn` as well

### 1.3 Configure DNS Records
Add these DNS records to your domain provider:

**For root domain:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Alternative (if CNAME at root not supported):**
```
Type: A
Name: @
Value: 76.76.19.61

Type: AAAA
Name: @
Value: 2600:1f14:f0b:5d00::1
```

## 🔧 Step 2: Update Environment Variables

### 2.1 Update .env.local (for development)
```env
DATABASE_URL=postgresql://neondb_owner:npg_f2mOrgZ1JGWI@ep-ancient-silence-adby4m41-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
ADMIN_SECRET=your-very-secure-admin-secret-here
RATE_LIMIT_MINUTES=20
ADMIN_SESSION_TTL_DAYS=7
NEXT_PUBLIC_APP_NAME=TokenCursor
NEXT_PUBLIC_DOMAIN=tokencursor.io.vn
```

### 2.2 Update Vercel Environment Variables
1. Go to Vercel Dashboard → **Settings** → **Environment Variables**
2. Add/Update these variables:
   - `NEXT_PUBLIC_APP_NAME` = `TokenCursor`
   - `NEXT_PUBLIC_DOMAIN` = `tokencursor.io.vn`
   - Ensure all other env vars are set (DATABASE_URL, JWT_SECRET, etc.)

## 🎨 Step 3: Update App Branding (Optional)

### 3.1 Update App Layout
The app will automatically use the new `NEXT_PUBLIC_APP_NAME` value.

### 3.2 Update Meta Tags
Consider updating:
- Page titles
- Meta descriptions
- Open Graph tags
- Favicon

## 🔐 Step 4: Security Configuration

### 4.1 Update Allowed Origins
✅ **Already configured** in `next.config.js`:
```javascript
allowedOrigins: [
  'localhost:3000',
  'tokencursor.io.vn', 
  'www.tokencursor.io.vn'
]
```

### 4.2 SSL Certificate
Vercel automatically provides SSL certificates for custom domains.

## 📋 Step 5: Testing & Verification

### 5.1 DNS Propagation Check
Use tools like:
- [dnschecker.org](https://dnschecker.org)
- `nslookup tokencursor.io.vn`

### 5.2 SSL Check
- Visit `https://tokencursor.io.vn`
- Verify SSL certificate is valid
- Check for mixed content warnings

### 5.3 Functionality Test
1. **Admin Panel:** `https://tokencursor.io.vn/admin/login`
2. **User Login:** `https://tokencursor.io.vn/login`
3. **Token Generation:** Test with valid keys
4. **API Endpoints:** Verify all work correctly

## ⚠️ Troubleshooting

### DNS Issues
- **Propagation Time:** DNS changes can take 24-48 hours
- **TTL:** Check TTL values on DNS records
- **Verification:** Use `dig` or `nslookup` commands

### SSL Issues
- **Certificate:** Vercel auto-provisions Let's Encrypt certificates
- **Mixed Content:** Ensure all resources use HTTPS
- **HSTS:** Consider enabling HTTP Strict Transport Security

### Application Issues
- **Environment Variables:** Verify all env vars are set in Vercel
- **Allowed Origins:** Check Next.js configuration
- **CORS:** Verify API calls work from new domain

## 🎯 Post-Setup Checklist

- [ ] Domain added to Vercel
- [ ] DNS records configured
- [ ] SSL certificate active
- [ ] Environment variables updated
- [ ] Application accessible at new domain
- [ ] Admin panel functional
- [ ] Token generation working
- [ ] All API endpoints responding correctly

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify DNS propagation status
3. Test with different browsers/devices
4. Check browser console for errors

---

**🎉 Once completed, your application will be accessible at: https://tokencursor.io.vn**
