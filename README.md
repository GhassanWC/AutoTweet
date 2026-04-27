# AutoTweet ✍️

An AI-powered content workspace for X (Twitter) that helps creators, founders, and agencies plan, create, and publish high-quality content — consistently and on-brand.

## What is AutoTweet?

AutoTweet is not a bot. It's not a growth hack tool. It's a smart content workspace designed for people who are serious about building their presence on X.

It helps you:

- **Define your brand voice** — Set up your niche, audience, tone, and content goals so every post sounds like you.
- **Generate content with AI** — Get post ideas, tweet drafts, and threads tailored to your topics and style.
- **Stay organized with content pillars** — Structure your content around core themes so you stay focused and avoid repetition.
- **Edit and approve before publishing** — Nothing goes live without your review. Quality over quantity.
- **Schedule and publish** — Plan your content calendar, pick the right times, and post consistently.
- **Learn from performance** — Track what resonates and refine your strategy over time.

## The Problem We're Solving

AI-generated content can easily become generic, repetitive, and robotic. That makes products like this feel cheap and untrustworthy.

AutoTweet is built differently:

- Every output is grounded in **your** niche, voice, and content goals
- Content pillars and themes prevent repetition
- Multiple post styles (hot takes, storytelling, threads, insights) create variety
- Human approval is required before anything is published
- The system learns your preferences over time

The goal is **better content, not just more content.**

## Who It's For

- **Creators** who struggle to know what to post every day
- **Founders** building a personal brand on X
- **Agencies** managing content for multiple clients

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **Firebase Firestore** for data storage
- **Twitter API v2** for publishing
- **node-cron** for scheduling
- **Winston** for logging

### Frontend
- **React 18** with React Router
- **Axios** for API communication
- **React Toastify** for notifications
- **date-fns** for date handling

## 📋 Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled
- Twitter Developer account with API v2 access

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd AutoTweet
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment variables

```bash
cp env.example .env
```

Fill in your credentials (see `env.example` for all required values).

### 4. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Firestore Database
4. Go to Project Settings > Service Accounts
5. Generate new private key and copy credentials to `.env`

### 5. Set up Twitter Developer Account

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new project and app
3. Enable OAuth 2.0 with PKCE
4. Add callback URL: `http://localhost:5000/api/auth/twitter/callback`
5. Copy Client ID and Client Secret to `.env`

### 6. Run the application

```bash
# Development mode (runs both server and client)
npm run dev-full

# Or run separately
npm run dev        # Backend on port 5000
npm run client     # Frontend on port 3000
```

### 7. Open in browser

Go to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
AutoTweet/
├── server/
│   ├── config/          # Firebase and Twitter API configuration
│   ├── controllers/     # Route handlers
│   ├── middleware/       # Auth and error middleware
│   ├── models/          # Data models (User, Rule, Tweet, etc.)
│   ├── routes/          # API route definitions
│   ├── services/        # Core business logic (Twitter, scheduler, engagement)
│   ├── utils/           # Logger and helpers
│   └── server.js        # Express entry point
├── client/
│   ├── public/          # Static HTML
│   └── src/
│       ├── components/  # Navbar, Sidebar, LoadingSpinner
│       ├── pages/       # Landing, Dashboard, TweetScheduler, etc.
│       ├── services/    # API client
│       ├── styles/      # Global CSS design system
│       ├── App.js       # Root component with routing
│       └── index.js     # React entry point
├── .env                 # Environment variables (not committed)
├── env.example          # Template for .env
├── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/twitter` | Initiate Twitter OAuth flow |
| GET | `/api/auth/twitter/callback` | OAuth callback |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/status` | Check auth status |

### Content (Tweets)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tweets` | Create a post |
| POST | `/api/tweets/thread` | Create a thread |
| GET | `/api/tweets` | Get all posts |
| GET | `/api/tweets/pending` | Get queued drafts |
| GET | `/api/tweets/:id` | Get single post |
| PUT | `/api/tweets/:id` | Update post |
| PATCH | `/api/tweets/:id/cancel` | Cancel post |
| POST | `/api/tweets/:id/send` | Publish immediately |
| DELETE | `/api/tweets/:id` | Delete post |
| GET | `/api/tweets/stats` | Get performance stats |

### Brand Voice & Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rules` | Create rule |
| GET | `/api/rules` | Get all rules |
| GET | `/api/rules/:id` | Get single rule |
| PUT | `/api/rules/:id` | Update rule |
| PATCH | `/api/rules/:id/toggle` | Toggle active status |
| DELETE | `/api/rules/:id` | Delete rule |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get profile |
| PUT | `/api/user/settings` | Update settings |
| GET | `/api/user/dashboard` | Get dashboard data |
| GET | `/api/user/engagement` | Get performance history |
| DELETE | `/api/user` | Delete account |

## 🔐 Security

- OAuth 2.0 with PKCE for secure authentication
- Session-based authentication with secure cookies
- Input sanitization
- Rate limiting on API endpoints
- Environment variables for sensitive credentials

## 📝 License

MIT License

## 📧 Support

If you have any questions or issues, please open an issue on GitHub.

---

Made with care using Node.js, React, and Firebase
