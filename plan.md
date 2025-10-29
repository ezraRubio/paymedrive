# Pay Me Drive - Development Plan

**Project**: File storage service with tiered subscriptions  
**Tech Stack**: Docker, Node.js/Express, SQLite, TypeScript, Expo, React Native Paper  
**Date**: Oct 29, 2025

---

## Project Overview

### Subscription Tiers
| Tier      | Limits                                 | Cost        |
|-----------|----------------------------------------|-------------|
| Free      | 10 items OR 10MB (whichever first)    | $0          |
| Pro       | 100 items OR 100MB (whichever first)  | $10/month   |
| Unlimited | Unlimited items                        | $0.5/MB/day |

### API Endpoints

**Users:**
- `GET /users` - Get user info from idToken
- `POST /users` - Create new user
- `DELETE /users` - Soft delete user
- `POST /subscribe` - Update subscription after payment validation
- `POST /auth` - Initiate login/signup/signout
- `POST /otp` - Complete login/signup with OTP

**Files:**
- `GET /files` - List all user files
- `GET /file` - Get file info by ID (with ownership check)
- `POST /file` - Upload file
- `DELETE /file` - Delete file (with ownership check)

### Database Schema

**User**
- id, name, email, tier, isAdmin, accessToken, isDeleted, createdAt, modifyAt

**File**
- id, name, location, size, format, isDeleted, createdAt, modifyAt

**Subscription**
- id, tier, limitSize, limitItems

**UserFiles** (junction)
- userId, fileId

**UserSubscription** (junction)
- userId, subscriptionId

---

## Architecture Decisions

### Confirmed Technologies
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite + Sequelize ORM
- **Storage**: Local `/bucket` directory
- **Authentication**: OTP (Nodemailer) + JWT
- **Payment**: Mock implementation
- **API Docs**: Auto-generated OpenAPI/Swagger
- **Client**: Expo + React Native Paper (web, iOS, Android)
- **Testing**: Jest + Supertest (unit + integration)
- **Rate Limiting**: express-rate-limit
- **Logging**: Winston or Pino
- **OTP Caching**: In-memory implementation (simple Map/object with TTL)

---

## Phase 1: Project Foundation & Infrastructure Setup

### Objectives
Set up complete development environment with Docker, TypeScript, and all configuration files.

### Tasks
1. **Docker Configuration**
   - Create production-ready `Dockerfile` for backend
   - Configure `compose.yaml` with backend service
   - Volume mounts for development hot-reload
   - Volume for SQLite database persistence
   - Volume for `/bucket` directory

2. **Backend Setup**
   - Initialize `server/package.json` with all dependencies
   - Configure `server/tsconfig.json` for strict TypeScript
   - Create `server/.env.example` template
   - Setup ESLint + Prettier configuration
   - Configure nodemon for hot-reload

3. **Project Configuration**
   - Create comprehensive `.gitignore`
   - Create `.dockerignore`
   - Setup folder structure

