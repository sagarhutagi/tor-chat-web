# 🚀 Deployment Guide

This guide will help you deploy your Encrypted Chat application to production.

## Prerequisites

- Node.js 16+ and npm
- A Supabase project with configured database
- Your PGP keys ready
- Domain name (optional but recommended)

## Pre-Deployment Checklist

- [ ] Update `CONFIG` in `app.js` with your Supabase credentials
- [ ] Test the application locally
- [ ] Verify database setup is complete
- [ ] Generate your PGP keys
- [ ] Test encryption/decryption functionality
- [ ] Verify all features work as expected

## Deployment Options

### 1. Static Hosting (Recommended)

#### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize your site
netlify init

# Deploy to production
netlify deploy --prod
```

**Environment Variables in Netlify:**
- Go to Site Settings → Environment Variables
- Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`

#### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Environment Variables in Vercel:**
- Go to Project Settings → Environment Variables
- Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`

#### GitHub Pages

```bash
# Create a gh-pages branch
git checkout -b gh-pages

# Push to GitHub
git push origin gh-pages

# Enable GitHub Pages in repository settings
# Settings → Pages → Source: gh-pages branch
```

### 2. VPS/Cloud Hosting

#### Using nginx

```bash
# Install nginx
sudo apt install nginx

# Copy files to web root
sudo cp -r * /var/www/html/

# Configure nginx
sudo nano /etc/nginx/sites-available/encrypted-chat
```

**nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Add security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/encrypted-chat /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

#### Using Apache

```bash
# Install Apache
sudo apt install apache2

# Enable mod_rewrite
sudo a2enmod rewrite

# Copy files
sudo cp -r * /var/www/html/

# Restart Apache
sudo systemctl restart apache2
```

### 3. Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```

Build and run:
```bash
docker build -t encrypted-chat .
docker run -d -p 80:80 --name encrypted-chat encrypted-chat
```

## Security Considerations

### HTTPS Configuration

**Using Let's Encrypt (Certbot):**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### Security Headers

Add these headers to your web server configuration:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';" always;
```

### Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Environment Configuration

### Production Environment Variables

Create `.env.production`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
MESSAGE_POLL_INTERVAL=5000
```

### Hardening Supabase

1. **Enable Row Level Security (RLS)**
   - Already included in `supabase-setup.sql`

2. **Restrict API Access**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your production domain to Site URL

3. **Enable Additional Security**
   - Go to Project Settings → API
   - Enable "Require SSL" for production

## Monitoring and Maintenance

### Log Monitoring

```bash
# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs (if using PM2)
pm2 logs encrypted-chat
```

### Backup Strategy

**Database Backup:**
```bash
# Use Supabase dashboard to create scheduled backups
# Or use pg_dump with connection string
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

### Performance Monitoring

Consider using:
- Google Analytics for user analytics
- Supabase Dashboard for database monitoring
- Uptime monitoring services (UptimeRobot, Pingdom)

## Tor Integration (Optional)

### Setting up Tor Hidden Service

1. **Install Tor**
```bash
sudo apt install tor
```

2. **Configure Hidden Service**
```bash
sudo nano /etc/tor/torrc
```

Add these lines:
```
HiddenServiceDir /var/lib/tor/hidden_service/
HiddenServicePort 80 127.0.0.1:80
```

3. **Restart Tor**
```bash
sudo systemctl restart tor
```

4. **Get your .onion address**
```bash
sudo cat /var/lib/tor/hidden_service/hostname
```

## Troubleshooting

### Common Issues

**CORS Errors:**
- Ensure your domain is added to Supabase allowed origins
- Check Content Security Policy headers

**Database Connection Issues:**
- Verify Supabase credentials are correct
- Check Supabase service status

**SSL Certificate Issues:**
- Ensure domain DNS is properly configured
- Check certbot logs: `sudo cat /var/log/letsencrypt/letsencrypt.log`

**Performance Issues:**
- Consider implementing caching
- Optimize database queries
- Use CDN for static assets

## Post-Deployment Steps

1. **Test All Features**
   - User registration
   - Message sending/receiving
   - Encryption/decryption
   - Mobile responsiveness

2. **Set Up Monitoring**
   - Configure uptime monitoring
   - Set up error tracking
   - Enable database backups

3. **Documentation**
   - Update README with deployment URL
   - Document any custom configurations
   - Create user guide if needed

4. **Security Audit**
   - Review security headers
   - Test for vulnerabilities
   - Verify SSL configuration

## Scaling Considerations

For high-traffic deployments:

1. **Load Balancing**
   - Use nginx as load balancer
   - Deploy multiple instances

2. **Database Optimization**
   - Add proper indexes
   - Consider read replicas
   - Implement connection pooling

3. **Caching Strategy**
   - Cache static assets
   - Consider Redis for session management

## Support

For deployment issues:
- Check application logs
- Review Supabase dashboard
- Consult hosting provider documentation
- Open GitHub issue with details

---

**Remember:** Always test thoroughly in a staging environment before deploying to production!