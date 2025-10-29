# Pay Me Drive - Mobile Client

React Native mobile application built with Expo and React Native Paper for the Pay Me Drive cloud storage platform.

## Features

- 📧 **Email OTP Authentication** - Secure passwordless login
- 📂 **File Management** - Upload, download, and delete files
- 💾 **Storage Quota** - Real-time storage usage tracking
- 👑 **Subscription Tiers** - Free, Pro, and Unlimited plans
- 👤 **Profile Management** - Update profile and manage account
- 🎨 **Modern UI** - Material Design with React Native Paper
- 📱 **Cross-Platform** - Works on iOS, Android, and Web

## Tech Stack

- **Framework**: Expo / React Native
- **UI Library**: React Native Paper (Material Design)
- **Navigation**: React Navigation
- **State Management**: React Context API
- **HTTP Client**: Axios
- **File System**: Expo File System & Document Picker
- **Storage**: AsyncStorage for auth tokens

## Prerequisites

- Node.js >= 18
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Physical device with Expo Go app (optional)

## Installation

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start Expo development server
npm start
```

## Running the App

### iOS Simulator (Mac only)
```bash
npm run ios
```

### Android Emulator
```bash
npm run android
```

### Web Browser
```bash
npm run web
```

### Physical Device
1. Install **Expo Go** from App Store or Google Play
2. Scan the QR code from the terminal
3. App will load on your device

## Project Structure

```
client/
├── api/                    # API service layer
│   ├── config.ts          # Axios configuration
│   ├── auth.ts            # Authentication API
│   ├── users.ts           # User API
│   ├── files.ts           # File API
│   └── subscription.ts    # Subscription API
├── context/               # React Context
│   └── AuthContext.tsx    # Auth state management
├── navigation/            # Navigation setup
│   └── AppNavigator.tsx   # Stack navigation
├── screens/               # App screens
│   ├── LoginScreen.tsx    # OTP authentication
│   ├── HomeScreen.tsx     # Dashboard
│   ├── FilesScreen.tsx    # File management
│   ├── SubscriptionScreen.tsx  # Plans
│   └── ProfileScreen.tsx  # User profile
├── App.tsx                # App entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Screens

### 1. Login Screen
- Email input for OTP request
- OTP verification
- Automatic account creation for new users
- Name input for first-time users

### 2. Home Screen
- Welcome message with user name
- Current subscription tier badge
- Storage usage progress bar
- File count and quota status
- Quick actions (View Files, Upgrade)
- Pull-to-refresh

### 3. Files Screen
- List of all user files
- Search functionality
- File upload (document picker)
- File download (with sharing)
- File deletion (with confirmation)
- File metadata (size, date, format)
- Pull-to-refresh

### 4. Subscription Screen
- Current plan display
- All available tiers
- Pricing and features
- Upgrade functionality
- Mock payment processing

### 5. Profile Screen
- User information display
- Edit profile (name)
- Email (read-only)
- Current subscription tier
- Logout
- Delete account (with confirmation)

## API Configuration

Update the API base URL in `api/config.ts`:

```typescript
const API_BASE_URL = 'http://localhost:3000/api';
```

For physical devices, use your computer's local IP:
```typescript
const API_BASE_URL = 'http://192.168.1.X:3000/api';
```

## Features in Detail

### Authentication Flow
1. User enters email
2. Backend sends 6-digit OTP via email
3. User enters OTP
4. Backend verifies and returns JWT token
5. Token stored in AsyncStorage
6. Token included in all API requests

### File Upload
1. User taps FAB button
2. Document picker opens
3. User selects file
4. File uploaded via multipart/form-data
5. Quota checked before upload
6. File list refreshed

### File Download
1. User taps download icon
2. File downloaded from backend
3. File saved to device storage
4. Share sheet opens (if available)

### Subscription Upgrade
1. User views available tiers
2. User selects desired tier
3. Confirmation dialog shown
4. Mock payment processed
5. User profile updated
6. New quota applied

## Development

### Debug Mode
Shake your device or press `Cmd+D` (iOS) / `Cmd+M` (Android) to open dev menu.

### Hot Reload
Enabled by default. Save files to see changes instantly.

### Error Handling
All API errors are caught and displayed to users via:
- Snackbars for minor errors
- Alert dialogs for critical errors

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

### Standalone Apps
```bash
# Configure app.json first
expo build:ios -t archive  # iOS
expo build:android -t app-bundle  # Android
```

## Environment Variables

Create `.env` file:
```env
API_BASE_URL=http://localhost:3000/api
```

## Troubleshooting

### Cannot connect to API
- Ensure backend is running on port 3000
- Check firewall settings
- Use local IP address for physical devices
- Verify API_BASE_URL in config.ts

### Expo Go App not loading
- Ensure device and computer are on same network
- Restart Expo development server
- Clear Expo cache: `expo start -c`

### File upload not working
- Check backend file size limits
- Verify multipart/form-data support
- Check quota limits

## Performance

- Images lazy loaded
- API responses cached in memory
- Pull-to-refresh for data updates
- Optimistic UI updates where possible

## Security

- JWT tokens stored securely in AsyncStorage
- No sensitive data in plain text
- Token included in Authorization header
- Automatic token refresh on app launch

## Testing

```bash
# Run tests (when configured)
npm test

# Type checking
npx tsc --noEmit
```

## License

MIT

## Support

For issues or questions:
- Email: support@paymedrive.com
- GitHub: https://github.com/yourusername/paymedrive
