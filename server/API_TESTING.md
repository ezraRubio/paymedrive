# API Testing Guide

## Overview

This document provides comprehensive testing instructions for the Pay Me Drive API.

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Structure

```
server/tests/
├── setup.ts                    # Test database setup
├── fixtures.ts                 # Mock data
├── unit/                       # Unit tests
│   ├── otp.util.test.ts
│   ├── jwt.util.test.ts
│   ├── storage.util.test.ts
│   └── payment.service.test.ts
└── integration/                # API endpoint tests
    ├── auth.test.ts
    ├── user.test.ts
    ├── subscription.test.ts
    ├── files.test.ts
    └── health.test.ts
```

## Manual API Testing

### 1. Authentication Flow

#### Send OTP
```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

Response:
```json
{
  "success": true,
  "message": "OTP sent successfully. Please check your email."
}
```

#### Verify OTP and Login
```bash
curl -X POST http://localhost:3000/api/otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "123456",
    "name": "John Doe"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "tier": "free",
    "isAdmin": false
  }
}
```

### 2. User Management

#### Get User Profile
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Update Profile
```bash
curl -X PUT http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe"}'
```

#### Get User Stats
```bash
curl -X GET http://localhost:3000/api/users/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Check Quota
```bash
curl -X GET http://localhost:3000/api/users/quota \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Delete Account
```bash
curl -X DELETE http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Subscription Management

#### Get Available Tiers
```bash
curl -X GET http://localhost:3000/api/subscription/tiers
```

#### Upgrade Subscription
```bash
curl -X POST http://localhost:3000/api/subscription/upgrade \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tier": "pro"}'
```

### 4. File Management

#### Upload File
```bash
curl -X POST http://localhost:3000/api/file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

#### List Files
```bash
curl -X GET http://localhost:3000/api/files \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Download File
```bash
curl -X GET "http://localhost:3000/api/file?id=FILE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded-file.pdf
```

#### Get File Metadata
```bash
curl -X GET "http://localhost:3000/api/file/metadata?id=FILE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Delete File
```bash
curl -X DELETE "http://localhost:3000/api/file?id=FILE_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Health Check

```bash
curl -X GET http://localhost:3000/health
```

## Test Coverage Goals

- **Services**: >90%
- **Routes**: >85%
- **Utilities**: >95%
- **Overall**: >80%

## Testing with Postman

Import the Swagger documentation into Postman:
1. Start the server: `npm run dev`
2. Navigate to `http://localhost:3000/api-docs`
3. Download the OpenAPI spec (JSON)
4. Import into Postman

## Common Test Scenarios

### Complete User Journey
1. Request OTP
2. Verify OTP and create account
3. Upload files
4. Check quota
5. Upgrade to Pro tier
6. Upload more files
7. Download a file
8. Delete a file
9. Logout

### Quota Testing
1. Create free tier account (10MB, 10 items)
2. Upload 5 small files
3. Check quota compliance
4. Attempt to upload file exceeding quota
5. Upgrade to Pro
6. Verify new limits applied

### Error Scenarios
- Invalid email format
- Expired OTP
- Invalid JWT token
- File upload without authentication
- Accessing another user's file
- Exceeding quota limits
- Invalid tier upgrade

## Debugging Tests

### View Test Output
```bash
npm test -- --verbose
```

### Run Specific Test File
```bash
npm test -- auth.test.ts
```

### Run Specific Test Suite
```bash
npm test -- --testNamePattern="Authentication"
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD Integration

Tests are designed to run in CI environments:

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: npm test
  
- name: Generate Coverage
  run: npm run test:coverage
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Notes

- All tests use an in-memory SQLite database
- Tests are isolated and independent
- Database is reset between tests
- Mock email service is used (no actual emails sent)
- Mock payment service simulates payment processing
