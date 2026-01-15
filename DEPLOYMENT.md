# 🚀 DEPLOYMENT GUIDE
## From Laptop to Production

---

## Quick Deploy Options

### Option 1: Local Demo (Best for Stakeholder Meetings)
**Time**: 2 minutes  
**Requirements**: Just a web browser

```bash
# Simply open index.html in your browser
open index.html
```

**Pros**:
- No setup required
- Works offline
- No dependencies

**Cons**:
- No backend API features
- Can't share with remote attendees

---

### Option 2: Simple HTTP Server (Best for Testing)
**Time**: 5 minutes  
**Requirements**: Python installed

```bash
# Navigate to project folder
cd hardware_cost_estimator_mvp

# Start server
python -m http.server 8080

# Open browser to:
http://localhost:8080
```

**Pros**:
- Quick setup
- Local network sharing
- Full feature access

**Cons**:
- Still local only
- No persistence

---

### Option 3: Heroku Deploy (Best for Sharing)
**Time**: 15 minutes  
**Requirements**: Heroku account (free tier works)

```bash
# Install Heroku CLI
# Mac: brew install heroku/brew/heroku
# Windows: Download from heroku.com

# Login
heroku login

# Create app
heroku create your-app-name

# Create Procfile
echo "web: python -m http.server $PORT" > Procfile

# Deploy
git init
git add .
git commit -m "Initial deploy"
git push heroku main

# Open in browser
heroku open
```

**Pros**:
- Public URL you can share
- Free tier available
- HTTPS included

**Cons**:
- Requires Heroku account
- Free tier sleeps after inactivity

---

### Option 4: Netlify Deploy (Best for Permanent Demo)
**Time**: 5 minutes  
**Requirements**: GitHub account

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Hardware Cost Estimator MVP"
git remote add origin your-repo-url
git push -u origin main
```

2. **Deploy on Netlify**:
- Go to https://netlify.com
- Click "New site from Git"
- Connect your GitHub repo
- Click "Deploy site"
- Get instant URL: `your-app.netlify.app`

**Pros**:
- Free forever
- Auto-deploy on git push
- Custom domain support
- Always-on (no sleeping)

**Cons**:
- Backend API needs separate deployment

---

### Option 5: Full Stack Deploy (Production Ready)

#### Frontend: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts
```

#### Backend: Railway.app
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

**Update frontend to point to backend**:
```javascript
// In app.js, replace API endpoint
const API_URL = 'https://your-backend.railway.app';
```

---

## Environment Variables

### For Backend Deployment

Create `.env` file:
```
# API Keys (get these for production)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Supplier API Keys
XOMETRY_API_KEY=your-key
FICTIV_API_KEY=your-key

# Database
DATABASE_URL=postgresql://...

# Environment
FLASK_ENV=production
PORT=5000
```

---

## Custom Domain Setup

### 1. Purchase Domain
- Namecheap, GoDaddy, Google Domains
- Recommended: `your-company.ai` or `.io`

### 2. Configure DNS (Example: Netlify)
```
Type    Name    Value
A       @       75.2.60.5
CNAME   www     your-app.netlify.app
```

### 3. Enable HTTPS
- Netlify/Vercel handle this automatically
- Free SSL certificate included

---

## Monitoring & Analytics

### Add Google Analytics
```html
<!-- In <head> of index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Add Error Tracking (Sentry)
```html
<script src="https://browser.sentry-cdn.com/7.0.0/bundle.min.js"></script>
<script>
  Sentry.init({
    dsn: 'your-sentry-dsn',
    environment: 'production'
  });
</script>
```

---

## Performance Optimization

### 1. Compress Assets
```bash
# Minify JavaScript
npm install -g terser
terser app.js -o app.min.js

# Update index.html
<script src="app.min.js"></script>
```

### 2. Enable Caching
```javascript
// In backend.py, add headers:
@app.after_request
def add_header(response):
    response.cache_control.max_age = 3600
    return response
```

### 3. CDN for Three.js
Already using CDN in index.html ✅

---

## Security Checklist

- [ ] Enable HTTPS (automatic on Netlify/Vercel)
- [ ] Add Content Security Policy headers
- [ ] Sanitize file uploads (check file type, size)
- [ ] Rate limit API endpoints (prevent abuse)
- [ ] Add CORS restrictions (backend)
- [ ] Environment variables for secrets (never commit .env)
- [ ] Regular dependency updates (npm audit, pip-audit)

---

## Backup & Recovery

### Backup Code
```bash
# Push to GitHub (backup + version control)
git remote add backup https://github.com/your-backup-repo
git push backup main
```

### Backup Data (Future)
```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup.sql

# Upload to S3/Cloud Storage
aws s3 cp backup.sql s3://your-bucket/backups/
```

---

## Scaling Considerations

### When you hit 1,000 users:
- Add Redis for caching geometry analyses
- Use PostgreSQL for user data
- Implement job queue (Celery) for long-running analyses
- Add CDN (Cloudflare) for global performance

### When you hit 10,000 users:
- Kubernetes for container orchestration
- Load balancer for multiple backend instances
- Dedicated AI inference servers (GPU-enabled)
- Microservices architecture (separate geometry, cost, AI services)

---

## Cost Estimation (Infrastructure)

### Free Tier (MVP Demo)
- Netlify: Free
- Backend: Railway free tier ($5 credit)
- **Total: $0-5/month**

### Paid Tier (Beta Launch)
- Netlify Pro: $19/month
- Railway: $20/month (backend)
- Database: $15/month (Supabase/Railway)
- **Total: ~$54/month**

### Production (100+ users)
- Vercel Pro: $20/month
- Railway: $50/month
- Database: $50/month (managed PostgreSQL)
- OpenAI API: $100-500/month (usage-based)
- **Total: ~$220-620/month**

---

## Testing Before Stakeholder Demo

### Checklist:
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on mobile device (iPhone, Android)
- [ ] Test with 5+ different STL files
- [ ] Test all material options
- [ ] Test on different screen sizes
- [ ] Test with slow internet connection
- [ ] Have backup files ready
- [ ] Take screenshots of successful analyses

### Load Testing
```bash
# Install Apache Bench
brew install apache bench

# Test backend
ab -n 1000 -c 10 http://localhost:5000/health
```

---

## Common Deployment Issues

### Issue: Three.js not loading
**Fix**: Check CDN URLs, ensure HTTPS if deploying to HTTPS site

### Issue: CORS errors with backend
**Fix**: Add CORS headers in backend.py (already included in MVP)

### Issue: Large STL files timeout
**Fix**: Increase request size limit in backend:
```python
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
```

### Issue: Heroku app sleeps
**Fix**: Upgrade to paid tier OR use UptimeRobot to ping every 5 min

---

## Investor-Specific Deployment

### Create Dedicated Demo Instance
```bash
# Deploy to: investor-demo.your-company.ai
# Pre-load impressive example analyses
# Add custom "Welcome [Investor Name]" header
```

### Track Investor Engagement
```javascript
// Add event tracking
gtag('event', 'investor_demo_view', {
  'investor_name': 'Sequoia Capital',
  'timestamp': new Date()
});
```

---

## Maintenance Schedule

### Daily:
- Check error logs (Sentry)
- Monitor uptime (UptimeRobot)

### Weekly:
- Review user analytics
- Check API rate limits
- Update material prices

### Monthly:
- Update dependencies (security patches)
- Review and optimize costs
- Backup database

---

**Ready to deploy? Choose your path and follow the steps. Good luck! 🚀**

*Last updated: January 15, 2026*
