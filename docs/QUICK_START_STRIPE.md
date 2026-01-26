# Quick Start: Stripe Integration

## ✅ What's Been Implemented

I've created all the code you need for Stripe integration:

1. ✅ **Stripe Client Library** (`src/lib/stripeClient.js`)
   - Handles checkout session creation
   - Manages billing portal access
   - Redirects to Stripe Checkout

2. ✅ **Edge Functions** (3 functions):
   - `create-checkout-session` - Creates Stripe checkout
   - `create-portal-session` - Creates billing portal session
   - `stripe-webhook` - Handles Stripe webhook events

3. ✅ **Updated Billing Page** (`src/pages/Billing.jsx`)
   - "Upgrade" button now redirects to Stripe Checkout
   - "Cancel Subscription" opens Stripe Billing Portal
   - "Manage Payment Methods" opens Stripe Billing Portal
   - Success/cancel handling from Stripe redirects

---

## 🚀 Next Steps (Do These Now)

### Step 1: Install Stripe Package (1 minute)

```bash
npm install @stripe/stripe-js
```

---

### Step 2: Set Up Stripe Account (10 minutes)

1. **Create Stripe Account**
   - Go to https://stripe.com
   - Sign up (free)
   - Complete account setup

2. **Get API Keys**
   - Go to Developers → API Keys
   - Copy **Publishable Key** (starts with `pk_test_`)
   - Copy **Secret Key** (starts with `sk_test_`)

3. **Create Products & Prices**
   - Go to Products → Add Product
   - Create products for each plan:
     - **Starter**: $29/month
     - **Pro**: $99/month  
     - **Enterprise**: $299/month
   - For each, create a **Recurring** price (Monthly)
   - Copy the **Price ID** for each (starts with `price_`)

4. **Set Up Webhook**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
   - Select events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the **Webhook Signing Secret** (starts with `whsec_`)

---

### Step 3: Update Database (5 minutes)

1. **Open Supabase SQL Editor**

2. **Update plans with Stripe Price IDs:**

```sql
-- Replace YOUR_PRICE_ID with actual Price IDs from Stripe

UPDATE plans 
SET stripe_price_id_monthly = 'price_YOUR_STARTER_PRICE_ID'
WHERE id = 'starter';

UPDATE plans 
SET stripe_price_id_monthly = 'price_YOUR_PRO_PRICE_ID'
WHERE id = 'pro';

UPDATE plans 
SET stripe_price_id_monthly = 'price_YOUR_ENTERPRISE_PRICE_ID'
WHERE id = 'enterprise';
```

---

### Step 4: Set Environment Variables (5 minutes)

#### Frontend (.env file or Vercel):

Create/update `.env` file:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

#### Backend (Supabase Edge Functions):

1. Go to Supabase Dashboard
2. Project Settings → Edge Functions → Secrets
3. Add these secrets:

```
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Note:** You also need `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` - these should already be set.

---

### Step 5: Deploy Edge Functions (5 minutes)

1. **Install Supabase CLI** (if not installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Deploy functions**:
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

### Step 6: Test! (10 minutes)

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Test Checkout Flow**:
   - Go to Billing page
   - Click "Upgrade" on any plan
   - Should redirect to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`
   - Complete checkout
   - Should redirect back with success message

3. **Test Webhook** (using Stripe CLI):
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe  # Mac
   # Or download from: https://stripe.com/docs/stripe-cli
   
   # Login
   stripe login
   
   # Forward webhooks to local
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
   ```
   
   Then trigger a test event:
   ```bash
   stripe trigger customer.subscription.created
   ```

---

## 🎯 What Happens When User Subscribes

1. User clicks "Upgrade" on Billing page
2. `handleUpgrade()` calls `handleSubscriptionChange()`
3. Creates Stripe Checkout session via Edge Function
4. User redirected to Stripe Checkout
5. User enters payment details
6. Stripe processes payment
7. Stripe sends webhook to your endpoint
8. Webhook handler updates database:
   - Creates/updates subscription
   - Creates invoice record
   - Updates subscription status
9. User redirected back to app with success message

---

## 🐛 Troubleshooting

### "Stripe publishable key not configured"
- Make sure `VITE_STRIPE_PUBLISHABLE_KEY` is set in `.env`
- Restart dev server after adding env var

### "No such price" error
- Verify Price IDs in database match Stripe
- Check you're using test keys with test prices

### Webhook not working
- Verify webhook endpoint URL in Stripe Dashboard
- Check webhook secret matches in Supabase secrets
- Use Stripe CLI to test locally first

### Edge Function errors
- Check Supabase logs: Dashboard → Edge Functions → Logs
- Verify all secrets are set correctly
- Check function deployment succeeded

---

## 📚 Documentation

- **Stripe Docs**: https://stripe.com/docs
- **Stripe Testing**: https://stripe.com/docs/testing
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

---

## ✅ Checklist

- [ ] Installed `@stripe/stripe-js` package
- [ ] Created Stripe account
- [ ] Got API keys (publishable + secret)
- [ ] Created products and prices in Stripe
- [ ] Updated database with Price IDs
- [ ] Set `VITE_STRIPE_PUBLISHABLE_KEY` in .env
- [ ] Set `STRIPE_SECRET_KEY` in Supabase secrets
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Supabase secrets
- [ ] Deployed Edge Functions
- [ ] Set up webhook endpoint in Stripe
- [ ] Tested checkout flow
- [ ] Tested webhook events

---

**Once you complete these steps, payment processing will be fully functional!** 🎉
