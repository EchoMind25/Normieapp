# Capacitor iOS Build Guide

This guide explains how to build the Normie Observer iOS app for App Store submission.

## Prerequisites

- macOS with Xcode 15+ installed
- Apple Developer account ($99/year)
- Node.js 18+

## Build Commands

Run these commands in order on your Mac:

```bash
# 1. Build the web app
npm run build

# 2. Add iOS platform (first time only)
npx cap add ios

# 3. Sync web assets to iOS
npx cap sync ios

# 4. Open in Xcode
npx cap open ios
```

## Xcode Configuration

After opening in Xcode:

1. **Bundle ID**: Set to `com.normie.observer`
2. **Version**: Set to `1.0.0`
3. **Build Number**: Set to `1`
4. **Minimum iOS**: 15.0
5. **Signing**: Enable "Automatically manage signing" and select your team

## App Icons

1. Create a 1024x1024 app icon (no transparency, no alpha channel)
2. Use https://www.appicon.co to generate all required sizes
3. Drag generated icons into `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

## Splash Screen

1. Create a 2732x2732 splash image
2. Place in `ios/App/App/Assets.xcassets/Splash.imageset/`
3. Update Contents.json in that folder

## Info.plist Additions

Add these to `ios/App/App/Info.plist`:

```xml
<key>NSUserTrackingUsageDescription</key>
<string>We use data to improve your experience</string>

<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

## Privacy Manifest (iOS 17+)

Create `ios/App/App/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyCollectedDataTypes</key>
    <array/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyTracking</key>
    <false/>
</dict>
</plist>
```

## App Store Submission

### Archive for App Store

1. In Xcode, select **Product > Archive**
2. Wait for build to complete
3. Click **Distribute App**
4. Select **App Store Connect**
5. Follow prompts to upload

### App Store Connect Metadata

**App Name**: Normie Observer - Solana Tracker

**Subtitle**: NFT & Memecoin Price Tracking

**Category**: Finance

**Age Rating**: 18+ (Financial Information, Investment Education)

Note: As of July 2025, Apple uses the new rating system (4+, 9+, 13+, 16+, 18+). The old 17+ rating has been replaced with 18+.

**Keywords**: NFT, Solana, cryptocurrency, blockchain, tracker, memecoin, crypto, price, alert

**Description**:
```
Track Solana memecoins and NFTs in real-time with Normie Observer.

FEATURES:
- Live price tracking with real-time updates
- Historical price charts with customizable timeframes
- NFT collection browsing and discovery
- Community features and meme generator
- Price alerts and push notifications
- Whale buy and jeet sell detection

DISCLAIMER:
This app provides informational price tracking for educational purposes only. We do not facilitate cryptocurrency or NFT purchases. All trading occurs through external wallets and platforms. Not financial advice - always do your own research.

REQUIREMENTS:
- Must be 18+ to use due to financial content
- Internet connection required for real-time data
```

**Privacy Policy URL**: https://normie.observer/privacy

**Support URL**: https://normie.observer

### App Review Notes

```
This app provides educational price tracking for Solana NFTs and memecoins.

Key compliance points:
- NO in-app cryptocurrency purchases
- NO Apple IAP bypassing  
- All pricing is informational/educational only
- Age-gated 18+ due to financial content
- Prominent risk disclaimers throughout app
- Community features are moderated with reporting functionality

Test Account:
Email: reviewer@normie.observer
Password: [Create secure password for Apple reviewer]

The app is built with Capacitor to provide native iOS features while maintaining our web codebase. All cryptocurrency transactions happen externally through user's own wallets - we do not facilitate purchases.
```

## Troubleshooting

### "Command not found: cap"
Run `npm install` to ensure Capacitor CLI is installed.

### Build fails in Xcode
1. Clean build folder: **Product > Clean Build Folder**
2. Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
3. Re-sync: `npx cap sync ios`

### White screen on launch
Check Safari Web Inspector for JavaScript errors:
1. Connect device to Mac
2. Open Safari > Develop > [Device] > normie.observer

### App rejected for "WebView wrapper"
Ensure native features are working:
- Haptic feedback on interactions
- Native share sheet
- Push notification prompt
- Offline detection banner
