# Social Sharing & SEO Setup Guide

## Overview

This guide explains how to set up social sharing previews and optimize SEO for SoundPath. When someone shares a link to your site, it will show a beautiful preview card with your logo, title, and description.

## ✅ What's Already Configured

The following has been set up in `index.html`:

- ✅ Open Graph meta tags (Facebook, LinkedIn, WhatsApp, iMessage)
- ✅ Twitter Card meta tags
- ✅ Structured data (JSON-LD) for SEO
- ✅ Comprehensive SEO meta tags
- ✅ Mobile-friendly meta tags

## 📸 Required: Add Social Sharing Image

To make links show previews with your logo, you need to add an image file.

### Step 1: Create the Image

Create an image with these specifications:

- **Dimensions:** 1200 x 630 pixels (recommended)
- **Format:** PNG or JPG
- **File name:** `og-image.png` (or `og-image.jpg`)
- **Content:** Should include:
  - SoundPath logo
  - "A&R Command Center" tagline
  - Your brand colors (purple/red gradient)
  - Clean, professional design

### Step 2: Add the Image

1. Create a `public` folder in your project root (if it doesn't exist)
2. Place your `og-image.png` file in the `public` folder
3. The file will be accessible at: `https://soundpath.app/og-image.png`

### Step 3: Verify It Works

After deploying, test your social sharing previews:

1. **Facebook Debugger:** https://developers.facebook.com/tools/debug/
   - Enter: `https://soundpath.app`
   - Click "Scrape Again" to refresh cache

2. **Twitter Card Validator:** https://cards-dev.twitter.com/validator
   - Enter: `https://soundpath.app`
   - Verify the preview looks correct

3. **LinkedIn Post Inspector:** https://www.linkedin.com/post-inspector/
   - Enter: `https://soundpath.app`
   - Check the preview

4. **Test in Messages:**
   - Send yourself a link via iMessage/WhatsApp
   - Verify the preview bubble appears with your image

### Quick Image Creation Tips

**Option 1: Use Canva (Free)**
1. Go to https://www.canva.com
2. Create a custom design: 1200 x 630 pixels
3. Add your logo, brand colors, and tagline
4. Download as PNG
5. Save as `og-image.png` in the `public` folder

**Option 2: Use Figma**
1. Create a 1200 x 630 frame
2. Design your social card
3. Export as PNG
4. Save as `og-image.png` in the `public` folder

**Option 3: Use Online Tools**
- https://www.bannerbear.com/tools/open-graph-image-generator/
- https://og-image.vercel.app/

## 🎨 Optional: Additional Favicon Files

For better mobile experience, you can also add:

- `apple-touch-icon.png` (180x180) - iOS home screen icon
- `favicon-32x32.png` (32x32) - Standard favicon
- `favicon-16x16.png` (16x16) - Small favicon
- `site.webmanifest` - Web app manifest

Place these in the `public` folder as well.

## 🔍 SEO Best Practices

### Current SEO Features

✅ **Meta Tags:**
- Title, description, keywords
- Open Graph tags for social sharing
- Twitter Card tags
- Mobile viewport settings

✅ **Structured Data:**
- SoftwareApplication schema
- Organization schema
- Helps search engines understand your site

✅ **Mobile Optimization:**
- Responsive viewport
- Theme colors
- Apple touch icons

### Additional SEO Tips

1. **Content:** Ensure your landing page has quality content with relevant keywords
2. **Performance:** Keep page load times fast (already optimized with Vite)
3. **HTTPS:** Ensure your site uses HTTPS (Vercel provides this automatically)
4. **Sitemap:** Consider adding a sitemap.xml for search engines
5. **Robots.txt:** Add a robots.txt file if needed

## 🧪 Testing Checklist

After adding your `og-image.png`:

- [ ] Image file exists in `public/og-image.png`
- [ ] Image is accessible at `https://soundpath.app/og-image.png`
- [ ] Facebook Debugger shows correct preview
- [ ] Twitter Card Validator shows correct preview
- [ ] LinkedIn Post Inspector shows correct preview
- [ ] iMessage/WhatsApp shows preview bubble
- [ ] Image loads quickly (< 2 seconds)

## 🐛 Troubleshooting

### Image Not Showing

**Problem:** Social platforms show no image or broken image

**Solutions:**
1. Verify the image is in the `public` folder (not `src` or `assets`)
2. Check the file name matches exactly: `og-image.png`
3. Ensure the image is accessible at the full URL
4. Clear the platform's cache (use their debugger tools)
5. Wait 24-48 hours for cache to refresh naturally

### Wrong Preview Showing

**Problem:** Old preview still showing after updating image

**Solutions:**
1. Use platform debuggers to force cache refresh:
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator
   - LinkedIn: https://www.linkedin.com/post-inspector/
2. Wait 24-48 hours for natural cache expiration
3. Verify meta tags are correct in `index.html`

### Image Too Large

**Problem:** Image takes too long to load

**Solutions:**
1. Optimize the image:
   - Use PNG compression tools
   - Or convert to JPG if acceptable
   - Target file size: < 500KB
2. Use image optimization services:
   - https://tinypng.com/
   - https://squoosh.app/

## 📱 Platform-Specific Notes

### Facebook/Meta
- Requires `og:image` tag (already added)
- Image should be at least 600x315 pixels
- Recommended: 1200x630 pixels
- Supports PNG, JPG, GIF

### Twitter
- Uses `twitter:image` tag (already added)
- Card type: `summary_large_image` (already set)
- Image should be at least 300x157 pixels
- Recommended: 1200x630 pixels

### LinkedIn
- Uses Open Graph tags (already added)
- Image should be at least 1200x627 pixels
- Recommended: 1200x630 pixels

### WhatsApp/iMessage
- Uses Open Graph tags (already added)
- Image should be at least 300x300 pixels
- Recommended: 1200x630 pixels

## 🚀 Next Steps

1. Create your `og-image.png` (1200x630 pixels)
2. Place it in the `public` folder
3. Deploy to production
4. Test with social media debuggers
5. Share a link and verify the preview appears!

---

**Need Help?** Check the troubleshooting section or test your links with the platform debuggers listed above.
