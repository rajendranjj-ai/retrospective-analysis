# Vercel Deployment Guide

## Overview
This project has been converted from a standalone Node.js/Express server to use Vercel's serverless API routes for production deployment.

## What Was Changed

### 1. **API Routes Created**
- `app/api/summary/route.js` - Main dashboard data
- `app/api/questions/route.js` - Available questions list
- `app/api/releases/route.js` - Release data for charts
- `app/api/trends/[question]/route.js` - Trend analysis for specific questions
- `app/api/director-analysis/[question]/route.js` - Director-based analysis
- `app/api/export-ppt/route.js` - PowerPoint export for single question
- `app/api/export-all-ppt/route.js` - PowerPoint export for all questions

### 2. **Frontend Updated**
- Changed all API calls from `http://localhost:4005/api/*` to `/api/*`
- This makes the app work in both development and production

### 3. **Dependencies**
- `xlsx` - For reading Excel files
- `pptxgenjs` - For generating PowerPoint presentations
- All dependencies are already in `package.json`

## Deployment Steps

### 1. **Connect to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### 2. **Environment Variables**
No environment variables are required for basic functionality.

### 3. **Build Settings**
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## How It Works

### **Data Loading**
- API routes read Excel files from the `Retrospectives/` folder
- Data is processed server-side using the same logic as the original Express server
- Results are returned as JSON to the frontend

### **PowerPoint Export**
- Export functionality works through serverless functions
- Charts are disabled for stability (text-only output)
- Files are generated and returned as downloadable blobs

## Troubleshooting

### **Data Not Loading**
1. Check Vercel function logs for errors
2. Verify Excel files are in the `Retrospectives/` folder
3. Ensure file names contain "Retrospective" and end with `.xlsx`

### **Export Not Working**
1. Check function timeout limits (default: 10 seconds)
2. Large exports may need longer timeouts
3. Verify `pptxgenjs` dependency is installed

### **Performance Issues**
1. API routes have cold start delays
2. Consider using Vercel's Edge Runtime for faster responses
3. Large Excel files may cause memory issues

## Development vs Production

### **Development**
- Uses local Express server on port 4005
- Run with `npm run server`

### **Production**
- Uses Vercel serverless functions
- Automatically scales based on demand
- No server management required

## File Structure
```
app/
├── api/                    # Vercel API routes
│   ├── summary/
│   ├── questions/
│   ├── releases/
│   ├── trends/[question]/
│   ├── director-analysis/[question]/
│   ├── export-ppt/
│   └── export-all-ppt/
├── components/             # React components
├── globals.css            # Global styles
├── layout.tsx             # Root layout
└── page.tsx               # Main dashboard
```

## Benefits of Vercel Deployment

✅ **No Server Management** - Fully managed infrastructure
✅ **Automatic Scaling** - Handles traffic spikes automatically  
✅ **Global CDN** - Fast loading worldwide
✅ **Easy Updates** - Git-based deployments
✅ **Cost Effective** - Pay per usage
✅ **Built-in Analytics** - Performance monitoring

## Limitations

⚠️ **Cold Starts** - First request may be slower
⚠️ **Function Timeouts** - Limited execution time
⚠️ **Memory Limits** - Restricted memory allocation
⚠️ **File System** - Read-only access to uploaded files 