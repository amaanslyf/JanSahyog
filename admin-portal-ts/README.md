# JanSahyog — Admin Portal

A comprehensive civic issue management dashboard for administrators to track, manage, and resolve citizen-reported issues. Built with React, TypeScript, Material UI, and Firebase.

> Part of the **JanSahyog** ecosystem — a citizen-government engagement platform where citizens report civic issues via a mobile app and administrators manage them through this portal.

---

## ✨ Features

### 📊 Dashboard
- **Stat cards** — Total Issues, Resolved, Avg Response Time, Total Users
- **SLA compliance** — % of issues resolved within 48 hours
- **Issue Trends** — 14-day line chart (Reported vs Resolved)
- **Status Distribution** — Donut chart (Open / In Progress / Resolved)
- **Department Performance** — Bar chart (Resolved vs Open per department)
- **Category Distribution** — Pie chart
- **Clickable Recent Issues** — Navigate to issue detail

### 🗂️ Issues Management
- **DataGrid** — Sortable, filterable, searchable table with pagination
- **SLA Column** — Real-time countdown (✓ Done / 24h / BREACHED)
  - Critical = 4h, High = 24h, Medium = 48h, Low = 72h
- **Duplicate Detection** — `DUP` badge on flagged issues
- **Inline Actions** — View, Edit, Delete
- **CSV Export** — One-click download

### 📋 Issue Detail
- **Full issue view** — description, location, reporter, comments
- **Image display** — supports `imageUrl`, `imageUri`, `imageBase64`
- **🤖 AI Analysis Card** — AI-suggested category, confidence bar, severity, tags
- **⚠️ Duplicate Warning** — "Possible Duplicate" banner with "View Original" / "Not a Duplicate" buttons
- **Quick Status Change** — one-click Open → In Progress → Resolved
- **Comment System** — threaded activity log

### 🏢 Departments
- **Department cards** — per-dept stats (Total, Open, Resolved, Resolution Rate %)
- **Auto-Assignment Rules** — category → department routing with enable/disable toggle
- **Seed Defaults** — one-click seed for departments and rules
- **Auto-Assign** — bulk-assign unassigned backlog

### 🗺️ Map View
- **Leaflet map** — all issues plotted with color-coded markers
- **Filters** — Status, Priority, Category
- **Custom markers** — size by priority, color by status
- **Popups** — issue summary + "View Details" link

### 📈 Analytics
- **KPI cards** — Total, Resolved, Resolution Rate, Avg Response Time
- **Daily Trends** — area chart
- **Department Performance** — stacked bar chart
- **Top Reporters** — leaderboard table
- **Geographic Hotspots** — area-based breakdown
- **Time Range** — 7 / 30 / 90 / 365 days
- **Department Filter** — scope to specific department
- **CSV Export** — one-click download

### 🔔 Notifications
- **Send Push Notifications** — via Expo Push API to mobile users
- **Notification History** — searchable log with success/failure counts
- **Automation Rules** — trigger-based notifications (issue created, status changed, assigned, priority changed)
- **Templates** — reusable notification templates

### 💬 Communication
- **Broadcast messages** — to all users or department heads
- **In-app + Push** — creates in-app notifications AND sends Expo push
- **History** — full send log

### 👥 Users
- **User management** — view all registered users
- **Push token tracking** — see which users have notifications enabled
- **Role management** — admin, department_head, user

### ⚙️ Settings
- **Gemini API Key** — configure for AI image analysis
- **Status indicator** — shows if key is configured

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    ADMIN PORTAL (React/TS)                    │
├──────────────┬───────────────┬───────────────┬───────────────┤
│   Pages (11) │ Services (5)  │Components (3) │  Hooks (1)    │
├──────────────┼───────────────┼───────────────┼───────────────┤
│ Dashboard    │ autoAssign    │ Sidebar       │ useAlert      │
│ IssuesTable  │ automation    │ Navbar        │               │
│ IssueDetail  │ aiAnalysis    │ ErrorBoundary │               │
│ Departments  │ notification  │               │               │
│ Map          │ duplicateDetect│              │               │
│ Analytics    │               │               │               │
│ Notifications│               │               │               │
│ Communication│               │               │               │
│ Users        │               │               │               │
│ Settings     │               │               │               │
│ Login        │               │               │               │
└──────┬───────┴───────┬───────┴───────────────┴───────────────┘
       │               │
       ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────────────────┐
│  Firebase    │ │ Expo Push   │ │ Google Gemini API       │
│  Firestore   │ │ Notification│ │ (Image Analysis)        │
│  Auth        │ │ API         │ │ gemini-2.0-flash        │
│  Storage     │ │             │ │ Free: 15 RPM, 1M tok/d  │
└──────────────┘ └─────────────┘ └─────────────────────────┘
```

### Data Flow

```
Citizen App → Firestore (civicIssues) → Admin Portal
                     │
        ┌────────────┼────────────────┐
        ▼            ▼                ▼
  Auto-Assign   Duplicate        AI Analysis
  (category →   Detection        (Gemini API →
   department)  (geo + category  category, severity,
                 + title match)  confidence, tags)
        │            │                │
        ▼            ▼                ▼
   Update issue  Flag issue      Store analysis
   in Firestore  with score      on issue doc
        │
        ▼
  Automation Engine → Push Notifications (Expo)
