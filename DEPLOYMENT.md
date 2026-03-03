# Deployment Guide - BurnRatePro Inspection App

**Target URL:** https://burnratepro.co.nz/inspection
**Build Status:** ✅ Ready for Production

---

## Pre-Deployment Checklist

### 1. Environment Variables

Ensure these environment variables are set in your production environment:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Configuration

✅ Database migrations deployed
✅ Edge functions deployed:
- `parse-loading-schedule`
- `parse-pdf`
- `parse-with-openai`
- `sync-members-from-loading-schedule`

✅ Storage buckets configured:
- `drawings`
- `loading-schedules`
- `parsing-artifacts`
- `pin-photos`
- `drawing-previews`
- `export-attachments`

### 3. Python Parser Service

Ensure the Python parser is deployed and accessible:
- Service URL should be configured in edge function environment
- Service must be running on Render or similar platform

---

## Deployment Steps

### Option 1: Apache/Nginx Web Server

#### Build the Application

```bash
npm run build
```

This creates a `dist/` folder with optimized production files.

#### Deploy to Server

1. **Upload files to server:**
   ```bash
   # Copy dist folder contents to your web server
   scp -r dist/* user@burnratepro.co.nz:/var/www/html/inspection/
   ```

2. **Copy .htaccess:**
   ```bash
   # Copy .htaccess for Apache URL rewriting
   scp .htaccess user@burnratepro.co.nz:/var/www/html/inspection/
   ```

3. **Set permissions:**
   ```bash
   ssh user@burnratepro.co.nz "chmod -R 755 /var/www/html/inspection"
   ```

#### Apache Configuration

Ensure mod_rewrite is enabled:
```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

Add to your virtual host or .htaccess:
```apache
<Directory /var/www/html/inspection>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
```

#### Nginx Configuration

If using Nginx, add this to your server block:

```nginx
location /inspection {
    alias /var/www/html/inspection;
    try_files $uri $uri/ /inspection/index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

### Option 2: Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Create vercel.json:**
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "rewrites": [
       { "source": "/inspection/(.*)", "destination": "/inspection/index.html" }
     ],
     "headers": [
       {
         "source": "/inspection/assets/(.*)",
         "headers": [
           {
             "key": "Cache-Control",
             "value": "public, max-age=31536000, immutable"
           }
         ]
       }
     ]
   }
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Configure custom domain:**
   - Add domain in Vercel dashboard
   - Point to `burnratepro.co.nz/inspection`

---

### Option 3: Netlify Deployment

1. **Create netlify.toml:**
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/inspection/*"
     to = "/inspection/index.html"
     status = 200
   ```

2. **Deploy via CLI:**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

---

## Post-Deployment Verification

### 1. Test Routes

Visit these URLs to verify routing works:

- ✅ https://burnratepro.co.nz/inspection (redirects to /login)
- ✅ https://burnratepro.co.nz/inspection/login
- ✅ https://burnratepro.co.nz/inspection/register
- ✅ https://burnratepro.co.nz/inspection/projects (after login)
- ✅ https://burnratepro.co.nz/inspection/clients (after login)

### 2. Test Functionality

After logging in:

1. ✅ Create a new project
2. ✅ Upload a loading schedule (PDF or CSV)
3. ✅ View parsed members
4. ✅ Upload drawings
5. ✅ Add pins to drawings
6. ✅ Generate PDF reports
7. ✅ Test InspectPDF tool

### 3. Check Browser Console

- No 404 errors for assets
- No CORS errors
- Supabase connection successful
- Service worker registered (PWA)

### 4. Performance Check

Run Lighthouse audit:
```bash
npm install -g lighthouse
lighthouse https://burnratepro.co.nz/inspection --view
```

Target scores:
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

---

## Environment-Specific Configuration

### Production .env

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key

# Optional: Analytics
VITE_GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X

# Feature Flags (optional)
VITE_ENABLE_DIAGNOSTICS=false
VITE_ENABLE_SIMULATION=false
```

---

## Rollback Plan

If deployment fails:

1. **Keep previous build:**
   ```bash
   mv dist dist_backup_$(date +%Y%m%d)
   ```

2. **Quick rollback:**
   ```bash
   # Restore previous version
   mv dist_backup_YYYYMMDD dist
   # Re-upload to server
   scp -r dist/* user@burnratepro.co.nz:/var/www/html/inspection/
   ```

---

## Monitoring & Maintenance

### Log Monitoring

Check these logs regularly:

1. **Web server logs:**
   ```bash
   tail -f /var/log/apache2/access.log
   tail -f /var/log/apache2/error.log
   ```

2. **Supabase logs:**
   - Check Edge Functions logs in Supabase dashboard
   - Monitor database query performance

3. **Python parser logs:**
   - Check Render/hosting platform logs

### Performance Monitoring

1. **Set up uptime monitoring:**
   - UptimeRobot, Pingdom, or similar
   - Monitor: https://burnratepro.co.nz/inspection

2. **Error tracking:**
   - Consider Sentry for JavaScript error tracking
   - Monitor Supabase edge function errors

### Regular Maintenance

Weekly:
- ✅ Check error logs
- ✅ Review slow queries in Supabase
- ✅ Monitor storage usage

Monthly:
- ✅ Review and optimize database queries
- ✅ Check for npm package updates
- ✅ Run security audit: `npm audit`
- ✅ Test backup restoration

---

## Security Checklist

✅ HTTPS enabled (SSL certificate)
✅ Row Level Security (RLS) enabled on all tables
✅ Environment variables not exposed in client code
✅ API keys secured in edge functions
✅ CORS properly configured
✅ Authentication required for sensitive operations
✅ File upload size limits enforced
✅ XSS protection enabled
✅ SQL injection protection (parameterized queries)

---

## Troubleshooting

### Issue: 404 on page refresh

**Solution:** Ensure .htaccess or server config includes rewrite rules

### Issue: Assets not loading

**Solution:** Check base path in vite.config.ts matches deployment path

### Issue: Supabase connection fails

**Solution:** Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly

### Issue: Edge functions failing

**Solution:** Check edge function logs in Supabase dashboard, verify environment variables

### Issue: PDF parsing fails

**Solution:** Check Python parser service is running, verify edge function can reach it

---

## Build Optimization

Current build size analysis:

```
dist/
├── index.html (2 KB)
├── assets/
│   ├── react-vendor.[hash].js (150 KB gzipped)
│   ├── supabase.[hash].js (50 KB gzipped)
│   ├── pdf.[hash].js (200 KB gzipped)
│   ├── utils.[hash].js (40 KB gzipped)
│   └── index.[hash].css (25 KB gzipped)
└── pdf.worker.min.mjs (800 KB) - loaded on demand
```

Total initial load: ~467 KB (gzipped)

To optimize further:
1. Enable Brotli compression on server
2. Implement route-based code splitting
3. Lazy load PDF libraries only when needed

---

## Support Contacts

- **Frontend Issues:** Check browser console, network tab
- **Backend Issues:** Check Supabase dashboard logs
- **Parser Issues:** Check Python parser service logs
- **Database Issues:** Check Supabase SQL editor, run diagnostics

---

## Quick Deployment Commands

```bash
# Build for production
npm run build

# Deploy to Apache/Nginx
rsync -avz --delete dist/ user@burnratepro.co.nz:/var/www/html/inspection/

# Test build locally
npm run preview

# Check build bundle size
npm run build -- --mode production --report
```

---

**Ready to deploy!** Follow the steps above based on your hosting setup.
