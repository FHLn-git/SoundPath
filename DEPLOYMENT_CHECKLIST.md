# Deployment Readiness Checklist

**Date:** January 25, 2026**

## ✅ Code Structure
- [x] Project organized with clean directory structure
- [x] Database files organized in `database/` folder
- [x] Documentation organized in `docs/` folder
- [x] Scripts organized in `scripts/` folder
- [x] Build configuration present (`vite.config.js`, `vercel.json`)
- [x] CI/CD pipeline configured (`.github/workflows/ci.yml`)

## ⚠️ Required Environment Variables

### Frontend (Vite - must be prefixed with `VITE_`)
These need to be set in your deployment platform (Vercel, Netlify, etc.):

**Required:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key

**Optional but Recommended:**
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (for payments)
- `VITE_RESEND_API_KEY` - Resend API key (for email - can use edge function instead)
- `VITE_RESEND_FROM_EMAIL` - From email address for Resend
- `VITE_ANALYTICS_PROVIDER` - Analytics provider (e.g., 'posthog')
- `VITE_ANALYTICS_API_KEY` - Analytics API key
- `VITE_POSTHOG_HOST` - PostHog host URL (if using PostHog)
- `VITE_SUPPORT_PROVIDER` - Support widget provider (e.g., 'crisp')
- `VITE_SUPPORT_API_KEY` - Support widget API key

### Supabase Edge Functions
These need to be set in Supabase Dashboard → Edge Functions → Secrets:

**Required:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)
- `STRIPE_SECRET_KEY` - Stripe secret key (for checkout/portal sessions)
- `RESEND_API_KEY` - Resend API key (for email sending)

**Optional:**
- `SUPABASE_ANON_KEY` - Supabase anonymous key (for JWT validation in some functions)
- `RESEND_FROM_EMAIL` - Default from email address

## ⚠️ Database Setup

### Required Steps:
1. **Run main schemas** (in order):
   - `database/schemas/master-schema.sql` - Core database schema
   - `database/schemas/saas-schema.sql` - Billing and subscriptions
   - `database/schemas/rbac-schema.sql` - Access control

2. **Run necessary migrations** from `database/migrations/`:
   - Check which features you need and run corresponding migrations
   - Common ones: `multi-tenant-migration.sql`, `onboarding-schema.sql`

3. **Configure Stripe Price IDs**:
   - Update `plans` table with Stripe price IDs
   - See `database/archive/update-stripe-price-ids.sql` for reference

4. **Set up Row-Level Security (RLS)**:
   - RLS policies should be included in `master-schema.sql`
   - Verify RLS is enabled on all tables

## ⚠️ Supabase Edge Functions

Deploy these functions to Supabase:

1. **`create-checkout-session`** - Stripe checkout
   - Requires: `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

2. **`create-portal-session`** - Stripe billing portal
   - Requires: `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

3. **`stripe-webhook`** - Stripe webhook handler
   - Requires: `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Configure webhook endpoint in Stripe Dashboard

4. **`send-email`** - Email sending via Resend
   - Requires: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

5. **`api/v1/tracks`** - REST API for tracks
   - Requires: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

6. **`api/v1/artists`** - REST API for artists
   - Requires: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

7. **`webhook-delivery`** - Webhook delivery system
   - Requires: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

8. **`health`** - Health check endpoint
   - No special requirements

## ⚠️ Security Checklist

### Before Deploying:
- [ ] Verify `.env` files are in `.gitignore` (✅ Already done)
- [ ] Ensure no API keys are hardcoded in source code
- [ ] Verify RLS policies are enabled on all database tables
- [ ] Check that service role keys are only in edge functions (server-side)
- [ ] Verify CORS settings are appropriate for your domain
- [ ] Review `vercel.json` security headers (✅ Already configured)
- [ ] Ensure Stripe webhook signing secret is configured
- [ ] Verify email sending is rate-limited

### Security Headers (Already Configured in vercel.json):
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy configured

## ⚠️ Build & Deploy

### Build Command:
```bash
npm run build
```

### Output Directory:
- `dist/` (configured in `vercel.json`)

### Deployment Platforms:
- **Vercel**: Configuration already in `vercel.json`
- **Netlify**: May need `netlify.toml` configuration
- **Other**: Ensure SPA routing is configured (all routes → `index.html`)

## ⚠️ Pre-Deployment Testing

### Local Testing:
- [ ] Run `npm run build` successfully
- [ ] Test `npm run preview` to verify production build
- [ ] Verify all environment variables are accessible
- [ ] Test database connection
- [ ] Test authentication flow
- [ ] Test Stripe checkout (if enabled)
- [ ] Test email sending (if enabled)

### Database Testing:
- [ ] Verify all required tables exist
- [ ] Test RLS policies work correctly
- [ ] Verify API endpoints work with API keys
- [ ] Test webhook endpoints

## ⚠️ Post-Deployment

### Immediate Checks:
- [ ] Verify site loads correctly
- [ ] Test user registration/login
- [ ] Verify database connections work
- [ ] Test Stripe integration (if enabled)
- [ ] Test email sending (if enabled)
- [ ] Check browser console for errors
- [ ] Verify analytics tracking (if enabled)

### Monitoring:
- [ ] Set up error tracking (Sentry is optional dependency)
- [ ] Monitor Supabase usage/quotas
- [ ] Monitor Stripe webhook deliveries
- [ ] Set up uptime monitoring

## 📝 Notes

### Environment Variable Naming:
- **Frontend**: Must use `VITE_` prefix (Vite requirement)
- **Edge Functions**: Use standard names (no prefix needed)

### Stripe Setup:
1. Create products and prices in Stripe Dashboard
2. Update `plans` table with `stripe_price_id_monthly` and `stripe_price_id_yearly`
3. Configure webhook endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Add webhook signing secret to edge function secrets

### Email Setup:
- Can use Resend directly (requires `VITE_RESEND_API_KEY` in frontend)
- OR use edge function (recommended - keeps API key server-side)
- Edge function requires `RESEND_API_KEY` in Supabase secrets

### Optional Features:
- Analytics (PostHog, etc.) - Optional
- Support widget (Crisp, etc.) - Optional
- Sentry error tracking - Optional (already configured as optional dependency)

## 🚨 Critical Before Launch

1. **Database**: Run all required schema files
2. **Environment Variables**: Set all required variables in deployment platform
3. **Edge Functions**: Deploy and configure all edge functions
4. **Stripe**: Configure products, prices, and webhooks
5. **Email**: Configure Resend or alternative email service
6. **Testing**: Test critical user flows end-to-end
7. **Security**: Verify RLS policies and API key security

## 📚 Documentation

See `docs/` folder for:
- Setup guides (`SUPABASE_SETUP.md`, `SAAS_SETUP_GUIDE.md`)
- Stripe integration (`STRIPE_SETUP_STEP_BY_STEP.md`)
- Troubleshooting (`TROUBLESHOOTING.md`)
