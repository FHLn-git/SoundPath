# Complete Resend Email Setup - All Emails Through Resend

This guide ensures **ALL** emails from your site go through Resend with your verified domain `noreply@soundpath.app`.

---

## ✅ Step 1: Verify Domain in Resend (Already Done)

Your domain `soundpath.app` is verified in Resend. ✅

---

## ✅ Step 2: Configure Supabase SMTP (CRITICAL - This Controls ALL Auth Emails)

This is the **most important step**. Supabase SMTP settings control:
- ✅ Email confirmations
- ✅ Password reset emails
- ✅ Magic link emails
- ✅ Email change confirmations
- ✅ All other Supabase auth emails

### Configuration Steps:

1. **Go to Supabase Dashboard:**
   - Navigate to **Settings** → **Auth** → **SMTP Settings**
   - (Or: **Project Settings** → **Auth** → **SMTP Settings**)

2. **Enable Custom SMTP:**
   - Toggle **"Enable Custom SMTP"** to **ON**

3. **Enter Resend SMTP Credentials:**
   - **SMTP Host**: `smtp.resend.com`
   - **SMTP Port**: `587` (TLS) - **Use 587, not 465**
   - **SMTP User**: `resend` (exactly, lowercase)
   - **SMTP Password**: Your Resend API key (starts with `re_`)
     - Get it from: Resend Dashboard → **API Keys**
     - Copy the full key (it's long, make sure you get it all)
   - **Sender Email**: `noreply@soundpath.app`
   - **Sender Name**: `SoundPath`

4. **Test SMTP Connection:**
   - Click **"Test SMTP Connection"** or **"Send Test Email"** button
   - You should receive a test email from `noreply@soundpath.app`
   - If it fails, check:
     - Domain is verified in Resend
     - API key is correct
     - Port is 587 (TLS)

5. **Save Settings:**
   - Click **"Save"** or **"Update SMTP Settings"**

---

## ✅ Step 3: Update Supabase Site URL

1. **Go to Supabase Dashboard:**
   - **Settings** → **API**
   - Find **"Site URL"** field

2. **Set Site URL:**
   - Value: `https://soundpath.app`
   - Save changes

---

## ✅ Step 4: Update Redirect URLs

1. **Go to Supabase Dashboard:**
   - **Authentication** → **URL Configuration**
   - Or: **Settings** → **Auth** → **URL Configuration**

2. **Add Redirect URLs:**
   - In **"Redirect URLs"** section, add:
     - `https://soundpath.app`
     - `https://soundpath.app/**` (wildcard for all paths)
   - Save changes

---

## ✅ Step 5: Update Edge Function Secrets (For Custom Emails)

Your edge function already sends emails via Resend. Update the from address:

1. **Go to Supabase Dashboard:**
   - **Project Settings** → **Edge Functions** → **Secrets**

2. **Update `RESEND_FROM_EMAIL`:**
   - Find `RESEND_FROM_EMAIL` secret
   - Update value to: `noreply@soundpath.app`
   - Save

**Note:** This affects emails sent via your edge function (invites, notifications), not Supabase auth emails.

---

## ✅ Step 6: Add Environment Variable to Vercel

1. **Go to Vercel Dashboard:**
   - Your project → **Settings** → **Environment Variables**

2. **Add Variable:**
   - **Name**: `VITE_SITE_URL`
   - **Value**: `https://soundpath.app`
   - **Environment**: Production, Preview, Development (select all)
   - Save

3. **Redeploy:**
   - After adding, trigger a new deployment so the variable is available

---

## 🧪 Step 7: Test Everything

### Test 1: Email Confirmation (Supabase Auth Email)
1. Create a new test account
2. Check email inbox
3. **Verify:**
   - From: `noreply@soundpath.app` ✅
   - Not from: `noreply@mail.app.supabase.io` ❌
   - Email arrives successfully ✅

### Test 2: Password Reset (Supabase Auth Email)
1. Go to login page
2. Click "Forgot Password"
3. Enter test email
4. **Verify:**
   - From: `noreply@soundpath.app` ✅
   - Email arrives successfully ✅

### Test 3: Custom Email (Edge Function)
1. Send a test email via your app (invite, notification, etc.)
2. **Verify:**
   - From: `noreply@soundpath.app` ✅
   - Email arrives successfully ✅

---

## 🔍 Verification Checklist

Run through this checklist to ensure everything is configured:

- [ ] Domain `soundpath.app` verified in Resend Dashboard
- [ ] Supabase SMTP Settings → Custom SMTP **ENABLED**
- [ ] SMTP Host: `smtp.resend.com`
- [ ] SMTP Port: `587` (TLS)
- [ ] SMTP User: `resend` (lowercase)
- [ ] SMTP Password: Your Resend API key (full key, starts with `re_`)
- [ ] Sender Email: `noreply@soundpath.app`
- [ ] Sender Name: `SoundPath`
- [ ] SMTP test email sent successfully
- [ ] Supabase Site URL: `https://soundpath.app`
- [ ] Redirect URLs include: `https://soundpath.app`
- [ ] Edge Function secret `RESEND_FROM_EMAIL`: `noreply@soundpath.app`
- [ ] Vercel env var `VITE_SITE_URL`: `https://soundpath.app`
- [ ] Test confirmation email comes from `noreply@soundpath.app`
- [ ] Test password reset comes from `noreply@soundpath.app`

---

## 🚨 Troubleshooting

### Emails Still Coming From Supabase Domain

**Problem:** Emails show `noreply@mail.app.supabase.io` instead of `noreply@soundpath.app`

**Solutions:**
1. **Check SMTP is enabled:**
   - Go to Supabase → Settings → Auth → SMTP Settings
   - Make sure "Enable Custom SMTP" toggle is **ON** (green/enabled)

2. **Verify SMTP credentials:**
   - SMTP Host must be exactly: `smtp.resend.com`
   - SMTP Port must be: `587` (not 465)
   - SMTP User must be exactly: `resend` (lowercase, no spaces)
   - SMTP Password must be your full Resend API key

3. **Test SMTP connection:**
   - Use the "Test" button in Supabase SMTP settings
   - If test fails, check Resend API key is valid
   - Check domain is verified in Resend

4. **Wait for propagation:**
   - If you just configured SMTP, wait 5-10 minutes
   - Supabase may cache email settings

5. **Check domain verification:**
   - Go to Resend Dashboard → Domains
   - Verify `soundpath.app` shows "Verified" status
   - If not verified, check DNS records

### SMTP Test Fails

**Error: "Authentication failed"**
- Check Resend API key is correct
- Make sure you copied the full key (they're long)
- Verify API key hasn't been revoked in Resend

**Error: "Connection timeout"**
- Check SMTP Host: `smtp.resend.com` (not `smtp.resend.io` or other)
- Check SMTP Port: `587` (TLS)
- Try port `465` (SSL) if 587 doesn't work

**Error: "Domain not verified"**
- Go to Resend Dashboard → Domains
- Check `soundpath.app` is verified
- If not, add DNS records and wait for verification

### Emails Not Arriving

**Check spam folder:**
- Resend emails sometimes go to spam initially
- Mark as "Not Spam" to improve deliverability

**Check Resend logs:**
- Go to Resend Dashboard → **Logs**
- See if emails are being sent
- Check for bounce/error messages

**Verify recipient email:**
- Make sure the email address is valid
- Test with your own email first

---

## 📋 Quick Reference

**Supabase SMTP Settings:**
```
Host: smtp.resend.com
Port: 587
User: resend
Password: [Your Resend API Key]
From: noreply@soundpath.app
```

**Resend API Key:**
- Location: Resend Dashboard → API Keys
- Format: `re_xxxxxxxxxxxxxxxxxxxxx`

**Domain Status:**
- Check: Resend Dashboard → Domains → soundpath.app
- Should show: "Verified" ✅

---

## ✅ Final Verification

After completing all steps, create a test account and verify:

1. **Confirmation email** comes from `noreply@soundpath.app` ✅
2. **Password reset** comes from `noreply@soundpath.app` ✅
3. **Custom emails** (invites, etc.) come from `noreply@soundpath.app` ✅
4. **All emails** arrive successfully ✅

If all checkboxes are ✅, you're done! All emails are now going through Resend with your domain.
