# Domain Connection Guide

## 🌐 আপনার Domain কে VPS এর সাথে Connect করার সম্পূর্ণ Guide

---

## Step 1: আপনার Domain Provider এ যান

### Popular Domain Providers:
- Namecheap (namecheap.com)
- GoDaddy (godaddy.com)
- Hostinger (hostinger.com)
- Google Domains (domains.google.com)
- Cloudflare (cloudflare.com)

### DNS Management পাবেন কোথায়:

**Namecheap**:
1. Login করুন
2. Dashboard → Domain List
3. আপনার domain এর পাশে "Manage" click করুন
4. "Advanced DNS" tab select করুন

**GoDaddy**:
1. Login করুন
2. My Products → Domains
3. আপনার domain এ click → "Manage DNS"

**Hostinger**:
1. Login করুন
2. Domains → আপনার domain select করুন
3. DNS / Name Servers → "Manage"

---

## Step 2: DNS Records Update করুন

### Delete Old Records (যদি থাকে):
প্রথমে এই records গুলো delete করুন:
- পুরাতন A records (যেগুলো @ এবং www host এ আছে)
- পুরাতন CNAME records (যদি render.com বা অন্য service এর জন্য থাকে)

### Add New A Records:

**Record 1** (Root domain):
```
Type:       A
Host:       @ (or blank)
Value:      72.61.254.84
TTL:        3600 (or Automatic)
```

**Record 2** (WWW subdomain):
```
Type:       A
Host:       www
Value:      72.61.254.84
TTL:        3600 (or Automatic)
```

### Example (Namecheap):
```
Type    Host    Value           TTL
A       @       72.61.254.84    Automatic
A       www     72.61.254.84    Automatic
```

### Example (GoDaddy):
```
Type    Name    Value           TTL
A       @       72.61.254.84    1 Hour
A       www     72.61.254.84    1 Hour
```

---

## Step 3: Save এবং Wait করুন

1. **Save/Update** button click করুন
2. DNS propagation এ **5 minutes থেকে 24 hours** লাগতে পারে (সাধারণত 15-30 minutes)
3. Propagation check করতে পারেন:

### Check DNS Propagation:

**Method 1: Online Tool**
- Visit: https://www.whatsmydns.net/
- আপনার domain name টাইপ করুন
- Record Type: A
- Check করুন worldwide servers এ propagate হয়েছে কিনা

**Method 2: Terminal/Command Prompt**
```bash
# Mac/Linux:
dig your-domain.com

# Windows:
nslookup your-domain.com

# Expected result:
# your-domain.com.    3600    IN    A    72.61.254.84
```

**Method 3: Ping**
```bash
ping your-domain.com

# Expected result:
# PING your-domain.com (72.61.254.84): 56 data bytes
```

---

## Step 4: VPS এ Nginx Configure করুন

DNS propagate হওয়ার পর VPS এ আপনার domain setup করুন:

### SSH Login:
```bash
ssh root@72.61.254.84
```

### Edit Nginx Configuration:
```bash
nano /etc/nginx/sites-available/dating-app
```

