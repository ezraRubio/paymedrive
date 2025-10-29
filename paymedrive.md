# Pay Me Drive

"You get a **free** drive...if you pay me!"

File management/backup system with tier based subscription model:

| tier      | includes                              | cost        |
| --------- | ------------------------------------- | ----------- |
| free      | 10 items or 10mb (what comes first)   | $0          |
| pro       | 100 items or 100mb (what comes first) | $10/mo      |
| unlimited | unlimited items                       | $0.5/mb/day |

## API spec

**Authentication**
POST /auth -> Initiates user login/signup (sends OTP to email)
POST /otp -> Completes user login/signup with OTP (creates user if new)
POST /logout -> Logs out user and invalidates token

**Users**
GET /users -> Returns user profile for userId in idToken
PUT /users -> Updates user profile (name)
DELETE /users -> Mark deleted in db for userId in idToken
GET /users/stats -> Returns user statistics (files count, total size, etc.)
GET /users/quota -> Returns quota compliance status and usage

**Files**
GET /files -> Returns all files for userId in idToken
GET /file -> Downloads file by id, after validating ownership
GET /file/metadata -> Returns file metadata by id, after validating ownership
POST /file -> Uploads file for userId in idToken
DELETE /file -> Deletes file by id, after validating ownership

**Subscriptions**
GET /subscription/tiers -> Returns available subscription tiers with pricing
POST /subscription/upgrade -> Updates user subscription tier after validation

### Entities

| **User**    |
| ----------- |
| id          |
| name        |
| email       |
| tier        |
| isAdmin     |
| accessToken |
| isDeleted   |
| createdAt   |
| modifyAt    |

| **File**  |
| --------- |
| id        |
| name      |
| location  |
| size      |
| format    |
| isDeleted |
| createdAt |
| modifyAt  |

| **Subscriptions** |
| ----------------- |
| id                |
| tier              |
| limitSize         |
| limitItems        |

| **UserFiles** |
| ------------- |
| userId        |
| fileId        |

| **UserSubscription** |
| -------------------- |
| userId               |
| subscriptionId       |

## Tech

### Server

NodeJS app using the Express framework, Sqlite through Sequelize ORM for database,
the /bucket directory as the storage bucket,
JWT for idTokens, OpenAPI for documentation.

### Client

React Native app managed by Expo
