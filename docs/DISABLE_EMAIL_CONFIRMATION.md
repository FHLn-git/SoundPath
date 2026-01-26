# Disable Email Confirmation in Supabase

If you're hitting email rate limits during development/testing, you can disable email confirmation in Supabase:

## Steps:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Under **Email Auth**, find **"Enable email confirmations"**
4. **Toggle it OFF** (disable email confirmations)
5. Save changes

## Benefits:
- Users can sign up and log in immediately without email confirmation
- No rate limit issues during development
- Faster testing and onboarding flow

## Security Note:
- For production, you may want to re-enable email confirmation
- Or implement a custom email confirmation flow with better rate limiting

## Alternative: Increase Rate Limits
If you want to keep email confirmation but increase limits:
1. Go to **Settings** → **API**
2. Check your rate limit settings
3. Consider upgrading your Supabase plan for higher limits
