# Testing Email Setup - Quick Guide

## Method 1: Test via Team Invite (Easiest)

This is the easiest way since we already implemented invite emails.

### Steps:

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Log in as an Owner:**
   - Make sure you're logged in with an account that has Owner role
   - If you're not an Owner, you can update your role in Supabase:
     ```sql
     -- Find your staff member ID first
     SELECT id, name, auth_user_id FROM staff_members;
     
     -- Then update to Owner (replace 'your-staff-id' with actual ID)
     UPDATE staff_members 
     SET role = 'Owner' 
     WHERE id = 'your-staff-id';
     ```

3. **Go to Staff Management:**
   - Click "Profile" in the sidebar
   - Or navigate to `/admin/staff` if that's where staff management is

4. **Invite a Team Member:**
   - Click "Add Staff" or "Invite Team Member"
   - Enter:
     - **Name**: Test User
     - **Email**: Your real email address (to test receiving)
     - **Role**: Scout (or any role)
   - Click "Send Invite"

5. **Check for Email:**
   - Check your email inbox
   - Check spam folder
   - Look for email from `onboarding@resend.dev`
   - Subject should be: "You've been invited to join [Organization Name] on SoundPath"

6. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for any errors (red text)
   - Should see success message or error details

7. **Check Resend Dashboard:**
   - Go to https://resend.com/emails
   - You should see the email in the log
   - Check delivery status (sent, delivered, bounced, etc.)

---

## Method 2: Quick Test Script (Advanced)

If you want to test directly without going through the UI:

1. **Open browser console** (F12 → Console tab)

2. **Run this test code:**
   ```javascript
   // Test email sending
   async function testEmail() {
     try {
       const { sendEmail } = await import('./src/lib/emailService.js');
       const result = await sendEmail({
         to: 'your-email@example.com', // Your real email
         subject: 'Test Email from SoundPath',
         html: '<h1>Test Email</h1><p>If you receive this, email is working!</p>',
         text: 'Test Email - If you receive this, email is working!'
       });
       console.log('Email result:', result);
     } catch (error) {
       console.error('Email error:', error);
     }
   }
   testEmail();
   ```

3. **Check your email** and Resend dashboard

---

## Method 3: Check Email Service Directly

For security, **Resend API keys are never used in the browser**.\n\nTo verify email delivery:\n- Check **Supabase Edge Function logs** for `send-email`\n- Check **Resend Dashboard** logs (`resend.com/emails`)\n\nConfiguration checklist in Supabase:\n- **Auth → SMTP Settings** uses Resend (controls confirmation + password reset emails)\n- **Edge Functions → Secrets** contains:\n  - `RESEND_API_KEY`\n  - `RESEND_FROM_EMAIL`

---

## What to Look For

### ✅ Success Indicators:

1. **Browser Console:**
   - No red errors
   - Success message like "Invite sent successfully"

2. **Resend Dashboard:**
   - Email appears in log
   - Status shows "Delivered" (green)
   - Delivery time is recent

3. **Your Email:**
   - Email arrives in inbox (or spam)
   - From: `onboarding@resend.dev`
   - Contains invite link

### ❌ Common Issues:

1. **"RESEND_API_KEY not configured" error:**
   - Supabase Dashboard → **Edge Functions → Secrets** → add `RESEND_API_KEY`

2. **"Invalid API key" error:**
   - Check you copied the full key (starts with `re_`)
   - Check for extra spaces or quotes
   - Verify key in Resend dashboard

3. **"Invalid from address" error:**
   - Supabase Dashboard → **Edge Functions → Secrets** → set `RESEND_FROM_EMAIL`

4. **Email not arriving:**
   - Check spam folder
   - Check Resend dashboard for delivery status
   - Some email providers block test domains
   - Try a different email address

5. **"Network error" or CORS error:**
   - This shouldn't happen with Resend
   - Check internet connection
   - Check browser console for specific error

---

## Quick Checklist

- [ ] Supabase Edge secrets include `RESEND_API_KEY`
- [ ] Supabase Edge secrets include `RESEND_FROM_EMAIL`
- [ ] Logged in as Owner role
- [ ] Tried sending invite
- [ ] Checked browser console for errors
- [ ] Checked Resend dashboard for email log
- [ ] Checked email inbox (and spam)

---

## Expected Results

### If Everything Works:

1. **In Browser Console:**
   ```
   ✅ Invite created successfully
   ✅ Email sent
   ```

2. **In Resend Dashboard:**
   - Email appears in list
   - Status: "Delivered" ✅
   - Timestamp: Just now

3. **In Your Email:**
   - Email arrives within seconds
   - From: `onboarding@resend.dev`
   - Subject: "You've been invited to join..."
   - Contains invite link

---

## Troubleshooting Steps

1. **Verify Environment Variables:**
   ```bash
   # In your project root, check .env file
   cat .env | grep RESEND
   ```

2. **Check Resend API Key:**
   - Go to https://resend.com/api-keys
   - Verify key exists and is active
   - Make sure you copied the full key

3. **Test API Key Manually:**
   ```bash
   # Using curl (if you have it)
   curl -X POST 'https://api.resend.com/emails' \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "onboarding@resend.dev",
       "to": "your-email@example.com",
       "subject": "Test",
       "html": "<p>Test</p>"
     }'
   ```

4. **Check Network Tab:**
   - Open DevTools → Network tab
   - Try sending invite
   - Look for request to `api.resend.com`
   - Check response status and body

---

## Next Steps After Testing

Once email is working:

1. ✅ Test with real team invites
2. ✅ Test with different email providers (Gmail, Outlook, etc.)
3. ✅ For production: Verify your own domain in Resend
4. ✅ Update `RESEND_FROM_EMAIL` in Supabase Edge Function secrets to your domain email

---

**Need Help?** Share the error message from browser console and I'll help debug! 🚀
