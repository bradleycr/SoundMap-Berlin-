# 🛠️ Sentry Setup Guide

## ✅ Current Status
- ✅ Sentry packages installed (`@sentry/nextjs`, `@sentry/react`)
- ✅ Configuration files created
- ✅ Local environment variables set
- ⚠️ Vercel environment variables needed
- 🧪 Test page created

## 🚀 Quick Test

1. **Visit the test page**: `http://localhost:3001/sentry-test`
2. **Click any test button** to send errors to Sentry
3. **Check your Sentry dashboard** - events should appear within 30 seconds
4. **Look for the 🧪 emoji** in error titles to identify test events

## 🔧 Vercel Environment Variables Setup

You need to add these environment variables to Vercel for production:

### Step 1: Get Your Sentry Values
From your Sentry dashboard:
- **DSN**: Project Settings → Client Keys (DSN)
- **Org Slug**: Organization Settings → General → Organization Slug
- **Project Slug**: Project Settings → General → Project Slug  
- **Auth Token**: User Settings → Auth Tokens → Create New Token

### Step 2: Add to Vercel
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add these variables:

```bash
# Required for error tracking
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here

# Optional but recommended for releases
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

### Step 3: Redeploy
After adding the variables, redeploy your app:
```bash
vercel --prod
```

## 🎯 What Each Test Does

| Test | Purpose | What to Look For |
|------|---------|------------------|
| **Basic Error** | Tests simple error capture | Error appears in Sentry Issues |
| **Async Error** | Tests async operation failures | Error with async context |
| **Network Error** | Tests API/network failures | Error with network tags |
| **Custom Message** | Tests info/warning messages | Message in Sentry (not error) |
| **User Context** | Tests user identification | Error shows user info |
| **Breadcrumbs** | Tests user action tracking | Error shows breadcrumb trail |
| **Performance** | Tests performance monitoring | Transaction in Sentry Performance |

## 📊 Sentry Dashboard Guide

### Issues Tab
- **All errors and exceptions** appear here
- **Click on any issue** to see details, stack trace, and context
- **Filter by environment** (development/production)

### Performance Tab
- **Transaction traces** show here
- **Performance metrics** and slow operations
- **Database queries** and API calls

### Releases Tab
- **Track deployments** and associate errors with releases
- **See which release** introduced new errors

## 🔍 Understanding Error Details

When you click on an error in Sentry, you'll see:

1. **Stack Trace**: Exact line where error occurred
2. **Breadcrumbs**: User actions leading to error
3. **User Context**: Who experienced the error
4. **Device/Browser**: Technical environment details
5. **Tags**: Custom categorization
6. **Extra Data**: Additional context you provided

## 🚨 Common Issues & Solutions

### "No events appearing"
- ✅ Check DSN is correct in `.env.local`
- ✅ Restart your dev server after adding DSN
- ✅ Check browser console for Sentry errors
- ✅ Verify your Sentry project is active

### "Events only in development"
- ✅ Add environment variables to Vercel
- ✅ Redeploy your application
- ✅ Check production logs in Vercel

### "Performance data missing"
- ✅ Ensure `tracesSampleRate` is set (already configured)
- ✅ Check Performance tab in Sentry dashboard
- ✅ Performance data may take longer to appear

## 🎉 Next Steps

1. **Test locally** with the test page
2. **Add Vercel environment variables**
3. **Deploy to production**
4. **Test production** with the same test page
5. **Monitor real errors** in your Sentry dashboard

## 📝 Pro Tips

- **Use meaningful error messages** in your code
- **Add context** with tags and extra data
- **Set up alerts** in Sentry for critical errors
- **Create releases** to track which deployment caused issues
- **Use breadcrumbs** to understand user flows leading to errors

---

🔗 **Useful Links:**
- [Sentry Dashboard](https://sentry.io/)
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Test Page](http://localhost:3001/sentry-test) 