### Key Dependencies (Backend)
```json
{
  "dependencies": {
    "express": "^4.18.x",
    "sequelize": "^6.x",
    "sqlite3": "^5.x",
    "jsonwebtoken": "^9.x",
    "bcrypt": "^5.x",
    "nodemailer": "^6.x",
    "multer": "^1.4.x",
    "joi": "^17.x",
    "swagger-jsdoc": "^6.x",
    "swagger-ui-express": "^5.x",
    "express-rate-limit": "^7.x",
    "winston": "^3.x",
    "cors": "^2.x",
    "helmet": "^7.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "ts-node": "^10.x",
    "nodemon": "^3.x",
    "@types/express": "^4.x",
    "@types/node": "^20.x",
    "@types/jsonwebtoken": "^9.x",
    "@types/bcrypt": "^5.x",
    "@types/nodemailer": "^6.x",
    "@types/multer": "^1.x",
    "jest": "^29.x",
    "ts-jest": "^29.x",
    "supertest": "^6.x",
    "@types/supertest": "^6.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

### Environment Variables (.env.example)
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_PATH=./data/database.sqlite

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# OTP
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

# File Storage
BUCKET_PATH=./bucket
MAX_FILE_SIZE=104857600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Deliverables
- ✅ Working Docker setup with hot-reload
- ✅ TypeScript compilation configured
- ✅ All configuration files in place
- ✅ Environment template created
- ✅ Folder structure established

---

## Phase 2: Database Models & Migrations

### Objectives
Create all Sequelize models, relationships, and initial database setup.

### Tasks
1. **Database Client**
   - `server/clients/db.ts` - Sequelize initialization
   - Connection management
   - Sync/migration utilities

2. **Core Models**
   - `server/models/user.model.ts` - User entity
   - `server/models/file.model.ts` - File entity
   - `server/models/subscription.model.ts` - Subscription tiers
   - `server/models/user-files.model.ts` - Junction table
   - `server/models/user-subscription.model.ts` - Junction table

3. **Relationships**
   - User hasMany Files (through UserFiles)
   - User hasOne Subscription (through UserSubscription)
   - Subscription hasMany Users
   - Files belongsToMany Users

4. **Seeders**
   - `server/seeders/01-subscriptions.ts` - Create 3 tiers
   - Default admin user (optional)

5. **Migrations**
   - Setup Sequelize CLI
   - Create migration files for all tables
   - Migration scripts in package.json

### Model Specifications

**User Model**
```typescript
{
  id: UUID (primary key),
  name: STRING (required),
  email: STRING (unique, required),
  tier: ENUM['free', 'pro', 'unlimited'] (default: 'free'),
  isAdmin: BOOLEAN (default: false),
  accessToken: TEXT (nullable),
  isDeleted: BOOLEAN (default: false),
  createdAt: DATE,
  modifyAt: DATE
}
```

**File Model**
```typescript
{
  id: UUID (primary key),
  name: STRING (required),
  location: STRING (required, unique),
  size: INTEGER (required, in bytes),
  format: STRING (required),
  isDeleted: BOOLEAN (default: false),
  createdAt: DATE,
  modifyAt: DATE
}
```

**Subscription Model**
```typescript
{
  id: UUID (primary key),
  tier: ENUM['free', 'pro', 'unlimited'] (unique),
  limitSize: INTEGER (nullable, in bytes),
  limitItems: INTEGER (nullable)
}
```

### Seed Data
```javascript
Subscriptions:
1. { tier: 'free', limitSize: 10485760, limitItems: 10 }
2. { tier: 'pro', limitSize: 104857600, limitItems: 100 }
3. { tier: 'unlimited', limitSize: null, limitItems: null }
```

### Deliverables
- ✅ All models created with proper types
- ✅ Relationships configured
- ✅ Migration system working
- ✅ Seed data loaded
- ✅ Database auto-sync in development

---

## Phase 3: Core Authentication System (OTP + JWT)

### Objectives
Implement email-based OTP authentication with JWT token management.

### Tasks
1. **OTP Utilities**
   - `server/utils/otp.util.ts`
     - Generate random 6-digit OTP
     - In-memory OTP store with TTL (Map-based)
     - OTP validation logic
     - Automatic expiry cleanup

2. **JWT Utilities**
   - `server/utils/jwt.util.ts`
     - Token generation
     - Token verification
     - Payload extraction

3. **Email Handler**
   - `server/clients/email.handler.ts`
     - Nodemailer configuration
     - OTP email template
     - Send email function
     - Error handling

4. **Auth Middleware**
   - `server/middleware/auth.middleware.ts`
     - JWT verification middleware
     - Extract user from token
     - Attach user to request object
     - Handle token errors

5. **Auth Service**
   - `server/users/auth.service.ts`
     - Initiate auth (send OTP)
     - Verify OTP
     - Generate JWT on success
     - Handle signup vs login

6. **Rate Limiting**
   - OTP request rate limiting (5 requests per 15 minutes)
   - Auth endpoint protection

### Authentication Flow

**POST /auth**
1. Receive email
2. Check if user exists
3. Generate 6-digit OTP
4. Store OTP in memory (10-minute expiry)
5. Send OTP via email
6. Return success (don't expose user existence)

**POST /otp**
1. Receive email + OTP
2. Validate OTP from memory store
3. If invalid/expired → return error
4. If valid:
   - Create user if doesn't exist
   - Generate JWT with userId
   - Update user.accessToken
   - Clear OTP from memory
   - Return JWT + user info

### In-Memory OTP Store Structure
```typescript
// Simple implementation
interface OTPEntry {
  otp: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

const otpStore = new Map<string, OTPEntry>();

// Cleanup expired OTPs every minute
setInterval(() => {
  const now = new Date();
  for (const [email, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000);
```

### Deliverables
- ✅ OTP generation and storage
- ✅ Email sending functionality
- ✅ JWT generation and verification
- ✅ Auth middleware working
- ✅ Complete auth flow tested
- ✅ Rate limiting active

---

## Phase 4: User Management & Subscription Logic

### Objectives
Implement user CRUD operations and subscription management.

### Tasks
1. **User Repository**
   - `server/users/repository.ts`
     - findById, findByEmail
     - create, update, softDelete
     - Database operations abstraction

2. **User Service**
   - `server/users/service.ts`
     - Business logic for user operations
     - Subscription tier management
     - Usage calculation (total files/size)
     - Quota validation

3. **Subscription Service**
   - `server/services/subscription.service.ts`
     - Get user's current subscription
     - Upgrade/downgrade logic
     - Validate tier change rules
     - Mock payment validation

4. **Payment Service (Mock)**
   - `server/services/payment.service.ts`
     - Mock payment validation
     - Always return success for development
     - Log payment attempts

5. **User Validation**
   - `server/users/validation.ts`
     - Joi schemas for requests
     - Email validation
     - Tier validation

6. **User Routes**
   - `server/users/routes.ts`
     - GET /users (protected)
     - POST /users (public, creates user)
     - DELETE /users (protected)
     - POST /subscribe (protected)

### Business Logic

**GET /users**
- Extract userId from JWT
- Return user info + current usage stats
- Include subscription details

**POST /users**
- Validate email
- Create user with 'free' tier
- Return user info

**DELETE /users**
- Extract userId from JWT
- Soft delete (set isDeleted = true)
- Don't delete files immediately

**POST /subscribe**
- Body: { tier: 'pro' | 'unlimited', paymentToken: string }
- Validate mock payment
- Check if downgrade is allowed (current usage fits new tier)
- Update UserSubscription
- Return updated user info

### Quota Utilities
```typescript
// server/utils/quota.util.ts
- calculateUserUsage(userId): { itemCount, totalSize }
- canUploadFile(userId, fileSize): boolean
- getRemainingQuota(userId): { items, size }
```

### Deliverables
- ✅ User CRUD operations working
- ✅ Subscription management functional
- ✅ Mock payment integration
- ✅ Quota validation logic
- ✅ All routes tested

---

## Phase 5: File Management System

### Objectives
Implement file upload, download, delete with quota enforcement.

### Tasks
1. **File Handler**
   - `server/clients/file.handler.ts`
     - Save file to `/bucket`
     - Generate unique filename
     - Read file from `/bucket`
     - Delete file from `/bucket`
     - File metadata extraction

2. **Multer Configuration**
   - `server/middleware/multer.config.ts`
     - Configure disk storage
     - File filter (allowed types)
     - Size limits per tier
     - Error handling

3. **File Repository**
   - `server/files/repository.ts`
     - CRUD operations for File model
     - Find files by userId
     - Find file with ownership check

4. **File Service**
   - `server/files/service.ts`
     - Upload logic with quota check
     - Download logic with ownership check
     - Delete logic (soft + hard delete)
     - List user files

5. **File Validation**
   - `server/files/validation.ts`
     - File upload validation
     - File ID validation
     - Allowed file types

6. **File Routes**
   - `server/files/routes.ts`
     - GET /files (list all user files)
     - GET /file (download file)
     - POST /file (upload file)
     - DELETE /file (delete file)

### File Upload Flow

**POST /file**
1. Check user quota before accepting file
2. Multer processes upload
3. Generate unique location path
4. Save file to `/bucket/{userId}/{uniqueId}.{ext}`
5. Create File record in database
6. Create UserFiles association
7. Return file metadata

### File Download Flow

**GET /file?id={fileId}**
1. Verify JWT
2. Get file record from database
3. Check ownership (via UserFiles)
4. Read file from `/bucket`
5. Set proper content headers
6. Stream file to client

### File Delete Flow

**DELETE /file?id={fileId}**
1. Verify JWT
2. Get file record
3. Check ownership
4. Soft delete (set isDeleted = true)
5. Optionally: Hard delete after 30 days (cron job)

### File Storage Structure
```
/bucket/
  ├── {userId}/
  │   ├── {fileId}.{ext}
  │   └── {fileId}.{ext}
  └── {userId}/
      └── {fileId}.{ext}
```

### Deliverables
- ✅ File upload with quota enforcement
- ✅ File download with ownership check
- ✅ File delete functionality
- ✅ File list endpoint
- ✅ `/bucket` directory management
- ✅ All file operations tested

---

## Phase 6: API Documentation & Testing

### Objectives
Auto-generate API documentation and achieve comprehensive test coverage.

### Tasks
1. **Swagger Configuration**
   - `server/swagger.config.ts`
     - swagger-jsdoc setup
     - API info and version
     - Server URLs
     - Security schemes (JWT)

2. **JSDoc Comments**
   - Add JSDoc to all route handlers
   - Include request/response examples
   - Document authentication requirements
   - Error responses

3. **Swagger UI Integration**
   - Mount at `/api-docs`
   - Include all endpoints
   - Interactive testing interface

4. **Unit Tests**
   - `server/tests/unit/`
     - Test all services
     - Test utilities (OTP, JWT, quota)
     - Mock database operations
     - Test business logic

5. **Integration Tests**
   - `server/tests/integration/`
     - Test all API endpoints
     - Test authentication flow
     - Test file operations
     - Test subscription flow
     - Use in-memory database

6. **Test Configuration**
   - `server/jest.config.js`
   - Setup/teardown scripts
   - Coverage thresholds (>80%)
   - Test database initialization

7. **Health Check Endpoint**
   - `GET /health`
   - Return server status
   - Database connection status
   - Storage status

### Test Coverage Goals
- Services: >90%
- Routes: >85%
- Utilities: >95%
- Overall: >80%

### Swagger Documentation Example
```typescript
/**
 * @swagger
 * /file:
 *   post:
 *     summary: Upload a file
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Quota exceeded
 *       401:
 *         description: Unauthorized
 */
```

### Deliverables
- ✅ Complete API documentation at `/api-docs`
- ✅ All endpoints documented with examples
- ✅ >80% test coverage
- ✅ All tests passing
- ✅ Health check endpoint

---

## Phase 7: Client Application (Expo + React Native Paper)

### Objectives
Build cross-platform mobile/web app with React Native Paper.

### Tasks
1. **Expo Setup**
   - Initialize Expo project with TypeScript
   - Configure `app.json` for web/iOS/Android
   - Setup navigation (React Navigation)
   - Configure environment variables

2. **Package Configuration**
   - `client/package.json`
   - Install React Native Paper
   - Install navigation dependencies
   - Install API client (axios)
   - Install file handling libraries

3. **State Management**
   - `client/context/AuthContext.tsx` - Auth state
   - `client/context/FileContext.tsx` - File state
   - AsyncStorage for token persistence

4. **API Layer**
   - `client/api/client.ts` - Axios configuration
   - `client/api/users.ts` - User endpoints
   - `client/api/files.ts` - File endpoints
   - Request/response interceptors
   - Error handling

5. **Authentication Screens**
   - `client/views/Login.tsx`
     - Email input
     - Send OTP button
     - Loading states
   - `client/views/OTPVerification.tsx`
     - OTP input (6 digits)
     - Verify button
     - Resend OTP
   - Auto-login if token exists

6. **Main Application Screens**
   - `client/views/Main.tsx`
     - Bottom navigation
     - Files tab
     - Profile tab
   - `client/views/FileList.tsx`
     - List all files
     - Pull to refresh
     - File cards with icons
   - `client/views/FileUpload.tsx`
     - File picker
     - Upload progress
     - Success/error feedback
   - `client/views/Profile.tsx`
     - User info
     - Current tier badge
     - Usage statistics
     - Logout button
   - `client/views/Subscription.tsx`
     - Display tiers
     - Upgrade options
     - Mock payment flow
     - Success feedback

7. **Reusable Components**
   - `client/components/FileCard.tsx`
   - `client/components/UploadButton.tsx`
   - `client/components/UsageIndicator.tsx`
   - `client/components/TierBadge.tsx`
   - `client/components/LoadingSpinner.tsx`

8. **Styling**
   - React Native Paper theme configuration
   - Custom color scheme
   - Responsive design
   - Dark mode support (optional)

### Client Dependencies
```json
{
  "dependencies": {
    "expo": "~51.x",
    "react": "18.x",
    "react-native": "0.74.x",
    "react-native-paper": "^5.x",
    "@react-navigation/native": "^6.x",
    "@react-navigation/bottom-tabs": "^6.x",
    "@react-navigation/stack": "^6.x",
    "axios": "^1.x",
    "expo-document-picker": "~11.x",
    "expo-file-system": "~16.x",
    "@react-native-async-storage/async-storage": "^1.x",
    "react-native-safe-area-context": "^4.x",
    "react-native-screens": "~3.x"
  },
  "devDependencies": {
    "@types/react": "~18.x",
    "typescript": "^5.x",
    "@babel/core": "^7.x"
  }
}
```

### Navigation Structure
```
Auth Stack (not logged in)
  - Login
  - OTP Verification

Main Stack (logged in)
  - Bottom Tabs
    - Files Tab
      - File List
      - File Upload (modal)
    - Profile Tab
      - Profile
      - Subscription (navigate)
```

### Key Features
- Email + OTP authentication
- Persistent login (AsyncStorage)
- File upload with progress
- File download
- File delete with confirmation
- Usage statistics display
- Subscription upgrade flow
- Error handling with user-friendly messages
- Loading states throughout
- Pull to refresh
- Responsive design

### React Native Paper Components to Use
- `Surface`, `Card` - File cards
- `Button`, `IconButton` - Actions
- `TextInput` - Forms
- `ProgressBar` - Usage indicators
- `Badge` - Tier display
- `FAB` - Upload button
- `Dialog`, `Portal` - Confirmations
- `Snackbar` - Notifications
- `ActivityIndicator` - Loading

### Deliverables
- ✅ Working Expo app
- ✅ Authentication flow complete
- ✅ File management functional
- ✅ Subscription management
- ✅ Responsive UI with React Native Paper
- ✅ Works on web, iOS, Android
- ✅ Token persistence
- ✅ Error handling

---

## Phase 8: Integration & E2E Testing

### Objectives
End-to-end testing and final validation of complete system.

### Tasks
1. **E2E Test Setup**
   - `e2e/` directory
   - Test environment configuration
   - Mock email service for E2E
   - Test database setup

2. **Complete Flow Tests**
   - User registration flow
   - Login flow with OTP
   - File upload → list → download → delete flow
   - Subscription upgrade flow
   - Quota enforcement scenarios
   - Error scenarios

3. **Multi-User Scenarios**
   - Multiple users with different tiers
   - File ownership validation
   - Concurrent operations

4. **Performance Testing**
   - Large file uploads
   - Multiple file uploads
   - API response times
   - Database query performance

5. **Security Audit**
   - JWT security
   - File access control
   - SQL injection prevention (ORM handles)
   - XSS prevention
   - Rate limiting effectiveness

6. **Documentation**
   - Update `README.md`
     - Project overview
     - Prerequisites
     - Installation steps
     - Running with Docker
     - Environment variables
     - API documentation link
   - Create `DEPLOYMENT.md`
     - Production deployment guide
     - Environment configuration
     - Database migrations
     - Backup strategies
   - Create `DEVELOPMENT.md`
     - Development setup
     - Running tests
     - Code structure
     - Contributing guidelines

7. **Final Checklist**
   - [ ] All API endpoints working
   - [ ] All tests passing
   - [ ] API documentation complete
   - [ ] Client app tested on all platforms
   - [ ] Docker setup validated
   - [ ] Environment variables documented
   - [ ] README comprehensive
   - [ ] Error handling robust
   - [ ] Logging implemented
   - [ ] Rate limiting active

### Deliverables
- ✅ E2E tests passing
- ✅ Security validated
- ✅ Performance acceptable
- ✅ Documentation complete
- ✅ Production-ready application

---

## Execution Timeline & Dependencies

```
Phase 1 (Foundation)
   ↓ (blocks all)
Phase 2 (Database)
   ↓ (blocks all)
Phase 3 (Auth)
   ↓ (blocks Phase 4, 5, 7)
Phase 4 (Users) ←→ Phase 5 (Files)
   ↓ (parallel possible)
Phase 6 (Testing & Docs)
   ↓ (validates backend)
Phase 7 (Client)
   ↓ (requires working API)
Phase 8 (E2E & Final)
```

**Estimated Timeline**: 8-12 days (1-2 days per phase)

---

## Additional Enhancements (Included)

✅ **Rate Limiting**: Protect all endpoints  
✅ **Logging**: Winston for structured logs  
✅ **Health Checks**: `/health` endpoint  
✅ **In-Memory OTP Cache**: Simple TTL-based Map  
✅ **Soft Deletes**: All entities support soft delete  
✅ **Comprehensive Testing**: Unit + Integration + E2E  
✅ **API Documentation**: Auto-generated Swagger  
✅ **Cross-Platform Client**: Web, iOS, Android  
✅ **Mock Payment**: Development-ready payment flow  

---

## Notes

- **Database**: SQLite with `/data` volume mount for persistence
- **Storage**: `/bucket` directory with volume mount
- **OTP Cache**: In-memory Map with automatic cleanup (no Redis needed)
- **Payment**: Mock implementation, easily replaceable with real provider
- **Scaling**: Architecture supports future migration to PostgreSQL + S3
- **Security**: JWT, rate limiting, ownership validation, soft deletes

---

## Getting Started Command (After Phase 1)

```bash
# Build and start
docker-compose up --build

# Access
Backend: http://localhost:3000
API Docs: http://localhost:3000/api-docs

# Run client
cd client
npm install
npm start
```

---

**Status**: Ready for Phase 3 execution
