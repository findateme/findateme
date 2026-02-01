# ✅ Environment Configuration & Payment Update - Complete

## 🔧 যা যা Fix করা হয়েছে

### 1. **Environment Variables (.env.production)**
```env
# Application
APP_URL=https://findateme.com
NODE_ENV=production
PORT=3000

# Database (Hostinger)
DB_HOST=srv1733.hstgr.io
DB_NAME=u999287469_DateMe
DB_USER=u999287469_date_me
DB_PASSWORD=Rafayat11799$

# Tatum API
TATUM_API_KEY=t-69604c801d8ded979d135068-97c96f6e7c6a426b99228729

# Payment - BEP20 Only (Binance Smart Chain)
BEP20_ADDRESS=0x82ec9da2a486c0875ce67710ab7b7ad3b0490ce3
USDT_BEP20_CONTRACT=0x55d398326f99059ff775485246999027b3197955

# Upgrade Tiers
UPGRADE_AMOUNT_BASIC=14    # Basic plan: $14 USDT
UPGRADE_AMOUNT_PREMIUM=30  # Premium plan: $30 USDT

# CORS
ALLOW_ORIGIN=https://findateme.com,https://www.findateme.com
```

### 2. **Payment Method Changes**

#### ❌ Removed (TRC20):
- TRC20 address removed
- TRON network support removed
- Verification function removed

#### ✅ Kept (BEP20 Only):
- **Network**: Binance Smart Chain (BEP20)
- **Address**: `0x82ec9da2a486c0875ce67710ab7b7ad3b0490ce3`
- **Contract**: `0x55d398326f99059ff775485246999027b3197955` (USDT)

### 3. **Upgrade Plans**

| Plan | Price | Features |
|------|-------|----------|
| **Basic** | $14 USDT | 10 profiles, 100 messages, basic features |
| **Premium** | $30 USDT | 100 profiles, 1000 messages, voice/video calls, priority matches |

### 4. **Files Updated**

#### **server.js**
```javascript
// Old (removed):
const TRC20_ADDRESS = process.env.TRC20_ADDRESS || "";
const USDT_TRC20_CONTRACT = process.env.USDT_TRC20_CONTRACT || "";
const UPGRADE_AMOUNT = Number(process.env.UPGRADE_AMOUNT || 14);

// New:
const BEP20_ADDRESS = process.env.BEP20_ADDRESS || "";
const USDT_BEP20_CONTRACT = process.env.USDT_BEP20_CONTRACT || "";
const UPGRADE_AMOUNT_BASIC = Number(process.env.UPGRADE_AMOUNT_BASIC || 14);
const UPGRADE_AMOUNT_PREMIUM = Number(process.env.UPGRADE_AMOUNT_PREMIUM || 30);
```

**Verification Logic:**
- Accepts both 14 USDT (Basic) and 30 USDT (Premium)
- Only BEP20 (Binance) transactions verified
- TRC20 verification function completely removed

#### **config.js**
```javascript
// Old:
window.API_BASE = "https://fin-date-me.onrender.com";
window.ADDR_TRC20 = "TCBFWrepuPqQWvdchhJ8RtQB9nTrn86cPb";
window.ADDR_BSC = "0x82ec9da2a486c0875ce67710ab7b7ad3b0490ce3";

// New:
window.API_BASE = "https://findateme.com";
window.ADDR_BEP20 = "0x82ec9da2a486c0875ce67710ab7b7ad3b0490ce3";
window.UPGRADE_AMOUNT_BASIC = 14;
window.UPGRADE_AMOUNT_PREMIUM = 30;
```

#### **profile-upgrade.html**
- Removed TRC20 payment section
- Removed TRC20 from network selector
- Updated text: "via BEP20 (Binance Smart Chain) network"
- Kept only BEP20 address display

---

## 📋 Deployment Checklist

### VPS এ Deploy করার সময়:

1. **Clone Repository**
```bash
cd /root
git clone https://github.com/findateme/findateme.git
cd findateme
```

2. **Create .env file** (VPS তে)
```bash
nano .env
```

