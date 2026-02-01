# Photo Storage System - Architecture Guide

## 🎯 Problem Solved
**আগে**: Photos database এ base64 format এ save হতো → database বড় হয়ে যেত → slow loading
**এখন**: Photos আলাদা files হিসেবে save হয় → database ছোট থাকে → fast loading → easy backup

---

## 📁 File Structure

```
/root/findateme/
├── uploads/
│   └── photos/
│       ├── a1b2c3d4_1704567890123.jpg    ← User 1's photo
│       ├── e5f6g7h8_1704567891234.jpg    ← User 2's photo
│       └── i9j0k1l2_1704567892345.png    ← User 3's photo
├── server.js                              ← Main server
├── photo-storage.js                       ← Photo handling module
└── ...
```

---

## 🔄 How It Works

### 1️⃣ Signup with Photo
```
User uploads photo (10MB max)
    ↓
Browser compresses to 512x512px, 85% quality
    ↓
Sent as base64 to server
    ↓
photo-storage.js:
  - Converts base64 → binary
  - Creates hash from email (a1b2c3d4)
  - Adds timestamp (1704567890123)
  - Saves as: /uploads/photos/a1b2c3d4_1704567890123.jpg
    ↓
Returns URL: /uploads/photos/a1b2c3d4_1704567890123.jpg
    ↓
Server saves URL in database (not base64!)
    ↓
Response sent to browser with photo URL
```

### 2️⃣ Login from Any Device
```
User logs in with email
    ↓
Server fetches profile from database
    ↓
Returns: { photo: "/uploads/photos/a1b2c3d4_1704567890123.jpg" }
    ↓
Browser loads: https://your-domain.com/uploads/photos/a1b2c3d4_1704567890123.jpg
    ↓
Nginx serves file from /root/findateme/uploads/photos/
    ↓
Photo displayed! ✅
```

### 3️⃣ Update Profile Photo
```
User selects new photo
    ↓
Browser compresses new photo
    ↓
Sent to server as base64
    ↓
photo-storage.js:
  - Gets old photo URL from database
  - Saves old photo URL to photo_history table
  - Deletes old photo file
  - Saves new photo as new file
  - Returns new URL
    ↓
Database updated with new URL
    ↓
Old photo backed up in history table
```

---

## 💻 Code Overview

### photo-storage.js
```javascript
// Main functions:

1. ensureUploadDir()
   - Creates /uploads/photos/ folder if doesn't exist
   - Called on server startup

2. savePhoto(email, base64Photo)
   - Input: email + base64 string
   - Process: 
     * Convert base64 → binary buffer
     * Generate hash from email (first 8 chars)
     * Add timestamp for uniqueness
     * Save file
   - Output: URL path like "/uploads/photos/abc12345_timestamp.jpg"

3. deletePhoto(photoPath)
   - Input: URL path like "/uploads/photos/old_photo.jpg"
   - Process: Delete file from disk
   - Used when: User updates photo

4. getPhotoUrl(filename)
   - Input: filename
   - Output: full URL path
```

### server.js Integration

