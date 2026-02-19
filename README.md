# GeoReminder Lite

A location-based reminder app built with React Native and Expo. Get notified when you're near places relevant to your reminders.

## Features

- Create reminders with natural language text
- Automatic entity extraction using OpenAI GPT
- Background location tracking with geofencing
- Push notifications when near matching places
- Google Places API integration for nearby place detection
- Dark theme UI with Material Design 3

## Requirements

- Node.js 18+
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## API Keys Required

You'll need to obtain and configure:

1. **Google Places API Key** - For nearby place search and geocoding
2. **OpenAI API Key** - For entity extraction from reminder text

Configure these in the app's Settings screen or in `config/appConfig.ts`.

## Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Project Structure

```
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home screen (reminder list)
│   ├── add.tsx            # Add reminder screen
│   ├── edit/[id].tsx      # Edit reminder screen
│   └── settings.tsx       # Settings screen
├── components/            # Reusable UI components
├── contexts/              # React contexts (Location, Reminders)
├── database/              # SQLite database layer
├── services/              # Business logic services
│   ├── backgroundLocationTask.ts  # Background location tracking
│   ├── entityExtractor.ts         # OpenAI entity extraction
│   ├── locationMatcher.ts         # Place-reminder matching
│   ├── placesService.ts           # Google Places API
│   └── notificationService.ts     # Push notifications
├── config/                # App configuration
└── theme/                 # UI theme definitions
```

## How It Works

1. **Add a reminder** with text like "Buy milk at Walmart"
2. **Entity extraction** identifies "Walmart" as the target location
3. **Background tracking** monitors your location periodically
4. **Place matching** compares nearby places to your reminder entities
5. **Notification** alerts you when you're near a matching place

## Permissions

The app requires the following permissions:

- **Location (Always)** - For background location tracking
- **Notifications** - For reminder alerts

## License

MIT
