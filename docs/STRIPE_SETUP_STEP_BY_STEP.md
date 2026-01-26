# Stripe Setup - Step by Step (Do This Now!)

## Step 1: Get Your API Keys (2 minutes)

1. **In Stripe Dashboard, go to:** Developers → API Keys
2. **You'll see two keys:**
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) - Click "Reveal test key" to see it

3. **Copy both keys** - You'll need them in a minute!

---

## Step 2: Create Products & Prices (15 minutes)

### Create Starter Plan ($29/month, $290/year)

1. **Go to:** Products → Add Product
2. **Fill in:**
   - **Name:** Starter Plan
   - **Description:** For growing labels
   - Click "Add product"

3. **Add Monthly Price:**
   - Click "Add another price"
   - **Pricing model:** Standard pricing
   - **Price:** $29.00
   - **Billing period:** Recurring → Monthly
   - Click "Add price"
   - **Copy the Monthly Price ID** (starts with `price_...`)

4. **Add Yearly Price:**
   - Click "Add another price" again
   - **Pricing model:** Standard pricing
   - **Price:** $290.00
   - **Billing period:** Recurring → Yearly
   - Click "Add price"
   - **Copy the Yearly Price ID** (starts with `price_...`)

### Create Pro Plan ($99/month, $990/year)

1. **Add Product again:**
   - **Name:** Pro Plan
   - **Description:** For established labels
   - Add **Monthly price:** $99/month (recurring, monthly) → **Copy Price ID**
   - Add **Yearly price:** $990/year (recurring, yearly) → **Copy Price ID**

### Enterprise Plan (Contact Only - No Stripe Prices Needed)

**Note:** Enterprise plan uses custom pricing and doesn't need Stripe prices. It will show a "Contact Sales" button instead.

**You should now have 4 Price IDs written down (2 monthly + 2 yearly for Starter and Pro only)!**

---

## Step 3: Set Up Webhook (5 minutes)

1. **Go to:** Developers → Webhooks
2. **Click:** "Add endpoint"
3. **Fill in:**
   - **Endpoint URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
     - Replace `YOUR_PROJECT` with your actual Supabase project reference
     - You can find it in your Supabase Dashboard URL
     - Example: `https://abcdefghijklmnop.supabase.co/functions/v1/stripe-webhook`
   
4. **Select events to listen to:**
   - Check these boxes:
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
     - ✅ `customer.subscription.trial_will_end`

5. **Click:** "Add endpoint"

6. **Copy the Signing Secret:**
   - After creating, click on the webhook endpoint
   - You'll see "Signing secret" - Click "Reveal" or "Click to reveal"
   - Copy it (starts with `whsec_...`)

---

## Step 4: Update Your Database (5 minutes)

1. **Open Supabase Dashboard**
2. **Go to:** SQL Editor
3. **Run this SQL** (replace the Price IDs with your actual ones):

```sql
-- Update Starter plan (monthly and yearly)
UPDATE plans 
SET 
  stripe_price_id_monthly = 'price_YOUR_STARTER_MONTHLY_PRICE_ID_HERE',
  stripe_price_id_yearly = 'price_YOUR_STARTER_YEARLY_PRICE_ID_HERE'
WHERE id = 'starter';

-- Update Pro plan (monthly and yearly)
UPDATE plans 
SET 
  stripe_price_id_monthly = 'price_YOUR_PRO_MONTHLY_PRICE_ID_HERE',
  stripe_price_id_yearly = 'price_YOUR_PRO_YEARLY_PRICE_ID_HERE'
WHERE id = 'pro';

-- Enterprise plan: No Stripe prices needed (uses custom pricing/contact sales)
-- You can leave stripe_price_id_monthly and stripe_price_id_yearly as NULL for enterprise
```

**Replace all `price_YOUR_*_PRICE_ID_HERE` with your actual Price IDs from Step 2!**
- You need 4 Price IDs total (2 monthly + 2 yearly for Starter and Pro only)
- Enterprise plan doesn't need Stripe prices - it will show "Contact Sales" button

---

## Step 5: Set Environment Variables (5 minutes)

### Frontend (.env file)

1. **Open or create `.env` file** in your project root (same folder as `package.json`)
2. **Add this line:**
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```
   (Replace with your actual publishable key from Step 1)

### Backend (Supabase Secrets)

1. **Go to Supabase Dashboard**
2. **Go to:** Project Settings → Edge Functions → Secrets
3. **Add these secrets:**

   **Secret 1:**
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** `sk_test_your_secret_key_here`
   - (Replace with your actual secret key from Step 1)

   **Secret 2:**
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_your_webhook_secret_here`
   - (Replace with your webhook secret from Step 3)

   **Note:** You should already have:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - If not, add them too!

---

## Step 6: Deploy Edge Functions (5 minutes)

1. **Open terminal in your project folder**

2. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

3. **Login to Supabase:**
   ```bash
   supabase login
   ```
   (This will open browser to login)

4. **Link your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (Replace `YOUR_PROJECT_REF` with your Supabase project reference - same one you used in webhook URL)

5. **Deploy the functions:**
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy create-portal-session
   supabase functions deploy stripe-webhook
   ```

   Or deploy all at once:
   ```bash
   supabase functions deploy
   ```

---

## Step 7: Test! (5 minutes)

1. **Restart your dev server** (if running):
   ```bash
   # Stop it (Ctrl+C) and restart
   npm run dev
   ```

2. **Go to your app** → Billing page

3. **Click "Upgrade" on any plan**

4. **You should be redirected to Stripe Checkout!**

5. **Use test card:**
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

6. **Complete checkout** - Should redirect back to your app!

---

## ✅ Checklist

- [ ] Got API keys (publishable + secret)
- [ ] Created 2 products (Starter + Pro) with monthly AND yearly prices
- [ ] Copied 4 Price IDs (2 monthly + 2 yearly for Starter and Pro)
- [ ] Set up webhook endpoint
- [ ] Copied webhook secret
- [ ] Updated database with Price IDs (Starter and Pro only)
- [ ] Added `VITE_STRIPE_PUBLISHABLE_KEY` to .env
- [ ] Added `STRIPE_SECRET_KEY` to Supabase secrets
- [ ] Added `STRIPE_WEBHOOK_SECRET` to Supabase secrets
- [ ] Deployed Edge Functions
- [ ] Tested checkout flow (Starter and Pro)
- [ ] Verified Enterprise shows "Contact Sales" button

---

## 🐛 Troubleshooting

### "Stripe publishable key not configured"
- Make sure `.env` file exists in project root
- Make sure key starts with `pk_test_`
- Restart dev server after adding env var

### "No such price" error
- Double-check Price IDs in database match Stripe
- Make sure you're using test keys with test prices

### Webhook not working
- Verify webhook URL is correct in Stripe
- Check webhook secret matches in Supabase
- Check Supabase Edge Functions logs for errors

### Edge Function deployment fails
- Make sure you're logged in: `supabase login`
- Make sure project is linked: `supabase link`
- Check you have the right project reference

---

## 🎯 What's Your Supabase Project Reference?

If you're not sure, it's in your Supabase Dashboard URL:
- Example: `https://supabase.com/dashboard/project/abcdefghijklmnop`
- The `abcdefghijklmnop` part is your project reference

---

**Start with Step 1 and work through each step! Let me know if you get stuck on any step.** 🚀
