# Pay Me Drive

"You get a **free** drive...if you pay me!"

File management/backup system with tier based subscription model:

| tier      | includes                              | cost        |
| --------- | ------------------------------------- | ----------- |
| free      | 10 items or 10mb (what comes first)   | $0          |
| pro       | 100 items or 100mb (what comes first) | $10/mo      |
| unlimited | unlimited items                       | $0.5/mb/day |

## API spec

**Users**
GET /users -> Returns user info of the userId in idToken
POST /users -> Creates and return new user
DELETE /users -> Mark deleted in db for userId in idToken
POST /subscribe -> Updates user subscription after validating payment
POST /auth -> Initiates user login/signup/signout
POST /otp -> Completes user login/signup/signout

**Files**
GET /files -> Returns all files for userId in idToken
GET /file -> Returns file info by id, after validating is the users'
POST /file -> uploads file for userId in idToken
DELETE file -> Deletes file, after validating is the users'

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
