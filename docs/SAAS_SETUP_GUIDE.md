# SoundPath SaaS Setup Guide - Step by Step

This guide will walk you through setting up all the SaaS features we just implemented.

## ✅ Step 1: Database Schema (Already Done!)

You've already run the `saas-schema.sql` file, so your database is ready. Great job!

---

## 📧 Step 2: Set Up Email Service (Resend)

You need an email service to send team invites and notifications.

### Option A: Resend (Recommended - Easy & Free Tier)

1. **Sign up for Resend:**
   - Go to https://resend.com
   - Click "Sign Up" and create a free account
   - Verify your email

2. **Create an API Key:**
   - Once logged in, go to **API Keys** in the sidebar
   - Click **"Create API Key"**
   - Give it a name like "SoundPath Production"
   - Copy the API key (starts with `re_`)

3. **Choose Your "From" Email Address:**
   
   **Option 1: Use Resend's Test Domain (Easiest - For Testing)**
   - Resend provides a free test domain you can use immediately
   - No setup required - just use: `onboarding@resend.dev`
   - This works right away, perfect for development
   - ⚠️ **Limitation**: Emails sent from this address go to a test inbox (not real recipients)
   
   **Option 2: Verify Your Own Domain (For Production)**
   - You'll need to verify a domain you own (like `studioos.app` or `yourdomain.com`)
   - This allows you to send real emails to actual recipients
   - See "Domain Verification" section below for details

4. **Put the Resend key in Supabase (server-side only):**
  - **Supabase Auth emails (confirmations, password resets):**
    - Supabase Dashboard → **Auth** → **SMTP Settings**
    - Enable Custom SMTP
    - **SMTP Password**: your Resend API key (`re_...`)
  - **App-triggered emails (invites/notifications via Edge Function):**
    - Supabase Dashboard → **Edge Functions** → **Secrets**
    - Add/update:
      - `RESEND_API_KEY` = your Resend API key (`re_...`)
      - `RESEND_FROM_EMAIL` = `onboarding@resend.dev` (testing) or `noreply@yourdomain.com` (production)

5. **Deploy Edge Functions (if needed):**
  - If you use the Supabase CLI, deploy `send-email` (and `password-reset` if used):
  - `supabase functions deploy send-email`
  - `supabase functions deploy password-reset`

### Domain Verification (For Production)

If you want to send real emails to actual recipients, you need to verify your own domain:

1. **In Resend Dashboard:**
   - Go to **Domains** in the sidebar
   - Click **"Add Domain"**
   - Enter your domain (e.g., `studioos.app` or `yourdomain.com`)
   - Click **"Add"**

2. **Add DNS Records:**
   - Resend will show you DNS records to add
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add the DNS records Resend provides:
     - Usually includes: `SPF`, `DKIM`, and `DMARC` records
   - Wait for DNS propagation (can take a few minutes to 24 hours)

3. **Verify Domain:**
   - Once DNS records are added, Resend will verify automatically
   - You'll see a green checkmark when verified

4. **Update the sender address (server-side):**
  - Supabase Dashboard → **Edge Functions** → **Secrets**
  - Set `RESEND_FROM_EMAIL` to: `noreply@yourdomain.com`
  - Replace `yourdomain.com` with your verified domain

### Option B: Skip Email for Now (Testing Only)

If you want to test without setting up email:
- The app will still work
- Invites will be created but emails won't send
- You can manually share invite links with users
- **Note**: With Resend's test domain (`onboarding@resend.dev`), emails are sent but may not reach real inboxes

---

## 💳 Step 3: Set Up Payment Processing (Stripe)

This is needed for actual subscriptions. You can test without it first, but you'll need it for production.

### Part A: Create Stripe Account

1. **Sign up for Stripe:**
   - Go to https://stripe.com
   - Click "Start now" and create an account
   - Complete the account setup (business info, etc.)

