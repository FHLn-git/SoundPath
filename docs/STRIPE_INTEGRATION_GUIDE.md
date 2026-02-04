# Stripe Integration Guide - Step by Step

## Overview
This guide will walk you through integrating Stripe payment processing into SoundPath.

---

## Step 1: Set Up Stripe Account (5 minutes)

1. **Create Stripe Account**
   - Go to https://stripe.com
   - Sign up for a free account
   - Complete account setup

2. **Get API Keys**
   - Go to Developers → API Keys
   - Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - **Important:** Use test keys first (`pk_test_` and `sk_test_`)

3. **Create Products and Prices**
   - Go to Products → Add Product
   - Create products for each plan:
     - **Starter Plan**: $29/month
     - **Pro Plan**: $99/month
     - **Enterprise Plan**: $299/month
   - For each product, create a recurring price:
     - Billing period: Monthly
     - Price: Match your plan prices
   - Copy the **Price ID** for each (starts with `price_`)

4. **Set Up Webhook Endpoint**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Select events to listen to:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.trial_will_end`
   - Copy the **Webhook Signing Secret** (starts with `whsec_`)

---

## Step 2: Update Database with Stripe Price IDs (5 minutes)

1. **Open Supabase SQL Editor**
2. **Update plans table with Stripe Price IDs:**

```sql
-- Update Starter plan
UPDATE plans 
SET stripe_price_id_monthly = 'price_YOUR_STARTER_MONTHLY_PRICE_ID'
WHERE id = 'starter';

-- Update Pro plan
UPDATE plans 
SET stripe_price_id_monthly = 'price_YOUR_PRO_MONTHLY_PRICE_ID'
WHERE id = 'pro';

-- Update Enterprise plan
UPDATE plans 
SET stripe_price_id_monthly = 'price_YOUR_ENTERPRISE_MONTHLY_PRICE_ID'
WHERE id = 'enterprise';
```

Replace `YOUR_*_PRICE_ID` with the actual Price IDs from Stripe.

---

## Step 3: Set Environment Variables (5 minutes)

### Frontend (Vercel or .env file):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Backend (Supabase Edge Functions):
Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets

Add these secrets:
```
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

---

## Step 4: Install Stripe (Already Done!)

The `@stripe/stripe-js` package is already in your `package.json` as an optional dependency. You just need to install it:

```bash
npm install @stripe/stripe-js
```

---

## Step 5: Implementation Files

The following files will be created/updated:

1. ✅ `src/lib/stripeClient.js` - Stripe client initialization
2. ✅ `src/pages/Billing.jsx` - Updated with checkout flow
3. ✅ `supabase/functions/stripe-webhook/index.ts` - Webhook handler

---

## Step 6: Testing

### Test Cards (Stripe Test Mode):
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires Authentication:** `4000 0025 0000 3155`

### Test Webhook Locally:
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe` (Mac) or download from Stripe
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`
4. Use the webhook secret from the CLI output

---

## Step 7: Go Live

When ready for production:

1. **Switch to Live Mode in Stripe**
   - Get live API keys
   - Create live products/prices
   - Update environment variables
   - Update database with live price IDs

2. **Update Webhook Endpoint**
   - Add production webhook endpoint in Stripe Dashboard
   - Use production webhook secret

3. **Test with Real Card**
   - Use a real card with small amount first
   - Verify webhook events are received
   - Check database updates

---

## What Gets Implemented

### Checkout Flow:
1. User clicks "Upgrade" on a plan
2. Stripe Checkout session is created
3. User is redirected to Stripe Checkout
4. User enters payment details
5. Stripe processes payment
6. Webhook updates database
7. User is redirected back to app with success

### Webhook Events Handled:
- **subscription.created** - Creates subscription in database
- **subscription.updated** - Updates subscription status
- **subscription.deleted** - Marks subscription as canceled
- **invoice.payment_succeeded** - Creates invoice record
- **invoice.payment_failed** - Marks subscription as past_due

---

## Next Steps

After completing this integration:
1. Test thoroughly with test cards
2. Test webhook events
3. Test upgrade/downgrade flows
4. Test cancellation
5. Deploy to staging
6. Test in staging
7. Deploy to production
8. Monitor closely for first week

---

## Troubleshooting

### Common Issues:

1. **"No such price" error**
   - Verify price IDs in database match Stripe
   - Check you're using test keys with test prices

2. **Webhook not receiving events**
   - Verify webhook endpoint URL is correct
   - Check webhook secret matches
   - Use Stripe CLI to test locally first

3. **Subscription not updating in database**
   - Check webhook handler logs in Supabase
   - Verify webhook events are being sent
   - Check database RLS policies allow updates

---

## Support

- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Stripe Testing: https://stripe.com/docs/testing

---

**Ready to start? Let's implement the code!** 🚀
