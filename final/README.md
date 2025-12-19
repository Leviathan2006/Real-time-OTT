# Netflix Subtitles with Translation Extension

A Chrome extension that captures Netflix subtitles in real-time and provides instant translation support. Seamlessly integrates with Netflix's interface to deliver translated subtitles without disrupting your viewing experience.

## 🌟 Features

### Real-Time Subtitle Capture
Intelligently monitors Netflix's video player to detect and capture subtitles as they appear. Uses advanced DOM monitoring techniques for reliable subtitle detection.

### Translation Support
Provides real-time translation using Google Translate's free API. Supports 5 languages with intelligent caching to reduce API calls and improve performance.

### Enhanced User Experience
Features a clean, non-intrusive overlay that displays subtitles at the top of your screen. When translation is enabled, shows both original and translated text.

## 🚀 Installation

### Prerequisites
- Google Chrome browser (version 88 or higher)
- Active Netflix subscription
- Stable internet connection

### Setup Instructions

1. **Download the Extension**
   - Clone or download this repository
   - Ensure all files are in the `netflix-subtitles` directory

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" using the toggle in the top-right corner
   - Click "Load unpacked" and select the `netflix-subtitles` folder

3. **Configure Settings**
   - Navigate to Netflix and start playing any content
   - Enable subtitles in Netflix's player interface
   - Click the extension icon to configure translation preferences

## 📖 Usage Guide

### Basic Operation
Once installed, the extension works automatically. Navigate to Netflix and start watching content with subtitles enabled. The extension will automatically detect and display subtitles in the overlay.

### Translation Features
- Click the extension icon while on Netflix
- Toggle translation ON/OFF and select your preferred language
- Settings are automatically saved and persist across sessions

## 🏗️ Technical Architecture

### Extension Structure
- **Content Script**: Manages Netflix integration, subtitle detection, and translation
- **Background Script**: Handles basic messaging for the extension
- **Popup Interface**: Provides user interface for translation settings

### Performance Optimizations
- Intelligent caching reduces API calls
- Efficient subtitle detection at optimal intervals
- Automatic cache clearing prevents memory bloat
- Graceful error handling for service unavailability

## 🐛 Troubleshooting

### Common Issues
- **Subtitles Not Appearing**: Ensure Netflix subtitles are enabled and refresh the page
- **Translation Not Working**: Check internet connection and try a different language
- **Extension Not Loading**: Verify Chrome version and extension is properly enabled

### Performance Tips
- Close unnecessary tabs to reduce memory usage
- Ensure stable internet connection for translation services
- Keep the extension updated for best performance

## 📝 Development Notes

### Prototype Status
This is a prototype version with focused functionality. Future versions may include additional languages, advanced formatting, multiple translation providers, and enhanced analytics.

### Technical Considerations
- Uses Google Translate's free endpoint with rate limits
- All data stored locally for privacy
- Designed for Netflix's current interface
- Optimized for minimal impact on viewing experience

## 📄 License

This project is developed for educational and personal use. Please respect Netflix's terms of service and use responsibly.

---

**Note**: This extension enhances your Netflix viewing experience. Please ensure compliance with Netflix's terms of service.
