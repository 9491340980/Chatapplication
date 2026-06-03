# ChatApp — Ionic Angular + Node.js

Real-time one-to-one chat app. Same Ionic codebase runs on **Web**, **Android**, and **iOS**.

## Stack
| Layer | Tech |
|-------|------|
| Frontend | Ionic 7 + Angular 16 |
| Mobile | Capacitor 5 (iOS / Android) |
| Backend | Node.js + Express |
| Realtime | Socket.io |
| Database | MongoDB + Mongoose |
| Auth | JWT |

---

## Quick Start

### 1. MongoDB
Install and run MongoDB locally, or use a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster.

### 2. Backend
```bash
cd backend
cp .env.example .env        # edit MONGO_URI and JWT_SECRET
npm install
npm run dev                 # runs on http://localhost:3000
```

### 3. Frontend (Web)
```bash
cd frontend
npm install
npm start                   # runs on http://localhost:4200
```

### 4. Mobile (Android)
```bash
cd frontend
npm run build               # build web assets first
npm run cap:add:android     # first time only
npm run cap:sync
npx cap open android        # opens Android Studio
```

### 5. Mobile (iOS — Mac only)
```bash
cd frontend
npm run build
npm run cap:add:ios         # first time only
npm run cap:sync
npx cap open ios            # opens Xcode
```

---

## Features
- Register / Login with JWT
- See all users with online/offline status
- Real-time 1-to-1 chat via Socket.io
- Typing indicator (animated dots)
- Message read receipts
- Works on web, Android, iOS from same codebase

## Project Structure
```
chat-app/
├── backend/
│   ├── server.js          # Express + Socket.io entry
│   ├── config/db.js       # MongoDB connection
│   ├── models/            # User, Message schemas
│   ├── routes/            # auth, messages REST routes
│   └── middleware/auth.js # JWT middleware
└── frontend/
    └── src/app/
        ├── pages/         # login, register, users, chat
        ├── services/      # auth.service, chat.service
        ├── guards/        # auth, guest route guards
        └── interceptors/  # JWT HTTP interceptor
```
