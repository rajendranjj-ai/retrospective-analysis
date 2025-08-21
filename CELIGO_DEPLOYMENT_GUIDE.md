# 🏢 Celigo Retrospective Analysis - Google Authentication Setup Guide

## 🎯 **Celigo-Specific Configuration**

Your application is configured to **only allow Celigo employees** with `@celigo.com` email addresses to access the retrospective analysis dashboard.

---

## 🚀 **Complete Deployment Steps**

### **Step 1: Google Cloud Console Setup**

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select a Celigo project**
3. **Enable Required APIs:**
   - Go to "APIs & Services" → "Library"
   - Enable **"Google+ API"** or **"People API"**
   - Enable **"Admin SDK API"** (for domain verification)

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose **"Web application"**
   - **Name:** `Celigo Retrospective Analysis`

### **Step 2: OAuth URLs Configuration**

**For Development:**
```
Authorized JavaScript origins:
- http://localhost:4005
- http://localhost:3002

Authorized redirect URIs:
- http://localhost:4005/auth/google/callback
```

**For Production (replace with your actual Vercel URL):**
```
Authorized JavaScript origins:
- https://your-celigo-app.vercel.app

Authorized redirect URIs:
- https://your-celigo-app.vercel.app/auth/google/callback
```

### **Step 3: OAuth Consent Screen**

1. **Go to "APIs & Services" → "OAuth consent screen"**
2. **Choose "Internal"** - This restricts access to Celigo organization only
3. **Fill in App Information:**
   - **App name:** `Celigo Retrospective Analysis`
   - **User support email:** Your Celigo email
   - **Developer contact:** Your Celigo email
4. **Add Celigo domain to authorized domains**

### **Step 4: Vercel Deployment**

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Import your GitHub repository**
3. **Configure Build Settings:**
   - Framework Preset: **Next.js**
   - Root Directory: `.` (project root)
   - Build Command: `npm run build`
   - Output Directory: `.next`

### **Step 5: Environment Variables in Vercel**

**In Vercel Dashboard → Settings → Environment Variables, add:**

```env
# Google OAuth (from Step 1)
GOOGLE_CLIENT_ID=your_google_client_id_from_console
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_console

# Session Security (generate a random 32+ character string)
SESSION_SECRET=your_super_secure_random_production_secret_here

# Celigo Domain Restriction
COMPANY_DOMAIN=celigo.com
ALLOWED_EMAILS=admin@celigo.com,special.external@partner.com

# URLs (update with your actual Vercel URL)
CLIENT_URL=https://your-celigo-app.vercel.app
SERVER_URL=https://your-celigo-app.vercel.app

# Environment
NODE_ENV=production
VERCEL=1
```

### **Step 6: Deploy and Update OAuth URLs**

1. **Click "Deploy" in Vercel**
2. **After deployment, copy your Vercel URL**
3. **Go back to Google Cloud Console**
4. **Update OAuth Client ID with your Vercel URL:**
   ```
   Authorized JavaScript origins:
   - https://your-actual-vercel-url.vercel.app
   
   Authorized redirect URIs:
   - https://your-actual-vercel-url.vercel.app/auth/google/callback
   ```

---

## 🔐 **Security Features for Celigo**

### **Access Control:**
- ✅ **Only @celigo.com emails** can access the application
- ✅ **Google OAuth 2.0** with company verification
- ✅ **Internal OAuth consent** (Celigo employees only)
- ✅ **Secure session management** with HTTPS cookies
- ✅ **Two-tier protection**: Company domain + basic auth

### **API Protection Levels:**

**🏢 Celigo Admin Only:**
- File uploads (`/api/upload-release`)
- PowerPoint exports (`/api/export-all-ppt`, `/api/export-ppt`)
- Data refresh operations (`/api/refresh`)

**👤 All Celigo Employees:**
- View question trends
- Access director analysis
- View retrospective data

**🚫 External Users:**
- Automatically blocked
- Cannot access any data
- Redirected to login with error message

---

## 🧪 **Testing Your Setup**

### **1. Local Testing:**
```bash
# Start your servers
node server/index.js    # Port 4005
npm run dev            # Port 3002

# Visit http://localhost:3002
# Click "Continue with Google"
# Test with your @celigo.com account
```

### **2. Production Testing:**
1. **Deploy to Vercel**
2. **Visit your Vercel URL**
3. **Test with Celigo Google account** - should work ✅
4. **Test with non-Celigo account** - should be blocked ❌

---

## 📊 **What Celigo Employees Will See**

### **Login Experience:**
1. **Professional login screen** with Celigo branding context
2. **"Continue with Google"** button
3. **Automatic redirect** to Google OAuth
4. **Company domain validation**
5. **Access to full dashboard** after authentication

### **Dashboard Access:**
- ✅ **Complete retrospective analysis**
- ✅ **All question categories and trends**
- ✅ **Director analysis and breakdowns**
- ✅ **Export capabilities** (for authorized users)
- ✅ **User profile with logout option**

### **Security Messages:**
- Non-Celigo users see: *"Access is restricted to @celigo.com users only"*
- Unauthorized API access: *"Authentication required"*

---

## 🔄 **Deployment Checklist**

- [ ] Google Cloud project created
- [ ] OAuth client ID configured
- [ ] OAuth consent screen set to "Internal"
- [ ] Vercel project created and configured
- [ ] Environment variables set in Vercel
- [ ] Application deployed successfully
- [ ] OAuth URLs updated with Vercel URL
- [ ] Tested with Celigo Google account ✅
- [ ] Verified non-Celigo users blocked ❌

---

## 🎉 **You're Ready to Go Live!**

Your Celigo retrospective analysis application is now:

✅ **Fully secured** with Google OAuth  
✅ **Restricted to Celigo employees**  
✅ **Production-ready** for Vercel deployment  
✅ **Enterprise-grade** authentication system  

**All Celigo employees can now access the retrospective analysis dashboard with their company Google accounts!**

---

## 📞 **Support**

If you need help with any step:
1. **Google Cloud OAuth issues** - Check the OAuth consent screen and authorized URLs
2. **Vercel deployment issues** - Verify environment variables are set correctly  
3. **Access issues** - Ensure users are signing in with @celigo.com accounts
4. **API errors** - Check that all environment variables match production URLs

The system will log detailed authentication information to help with troubleshooting.
