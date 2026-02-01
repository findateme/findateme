# Complete VPS Setup Guide for Dating Website

## আপনার VPS তথ্য
- **IP Address**: 72.61.254.84
- **Server**: Hostinger KVM 2
- **OS**: Ubuntu 24.04.3 LTS
- **Domain**: (যেটি আপনি connect করতে চান)

---

## ✅ Already Completed (Step 1-4)
1. ✅ VPS Access: `ssh root@72.61.254.84`
2. ✅ System Update: `apt update && apt upgrade -y`
3. ✅ Essential Tools: curl, wget, git, nano, ufw, fail2ban, unzip installed
4. ✅ Node.js v20.20.0 & npm v10.8.2 installed

---

## 📋 Next Steps (5-11)

### Step 5: Install MySQL
```bash
# Install MySQL server
apt install -y mysql-server

# Secure MySQL installation
mysql_secure_installation
# - Set root password: পছন্দের একটা strong password দিন
# - Remove anonymous users: Yes
# - Disallow root login remotely: Yes
# - Remove test database: Yes
# - Reload privilege tables: Yes

# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE dating_app;
CREATE USER 'datingapp'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON dating_app.* TO 'datingapp'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 6: Clone Your Code
```bash
# Go to home directory
cd /root

# Clone from GitHub
git clone https://github.com/findateme/findateme.git
cd findateme

# Install dependencies
npm install --production
```

### Step 7: Create Environment File
```bash
# Create .env file
nano .env
```

**.env file content** (এই values গুলো paste করুন):
```env
# Server
PORT=3000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_USER=datingapp
DB_PASSWORD=your_strong_password_here
DB_NAME=dating_app

# CORS
CORS_ORIGIN=*

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/root/findateme/uploads/photos
```

Save করুন: `Ctrl+X`, then `Y`, then `Enter`

### Step 8: Create Upload Directory
```bash
# Create uploads directory
mkdir -p /root/findateme/uploads/photos
chmod 755 /root/findateme/uploads
```

### Step 9: Install PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start your app
pm2 start server.js --name "dating-app"

# Setup PM2 to start on boot
pm2 startup systemd
pm2 save

# Check status
pm2 status
pm2 logs dating-app
```

### Step 10: Install & Configure Nginx
```bash
# Install Nginx
apt install -y nginx

# Create Nginx configuration
nano /etc/nginx/sites-available/dating-app
```

**Nginx config** (paste করুন, আপনার domain দিয়ে replace করুন):
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Increase body size for 10MB photos
    client_max_body_size 15M;

    # Serve uploaded photos
    location /uploads/ {
        alias /root/findateme/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Node.js app
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

```bash
# Enable the site
ln -s /etc/nginx/sites-available/dating-app /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 11: Configure Firewall
```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## 🌐 Domain Connection

### Step A: Update DNS Records (আপনার domain provider এ)
আপনার domain provider (যেমন: Namecheap, GoDaddy, Hostinger DNS) এ যান:

1. **DNS Management** section এ যান
2. এই A Records add করুন:

```
Type    Host    Value           TTL
A       @       72.61.254.84    3600
A       www     72.61.254.84    3600
```

3. Save করুন এবং 5-30 minutes wait করুন

### Step B: Check DNS Propagation
```bash
# আপনার local computer থেকে check করুন
ping your-domain.com

# অথবা online tool ব্যবহার করুন:
# https://www.whatsmydns.net/
```

### Step C: Install SSL Certificate (HTTPS)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (আপনার email এবং domain দিয়ে replace করুন)
certbot --nginx -d your-domain.com -d www.your-domain.com --email your-email@example.com --agree-tos --no-eff-email

# Auto-renewal test
certbot renew --dry-run
```

---

## 🔄 Photo Storage System

### How It Works Now:
1. **Signup**: User photo → compressed 512px → saved as file → URL stored in database
2. **Profile Update**: New photo → old photo deleted → new file saved → URL updated
3. **Login**: URL fetched from database → photo loaded from `/uploads/photos/filename.jpg`
4. **Cross-Device**: Same URL works on all devices because files stored on server

### File Structure:
```
/root/findateme/
├── uploads/
│   └── photos/
│       ├── abc12345_1704567890123.jpg
│       ├── def67890_1704567891234.jpg
│       └── ...
├── server.js
├── photo-storage.js
└── ...
```

### Advantages:
✅ প্রতিটা user এর photo আলাদা file
✅ Fast loading (no base64 decoding)
✅ Easy backup (শুধু uploads folder copy করুন)
✅ Any device থেকে same photo access
✅ Database size ছোট থাকে

---

## 🔧 Useful Commands

### Check App Status:
```bash
pm2 status
pm2 logs dating-app --lines 50
```

### Restart App:
```bash
pm2 restart dating-app
```

### Update Code from GitHub:
```bash
cd /root/findateme
git pull origin main
npm install --production
pm2 restart dating-app
```

### Check Nginx:
```bash
systemctl status nginx
nginx -t  # Test configuration
```

### Check MySQL:
```bash
systemctl status mysql
mysql -u root -p
```

### View Upload Directory:
```bash
ls -lh /root/findateme/uploads/photos/
du -sh /root/findateme/uploads/  # Check size
```

### Backup Photos:
```bash
# Create backup
tar -czf photos-backup-$(date +%Y%m%d).tar.gz /root/findateme/uploads/

# Download to local computer (from your computer)
scp root@72.61.254.84:/root/photos-backup-*.tar.gz ./
```

---

## ❗ Important Notes

1. **Security**:
   - Root password strong করুন
   - MySQL password strong করুন
   - SSH key-based authentication setup করুন (optional but recommended)

2. **Backup**:
   - Regular database backup করুন
   - `/root/findateme/uploads/` folder backup করুন

3. **Monitoring**:
   - `pm2 logs` regularly check করুন
   - Disk space monitor করুন: `df -h`

4. **Updates**:
   - GitHub এ code push করুন
   - VPS এ `git pull` করে update করুন
   - `pm2 restart dating-app` করুন

---

## 🎯 Next Action

**এখন কি করবেন:**

1. **Step 5 (MySQL Install)** দিয়ে শুরু করুন
2. একটা একটা করে step follow করুন
3. Domain এর DNS update করুন
4. SSL certificate install করুন

প্রতিটা step এ যদি কোনো problem হয়, আমাকে জানান!
