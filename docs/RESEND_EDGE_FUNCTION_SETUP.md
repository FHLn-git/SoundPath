# Resend Email Setup via Supabase Edge Function

This guide will help you set up Resend email sending through a Supabase Edge Function to avoid CORS issues.

## Why Use an Edge Function?

Resend's API doesn't allow direct browser calls due to CORS security. Using a Supabase Edge Function:
- ✅ Keeps your API key secure (not exposed in client code)
- ✅ Avoids CORS errors
- ✅ Follows security best practices

---

## Step 1: Get Your Resend API Key (5 minutes)

1. **Sign up for Resend:**
   - Go to https://resend.com
   - Click "Sign Up" and create a free account
   - Verify your email

2. **Create an API Key:**
   - Once logged in, go to **API Keys** in the sidebar
   - Click **"Create API Key"**
   - Give it a name like "SoundPath Production"
   - Copy the API key (starts with `re_`)

3. **Choose Your "From" Email:**
   - **For Testing:** Use `onboarding@resend.dev` (works immediately, no setup)
   - **For Production:** Verify your own domain in Resend, then use `noreply@yourdomain.com`

---

## Step 2: Set Supabase Edge Function Secrets (5 minutes)

1. **Go to Supabase Dashboard:**
   - Navigate to your project
   - Go to **Project Settings** → **Edge Functions** → **Secrets**

2. **Add These Secrets:**

   **Secret 1:**
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_your_api_key_here`
   - (Paste your actual Resend API key)

   **Secret 2 (Optional - defaults to onboarding@resend.dev):**
   - **Name:** `RESEND_FROM_EMAIL`
   - **Value:** `onboarding@resend.dev`
   - (Or use your verified domain email like `noreply@yourdomain.com`)

   **Note:** These secrets are already configured:
   - `SUPABASE_URL` (should already exist)
   - `SUPABASE_SERVICE_ROLE_KEY` (should already exist)

---

## Step 3: Deploy the Edge Function (5 minutes)

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```
   (This will open browser to login)

3. **Link your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Replace `YOUR_PROJECT_REF` with your Supabase project reference - found in your project URL)

4. **Deploy the send-email function:**
   ```bash
   supabase functions deploy send-email
   ```

   Or deploy all functions at once:
   ```bash
   supabase functions deploy
   ```

---

## Step 4: Test Your Setup (2 minutes)

1. **Restart your dev server** (if running):
   ```bash
   # Stop it (Ctrl+C) and restart
   npm run dev
   ```

2. **Go to the Email Test Page:**
   - Navigate to `/test-email` in your app
   - Enter your email address
   - Click "Send Test Email"

3. **Check Your Inbox:**
   - You should receive the test email
   - Check spam folder if needed

---

## Troubleshooting

### "RESEND_API_KEY not configured" Error

**Solution:** Make sure you added the secret in Supabase Dashboard:
1. Go to Project Settings → Edge Functions → Secrets
2. Add `RESEND_API_KEY` with your Resend API key
3. Redeploy the function: `supabase functions deploy send-email`

### "Invalid API key" Error

**Solution:** 
1. Verify your API key is correct in Resend dashboard
2. Make sure it starts with `re_`
3. Check that the key hasn't been revoked
4. Try creating a new API key if needed

### "Invalid from address" Error

**Solution:**
1. For testing: Use `onboarding@resend.dev` (set in `RESEND_FROM_EMAIL` secret)
2. For production: Verify your domain in Resend dashboard first
3. Then use an email on that domain (e.g., `noreply@yourdomain.com`)

### Edge Function Not Found (404)

**Solution:**
1. Make sure you deployed the function: `supabase functions deploy send-email`
2. Check that you're using the correct Supabase URL in your `.env` file
3. Verify the function name matches: `send-email`

### Emails Not Arriving

**Solution:**
1. Check your spam folder
2. Verify the recipient email address is correct
3. Check Resend dashboard for delivery status and logs
4. If using `onboarding@resend.dev`, some email providers may filter test domain emails

---

## Production Checklist

Before going to production:

- [ ] Verify your own domain in Resend dashboard
- [ ] Update `RESEND_FROM_EMAIL` secret to use your domain (e.g., `noreply@yourdomain.com`)
- [ ] Test email delivery to real email addresses
- [ ] Monitor Resend dashboard for delivery rates
- [ ] Set up Resend webhooks (optional) for delivery tracking

---

## Quick Reference

**Edge Function Endpoint:**
```
POST https://YOUR_PROJECT.supabase.co/functions/v1/send-email
```

**Required Secrets:**
- `RESEND_API_KEY` (required)
- `RESEND_FROM_EMAIL` (optional, defaults to `onboarding@resend.dev`)

**Deploy Command:**
```bash
supabase functions deploy send-email
```

**Test Page:**
Navigate to `/test-email` in your app

---

## Need Help?

- Check Resend Dashboard: https://resend.com/emails (for delivery logs)
- Check Supabase Edge Function logs in dashboard
- Review browser console (F12) for client-side errors
- Check Supabase function logs: `supabase functions logs send-email`