**Registration endpoint** ([server.js#L807-L822](server.js#L807-L822)):
```javascript
// Old way (base64 in DB):
photo = "data:image/jpeg;base64,/9j/4AAQ..." // 500KB-2MB!

// New way (file + URL):
photoUrl = await photoStorage.savePhoto(email, photo);
// photoUrl = "/uploads/photos/abc12345_1704567890.jpg"
// Saves only ~50 bytes in DB instead of 500KB!
```

**Profile update endpoint** ([server.js#L925-L985](server.js#L925-L985)):
```javascript
// Check if updating photo
if (photo && photo.trim()) {
  // Get old photo
  const oldPhoto = await getOldPhotoFromDB();
  
  // Save old to history
  await saveToPhotoHistory(oldPhoto);
  
  // Delete old file
  await photoStorage.deletePhoto(oldPhoto);
  
  // Save new file
  photoUrl = await photoStorage.savePhoto(email, photo);
  
  // Update DB with new URL
  await updateDatabase(photoUrl);
}
```

---

## 🌐 URL Access Pattern

### Local Development:
```
Browser requests: http://localhost:3000/uploads/photos/abc12345_timestamp.jpg
Express static middleware serves from: /uploads/photos/abc12345_timestamp.jpg
```

### Production VPS:
```
Browser requests: https://your-domain.com/uploads/photos/abc12345_timestamp.jpg
    ↓
Nginx receives request
    ↓
Nginx config: location /uploads/ { alias /root/findateme/uploads/; }
    ↓
Nginx serves: /root/findateme/uploads/photos/abc12345_timestamp.jpg
    ↓
Photo delivered! ✅
```

---

## 📊 Database Schema

### Old Schema (Base64):
```sql
user_profiles:
  email: user@example.com
  photo: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ... (500KB-2MB per user!)
  
Total size for 1000 users: 500MB - 2GB 😱
```

### New Schema (File URLs):
```sql
user_profiles:
  email: user@example.com
  photo: /uploads/photos/abc12345_1704567890.jpg (50 bytes)
  
photo_history:
  email: user@example.com
  photo: /uploads/photos/old_abc12345_1704567890.jpg
  uploaded_at: 2024-01-06 12:34:56

Total DB size for 1000 users: ~50KB only! ✅
Actual photos in: /uploads/photos/ folder
```

---

## ✅ Benefits

### 1. Performance
- **Old**: Database query returns 2MB base64 → slow
- **New**: Database query returns 50 bytes URL → fast ⚡
- Browser caches photo files (not possible with base64)

### 2. Storage
- **Old**: 1000 users = 500MB-2GB database size
- **New**: 1000 users = 50KB database + 200MB files (separate)

### 3. Backup
- **Old**: Must backup entire database (huge!)
- **New**: Backup database (small) + backup /uploads folder separately

### 4. Scalability
- **Old**: Database gets slower as more users signup
- **New**: File system handles millions of files easily

### 5. Cross-Device
- **Old**: Base64 stored in localStorage → doesn't sync
- **New**: URL stored → loads same photo on any device

---

## 🔧 Maintenance

### View uploaded photos:
```bash
ls -lh /root/findateme/uploads/photos/
```

### Check upload folder size:
```bash
du -sh /root/findateme/uploads/
```

### Backup photos:
```bash
# Create compressed backup
tar -czf photos-backup-$(date +%Y%m%d).tar.gz /root/findateme/uploads/

# Copy to another server
scp photos-backup-*.tar.gz user@backup-server:/backups/
```

### Clean old history photos (optional):
```sql
-- Delete photo history older than 90 days
DELETE FROM photo_history WHERE uploaded_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

---

## 🐛 Troubleshooting

### Photo not loading?
```bash
# Check if file exists
ls -la /root/findateme/uploads/photos/abc12345_*.jpg

# Check Nginx config
nginx -t
systemctl status nginx

# Check file permissions
chmod 755 /root/findateme/uploads/photos/
```

### Upload not working?
```bash
# Check PM2 logs
pm2 logs dating-app --lines 50

# Check upload directory writable
ls -ld /root/findateme/uploads/

# Should show: drwxr-xr-x (755 permissions)
```

### Old base64 photos in database?
```sql
-- Check how many users still have base64 photos
SELECT COUNT(*) FROM user_profiles WHERE photo LIKE 'data:image%';

-- Optional: Clear old base64 (they'll re-upload)
UPDATE user_profiles SET photo = '' WHERE photo LIKE 'data:image%';
```

---

## 🎯 Summary

**আগে (Old System)**:
- Photos → base64 → database MEDIUMTEXT field
- Problem: database বড়, slow, backup কঠিন

**এখন (New System)**:
- Photos → compressed → separate files → URL in database
- Benefits: fast, scalable, easy backup, cross-device sync

**Result**: ✅ প্রতিটা user এর photo আলাদা file এ save হয় ✅ যেকোনো device থেকে access করা যায় ✅ Server fast থাকে
