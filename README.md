![Screenshot from 2025-05-26 12-40-56](https://github.com/user-attachments/assets/9d20ad0d-0938-4dcb-ba0f-e2da6d66c46b)


# Meu Chat – Real-Time Fullstack Chat Application
Meu Chat is a full-featured, real-time chat application developed for Flipr Hackathon 27. It is designed with scalability, modular architecture, real-time performance, and a clean user experience in mind. The application supports user authentication, direct and group messaging, media sharing, and various real-time indicators.

![Screenshot from 2025-05-26 12-38-42](https://github.com/user-attachments/assets/5b7a24b8-e5db-4b74-99d6-8f02b727c169)
---

## Live Demo

https://meu-chat-blond.vercel.app/


---

## Video Presentation

🎥 [Link to video walkthrough (YouTube/Drive)](https://your-video-link-here)

---

## Table of Contents

* [Features](#features)
* [Tech Stack](#tech-stack)
* [Architecture](#architecture)
* [Setup Instructions](#setup-instructions)

---

Sure! Here's a clean and professional version of your **Features** section for your README file, keeping everything as you provided but formatted for clarity and readability:

---

## Features

* **User Authentication**: Register, Login, Logout
* **User Profiles** with avatar customization
* **JWT-Based Session Management**
* **Password Recovery**
* **End-to-End Encryption (E2EE)**
* **Chat Interface**: Threaded chat, timestamps
* **Typing indicators**
* **Online/Offline status**
* **Delivery status**, **Reactions** (emojis)
* **Group and Direct Chats**
* **Media Support**: Image sharing and previews, Link previews, File attachments, and Voice messages support
* **Search messages**, **Chat history**
* **Pin important messages**
* **Real-time Email Notifications**
* **Video Calling and Voice Calling**
* **Real-time Screen Share**
* **Message replies/threading**
* **@Mentions** support
* **Light/Dark Mode** toggle
* **Performance optimized**
* **Dockerization for Scalability**

---

## Bonus Features

* **Voice messages**
* **Email notifications**
* **Custom emoji/sticker packs**
* **Voice/Video calling**
* **Screen sharing**
* **Chat bots/integrations**

---

## Tech Stack

### Frontend
- **Next.js 13+** - React framework with App Router
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Heroicons** - Beautiful hand-crafted SVG icons
- **Emoji Picker React** - Emoji picker component

### Backend & Infrastructure
- **Firebase**
  - Authentication - User management
  - Firestore - Real-time database
  - Realtime Database - Real-time features (typing status, online status)
  - Storage - File storage
- **Nodemailer** - Email service integration
  - Real-time message notifications
  - HTML email templates
  - Secure SMTP configuration
  - Automated email delivery
- **Zego Cloud** - Real-time communication platform
  - High-quality audio/video calls
  - Screen sharing capabilities
  - Low-latency streaming
  - Cross-platform compatibility
  - Real-time communication SDK

### File Handling
- **Cloudinary** - Media storage and optimization
  - Image uploads with automatic optimization and format conversion
  - Video uploads with streaming capabilities
  - Voice message storage with audio compression
  - File attachments with secure URLs
  - Integration using `next-cloudinary` package
  - Automatic file type detection and handling
  - Secure upload presets for different file types
  - Maximum file size limit of 10MB
  - Support for multiple upload sources (local, camera, URL)

### Development Tools
- ESLint - Code linting
- TypeScript - Type checking
- Next.js App Router - File-based routing
- React Hooks - State management
- Firebase SDK - Backend integration
---

## Architecture

* **Client**: SPA with Next.js for fast load & routing
* **Server**: Express API server with REST endpoints & WebSocket handling
* **Authentication**: JWT tokens stored securely in localStorage
* **Database Models**:

  * `User`: profile, avatar, session
  * `Message`: content, type (text/media), timestamp
  * `Chat`: group vs private, participants
* **Socket Events**: join, message, typing, delivery, status

## Architecture Diagram

![diagram-export-5-26-2025-3_41_05-PM](https://github.com/user-attachments/assets/34181da0-fb8a-4692-a901-4f7c293a3ae3)


---

## Setup Instructions

1. **Clone the repo**

   ```bash
   git clone https://github.com/your-username/meu-chat.git
   cd meu-chat
   ```

2. **Environment Variables**
   Create a `.env` file and configure:

   ```env
    NEXT_PUBLIC_API_KEY=xxx
    NEXT_PUBLIC_AUTH_DOMAIN=xxx
    NEXT_PUBLIC_PROJECT_ID=xxx
    NEXT_PUBLIC_STORAGE_BUCKET=xxx
    NEXT_PUBLIC_MESSAGING_SENDER_ID=xxx
    NEXT_PUBLIC_APP_ID=xxx
    NEXT_PUBLIC_MEASUREMENT_ID=xxx
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx
    NEXT_PUBLIC_CLOUDINARY_API_KEY=xxx
    CLOUDINARY_API_SECRET=xxx
    EMAIL_USER=	xxx
    EMAIL_PASS=xxx
    PORT=3001
    ZEGO_YOUR_SERVER_SECRET=xxx
    ZEGO_APPID=xxx
    NEXT_PUBLIC_OPENROUTER_API_KEY=xxx
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Start the app**

   ```bash
   npm run dev
   ```

---

## Docker (Production Ready)

1. Build
```bash
docker build -t meu_chat .
```

2. Run
```bash
docker run -p 3000:3000 meu_chat
```
---

