# iMessage Link Preview Troubleshooting

## Issue: Link previews not showing in iMessage

iMessage (and other messaging apps) cache link previews very aggressively. Even after fixing the code, you may need to wait or force a refresh.

## ✅ What Was Fixed

1. **Case Sensitivity Issue:** Renamed `og-image.PNG` → `og-image.png` (lowercase)
   - Linux servers (like Vercel) are case-sensitive
   - The HTML was referencing lowercase, but file was uppercase
   - This is now fixed and deployed

## 🔍 Verification Steps

### Step 1: Verify the Image is Accessible

After deployment completes (usually 1-2 minutes), test if the image loads:

1. Open browser and go to: `https://soundpath.app/og-image.png`
2. The image should load and display
3. If you see a 404 error, the deployment hasn't finished yet

### Step 2: Verify Meta Tags

Check that the HTML has the correct meta tags:

1. Go to: `https://soundpath.app`
2. Right-click → "View Page Source"
3. Search for `og:image`
4. Should see: `<meta property="og:image" content="https://soundpath.app/og-image.png" />`

### Step 3: Test with Facebook Debugger

This will verify the meta tags are correct:

1. Go to: https://developers.facebook.com/tools/debug/
2. Enter: `https://soundpath.app`
3. Click "Scrape Again" to force refresh
4. Check if the preview shows correctly
5. If it shows here, the setup is correct - it's just iMessage caching

## 🍎 iMessage-Specific Solutions

### Option 1: Wait for Cache to Expire
- iMessage caches can take **24-48 hours** to expire naturally
- This is the most reliable method, but slowest

### Option 2: Add Query Parameter (Force Refresh)
Try sending a link with a unique parameter:
- `https://soundpath.app/?v=1`
- `https://soundpath.app/?test=123`
- iMessage may treat this as a "new" link and fetch fresh preview

### Option 3: Use Different Link Format
Try sending:
- `https://www.soundpath.app` (with www)
- Or: `https://soundpath.app/` (with trailing slash)
- Sometimes different URL formats trigger fresh fetches

### Option 4: Clear iMessage Cache (Advanced)
**Warning:** This will clear all iMessage data on your device

1. **On iPhone:**
   - Settings → General → iPhone Storage
   - Find "Messages"
   - Offload App (then reinstall)
   - OR: Delete and reinstall Messages app

2. **On Mac:**
   - Quit Messages app
   - Delete: `~/Library/Caches/com.apple.Messages`
   - Restart Messages

**Note:** This is extreme and will clear all message data. Only do this if absolutely necessary.

### Option 5: Test from Different Device
- Send the link from a device that hasn't seen it before
- Or ask someone else to send you the link
- Fresh devices won't have cached the old preview

## 🧪 Quick Test Checklist

After deployment completes:

- [ ] Image accessible at: `https://soundpath.app/og-image.png`
- [ ] Meta tags visible in page source
- [ ] Facebook Debugger shows correct preview
- [ ] Twitter Card Validator shows correct preview
- [ ] LinkedIn Post Inspector shows correct preview
- [ ] Try sending link with query parameter: `?v=2`
- [ ] Wait 24-48 hours for iMessage cache to expire

## 🐛 Common Issues

### "Image loads in browser but not in preview"
- **Cause:** Meta tags might be missing or incorrect
- **Fix:** Verify all `og:` and `twitter:` tags are in `index.html`

### "Preview shows but image is broken"
- **Cause:** Image file not accessible or wrong path
- **Fix:** Verify `https://soundpath.app/og-image.png` loads in browser

### "Old preview still showing"
- **Cause:** Aggressive caching by messaging apps
- **Fix:** Wait 24-48 hours OR use query parameter trick

### "Works on Facebook but not iMessage"
- **Cause:** iMessage has stricter caching than Facebook
- **Fix:** This is normal - iMessage can take longer to update

## 📱 Testing Other Platforms

While waiting for iMessage, test these (they update faster):

1. **WhatsApp:** Usually updates within 1-2 hours
2. **Facebook:** Updates immediately with debugger refresh
3. **Twitter:** Updates within minutes
4. **LinkedIn:** Updates within 1-2 hours
5. **Slack:** Updates within minutes

If these work, your setup is correct - it's just iMessage being slow.

## ✅ Success Indicators

You'll know it's working when:
- ✅ Image loads at `https://soundpath.app/og-image.png`
- ✅ Facebook Debugger shows preview
- ✅ Other platforms show preview
- ✅ iMessage shows preview (may take 24-48 hours)

## 🚀 Next Steps

1. **Wait for deployment** (1-2 minutes after push)
2. **Verify image loads** in browser
3. **Test with Facebook Debugger** (fastest verification)
4. **Try query parameter trick** for iMessage
5. **Be patient** - iMessage can take 24-48 hours

---

**Remember:** If Facebook Debugger shows the preview correctly, your setup is 100% correct. The iMessage delay is just aggressive caching, not a code issue.