2. **Get Your API Keys:**
   - In Stripe Dashboard, go to **Developers** → **API keys**
   - You'll see two keys:
     - **Publishable key** (starts with `pk_test_` or `pk_live_`)
     - **Secret key** (starts with `sk_test_` or `sk_live_`)
   - For testing, use the **Test mode** keys (they have `_test_` in them)
   - Copy both keys

3. **Add to your `.env` file:**
   ```env
   # Stripe Keys (Test Mode)
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   ```
   - ⚠️ **Important**: The `STRIPE_SECRET_KEY` should NOT have `VITE_` prefix (it's server-side only)
   - The publishable key needs `VITE_` because it's used in the browser

### Part B: Create Products in Stripe

1. **Go to Products in Stripe Dashboard:**
   - Click **Products** in the left sidebar
   - Click **"Add product"**

2. **Create each plan:**

   **Free Plan:**
   - Name: `Free`
   - Description: `Perfect for small labels getting started`
   - Pricing: `$0.00` one-time (or free)
   - Save and copy the **Price ID** (starts with `price_`)

   **Starter Plan:**
   - Name: `Starter`
   - Description: `For growing labels`
   - Pricing: `$29.00` per month
   - Save and copy the **Price ID**

   **Pro Plan:**
   - Name: `Pro`
   - Description: `For established labels`
   - Pricing: `$99.00` per month
   - Save and copy the **Price ID**

   **Enterprise Plan:**
   - Name: `Enterprise`
   - Description: `For large labels and agencies`
   - Pricing: `$299.00` per month
   - Save and copy the **Price ID**

3. **Update Database with Stripe Price IDs:**
   - Go to your Supabase SQL Editor
   - Run this SQL (replace with your actual price IDs):
   ```sql
   UPDATE plans 
   SET stripe_price_id_monthly = 'price_your_starter_monthly_id'
   WHERE id = 'starter';
   
   UPDATE plans 
   SET stripe_price_id_monthly = 'price_your_pro_monthly_id'
   WHERE id = 'pro';
   
   UPDATE plans 
   SET stripe_price_id_monthly = 'price_your_enterprise_monthly_id'
   WHERE id = 'enterprise';
   ```

### Part C: Set Up Webhooks (For Production)

Webhooks let Stripe notify your app when payments happen.

1. **In Stripe Dashboard:**
   - Go to **Developers** → **Webhooks**
   - Click **"Add endpoint"**
   - Endpoint URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Select events to listen to:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the **Signing secret** (starts with `whsec_`)

2. **Add to `.env`:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

**Note:** Webhooks require a Supabase Edge Function, which we haven't created yet. You can skip this for now and add it later.

---

## 🧪 Step 4: Test the Features

### Test Email Invites:

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Log in as an Owner:**
   - Go to Staff Management
   - Try inviting a new team member
   - Check if email is sent (check spam folder)

### Test Billing Page:

1. **Navigate to Billing:**
   - Click "Billing" in the sidebar (Owner only)
   - You should see:
     - Current plan (should be "Free" by default)
     - Usage limits
     - Available plans

2. **Check Usage Tracking:**
   - Add some tracks
   - Add some staff members
   - Go back to Billing page
   - You should see usage counts updating

### Test Admin Dashboard:

1. **Create a SystemAdmin user:**
   - In Supabase SQL Editor, run:
   ```sql
   -- Replace 'your-staff-id' with an actual staff_members.id
   UPDATE staff_members 
   SET role = 'SystemAdmin' 
   WHERE id = 'your-staff-id';
   ```

2. **Log in as SystemAdmin:**
   - You should see "Admin" in the sidebar
   - Click it to see the admin dashboard
   - You should see:
     - Total organizations
     - Active subscriptions
     - Revenue metrics

### Test API Keys:

1. **Navigate to API Keys:**
   - Click "API Keys" in sidebar (Owner only)
   - Create a new API key
   - Copy it (you can only see it once!)

---

## 🚧 Step 5: What's Not Working Yet (And How to Fix)

### Payment Checkout (Not Implemented Yet)

**Current Status:** The billing page shows plans, but clicking "Upgrade" doesn't do anything yet.

**To Fix:** You need to:
1. Install Stripe.js in your project:
   ```bash
   npm install @stripe/stripe-js
   ```
2. Create a checkout component (we can do this next)
3. Set up Supabase Edge Function for webhooks

**For Now:** You can manually create subscriptions in the database for testing:
```sql
-- Create a test subscription
INSERT INTO subscriptions (organization_id, plan_id, status, current_period_start, current_period_end)
VALUES (
  'your-org-id-here',
  'starter',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month'
);
```

### Webhook Delivery (Not Implemented Yet)

**Current Status:** Schema is ready, but no UI or delivery system.

**To Fix:** We need to create:
1. Webhook management UI page
2. Webhook delivery service
3. Event triggering system

---

## 📋 Complete `.env` File Example

Here's what your complete `.env` file should look like:

```env
# Public app config (safe; these are used by the browser)
VITE_SITE_URL=http://localhost:5173

# Supabase (you should already have these)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Stripe (public key used by the browser)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**Important Notes:**
- Never commit `.env` to git (it's already in `.gitignore`)
- Use test keys for development
- Switch to live keys only when going to production
- Real secrets are **server-side only**:
  - Resend: configure in Supabase (Auth SMTP + Edge Function secrets)
  - Stripe secret + webhook secret: configure in Vercel (and/or Supabase Edge secrets if using Edge billing)

---

## 🎯 Quick Start Checklist

- [ ] Run `saas-schema.sql` in Supabase (✅ Already done!)
- [ ] Sign up for Resend and configure Supabase SMTP + Edge Function secrets
- [ ] Test email invites
- [ ] Sign up for Stripe (optional for now)
- [ ] Create Stripe products and get price IDs
- [ ] Update database with Stripe price IDs
- [ ] Test billing page
- [ ] Test admin dashboard (create SystemAdmin user)
- [ ] Test API keys page

---

## 🆘 Troubleshooting

### Emails Not Sending:
- Check Resend API key is correct
- Check spam folder
- Look at browser console for errors
- Check Resend dashboard for delivery status

### Billing Page Shows "Loading":
- Check that subscriptions table has data
- Check browser console for errors
- Verify RLS policies are set correctly

### Can't See Billing/API Keys in Sidebar:
- Make sure you're logged in as Owner
- Check `activeMembership.role === 'Owner'`
- Refresh the page

### Admin Dashboard Not Showing:
- Create a SystemAdmin user (see Step 4)
- Make sure you're logged in as that user
- Check `staffProfile.role === 'SystemAdmin'`

---

## 🚀 Next Steps After Setup

Once everything is working:

1. **Implement Stripe Checkout** - Add actual payment flow
2. **Create Webhook Management UI** - Let users manage webhooks
3. **Build REST API** - For programmatic access
4. **Add Help Center** - Documentation for users
5. **Set Up Monitoring** - Error tracking (Sentry)

---

## 💡 Pro Tips

1. **Start with Test Mode:**
   - Always use Stripe test mode keys first
   - Test with Stripe test cards: `4242 4242 4242 4242`
   - Only switch to live mode when ready for production

2. **Email Testing:**
   - Use Resend's test domain (`onboarding@resend.dev`) for development
   - Verify your own domain before production

3. **Database Testing:**
   - You can manually create subscriptions for testing
   - Use SQL to update usage counts if needed

4. **Security:**
   - Never expose secret keys in frontend code
   - Use environment variables for all sensitive data
   - Rotate keys regularly

---

## 📞 Need Help?

If you get stuck:
1. Check browser console for errors
2. Check Supabase logs
3. Check Resend/Stripe dashboards for delivery status
4. Review the error messages - they usually tell you what's wrong

Good luck! 🎉
