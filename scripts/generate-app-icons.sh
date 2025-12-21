#!/bin/bash

# App Icon Generation Script for Normie Observer
# This script generates app icons in all required sizes for iOS and Android
# Requires: ImageMagick (convert command)

set -e

SOURCE_ICON="${1:-attached_assets/app-icon.png}"
OUTPUT_DIR="app-icons"

if [ ! -f "$SOURCE_ICON" ]; then
    echo "Error: Source icon not found at $SOURCE_ICON"
    echo "Usage: $0 [path-to-source-icon.png]"
    echo ""
    echo "Please provide a source icon that is at least 1024x1024 pixels."
    exit 1
fi

mkdir -p "$OUTPUT_DIR/ios"
mkdir -p "$OUTPUT_DIR/android"

echo "Generating iOS App Icons..."

# iOS icon sizes (all required for App Store)
IOS_SIZES=(
    "20x20:Icon-20.png"
    "40x40:Icon-20@2x.png"
    "60x60:Icon-20@3x.png"
    "29x29:Icon-29.png"
    "58x58:Icon-29@2x.png"
    "87x87:Icon-29@3x.png"
    "40x40:Icon-40.png"
    "80x80:Icon-40@2x.png"
    "120x120:Icon-40@3x.png"
    "60x60:Icon-60@2x.png"
    "180x180:Icon-60@3x.png"
    "76x76:Icon-76.png"
    "152x152:Icon-76@2x.png"
    "167x167:Icon-83.5@2x.png"
    "1024x1024:Icon-1024.png"
)

for SIZE_FILE in "${IOS_SIZES[@]}"; do
    SIZE="${SIZE_FILE%%:*}"
    FILE="${SIZE_FILE##*:}"
    echo "  Creating $FILE ($SIZE)"
    convert "$SOURCE_ICON" -resize "${SIZE}!" "$OUTPUT_DIR/ios/$FILE"
done

echo "Generating Android App Icons..."

# Android icon sizes
ANDROID_SIZES=(
    "48x48:mipmap-mdpi/ic_launcher.png"
    "72x72:mipmap-hdpi/ic_launcher.png"
    "96x96:mipmap-xhdpi/ic_launcher.png"
    "144x144:mipmap-xxhdpi/ic_launcher.png"
    "192x192:mipmap-xxxhdpi/ic_launcher.png"
    "512x512:playstore-icon.png"
)

for SIZE_FILE in "${ANDROID_SIZES[@]}"; do
    SIZE="${SIZE_FILE%%:*}"
    FILE="${SIZE_FILE##*:}"
    DIR=$(dirname "$OUTPUT_DIR/android/$FILE")
    mkdir -p "$DIR"
    echo "  Creating $FILE ($SIZE)"
    convert "$SOURCE_ICON" -resize "${SIZE}!" "$OUTPUT_DIR/android/$FILE"
done

# Generate adaptive icon foreground (with padding for Android adaptive icons)
echo "Generating Android Adaptive Icon..."
convert "$SOURCE_ICON" -resize "432x432" -gravity center -background none -extent "512x512" "$OUTPUT_DIR/android/ic_launcher_foreground.png"

echo ""
echo "Icon generation complete!"
echo ""
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. iOS: Copy ios/ folder contents to ios/App/App/Assets.xcassets/AppIcon.appiconset/"
echo "2. Android: Copy android/ folder contents to android/app/src/main/res/"
echo "3. Run 'npx cap sync' to sync assets"