### Replace `your-domain.com` with your actual domain:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # ← এখানে আপনার domain দিন

    client_max_body_size 15M;

    location /uploads/ {
        alias /root/findateme/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Test & Restart Nginx:
```bash
# Test configuration
nginx -t

# Should show: syntax is ok, test is successful

# Restart Nginx
systemctl restart nginx

# Check status
systemctl status nginx
```

---

## Step 5: Test Your Website

### Open in Browser:
```
http://your-domain.com
http://www.your-domain.com
```

আপনার dating website load হওয়া উচিত! ✅

---

## Step 6: Install SSL Certificate (HTTPS)

HTTP কাজ করার পর SSL certificate install করুন for HTTPS:

### Install Certbot:
```bash
apt install -y certbot python3-certbot-nginx
```

### Get SSL Certificate:
```bash
# Replace your-domain.com and your-email@example.com
certbot --nginx -d yourdomain.com -d www.yourdomain.com --email your-email@example.com --agree-tos --no-eff-email
```

### Questions দেখাবে:
1. **Email address**: আপনার email দিন (certificate renewal alert এর জন্য)
2. **Terms of Service**: Yes (Y)
3. **Share email with EFF**: No (N) - optional

### Success Message:
```
Congratulations! You have successfully enabled HTTPS on https://yourdomain.com
```

### Test Auto-Renewal:
```bash
certbot renew --dry-run
```

---

## Step 7: Update Your Website Config

যদি আপনার code এ hardcoded URL থাকে, update করুন:

### Check files:
```bash
cd /root/findateme
grep -r "render.com" .
grep -r "localhost:3000" .
```

### Update if found:
```bash
nano config.js  # or যেই file এ URL আছে

# Replace:
# const API_URL = "https://your-app.onrender.com";
# With:
# const API_URL = "https://yourdomain.com";
```

### Restart app:
```bash
pm2 restart dating-app
```

---

## Step 8: Final Testing

### ✅ Check These:
1. **HTTP → HTTPS Redirect**: http://yourdomain.com should redirect to https://yourdomain.com
2. **WWW → Non-WWW**: www.yourdomain.com should work
3. **Photos Loading**: Profile photos should load from your domain
4. **Signup/Login**: Test new user registration
5. **Messages**: Test sending messages
6. **Mobile**: Test on mobile browser

### Browser Developer Tools:
```
F12 → Console → Check for errors
F12 → Network → Check API calls
```

---

## 🔄 Remove Render.com Dependency

### Stop Render.com Service:
1. Login to render.com
2. Go to your app dashboard
3. Click "Suspend" or "Delete" service
4. Confirm deletion

### Update GitHub Repository (Optional):
আপনার GitHub repo থেকে এখন directly deploy করার দরকার নেই, কারণ VPS তে manually deploy করবেন।

```bash
# VPS থেকে code update করার command:
cd /root/findateme
git pull origin main
npm install --production
pm2 restart dating-app
```

---

## 📊 Monitoring

### Check Website Status:
```bash
# Check if app running
pm2 status

# View logs
pm2 logs dating-app --lines 50

# Check Nginx
systemctl status nginx

# Check SSL certificate
certbot certificates
```

### Monitor Disk Space:
```bash
df -h
du -sh /root/findateme/uploads/
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Domain not loading
```bash
# Check DNS propagation
dig your-domain.com

# Check Nginx running
systemctl status nginx

# Check app running
pm2 status

# Check firewall
ufw status
```

### Issue 2: SSL certificate failed
```bash
# Make sure port 80 and 443 open
ufw allow 80/tcp
ufw allow 443/tcp

# Try again
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Issue 3: Photos not loading
```bash
# Check upload directory
ls -la /root/findateme/uploads/photos/

# Check Nginx config
nginx -t

# Check permissions
chmod 755 /root/findateme/uploads/
```

### Issue 4: "502 Bad Gateway"
```bash
# App crashed? Restart it
pm2 restart dating-app

# Check logs
pm2 logs dating-app --lines 100

# Check if port 3000 used by app
netstat -tuln | grep 3000
```

---

## 🎯 Complete Setup Checklist

- [ ] DNS A records updated (@ and www)
- [ ] DNS propagated (checked with whatsmydns.net)
- [ ] Nginx configured with domain name
- [ ] Nginx restarted successfully
- [ ] Website loads on http://domain.com
- [ ] SSL certificate installed
- [ ] Website loads on https://domain.com
- [ ] HTTP redirects to HTTPS
- [ ] Photos loading from domain
- [ ] Signup/Login working
- [ ] Messages working
- [ ] Render.com service suspended/deleted
- [ ] PM2 running and monitoring app

---

## 📝 Final Notes

### Backup Domain:
যদি future এ domain provider change করতে হয়:
1. Transfer domain to new provider
2. Update DNS A records to 72.61.254.84
3. Wait for propagation
4. Done! App automatic কাজ করবে

### Multiple Domains:
একই VPS এ multiple domains use করতে পারেন:
```nginx
server {
    listen 80;
    server_name domain1.com www.domain1.com domain2.com www.domain2.com;
    # ... rest of config
}
```

### Subdomain:
Subdomain add করতে চাইলে (যেমন: api.yourdomain.com):
```
Type:   A
Host:   api
Value:  72.61.254.84
```

---

## ✅ Success!

এখন আপনার dating website আপনার নিজের domain এ চলছে! 🎉

- ✅ Custom domain
- ✅ HTTPS secure
- ✅ Fast loading
- ✅ Full control
- ✅ No Render.com dependency

পরবর্তী steps:
1. Regular backup setup করুন
2. Monitoring setup করুন (Uptime Robot, etc.)
3. Analytics add করুন (Google Analytics)
4. SEO optimize করুন
