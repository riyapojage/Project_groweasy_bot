# 🚀 GrowEasy Netlify Deployment Guide

## 📋 Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Claude API Key**: Get from [Anthropic Console](https://console.anthropic.com)

## 🔧 Deployment Steps

### 1. Connect Repository to Netlify

1. Log into your Netlify dashboard
2. Click "New site from Git"
3. Connect your GitHub account
4. Select your GrowEasy repository

### 2. Configure Build Settings

Netlify will automatically detect the `netlify.toml` configuration. Verify these settings:

- **Base directory**: `client`
- **Build command**: `npm run build`
- **Publish directory**: `client/build`
- **Functions directory**: `netlify/functions`

### 3. Set Environment Variables

In your Netlify site dashboard, go to:
**Site settings** → **Environment variables** → **Add variable**

Add:
```
CLAUDE_API_KEY=your_claude_api_key_here
```

### 4. Deploy

Click **Deploy site**. Netlify will:
1. Install dependencies for both client and functions
2. Build the React app
3. Deploy serverless functions
4. Deploy your site

## 🌐 API Endpoints

After deployment, your endpoints will be:

- **Health Check**: `https://your-site.netlify.app/.netlify/functions/health`
- **Claude Test**: `https://your-site.netlify.app/.netlify/functions/test-claude`
- **Chat**: `https://your-site.netlify.app/.netlify/functions/chat`
- **Reset**: `https://your-site.netlify.app/.netlify/functions/reset`

## 🔍 Troubleshooting

### Build Failures

1. Check build logs in Netlify dashboard
2. Ensure all dependencies are listed in `package.json`
3. Verify environment variables are set

### Function Errors

1. Check function logs in Netlify dashboard
2. Verify Claude API key is set correctly
3. Check for import/export syntax errors

### CORS Issues

CORS headers are configured in each function. If you experience issues:
1. Check browser console for error messages
2. Verify the function URLs are correct

## 📝 Development vs Production

- **Development**: Uses `http://localhost:3000` endpoints
- **Production**: Uses `/.netlify/functions/` endpoints

The client automatically detects the environment and uses appropriate URLs.

## 🔒 Security Considerations

1. Never commit API keys to the repository
2. Use Netlify environment variables for secrets
3. Monitor function usage and costs
4. Consider rate limiting for production use

## 📊 Monitoring

Monitor your deployment:
1. **Netlify Analytics**: Basic traffic and performance
2. **Function Logs**: Debug serverless function issues
3. **Build Logs**: Troubleshoot deployment problems

## 🚀 Going Live

1. Configure custom domain (optional)
2. Set up SSL certificate (automatic with Netlify)
3. Update any external service configurations
4. Test all functionality end-to-end

## 💡 Next Steps

Consider these improvements for production:
1. Add database for persistent conversation storage
2. Implement user authentication
3. Add monitoring and alerting
4. Set up CI/CD pipeline
5. Add comprehensive error handling 