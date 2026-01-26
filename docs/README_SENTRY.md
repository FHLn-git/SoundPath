# Sentry Error Tracking Setup (Optional)

Sentry integration is **optional**. The app will work fine without it, but error tracking won't be enabled.

## Current Status

If you see an error about `@sentry/react` not being found, that's expected. The app will still work - error tracking just won't be enabled.

## To Enable Sentry:

1. **Install Sentry package:**
   ```bash
   npm install @sentry/react
   ```

2. **Sign up for Sentry:**
   - Go to https://sentry.io
   - Create a free account
   - Create a new project (select React)
   - Copy your DSN

3. **Add DSN to environment:**
   Add to your `.env` file:
   ```env
   VITE_SENTRY_DSN=your_sentry_dsn_here
   ```

4. **Restart dev server:**
   ```bash
   npm run dev
   ```

## Without Sentry:

The app will work perfectly fine without Sentry. Errors will still be:
- ✅ Caught by ErrorBoundary
- ✅ Displayed to users  
- ✅ Logged to console
- ❌ Just not sent to Sentry dashboard

The error tracking code gracefully handles the case where Sentry isn't installed. You may see a build warning, but the app will function normally.

## Quick Fix

If you want to remove the warning completely and don't plan to use Sentry right now, you can:

1. Install the package (even if unused):
   ```bash
   npm install @sentry/react
   ```

2. Or comment out the Sentry initialization in `src/lib/errorTracking.js` until you're ready to use it.
