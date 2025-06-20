# 🔧 GrowEasy Netlify Debugging Guide

## ✅ **What I Just Fixed:**

1. **Module System Issues**: Converted from ES modules to CommonJS
2. **API Key Validation**: Added proper error handling for missing Claude API key
3. **File Path Issues**: Fixed business profile loading with multiple fallback paths
4. **Function Initialization**: Moved Claude client initialization inside handlers

## 🔍 **Next Steps - Check These in Order:**

### 1. **Environment Variable Setup** ⚠️ MOST LIKELY ISSUE
Go to your Netlify dashboard:
1. Site Settings → Environment Variables
2. Add: `CLAUDE_API_KEY` = `your_actual_api_key`
3. **Important**: After adding, redeploy the site

### 2. **Test Individual Functions**
Test each endpoint directly:

- **Health Check**: `https://your-site.netlify.app/.netlify/functions/health`
- **Claude Test**: `https://your-site.netlify.app/.netlify/functions/test-claude`

### 3. **Check Build Logs**
In Netlify dashboard:
1. Go to "Deploys" tab
2. Click on latest deploy
3. Look for function deployment messages
4. Check if functions were bundled correctly

### 4. **Browser Developer Tools**
1. Open browser dev tools (F12)
2. Go to Network tab
3. Send a chat message
4. Check what HTTP status code you get:
   - **404**: Function not deployed
   - **500**: Server error (likely API key)
   - **502/503**: Function timeout or crash

## 🚨 **Common Issues & Solutions:**

### **"Service is temporarily unavailable"**
- ✅ **Most likely**: Missing `CLAUDE_API_KEY` environment variable
- Check: Function logs in Netlify for specific error messages

### **404 Function Not Found**
- Check: `netlify.toml` configuration
- Verify: Functions directory is `../netlify/functions`

### **Function Timeout**
- Check: Claude API rate limits
- Verify: API key is valid and has credits

## 📝 **Quick Test Commands:**

```bash
# Test health endpoint
curl https://your-site.netlify.app/.netlify/functions/health

# Test Claude endpoint  
curl https://your-site.netlify.app/.netlify/functions/test-claude

# Test chat endpoint
curl -X POST https://your-site.netlify.app/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello"}'
```

## 🎯 **Most Likely Fix:**

90% chance this is just missing the Claude API key in Netlify environment variables. Add it and redeploy! 