```

---

## 🤖 AI Image Analysis — How It Works

The AI analysis uses **Google Gemini 2.0 Flash** (free tier) to automatically classify civic issue photos.

### Flow

1. **Citizen uploads photo** via mobile app → stored as base64 in Firestore
2. **Auto-assign listener** picks up new issue
3. If Gemini API key is configured AND issue has image:
   - Sends image to `generativelanguage.googleapis.com`
   - Prompt asks Gemini to classify into: Garbage, Water Leak, Roads, Streetlight, Pollution, Other
4. **Gemini returns** JSON with:
   - `suggestedCategory` — AI's classification
   - `confidence` — 0.0 to 1.0
   - `description` — one-sentence description
   - `severity` — low / medium / high / critical
   - `tags` — 2-5 keywords
5. **Results stored** on the issue document as `aiAnalysis`
6. **Admin sees** the AI Analysis card in Issue Detail:
   - If AI category differs from citizen's, both are shown
   - Confidence bar (green >70%, amber otherwise)
   - Severity chip and keyword tags

### Free Tier Limits

| Feature | Limit |
|-|-|
| Requests per minute | 15 |
| Tokens per day | 1,000,000 |
| Cost | Free |

---

## 🔁 Duplicate Detection — How It Works

When a new issue arrives, the system checks for potential duplicates using a **3-factor scoring system**:

| Factor | Weight | Logic |
|-|-|-|
| Same category | +0.4 | Case-insensitive exact match |
| Within 100 meters | +0.3 | Haversine distance formula, scales by proximity |
| Title word overlap | +0.3 | Jaccard similarity (shared words / total words) |

- **Score ≥ 0.6** → flagged as duplicate
- **Only non-resolved issues** within 7 days are considered
- **Different categories at same location** are NOT duplicates (e.g., pothole + broken streetlight at same intersection)

Admins can dismiss false positives via the "Not a Duplicate" button.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Firebase Project](https://console.firebase.google.com/) with Firestore, Auth, and Storage enabled
- (Optional) [Google Gemini API Key](https://aistudio.google.com/apikey) for AI features

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd admin-portal-ts
npm install
```

### 2. Configure Firebase

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Where to find these values:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → ⚙️ Project Settings
3. Scroll to "Your apps" → Web app → Config

### 3. Configure Gemini API Key (Optional)

This enables AI image analysis for auto-categorizing issue photos.

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API Key"**
3. Copy the key
4. In the admin portal: **Sidebar → Settings → Paste key → Save**

> The key is stored in localStorage (browser only). It never leaves the client except to call the Gemini API.

### 4. Run

```bash
npm run dev
```

The portal will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
npm run preview
```

---

## 📂 Project Structure

```
admin-portal-ts/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx    # Catches page crashes, shows retry UI
│   │   ├── Navbar.tsx           # Top navigation bar
│   │   └── Sidebar.tsx          # Side navigation menu
│   │
│   ├── firebase/
│   │   └── firebase.ts          # Firebase initialization (env-based config)
│   │
│   ├── hooks/
│   │   └── useAlert.ts          # Alert state management hook
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx        # Main dashboard with charts
│   │   ├── IssuesTable.tsx      # DataGrid of all issues + SLA
│   │   ├── IssueDetail.tsx      # Single issue view + AI card
│   │   ├── DepartmentsPage.tsx  # Department management + rules
│   │   ├── MapPage.tsx          # Leaflet map visualization
│   │   ├── AnalyticsPage.tsx    # Charts, KPIs, CSV export
│   │   ├── NotificationsPage.tsx# Push notification sending + history
│   │   ├── CommunicationPage.tsx# Broadcast messaging
│   │   ├── UsersPage.tsx        # User management
│   │   ├── SettingsPage.tsx     # Gemini API key config
│   │   └── LoginPage.tsx        # Firebase auth login
│   │
│   ├── services/
│   │   ├── autoAssignService.ts      # Category → department routing
│   │   ├── automationEngine.ts       # Event-driven notification rules
│   │   ├── aiAnalysisService.ts      # Gemini image classification
│   │   ├── duplicateDetectionService.ts # Geo + category duplicate flagging
│   │   └── notificationService.ts    # Expo Push API integration
│   │
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   │
│   ├── utils/
│   │   ├── dateUtils.ts         # Date formatting/conversion
│   │   └── colorUtils.ts        # Status/priority color mapping
│   │
│   ├── App.tsx                  # Root component, routing, listeners
│   └── main.tsx                 # Entry point
│
├── .env                         # Firebase config (create this)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔧 Tech Stack

| Technology | Version | Purpose |
|-|-|-|
| React | 19 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool + dev server |
| Material UI | 7.x | Component library |
| MUI X DataGrid | 8.x | Advanced data tables |
| Firebase | 12.x | Auth, Firestore, Storage |
| Recharts | 3.x | Charts and visualizations |
| Leaflet | 1.9 | Map rendering |
| React Router | 7.x | Client-side routing |
| Google Gemini | 2.0 Flash | AI image analysis (free tier) |

---

## 🔐 Firebase Security

The portal uses Firebase Authentication. Only authenticated users can access the admin dashboard. Firestore security rules should be configured to restrict access based on user roles:

- `admin` — full access to all collections
- `department_head` — access to issues in their department
- `user` — read-only access to their own issues

---

## 📱 Related Projects

| Project | Description |
|-|-|
| `citizenapp_new/` | Expo/React Native mobile app for citizens to report issues |
| `admin-portal-ts/` | This project — admin management dashboard |

---

## 📄 License

This project is part of the JanSahyog platform. All rights reserved.
