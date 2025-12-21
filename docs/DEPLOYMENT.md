# Normie Observer - App Store Deployment Guide

## Overview

This guide covers deploying Normie Observer to the iOS App Store and Google Play Store.

## Prerequisites

### Development Environment
- Node.js 18+ and npm
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- Apple Developer Account ($99/year)
- Google Play Developer Account ($25 one-time)

### Required Assets
- App icon (1024x1024 PNG, no transparency for iOS)
- Screenshots for each device size
- App description and keywords
- Privacy Policy URL: https://normie.observer/privacy
- Terms of Service URL: https://normie.observer/terms
- Support email: support@tryechomind.net

---

## Build Process

### 1. Build the Web App

```bash
npm run build
```

This creates the production build in the `dist/` directory.

### 2. Sync with Capacitor

```bash
npx cap sync
```

This copies the web build to native platforms and updates native dependencies.

### 3. Generate App Icons

```bash
chmod +x scripts/generate-app-icons.sh
./scripts/generate-app-icons.sh path/to/your-icon.png
```

Copy generated icons to the appropriate platform directories.

---

## iOS Deployment

### Initial Setup

1. Open the iOS project:
   ```bash
   npx cap open ios
   ```

2. In Xcode:
   - Set your Team in Signing & Capabilities
   - Update Bundle Identifier if needed (com.normie.observer)
   - Configure app capabilities (Push Notifications if used)

### App Store Connect Setup

1. Create a new app in [App Store Connect](https://appstoreconnect.apple.com)
2. Fill in required information:
   - App name: Normie Observer
   - Bundle ID: com.normie.observer
   - Primary language: English
   - Category: Finance

### App Information

**Description:**
```
Normie Observer is your companion app for tracking Solana memecoins. Get real-time price updates, view whale activity, create memes, and connect with the community.

Features:
- Real-time token metrics and price charts
- Whale buy and jeet sell tracking
- Community meme generator
- Art gallery and NFT marketplace
- Live chat and community polls
- Diamond hands and whale leaderboards
```

**Keywords:**
```
solana, memecoin, crypto, token, price tracker, defi, web3, nft, community
```

### iOS Required Permissions

Add these to `ios/App/App/Info.plist`:

```xml
<!-- Camera and Photo Library (Required for Art Gallery uploads) -->
<key>NSCameraUsageDescription</key>
<string>Normie Observer needs camera access to take photos for the Art Gallery and meme creation.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Normie Observer needs photo library access to select images for the Art Gallery and meme creation.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Normie Observer needs permission to save memes and artwork to your photo library.</string>
```

### Review Guidelines Compliance

- Age Rating: 18+ (Financial Information, Investment Education, Cryptocurrency Content)
- No private key storage or wallet signing for transfers
- Cryptocurrency content disclaimer required
- No guarantees of profits or financial advice
- Minimum age requirement: 18 years old

### Build and Submit

1. Archive the app in Xcode (Product > Archive)
2. Upload to App Store Connect
3. Complete app metadata and screenshots
4. Submit for review

---

## Android Deployment

### Initial Setup

1. Open the Android project:
   ```bash
   npx cap open android
   ```

2. In Android Studio:
   - Update the signing configuration
   - Generate a signed release APK/AAB

### Android Required Permissions

Add these to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Camera and Photo Library (Required for Art Gallery uploads) -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
    android:maxSdkVersion="29" />

<!-- Optional: Camera feature (not required, allows install on devices without camera) -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

Note: The Capacitor Camera plugin should automatically add most permissions, but verify they are present before building.

### Generate Signed Bundle

1. Build > Generate Signed Bundle/APK
2. Create a new keystore (keep it safe!)
3. Fill in key details
4. Generate the Android App Bundle (.aab)

### Google Play Console Setup

1. Create a new app in [Google Play Console](https://play.google.com/console)
2. Complete store listing:
   - App name: Normie Observer
   - Short description (80 chars)
   - Full description (4000 chars)
   - App icon and feature graphic
   - Screenshots for different devices

### Content Rating

1. Complete the content rating questionnaire
2. Select categories:
   - Finance
   - Social

### Privacy & Data Safety

Fill out the Data Safety form:
- Data collected: Account info (optional), Device identifiers
- Data shared: None
- Data encrypted in transit: Yes
- Users can request data deletion: Yes

### Release

1. Upload the AAB to internal testing first
2. Test thoroughly on multiple devices
3. Promote to production after testing

---

## Pre-Deployment Checklist

### Technical Requirements

- [ ] Build completes without errors
- [ ] All API endpoints responding correctly
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] SSL/HTTPS configured
- [ ] Rate limiting enabled

### Legal Requirements

- [ ] Privacy Policy accessible at /privacy
- [ ] Terms of Service accessible at /terms
- [ ] Support email working (support@tryechomind.net)
- [ ] Age rating appropriate (18+)
- [ ] Cryptocurrency disclaimers included

### Content Requirements

- [ ] App icon in all required sizes
- [ ] Screenshots for all device sizes
- [ ] App description complete
- [ ] Keywords optimized
- [ ] No placeholder or test content

### Testing

- [ ] Run pre-deployment test suite
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Test offline behavior
- [ ] Test push notifications
- [ ] Test deep links

---

## Environment Variables

Ensure these are set in production:

```env
DATABASE_URL=<postgresql-connection-string>
NODE_ENV=production
NORMIE_ADMIN_PASSWORD=<secure-password>
SESSION_SECRET=<random-32-char-string>
VAPID_PUBLIC_KEY=<web-push-key>
VAPID_PRIVATE_KEY=<web-push-key>
```

---

## Maintenance

### Updating the App

1. Make code changes
2. Run `npm run build`
3. Run `npx cap sync`
4. Increment version in capacitor.config.ts
5. Build and submit new version

### Monitoring

- Monitor crash reports in App Store Connect / Google Play Console
- Check error logs regularly
- Monitor API usage and performance

---

## Support

For technical issues: support@tryechomind.net
For app store questions: Refer to Apple/Google documentation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0   | TBD  | Initial release |
