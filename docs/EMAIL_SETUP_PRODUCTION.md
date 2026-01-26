# Email Setup for Production - SoundPath

## Issues Fixed

1. ✅ Email confirmation redirect URL now uses production domain
2. ✅ Email from address configuration guide

---

## Step 1: Verify Domain in Resend (REQUIRED)

Before Supabase can send emails via Resend, you must verify your domain:

1. **Go to Resend Dashboard:**
   - Navigate to **Domains** (left sidebar)
   - Click **"Add Domain"**
   - Enter: `soundpath.app`
   - Click **"Add"**

2. **Get DNS Records from Resend:**
   - After adding the domain, Resend will show you specific DNS records
   - Copy each record exactly as shown (they're unique to your domain)
   - You'll typically need:
     - **SPF Record** (TXT type)
     - **DKIM Record** (CNAME type) - this will be unique to your domain

3. **Determine Your DNS Provider:**
   
   **Check in Namecheap:**
   - Go to Namecheap → **Domain List** → Click **Manage** next to `soundpath.app`
   - Look at **Nameservers** section
   - If it says "Custom DNS" with Vercel nameservers (like `ns1.vercel-dns.com`) → Use **Option A** below
   - If it says "Namecheap BasicDNS" → Use **Option B** below
   - If Namecheap shows a message about "use your DNS provider" → You're using custom nameservers (use **Option A**)

---

### Option A: Add DNS Records in Vercel (Recommended - If using Vercel nameservers)

If your domain uses Vercel's nameservers (most common if hosting on Vercel):

1. **Go to Vercel Dashboard:**
   - Navigate to your project → **Settings** → **Domains**
   - Click on `soundpath.app`
   - Scroll down to **DNS Records** section

2. **Add SPF Record (TXT):**
   - Click **Add Record** or **Add DNS Record**
   - Type: `TXT`
   - Name: `@` (or leave blank for root domain)
   - Value: The exact SPF value from Resend (usually `v=spf1 include:resend.com ~all`)
   - TTL: `Automatic` or `3600`
   - Click **Save**

3. **Add DKIM Record (CNAME):**
   - Click **Add Record**
   - Type: `CNAME`
   - Name: `resend._domainkey` (or exactly what Resend shows)
   - Value: The exact CNAME value from Resend (unique to your domain)
   - TTL: `Automatic` or `3600`
   - Click **Save**

**Note:** DNS records in Vercel may take a few minutes to propagate.

---

### Option B: Add DNS Records in Namecheap (If using Namecheap BasicDNS)

If you're using Namecheap's DNS or want to switch back:

1. **Switch to Namecheap BasicDNS (if needed):**
   - In Namecheap → **Domain List** → **Manage** → **Nameservers**
   - If it shows "Custom DNS", change to **"Namecheap BasicDNS"**
   - Wait for propagation (can take a few hours)
   - ⚠️ **Warning:** This will temporarily break your Vercel connection until DNS propagates
   - After switching, you'll need to add your domain's A/CNAME records back in Namecheap for Vercel

2. **Add DNS Records:**
   - Go to **Advanced DNS** tab
   - Scroll to **Host Records** section
   - Click **Add New Record** for each:
     
     **For SPF (TXT Record):**
     - Type: `TXT Record`
     - Host: `@` (or leave blank)
     - Value: The exact value from Resend
     - TTL: `Automatic` or `300`
     - Click **Save** (green checkmark)
     
     **For DKIM (CNAME Record):**
     - Type: `CNAME Record`
     - Host: `resend._domainkey` (or what Resend shows)
     - Value: The exact CNAME value from Resend
     - TTL: `Automatic` or `300`
     - Click **Save** (green checkmark)

**Important Notes:**
- Use the **exact values** Resend provides (don't use examples)
- Each domain gets unique DKIM values
- If Namecheap says "use your DNS provider", you're using custom nameservers (use Option A instead)

---

4. **Verify in Resend:**
   - Go back to Resend Dashboard → **Domains**
   - Click on `soundpath.app`
   - Resend will check the DNS records automatically
   - Status will change from "Pending" to "Verified" when ready
   - This usually takes 5 minutes to 2 hours (can take up to 48 hours)
   - You can click "Refresh" to check status manually

**Troubleshooting DNS Records:**
- If Namecheap says "use your DNS provider", make sure you're in **Advanced DNS** tab
- If records aren't showing up, wait 10-15 minutes after adding (DNS propagation delay)
- Double-check you copied the exact values from Resend (especially the DKIM CNAME)
- Make sure there are no typos in the Host field (e.g., `resend._domainkey` not `resend.domainkey`)

---

## Step 2: Configure Supabase to Use Resend SMTP

Once your domain is verified in Resend, configure Supabase to send all emails through Resend:

1. **Get Your Resend API Key:**
   - Go to Resend Dashboard → **API Keys**
   - Copy your API key (starts with `re_`)
   - If you don't have one, create a new API key

2. **Configure SMTP in Supabase:**
   - Go to Supabase Dashboard → **Settings** → **Auth** → **SMTP Settings**
   - Enable **Custom SMTP** toggle
   - **SMTP Host**: `smtp.resend.com`
   - **SMTP Port**: `587` (TLS) or `465` (SSL)
   - **SMTP User**: `resend`
   - **SMTP Password**: Your Resend API key (paste the full key starting with `re_`)
   - **Sender Email**: `noreply@soundpath.app`
   - **Sender Name**: `SoundPath`
   - Click **Save**

3. **Update Site URL in Supabase:**
   - Go to **Settings** → **API**
   - Find **Site URL** field
   - Set to: `https://soundpath.app` (or your actual domain)
   - Save changes

4. **Add Redirect URLs:**
   - Go to **Authentication** → **URL Configuration**
   - Add to **Redirect URLs**: `https://soundpath.app`
   - Save changes

---

## Step 3: Add Environment Variable

Add your production site URL to Vercel environment variables:

1. **In Vercel Dashboard:**
   - Go to your project → **Settings** → **Environment Variables**
   - Add new variable:
     - **Name**: `VITE_SITE_URL`
     - **Value**: `https://soundpath.app` (or your actual domain)
     - **Environment**: Production, Preview, Development (select all)
   - Save

2. **Update Local .env (optional for local dev):**
   ```env
   VITE_SITE_URL=http://localhost:5173
   ```

---

## Step 4: Update Resend Edge Function (For Custom Emails)

If you're using Resend for custom emails (invites, notifications), update the edge function secret:

1. **In Supabase Dashboard:**
   - Go to **Project Settings** → **Edge Functions** → **Secrets**
   - Find `RESEND_FROM_EMAIL`
   - Update value to: `noreply@soundpath.app`
   - Save

**Note:** This only affects emails sent via your edge function, not Supabase's built-in confirmation emails.

---

## Step 5: Test Email Confirmation

1. **Create a test account:**
   - Sign up with a test email
   - Check email inbox (and spam folder)
   - Click confirmation link
   - Should redirect to: `https://soundpath.app/?confirmed=true`
   - Should show success message and login modal

2. **Verify Email From Address:**
   - Check the "From" field in the confirmation email
   - Should be: `noreply@soundpath.app` (via Resend)
   - If it's still `noreply@mail.app.supabase.io`, SMTP isn't configured correctly

---

## Troubleshooting

### "Site can't be reached" Error

**Cause:** Email confirmation link is pointing to wrong URL (likely localhost or old domain)

**Fix:**
1. Check Supabase **Settings** → **API** → **Site URL** is set to production domain
2. Verify `VITE_SITE_URL` is set in Vercel environment variables
3. Redeploy your Vercel project after adding environment variable
4. Test with a new signup (old confirmation links won't work)

### Emails Still Coming From Supabase Domain

**Cause:** Custom SMTP not configured correctly or domain not verified

**Fix:**
1. Verify `soundpath.app` domain shows "Verified" in Resend Dashboard
2. Double-check SMTP settings in Supabase:
   - SMTP Host: `smtp.resend.com`
   - SMTP Port: `587` or `465`
   - SMTP User: `resend` (exactly, lowercase)
   - SMTP Password: Your full Resend API key (starts with `re_`)
   - Sender Email: `noreply@soundpath.app`
3. Test SMTP connection in Supabase (there should be a "Test" button)
4. Wait 24-48 hours for DNS propagation if you just added DNS records
5. Make sure "Custom SMTP" toggle is enabled

### Confirmation Link Works But Shows Error

**Cause:** Redirect URL not whitelisted in Supabase

**Fix:**
1. Go to **Authentication** → **URL Configuration**
2. Add `https://soundpath.app` to **Redirect URLs**
3. Save changes

---

## Quick Checklist

- [ ] Verify `soundpath.app` domain in Resend Dashboard
- [ ] Add DNS records to Namecheap (SPF, DKIM)
- [ ] Wait for domain verification in Resend
- [ ] Configure custom SMTP in Supabase with Resend credentials
- [ ] Set Site URL in Supabase: `https://soundpath.app`
- [ ] Add `VITE_SITE_URL` to Vercel environment variables
- [ ] Add redirect URL to Supabase whitelist
- [ ] Update `RESEND_FROM_EMAIL` in Supabase Edge Function secrets
- [ ] Test email confirmation flow
- [ ] Verify email from address is `noreply@soundpath.app`

---

## Current Status

✅ **Code Updated:**
- `AuthContext.jsx` - Uses `VITE_SITE_URL` for email redirects
- `Onboarding.jsx` - Uses `VITE_SITE_URL` for email redirects
- `Landing.jsx` - Handles `?confirmed=true` query parameter

⚠️ **Action Required:**
1. Verify `soundpath.app` domain in Resend
2. Configure Supabase to use Resend SMTP (see Step 2)
3. Add `VITE_SITE_URL` environment variable in Vercel
4. Configure Supabase Site URL
5. Update `RESEND_FROM_EMAIL` in Supabase Edge Function secrets
