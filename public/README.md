# Public Assets Folder

This folder contains static assets that are served at the root of your website.

## Required Files

### og-image.png (Required for Social Sharing)
- **Size:** 1200 x 630 pixels
- **Format:** PNG or JPG
- **Purpose:** Preview image shown when links are shared on social media, messaging apps, etc.
- **Location:** Place `og-image.png` in this folder
- **URL:** Will be accessible at `https://soundpath.app/og-image.png`

## Optional Files

### Favicon Files (Optional but Recommended)
- `apple-touch-icon.png` (180x180) - iOS home screen icon
- `favicon-32x32.png` (32x32) - Standard favicon
- `favicon-16x16.png` (16x16) - Small favicon
- `site.webmanifest` - Web app manifest

## How It Works

Files in this `public` folder are automatically copied to the root of your built site during the build process. They are accessible at the root URL path.

For example:
- `public/og-image.png` → `https://soundpath.app/og-image.png`
- `public/favicon.ico` → `https://soundpath.app/favicon.ico`

## See Also

For detailed setup instructions, see: `docs/SOCIAL_SHARING_SETUP.md`
