# Quick Deploy Guide - https://burnratepro.co.nz/inspection

## ✅ Ready to Deploy!

Your application is **built and ready** for production deployment.

---

## 🚀 Quick Deploy (5 minutes)

### Option 1: Automated Deploy Script

```bash
# Configure deployment settings
export DEPLOY_USER=your_ssh_username
export DEPLOY_HOST=burnratepro.co.nz
export DEPLOY_PATH=/var/www/html/inspection

# Run deployment
./deploy.sh
```

### Option 2: Manual Deploy

```bash
# 1. Upload the package
scp burnratepro-inspection-production.tar.gz user@burnratepro.co.nz:/tmp/

# 2. SSH to server
ssh user@burnratepro.co.nz

# 3. Extract files
cd /var/www/html/inspection
tar -xzf /tmp/burnratepro-inspection-production.tar.gz

# 4. Set permissions
chmod -R 755 /var/www/html/inspection

# Done!
```

---

## 📋 What's Configured

✅ **Base URL:** `/inspection/`
✅ **Router:** Configured with basename="/inspection"
✅ **Build:** Production-optimized (4.1 MB total, ~1.2 MB gzipped)
✅ **.htaccess:** Included for Apache URL rewriting
✅ **Code splitting:** React, Supabase, PDF, Utils chunks
✅ **Service Worker:** PWA support enabled
✅ **Assets:** Optimized and cached

---

## 🔧 Server Requirements

### Apache (Recommended)
- Mod_rewrite enabled
- AllowOverride All
- .htaccess support

### Nginx
Add to your server block:
```nginx
location /inspection {
    alias /var/www/html/inspection;
    try_files $uri $uri/ /inspection/index.html;
}
```

---

## 🌐 Test Your Deployment

After deploying, test these URLs:

1. **Landing:** https://burnratepro.co.nz/inspection
2. **Login:** https://burnratepro.co.nz/inspection/login
3. **Register:** https://burnratepro.co.nz/inspection/register
4. **Dashboard:** https://burnratepro.co.nz/inspection/ (after login)

All routes should work without 404 errors.

---

## 🔐 Environment Variables

Make sure your `.env` file contains:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

These are **already baked into the build** - no server-side env needed!

---

## 📦 Package Contents

```
burnratepro-inspection-production.tar.gz (1.2 MB)
├── index.html
├── manifest.json
├── sw.js
├── pdf.worker.min.mjs
├── .htaccess
└── assets/
    ├── index-[hash].js (main app)
    ├── react-vendor-[hash].js
    ├── supabase-[hash].js
    ├── pdf-[hash].js
    ├── utils-[hash].js
    └── index-[hash].css
```

---

## ⚡ Performance

**Initial Load:**
- React + Router: 178 KB (58 KB gzipped)
- Supabase: 126 KB (34 KB gzipped)
- Utils: 325 KB (108 KB gzipped)
- PDF libs: 966 KB (339 KB gzipped) - lazy loaded
- CSS: 59 KB (10 KB gzipped)

**Total first load:** ~467 KB gzipped

---

## 🛠️ Troubleshooting

### Issue: "Cannot GET /inspection/projects"
**Fix:** Ensure .htaccess is deployed and mod_rewrite is enabled

### Issue: Assets return 404
**Fix:** Check that base path matches: `/inspection/`

### Issue: Blank page
**Fix:** Check browser console for errors, verify SUPABASE env vars

### Issue: "Failed to fetch"
**Fix:** Check Supabase URL is correct, verify CORS settings

---

## 🔄 Update Workflow

When you make changes:

```bash
# 1. Make your changes
# 2. Test locally
npm run dev

# 3. Build for production
npm run build

# 4. Deploy
./deploy.sh
```

---

## 📊 Monitor After Deploy

1. **Check server logs:**
   ```bash
   tail -f /var/log/apache2/access.log
   tail -f /var/log/apache2/error.log
   ```

2. **Test critical paths:**
   - Login ✓
   - Create project ✓
   - Upload loading schedule ✓
   - Upload drawings ✓
   - Generate PDF ✓

3. **Performance check:**
   ```bash
   lighthouse https://burnratepro.co.nz/inspection
   ```

---

## 🆘 Need Help?

**Common commands:**

```bash
# Rebuild
npm run build

# Test build locally
npm run preview
# Then visit: http://localhost:4173/inspection

# Check build size
npm run build -- --report

# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

---

## ✨ You're Ready!

Your production build is complete and ready to deploy to:
**https://burnratepro.co.nz/inspection**

Run `./deploy.sh` to get started! 🚀
