# JanSahyog — Citizen App

A high-performance, cross-platform mobile application for citizens to report civic issues, track resolution progress, and engage with their local government. Built with Expo, React Native, TypeScript, and Firebase.

> Part of the **JanSahyog** ecosystem — a citizen-government engagement platform where citizens report issues via this app and administrators manage them through the [Admin Portal](../admin-portal-ts/).

---

## ✨ Features

### 🏠 Home Dashboard
- **Quick Actions** — Report an Issue, Track Complaints, Nearby Issues, Helpline, and Leaderboard.
- **Real-time Stats** — Total Issues managed, My Reports, Resolved Today, and Issues In Progress.
- **Issue Feed** — List of recent updates and top community responders.
- **Category Browsing** — Quick access to report Garbage, Water, Roads, Streetlights, etc.

### 📸 Proactive Reporting
- **Image Capture** — Integrated camera support with on-device optimization (image manipulation).
- **GPS Location** — Automatic location pinning for accurate problem reporting.
- **Robust Forms** — Built-in guards and real-time validation to ensure high-quality reports.
- **Category Selection** — Easy selection of civic issue types.

### 📋 Issue Tracking & Engagement
- **My Complaints** — Personal dashboard to monitor the lifecycle of your reports.
- **Status Timeline** — Visual representation of issue progress (Reported → In Progress → Resolved).
- **Atomic Upvoting** — Support community issues to increase visibility using failure-safe Firestore transactions.
- **Detailed View** — Full issue details, including admin notes and location maps.

### 🌍 Discovery & Accessibility
- **Nearby Issues** — Interactive map view to see what's happening in your neighborhood.
- **Global Search** — Advanced filtering by category and status to find specific issues.
- **Notifications** — Dedicated center for real-time updates on your reports.
- **Multilingual Support** — Fully localized in **English** and **Hindi**, with an extensible i18n framework.

### 🏆 Gamification
- **Leaderboard** — Track your civic impact, earn points, and see top citizen contributors.
- **User Impact** — Profile stats showing resolution rate and total contribution.

### 🎨 Design & Experience
- **Dark Mode Support** — Context-driven theme management with persistent user preferences.
- **Responsive UI** — Proportional scaling across all device sizes (phone to tablet).
- **Modern Aesthetics** — Premium UI with glassmorphism, smooth animations, and curated color palettes.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    CITIZEN APP (Expo/RN/TS)                   │
├──────────────┬───────────────┬───────────────┬───────────────┤
│    App (Tabs)│   Services    │    Context    │    Hooks      │
├──────────────┼───────────────┼───────────────┼───────────────┤
│ Home         │ issueService  │ AuthContext   │ useFirebase   │
│ Report       │ notification  │ ThemeContext  │ useAuth       │
│ MyComplaints │ storage       │               │ useTheme      │
│ Profile      │               │               │               │
├──────────────┴───────────────┴───────────────┴───────────────┤
│    Shared Components (Icons, PrimaryButton, Typography)      │
└──────┬───────┴───────┬───────┴───────────────┴───────────────┘
       │               │
       ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────────────────┐
│  Firebase    │ │ Expo API    │ │ Google Service          │
│  Firestore   │ │ Location    │ │ (Maps, Analytics)       │
│  Auth        │ │ Camera      │ │                         │
│  Storage     │ │ Notifications│ │                         │
└──────────────┘ └─────────────┘ └─────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo Go](https://expo.dev/client) app on your mobile device
- [Firebase Project](https://console.firebase.google.com/) configured for Web/Mobile

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd citizenapp_new
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root (use `.env.example` as a template):

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firebase Setup

1. Add a Web App to your Firebase project.
2. Download and place `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) in the root directory for native builds (optional for Expo Go).

### 4. Run

```bash
# Start Expo development server
npm start

# For specific platforms
npm run android
npm run ios
```

---

## 📂 Project Structure

```
citizenapp_new/
├── app/                  # Expo Router directory (File-based routing)
│   ├── (tabs)/           # Main tab navigation (Home, Report, Profile, etc.)
│   ├── IssueDetail/      # Dynamic routes for issue details [id].tsx
│   ├── NearbyIssues.tsx  # Interactive map screen
│   └── notifications.tsx # Notification center
│
├── src/
│   ├── components/       # Shared UI components (Icons, Buttons, etc.)
│   ├── context/          # Global state (Auth, Theme)
│   ├── hooks/            # Custom React hooks (useFirebase, useAuth)
│   ├── i18n/             # Translations (en.json, hi.json)
│   ├── services/         # Business logic (IssueService, NotificationService)
│   ├── styles/           # Design system (Colors, Typography)
│   └── utils/            # Shared helpers (Responsive scaling, Date formatting)
│
├── assets/               # Local fonts, images, and brand assets
├── app.json              # Expo configuration
└── package.json          # Dependencies and scripts
```

---

## 🔧 Tech Stack

| Technology | Version | Purpose |
|-|-|-|
| React Native | 0.81 | Mobile framework |
| Expo SDK | 54 | Development platform |
| TypeScript | 5.x | Type safety |
| Firebase | 12.x | Backend (Auth, Firestore, Storage) |
| Expo Router | 6.x | Native file-based navigation |
| i18next | 25.x | Internationalization |
| React Native Maps | 1.20 | Mapping and location plotting |
| Svg | 15.x | SVG icon rendering |

---

## 🔐 Security & Reliability

- **Firestore Rules**: Restricted access based on user UID and public visibility flags.
- **Data Integrity**: Atomic transactions for upvoting and status updates.
- **Navigation Guards**: Authentication listeners ensure users are logged in before accessing private features.
- **Offline Awareness**: Basic checks for network status before critical operations.

---

## 📱 Related Projects

| Project | Description |
|-|-|
| `admin-portal-ts/` | Management dashboard for administrators to resolve issues |
| `citizenapp_new/` | This project — Front-line reporting app for citizens |

---

## 📄 License

This project is part of the JanSahyog platform. All rights reserved.
