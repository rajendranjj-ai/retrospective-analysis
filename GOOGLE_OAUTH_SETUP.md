# Google OAuth Setup Guide

## 🚀 Setting up Google Authentication

### Step 1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** or **People API**
4. Go to **Credentials** in the left sidebar
5. Click **Create Credentials** → **OAuth client ID**
6. Choose **Web application**
7. Add these URLs:
   - **Authorized JavaScript origins**: `http://localhost:4005`
   - **Authorized redirect URIs**: `http://localhost:4005/auth/google/callback`

### Step 2: Create Environment Variables

Create a `.env` file in the project root with the following content:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here

# Session Configuration - Change this to a random secure string
SESSION_SECRET=your_super_secret_random_session_key_here

# Application URLs
CLIENT_URL=http://localhost:3002
SERVER_URL=http://localhost:4005

# Environment
NODE_ENV=development
```

### Step 3: Update Git Ignore

Make sure `.env` is in your `.gitignore` file to keep credentials secure.

### Step 4: Start the Application

1. Start the backend server:
   ```bash
   node server/index.js
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

## 🔧 Testing Authentication

1. Visit `http://localhost:3002`
2. You should see a login screen
3. Click "Continue with Google"
4. Complete Google OAuth flow
5. You should be redirected back to the dashboard

## 🛡️ Security Notes

- Never commit your `.env` file
- Use strong, random session secrets in production
- For production, update the authorized origins and redirect URIs
- Consider restricting access by email domain in `middleware/auth.js`

## 📊 Current Status

✅ Authentication backend implemented  
✅ Login/logout UI components created  
✅ Authentication state management  
✅ Protected routes and middleware  
🔲 Environment variables configuration (you need to do this)  
🔲 API route protection (optional - can be added later)  

## 🎯 What's Working

- **Login Flow**: Google OAuth authentication
- **Session Management**: User sessions with express-session
- **Protected Dashboard**: Only authenticated users can access
- **User Profile**: Shows user info and logout option
- **Authentication Context**: React context for auth state

## 🔄 Next Steps (Optional)

1. Add authentication to sensitive API routes
2. Add role-based access control
3. Add email domain restrictions
4. Add production deployment configuration
