# Google Cloud Authentication Setup for Company Employees on Vercel

## 🏢 Company Domain Authentication Setup

### Step 1: Google Cloud Console Configuration

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select your company project**
3. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Enable "Google+ API" or "People API"
   - Enable "Admin SDK API" (for company domain verification)

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Set these URLs (replace `your-app-name` with your actual Vercel app name):

   **For Production (Vercel):**
   ```
   Authorized JavaScript origins:
   - https://your-app-name.vercel.app
   - https://your-custom-domain.com (if you have one)

   Authorized redirect URIs:
   - https://your-app-name.vercel.app/auth/google/callback
   - https://your-custom-domain.com/auth/google/callback (if you have one)
   ```

   **For Development:**
   ```
   Authorized JavaScript origins:
   - http://localhost:4005
   - http://localhost:3002

   Authorized redirect URIs:
   - http://localhost:4005/auth/google/callback
   ```

### Step 2: Company Domain Restrictions (Optional but Recommended)

1. **In Google Cloud Console**:
   - Go to "APIs & Services" → "Credentials"
   - Click on your OAuth client ID
   - Under "Restrictions", you can add:
     - Authorized domains (your company domain)
     - User access restrictions

2. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "Internal" if you want only your company employees
   - Add your company domain
   - Fill in app information

## 🚀 Vercel Deployment Configuration

### Step 3: Environment Variables in Vercel

1. **Go to your Vercel dashboard**
2. **Select your project**
3. **Go to Settings → Environment Variables**
4. **Add these variables**:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_from_step_1
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_step_1

# Session Configuration - Generate a strong random string
SESSION_SECRET=your_super_secure_random_string_for_production

# Production URLs - Update with your actual Vercel URL
CLIENT_URL=https://your-app-name.vercel.app
SERVER_URL=https://your-app-name.vercel.app

# Environment
NODE_ENV=production

# Company Domain (for restricting access)
COMPANY_DOMAIN=your-company.com
```

### Step 4: Update Domain Restrictions

**What company domain should employees use to access?**
Please provide:
- Your company domain (e.g., "company.com")
- Any additional domains you want to allow
- Whether you want to restrict to specific email addresses

### Step 5: Vercel Build Configuration

I'll create a `vercel.json` file to ensure proper deployment:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/auth/(.*)",
      "dest": "/api/auth/$1"
    },
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## 🔒 Security Considerations

### For Company Use:
- **Domain Restrictions**: Only employees with company email can access
- **OAuth Consent**: Set to "Internal" for company-only access
- **Session Security**: Secure cookies with proper domain settings
- **HTTPS Only**: Force HTTPS in production

### Access Control Options:
1. **Domain-based**: Only @company.com emails
2. **Whitelist**: Specific email addresses only
3. **Hybrid**: Domain + specific external emails

## 🎯 Next Steps

1. **Provide your company domain**
2. **I'll update the authentication code** to restrict access
3. **Deploy to Vercel** with environment variables
4. **Test with company Google accounts**

## 📋 Checklist

- [ ] Google Cloud project created
- [ ] OAuth client ID configured with production URLs
- [ ] OAuth consent screen set to "Internal"
- [ ] Vercel environment variables configured
- [ ] Company domain restrictions added to code
- [ ] Vercel deployment successful
- [ ] Testing with company employees

## 🚀 Deployment Steps

### Step 6: Deploy to Vercel

1. **Connect GitHub to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**:
   - Framework Preset: **Next.js**
   - Root Directory: `.` (project root)
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Set Environment Variables** (Critical!):
   In Vercel Dashboard → Settings → Environment Variables, add:
   ```env
   GOOGLE_CLIENT_ID=your_actual_google_client_id
   GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
   SESSION_SECRET=your_super_secure_random_production_secret
   CLIENT_URL=https://your-app-name.vercel.app
   SERVER_URL=https://your-app-name.vercel.app
   COMPANY_DOMAIN=your-company.com
   ALLOWED_EMAILS=admin1@company.com,admin2@company.com
   NODE_ENV=production
   VERCEL=1
   ```

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

### Step 7: Update Google OAuth URLs

After deployment, update your Google Cloud OAuth settings:

1. **Go back to Google Cloud Console**
2. **Update OAuth Client ID** with your new Vercel URL:
   ```
   Authorized JavaScript origins:
   - https://your-actual-vercel-url.vercel.app
   
   Authorized redirect URIs:
   - https://your-actual-vercel-url.vercel.app/auth/google/callback
   ```

### Step 8: Test Authentication

1. **Visit your Vercel URL**
2. **Test login with company Google account**
3. **Verify only company employees can access**

## 🛠️ Current Configuration

### Company Domain Restrictions
```javascript
// In middleware/auth.js
requireCompanyDomain - Checks user's email domain
Environment: COMPANY_DOMAIN=celigo.com
Fallback: ALLOWED_EMAILS for exceptions
```

### Production URLs
```javascript
// Automatic URL detection:
- Development: http://localhost:4005
- Production: Uses VERCEL_URL or CLIENT_URL
- CORS: Handles multiple origins automatically
```

## 🔍 Troubleshooting

### Common Issues:
1. **OAuth Error**: Update Google Cloud redirect URLs with exact Vercel URL
2. **CORS Error**: Check environment variables are set correctly
3. **Session Issues**: Ensure SESSION_SECRET is set in Vercel
4. **Company Access**: Verify COMPANY_DOMAIN matches user's email domain

### Debug Endpoints:
- `/auth/company-info` - Shows domain restrictions
- `/auth/user` - Shows current auth status
- `/auth/test` - Tests company domain access

---

## 🎯 Final Checklist

- [ ] Google Cloud OAuth configured with production URLs
- [ ] Vercel environment variables set
- [ ] Company domain specified (COMPANY_DOMAIN)
- [ ] OAuth consent screen set to "Internal" 
- [ ] Deployment successful
- [ ] Company employees can login
- [ ] Non-company users blocked

**What's your company domain?** I'll update the authentication middleware to restrict access to your employees only.
