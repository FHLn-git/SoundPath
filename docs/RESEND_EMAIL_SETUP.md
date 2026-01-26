# Resend Email Setup - Quick Guide

## Quick Answer: What Email Address to Use?

### For Testing (Right Now):
```
VITE_RESEND_FROM_EMAIL=onboarding@resend.dev
```

**This works immediately** - no setup needed! Just use this in your `.env` file.

---

## Detailed Explanation

### You Don't "Create" an Email Address in Resend

Resend doesn't work like Gmail where you create an email account. Instead:

1. **For Testing**: Use Resend's pre-made test domain
2. **For Production**: Verify a domain you own, then use any email address on that domain

---

## Option 1: Test Domain (Use This First!)

**Email Address:** `onboarding@resend.dev`

**How to Use:**
1. Just add this to your `.env`:
   ```env
   VITE_RESEND_FROM_EMAIL=onboarding@resend.dev
   ```
2. That's it! No verification needed.

**What Happens:**
- Emails will be sent successfully
- Perfect for development and testing
- ⚠️ **Note**: Some email providers may block or filter test domain emails
- For real production, you'll want to verify your own domain

---

## Option 2: Your Own Domain (For Production)

### Step 1: Get a Domain
If you don't have one:
- Buy from: GoDaddy, Namecheap, Google Domains, etc.
- Cost: Usually $10-15/year
- Example: `studioos.app`, `mylabel.com`, etc.

### Step 2: Verify Domain in Resend

1. **In Resend Dashboard:**
   - Go to **Domains** (left sidebar)
   - Click **"Add Domain"**
   - Enter your domain: `yourdomain.com`
   - Click **"Add"**

2. **Add DNS Records:**
   Resend will show you something like:
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:resend.com ~all
   
   Type: CNAME
   Name: resend._domainkey
   Value: resend._domainkey.resend.com
   ```

3. **Add These to Your Domain:**
   - Go to your domain registrar (where you bought the domain)
   - Find "DNS Settings" or "DNS Management"
   - Add each record Resend shows you
   - Save changes

4. **Wait for Verification:**
   - DNS changes can take 5 minutes to 24 hours
   - Resend will automatically verify when ready
   - You'll see a green checkmark ✅

### Step 3: Use Your Domain Email

Once verified, you can use **any email address** on your domain:

```env
# Examples (all work once domain is verified):
VITE_RESEND_FROM_EMAIL=noreply@yourdomain.com
VITE_RESEND_FROM_EMAIL=hello@yourdomain.com
VITE_RESEND_FROM_EMAIL=support@yourdomain.com
VITE_RESEND_FROM_EMAIL=team@yourdomain.com
```

**You don't need to "create" these addresses** - they just work once your domain is verified!

---

## Common Questions

### Q: Do I need to create an email account?
**A:** No! Once your domain is verified, you can use any email address on that domain. Resend handles the sending.

### Q: Can I use my Gmail address?
**A:** No. Resend requires you to either:
- Use their test domain (`onboarding@resend.dev`) for testing
- Verify your own domain for production

### Q: What if I don't have a domain?
**A:** For now, just use `onboarding@resend.dev` for testing. You can add your own domain later when you're ready for production.

### Q: Will emails from test domain reach real people?
**A:** They'll be sent, but some email providers may filter them. For production, verify your own domain.

### Q: How long does domain verification take?
**A:** Usually 5-30 minutes, but can take up to 24 hours for DNS to propagate.

---

## Recommended Setup Flow

1. **Start with Test Domain:**
   ```env
   VITE_RESEND_FROM_EMAIL=onboarding@resend.dev
   ```
   - Get your app working
   - Test email functionality

2. **When Ready for Production:**
   - Buy a domain (if you don't have one)
   - Verify it in Resend
   - Update `.env` to use your domain

---

## Example `.env` File

```env
# For Testing (works immediately):
VITE_RESEND_API_KEY=re_abc123xyz
VITE_RESEND_FROM_EMAIL=onboarding@resend.dev

# For Production (after domain verification):
# VITE_RESEND_FROM_EMAIL=noreply@studioos.app
```

---

## Troubleshooting

### "Invalid from address" error:
- Make sure you're using `onboarding@resend.dev` for testing
- Or make sure your domain is verified in Resend dashboard

### Emails not sending:
- Check your API key is correct
- Check Resend dashboard for delivery status
- Check spam folder

### Domain verification failing:
- Make sure DNS records are added correctly
- Wait a bit longer (DNS can be slow)
- Check Resend dashboard for specific error messages

---

**TL;DR**: Just use `onboarding@resend.dev` for now - it works immediately! 🚀
