# Custom Error Tracking System

## Overview

Instead of using Sentry, SoundPath now has a **built-in error tracking system** that stores all errors in your database and displays them in the God Mode (Admin Dashboard).

## Features

✅ **Automatic Error Logging** - All errors are automatically captured  
✅ **Database Storage** - Errors stored in `error_logs` table  
✅ **Admin Dashboard** - View all errors in God Mode  
✅ **Error Grouping** - Similar errors are grouped with occurrence counts  
✅ **Error Resolution** - Mark errors as resolved  
✅ **Error Details** - Full stack traces, context, and browser info  
✅ **Filtering** - Filter by status, severity, date  
✅ **No External Dependencies** - Everything stays in your database  

## Setup

1. **Run the database schema:**
   ```sql
   -- Run error-logging-schema.sql in Supabase SQL Editor
   ```

2. **That's it!** The error logger is automatically initialized when the app starts.

## How It Works

### Automatic Error Capture

- **React Error Boundaries** - Catches component errors
- **Global Error Handler** - Catches unhandled errors
- **Promise Rejections** - Catches unhandled promise rejections
- **Manual Logging** - Use `logError()`, `logWarning()`, `logInfo()` functions

### Error Storage

Errors are stored in the `error_logs` table with:
- Error message and stack trace
- Component where error occurred
- User context (user ID, staff member, organization)
- Browser information
- Error context (props, state, etc.)
- Occurrence count (groups similar errors)
- Timestamps (first seen, last seen)

### Viewing Errors

1. Go to **Admin Dashboard** (`/admin/dashboard`)
2. Click the **"Error Logs"** tab
3. View all errors with filtering options
4. Click the eye icon to see full error details
5. Mark errors as resolved when fixed

## Usage

### Automatic Logging

Errors are automatically logged when:
- A React component throws an error
- An unhandled error occurs
- A promise is rejected without a catch

### Manual Logging

You can also manually log errors:

```javascript
import { logError, logWarning, logInfo } from './lib/errorLogger'

// Log an error
logError({
  message: 'Something went wrong',
  stack: error.stack,
  component: 'MyComponent',
  context: { userId: 123, action: 'submit' }
})

// Log a warning
logWarning('This is a warning', { context: 'data' })

// Log info
logInfo('User action', { action: 'clicked button' })
```

## Database Schema

The `error_logs` table includes:
- Error details (message, stack, component, URL)
- User context (user_id, staff_member_id, organization_id)
- Browser info (user agent, screen size, etc.)
- Error context (JSONB for custom data)
- Resolution tracking (resolved, resolved_by, resolved_at, resolved_note)
- Occurrence tracking (occurrence_count, first_seen_at, last_seen_at)

## Admin Features

In the Admin Dashboard Error Logs tab:

- **View all errors** with full details
- **Filter by status** (all, unresolved, resolved)
- **Filter by severity** (all, error, warning, info)
- **See occurrence counts** (how many times error happened)
- **View stack traces** and error context
- **Mark errors as resolved** when fixed
- **See browser info** for debugging
- **Track error trends** with stats

## Benefits Over Sentry

✅ **No External Service** - Everything in your database  
✅ **No Cost** - Free forever  
✅ **Full Control** - Own your error data  
✅ **Integrated** - Part of your admin dashboard  
✅ **Customizable** - Add any fields you want  
✅ **Privacy** - Error data stays in your database  

## Security

- Only SystemAdmin users can view error logs
- RLS policies ensure proper access control
- Error logs include user context for debugging
- Sensitive data can be filtered in error context

## Next Steps

1. Run `error-logging-schema.sql` in Supabase
2. Errors will start being logged automatically
3. Check Admin Dashboard → Error Logs tab
4. Monitor and resolve errors as they occur

That's it! You now have a complete error tracking system built into your app. 🎉
