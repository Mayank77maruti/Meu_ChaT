# Meu Chat – Real-Time Fullstack Chat Application

A full-featured, real-time chat application built for **Flipr Hackathon 27**. Designed with scalability, modern UI/UX, and real-time collaboration in mind.

---

## Live Demo

🔗 [Access the deployed app on Vercel](https://meu-chat-blond.vercel.app/)

**Demo Credentials**

* Email: `testuser@example.com`
* Password: `password123`

---

## Video Presentation

🎥 [Link to video walkthrough (YouTube/Drive)](https://your-video-link-here)

---

## Table of Contents

* [Features](#features)
* [Tech Stack](#tech-stack)
* [Architecture](#architecture)
* [Setup Instructions](#setup-instructions)
* [Deployment](#deployment)
* [Challenges Faced](#challenges-faced)
* [Contributors](#contributors)

---

## ✨ Features

### Day 1: Foundation & Basic Chat

*  **User Authentication**: Register, Login, Logout
*  **User Profiles** with avatar customization
*  **JWT-Based Session Management**
*  **Password Recovery**
*  **Chat Interface**: Threaded chat, timestamps, and read receipts

### Day 2: Real-Time Enhancements

*  **Typing indicators**, **online/offline status**
*  **Delivery status**, **reactions** (emojis)
*  **Group and Direct Chats**

### Media & Rich Messaging

*  Image previews
*  File attachments
*  Link previews
*  Voice message support

### Day 3: Polish & UX Features

*  **Search messages**, **chat history**
*  Pin important messages
*  Real-time and Email Notifications
*  Message replies/threading
*  **@Mentions** support
*  **Light/Dark Mode** toggle
*  **Performance optimized**

---

## Tech Stack

### Frontend

* **Framework**: React.js
* **UI Library**: Tailwind CSS, Shadcn UI
* **Routing**: Next.js App Router
* **State Management**: React Context API
* **Socket**: Socket.IO-client

### Backend

* **Server**: Node.js, Express.js
* **Database**: MongoDB + Mongoose
* **Auth**: JWT (JSON Web Token)
* **WebSockets**: Socket.IO
* **Storage**: Firebase for media
* **Deployment**: Dockerized app hosted on **Vercel**

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

![Architecture Diagram](https://your-architecture-image-link-if-any)

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
