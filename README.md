# Pay Me Drive

> "You get a **free** drive...if you pay me!"

A file management/backup system with a tier-based subscription model.
Refer to `paymedrive.md` for non-ai information on system architecture.
`pmd_architecture.png` shows the user flow on the system.
See `plan.md` for detailed development plan, and `prompt_history.md`
for the chat history with cascade (agentic claude sonnet).
Use test@example.com 123456 for testing.

## 📋 Features

- **Tiered Subscriptions**
  - Free: 10 items or 10MB
  - Pro: 100 items or 100MB ($10/month)
  - Unlimited: Unlimited items ($0.5/MB/day)

- **Secure Authentication**
  - Email-based OTP authentication
  - JWT token management

- **File Management**
  - Upload, download, and delete files
  - Quota enforcement
  - Ownership validation

- **Cross-Platform Client**
  - Web, iOS, and Android support
  - Built with Expo and React Native Paper

## 🏗️ Tech Stack

### Backend
- Node.js + Express + TypeScript
- SQLite + Sequelize ORM
- JWT Authentication
- Nodemailer (OTP emails)
- Swagger/OpenAPI Documentation
- Winston Logging
- Jest Testing

### Client
- Expo (React Native)
- React Native Paper
- TypeScript

### Infrastructure
- Docker + Docker Compose
- Hot-reload development environment

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for client development)
- npm or yarn

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd paymedrive
   ```

2. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

3. **Start with Docker**
   ```bash
   docker-compose up --build
   ```

   The backend will be available at:
   - API: http://localhost:3000
   - API Docs: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/health

### Local Development (without Docker)

1. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   npm start
   ```

### Client Setup

1. **Install dependencies**
   ```bash
   cd client
   npm install
   ```

2. **Start Expo**
   ```bash
   npm start
   ```

   - Press `w` for web
   - Press `a` for Android
   - Press `i` for iOS

## 📁 Project Structure

```
paymedrive/
├── server/                 # Backend application
│   ├── clients/           # External service clients (DB, Email, Storage)
│   ├── config/            # Configuration files (Swagger)
│   ├── files/             # File management module
│   ├── users/             # User management module
│   ├── middleware/        # Express middleware
│   ├── models/            # Database models
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── tests/             # Unit and integration tests
├── client/                # Expo mobile/web app
│   ├── api/               # API client
│   ├── components/        # Reusable components
│   ├── context/           # React context (state management)
│   └── views/             # Screen components
├── data/                  # SQLite database (gitignored)
├── bucket/                # File storage (gitignored)
├── Dockerfile             # Docker configuration
├── compose.yaml           # Docker Compose configuration
└── plan.md               # Development plan
```

## 🔧 Available Scripts

### Backend

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run all tests with coverage
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Client

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web browser

## 📚 API Documentation

Interactive API documentation is available at `/api-docs` when the server is running.

### Key Endpoints

**Authentication**
- `POST /api/auth` - Initiate login/signup (sends OTP)
- `POST /api/otp` - Verify OTP and get JWT token

**Users**
- `GET /api/users` - Get user info (protected)
- `POST /api/users` - Create new user
- `DELETE /api/users` - Delete user (protected)
- `POST /api/subscribe` - Update subscription (protected)

**Files**
- `GET /api/files` - List all user files (protected)
- `GET /api/file?id={fileId}` - Download file (protected)
- `POST /api/file` - Upload file (protected)
- `DELETE /api/file?id={fileId}` - Delete file (protected)

## 🗄️ Database Schema

- **User**: id, name, email, tier, isAdmin, accessToken, isDeleted, timestamps
- **File**: id, name, location, size, format, isDeleted, timestamps
- **Subscription**: id, tier, limitSize, limitItems
- **UserFiles**: userId, fileId (junction table)
- **UserSubscription**: userId, subscriptionId (junction table)

## 🧪 Testing

Run tests with:
```bash
cd server
npm test
```

Coverage report will be generated in `coverage/` directory.

## 🔐 Environment Variables

See `server/.env.example` for all available environment variables.

Key variables:
- `JWT_SECRET` - Secret key for JWT tokens
- `SMTP_*` - Email configuration for OTP
- `DB_PATH` - SQLite database location
- `BUCKET_PATH` - File storage directory

## 🤝 Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Run linting and formatting before committing
4. Update documentation as needed

## 📄 License

MIT