**Paste করুন:**
```env
NODE_ENV=production
PORT=3000

APP_URL=https://findateme.com

DB_HOST=srv1733.hstgr.io
DB_USER=u999287469_date_me
DB_PASSWORD=Rafayat11799$
DB_NAME=u999287469_DateMe

CORS_ORIGIN=*
ALLOW_ORIGIN=https://findateme.com,https://www.findateme.com

SESSION_SECRET=dateme-secret-2026-findateme-production
JWT_SECRET=jwt-dateme-findateme-secure-token-2026

TATUM_API_KEY=t-69604c801d8ded979d135068-97c96f6e7c6a426b99228729

BEP20_ADDRESS=0x82ec9da2a486c0875ce67710ab7b7ad3b0490ce3
USDT_BEP20_CONTRACT=0x55d398326f99059ff775485246999027b3197955

UPGRADE_AMOUNT_BASIC=14
UPGRADE_AMOUNT_PREMIUM=30

MAX_FILE_SIZE=10485760
UPLOAD_DIR=/root/findateme/uploads/photos

DATEME_ADMIN_EMAIL=toki11799@gmail.com
```

Save: `Ctrl+X` → `Y` → `Enter`

3. **Install Dependencies**
```bash
npm install --production
```

4. **Create Upload Directory**
```bash
mkdir -p /root/findateme/uploads/photos
chmod 755 /root/findateme/uploads
```

5. **Start with PM2**
```bash
pm2 start server.js --name "dating-app"
pm2 save
```

---

## 🧪 Testing Payment System

### Test BEP20 Payment:

1. **Navigate to**: https://findateme.com/profile-upgrade.html
2. **Select Plan**: Choose Basic ($14) or Premium ($30)
3. **Select Payment**: Choose "Crypto Payment" → "USDT (Binance)"
4. **Network**: BEP20 (Binance Smart Chain) - automatically selected
5. **Address**: `0x82ec9da2a486c0875ce67710ab7b7ad3b0490ce3`
6. **Send USDT**: 
   - Basic: 14 USDT
   - Premium: 30 USDT
7. **Copy TXID**: After payment, copy transaction hash
8. **Verify**: Paste TXID in app and click "Confirm Upgrade"

### Expected Behavior:
- ✅ 14 USDT payment → Basic plan activated
- ✅ 30 USDT payment → Premium plan activated
- ❌ TRC20 payment → Rejected (not supported)
- ❌ Other amounts → Rejected

---

## 🔍 Verify Configuration

### Check Environment Variables (VPS):
```bash
cd /root/findateme
cat .env | grep -E "DB_HOST|BEP20|UPGRADE"
```

**Expected Output:**
```
DB_HOST=srv1733.hstgr.io
BEP20_ADDRESS=0x82ec9da2a486c0875ce67710ab7b7ad3b0490ce3
UPGRADE_AMOUNT_BASIC=14
UPGRADE_AMOUNT_PREMIUM=30
```

### Check Server Running:
```bash
pm2 status
pm2 logs dating-app --lines 20
```

### Check Database Connection:
```bash
mysql -h srv1733.hstgr.io -u u999287469_date_me -p'Rafayat11799$' u999287469_DateMe -e "SHOW TABLES;"
```

---

## 📊 Summary of Changes

| Item | Old | New |
|------|-----|-----|
| **API Base** | fin-date-me.onrender.com | findateme.com |
| **Database Host** | localhost | srv1733.hstgr.io |
| **Database Name** | dateme_database | u999287469_DateMe |
| **Payment Networks** | TRC20 + BEP20 | BEP20 only |
| **Upgrade Amounts** | 14 only | 14 (Basic) + 30 (Premium) |
| **TRC20 Address** | TCBFWrepuPqQ... | ❌ Removed |
| **BEP20 Address** | 0x82ec9da2... | ✅ Active |

---

## ✅ All Fixed Issues

1. ✅ **Environment variables** - Updated with correct Hostinger database credentials
2. ✅ **Payment method** - Removed TRC20, kept only BEP20 (Binance)
3. ✅ **Upgrade amounts** - Added support for both $14 (Basic) and $30 (Premium)
4. ✅ **API endpoint** - Changed from Render.com to findateme.com
5. ✅ **CORS settings** - Updated for findateme.com domain
6. ✅ **Missing configs** - Added all required environment variables
7. ✅ **Code pushed to GitHub** - All changes committed and pushed

---

## 🚀 Next Steps

1. **Complete VPS Setup** - Follow [VPS_COMPLETE_SETUP.md](VPS_COMPLETE_SETUP.md)
2. **Deploy to VPS** - Use steps mentioned above
3. **Connect Domain** - Follow [DOMAIN_CONNECTION_GUIDE.md](DOMAIN_CONNECTION_GUIDE.md)
4. **Test Payment** - Verify BEP20 USDT payment works
5. **Go Live** 🎉

---

## 📞 Support

যদি কোনো problem হয়:
1. `pm2 logs dating-app` দেখুন
2. Database connection test করুন
3. `.env` file এর values double-check করুন
4. Firewall rules check করুন: `ufw status`

All set! 🚀
