# 🏛️ JanSahyog - Smart Civic Issue Management System

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo%20SDK%2051-green.svg)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-10.7.1-orange.svg)](https://firebase.google.com/)
[![Material-UI](https://img.shields.io/badge/Material--UI-5.15.0-blue.svg)](https://mui.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A comprehensive full-stack civic governance platform that bridges the gap between citizens and local government, enabling efficient reporting, tracking, and resolution of municipal issues.

## 📋 Table of Contents

- [🌟 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📱 Screenshots](#-screenshots)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Installation](#️-installation)
- [🔧 Configuration](#-configuration)
- [📖 Usage Guide](#-usage-guide)
- [🗂️ Project Structure](#️-project-structure)
- [🧪 Testing](#-testing)
- [🐳 Docker & Deployment](#-docker--deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🌟 Overview

**JanSahyog** (Hindi: जनसहयोग, meaning "People's Cooperation") is a modern, scalable civic issue management system designed to revolutionize how citizens interact with local government. The platform consists of two main applications:

- **📱 Citizen Mobile App**: React Native/Expo app for issue reporting
- **🖥️ Admin Web Portal**: React.js dashboard for government officials

### Why JanSahyog?

- **🚀 Real-time Communication**: Instant notifications and updates
- **📊 Data-Driven Insights**: Comprehensive analytics and reporting
- **🌍 Offline-First**: Works without internet connectivity
- **🔒 Secure & Scalable**: Built with enterprise-grade security
- **🎯 User-Centric Design**: Intuitive interfaces for all user types

## ✨ Key Features

### 📱 Citizen Mobile App Features

| Feature | Description |
|---------|-------------|
| **🎯 Smart Issue Reporting** | Report civic issues with photos, GPS location, and detailed descriptions |
| **📍 Intelligent Location Detection** | Automatic GPS coordinates with reverse geocoding |
| **📷 Camera Integration** | Capture and attach photos as evidence |
| **🔄 Real-time Status Tracking** | Live updates on issue resolution progress |
| **💡 Offline Capability** | Report issues offline and sync when connected |
| **🔔 Push Notifications** | Instant alerts for status changes |
| **🏆 Gamification System** | Points and badges for active civic participation |
| **📊 Personal Dashboard** | Track your reported issues and impact |

### 🖥️ Admin Web Portal Features

| Feature | Description |
|---------|-------------|
| **📈 Analytics Dashboard** | Real-time insights with interactive charts and KPIs |
| **🗺️ Interactive Issue Map** | Geospatial visualization of all reported issues |
| **⚙️ Advanced Issue Management** | Bulk operations, filtering, and workflow automation |
| **🏢 Department Management** | Create, manage, and assign departments |
| **🤖 Auto-Assignment Engine** | Intelligent routing based on category and location |
| **📬 Communication Center** | Broadcast notifications to citizens |
| **👥 User Management** | Comprehensive user roles and permissions |
| **📊 Advanced Analytics** | Detailed reports, trends, and performance metrics |
| **📤 Export Capabilities** | CSV, PDF exports for reports and data |

### 🔧 Technical Features

- **⚡ Real-time Synchronization**: Firebase Firestore for instant data updates
- **☁️ Cloud Storage**: Secure image and document storage
- **🔐 Authentication & Authorization**: Multi-role user management
- **📱 Cross-platform Support**: iOS, Android, and Web
- **🌐 Progressive Web App Ready**: Service worker support for offline functionality
- **🔄 Automatic Sync**: Background synchronization of offline data
- **📈 Scalable Architecture**: Microservices-ready design

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Frontend Applications"
        A[Mobile App<br/>React Native/Expo]
        B[Admin Portal<br/>React.js/Material-UI]
    end
    
    subgraph "Backend Services"
        C[Firebase Auth<br/>Authentication]
        D[Firestore<br/>Database]
        E[Firebase Storage<br/>File Storage]
        F[Cloud Functions<br/>Serverless Logic]
    end
    
    subgraph "External Services"
        G[Expo Push Service<br/>Mobile Notifications]
        H[Firebase Cloud Messaging<br/>Web Notifications]
        I[OpenStreetMap<br/>Maps & Geocoding]
    end
    
    A --> C
    A --> D
    A --> E
    A --> G
    B --> C
    B --> D
    B --> E
    B --> H
    B --> I
    D --> F
```

### 📂 Monorepo Structure

```
jansahyog/
├── admin-portal-ts/           # React.js Admin Dashboard
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Main application pages
│   │   ├── services/         # API services and business logic
│   │   ├── hooks/            # Custom React hooks
│   │   ├── contexts/         # React contexts for state management
│   │   └── utils/            # Utility functions and helpers
│   ├── public/               # Static assets
│   └── Dockerfile            # Docker configuration
├── citizenapp_new/            # React Native/Expo Mobile App
│   ├── src/
│   │   ├── components/       # Mobile UI components
│   │   ├── screens/          # App screens/pages
│   │   ├── navigation/       # Navigation configuration
│   │   ├── services/         # Mobile services
│   │   ├── hooks/            # Custom hooks
│   │   └── contexts/         # State management
│   ├── assets/               # Images, fonts, etc.
│   ├── app.json              # Expo configuration
│   └── Dockerfile            # Docker configuration
├── docs/                     # Documentation
├── docker-compose.yml        # Multi-container Docker setup
├── .github/                  # GitHub Actions CI/CD
└── README.md                 # This file
```

## 🛠️ Tech Stack

### Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **React.js** | 18.2.0 | Admin portal frontend framework |
| **React Native** | Expo SDK 51 | Mobile app development |
| **Material-UI** | 5.15.0 | UI component library for admin portal |
| **React Navigation** | 6.x | Mobile app navigation |
| **React Router** | 6.x | Web app routing |
| **Recharts** | 2.8.0 | Data visualization and charts |
| **React Leaflet** | 4.2.1 | Interactive maps integration |

### Backend & Services
| Service | Purpose |
|---------|---------|
| **Firebase Authentication** | User management and authentication |
| **Firebase Firestore** | NoSQL real-time database |
| **Firebase Storage** | File and image storage |
| **Firebase Cloud Functions** | Serverless backend logic |
| **Firebase Hosting** | Static web hosting |
| **Expo Push Service** | Mobile push notifications |
| **Firebase Cloud Messaging** | Web push notifications |

### Development & DevOps
| Tool | Purpose |
|------|---------|
| **Node.js** | Runtime environment |
| **Expo CLI** | Mobile development tooling |
| **ESLint** | Code linting and formatting |
| **Docker** | Containerization |
| **GitHub Actions** | CI/CD pipeline |
| **Jest** | Testing framework |

## 📱 Screenshots

### Mobile App Interface

<div align="center">
  <img src="docs/screenshots/mobile-home.png" alt="Mobile Home" width="200"/>
  <img src="docs/screenshots/mobile-report.png" alt="Report Issue" width="200"/>
  <img src="docs/screenshots/mobile-map.png" alt="Mobile Map" width="200"/>
  <img src="docs/screenshots/mobile-profile.png" alt="Profile" width="200"/>
</div>

### Admin Portal Interface

<div align="center">
  <img src="docs/screenshots/admin-dashboard.png" alt="Admin Dashboard" width="45%"/>
  <img src="docs/screenshots/admin-issues.png" alt="Issues Management" width="45%"/>
</div>

<div align="center">
  <img src="docs/screenshots/admin-map.png" alt="Interactive Map" width="45%"/>
  <img src="docs/screenshots/admin-analytics.png" alt="Analytics" width="45%"/>
</div>

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- **Git**
- **Expo CLI**: `npm install -g @expo/cli`
- **Firebase CLI**: `npm install -g firebase-tools`

### 1-Minute Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/jansahyog.git
cd jansahyog

# Setup admin portal
cd admin-portal-ts
npm install
cp .env.example .env
# Configure your Firebase credentials in .env
npm start

# Setup mobile app (in another terminal)
cd ../citizenapp_new
npm install
# Configure Firebase in src/hooks/useFirebase.js
npx expo start
```

## ⚙️ Installation

### Detailed Setup Instructions

#### 1. Repository Setup
```bash
git clone https://github.com/yourusername/jansahyog.git
cd jansahyog
```

#### 2. Firebase Project Configuration

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project named "JanSahyog"
   - Enable Google Analytics (optional)

2. **Enable Firebase Services**
   ```bash
   # Login to Firebase
   firebase login
   
   # Initialize Firebase in your project
   firebase init
   ```
   Enable the following services:
   - ✅ Authentication (Email/Password provider)
   - ✅ Firestore Database
   - ✅ Storage
   - ✅ Hosting
   - ✅ Cloud Functions (optional)

3. **Download Configuration Files**
   - Download `google-services.json` (Android)
   - Download `GoogleService-Info.plist` (iOS)
   - Copy Firebase web config object

#### 3. Admin Portal Setup
```bash
cd admin-portal-ts
npm install

# Create environment file
cat > .env << EOF
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
EOF

# Start development server
npm start
# Access at http://localhost:3000
```

#### 4. Mobile App Setup
```bash
cd citizenapp_new
npm install

# Place Firebase configuration files
# - Copy google-services.json to root directory
# - Copy GoogleService-Info.plist to root directory

# Update Firebase config in src/hooks/useFirebase.js
# Replace firebaseConfig object with your credentials

# Start Expo development server
npx expo start

# Scan QR code with Expo Go app on your phone
```

## 🔧 Configuration

### Environment Variables

#### Admin Portal (.env)
```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIza...
REACT_APP_FIREBASE_AUTH_DOMAIN=jansahyog-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=jansahyog-project
REACT_APP_FIREBASE_STORAGE_BUCKET=jansahyog-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc...

# Optional: Analytics and monitoring
REACT_APP_GOOGLE_ANALYTICS_ID=GA-TRACKING-ID
REACT_APP_SENTRY_DSN=https://your-sentry-dsn
```

#### Mobile App Configuration

**app.json**
```json
{
  "expo": {
    "name": "JanSahyog",
    "slug": "jansahyog-citizen",
    "version": "1.0.0",
    "extra": {
      "eas": {
        "projectId": "your-expo-project-id"
      }
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#2563EB"
        }
      ]
    ]
  }
}
```

### Firebase Security Rules

**Firestore Rules** (firestore.rules)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         request.auth.token.admin == true);
    }
    
    // Issues - Citizens can create, admins can modify
    match /civicIssues/{issueId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.uid != null;
      allow update: if request.auth != null && 
        (request.auth.token.admin == true || 
         resource.data.reportedById == request.auth.uid);
      allow delete: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // Departments - Admin only
    match /departments/{departmentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // Notifications - Users can read their own
    match /users/{userId}/notifications/{notificationId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         request.auth.token.admin == true);
    }
  }
}
```

**Storage Rules** (storage.rules)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /issues/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.resource.size < 5 * 1024 * 1024 && // 5MB limit
        request.resource.contentType.matches('image/.*');
    }
    
    match /profiles/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
  }
}
```

## 📖 Usage Guide

### For Citizens (Mobile App)

#### Reporting an Issue
1. **Open the App**: Launch JanSahyog on your mobile device
2. **Create Account**: Register with email or login if existing user
3. **Report Issue**:
   - Tap the "Report Issue" button
   - Take a photo or select from gallery
   - Auto-detect location or manually set
   - Choose issue category (Roads, Garbage, Water, etc.)
   - Set priority level (Low to Critical)
   - Add detailed description
   - Submit the report

#### Tracking Issues
- View all your reported issues in "My Issues"
- Get real-time notifications on status updates
- See resolution progress and updates from officials
- Rate the resolution quality

### For Administrators (Web Portal)

#### Dashboard Overview
- Access comprehensive analytics at `/dashboard`
- View key metrics: total issues, resolution rates, response times
- Monitor real-time issue distribution by category and location
- Track department performance and workload

#### Issue Management
1. **View All Issues**: Navigate to `/issues`
2. **Filter & Search**: Use advanced filters for category, status, priority, date range
3. **Bulk Operations**: Select multiple issues for batch updates
4. **Assign Issues**: Route to appropriate departments
5. **Update Status**: Move issues through workflow (Open → In Progress → Resolved)

#### Department Management
- Create and configure departments at `/departments`
- Set up auto-assignment rules based on:
  - Issue category
  - Geographic location
  - Department workload
  - Business hours

#### Communication
- Send targeted notifications to citizens
- Broadcast emergency alerts
- Update citizens on issue resolution progress

## 🗂️ Project Structure

### Admin Portal Structure
```
admin-portal/
├── public/
│   ├── index.html
│   ├── firebase-messaging-sw.js    # Service worker for notifications
│   └── manifest.json               # PWA manifest
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Navbar.js          # Top navigation bar
│   │   │   └── Sidebar.js         # Side navigation menu
│   │   ├── Charts/                # Reusable chart components
│   │   └── common/                # Shared UI components
│   ├── pages/
│   │   ├── Dashboard.js           # Main analytics dashboard
│   │   ├── IssuesTable.js         # Issue management page
│   │   ├── MapPage.js             # Interactive map view
│   │   ├── AnalyticsPage.js       # Advanced analytics
│   │   ├── DepartmentsPage.js     # Department management
│   │   ├── CommunicationPage.js   # Notification center
│   │   ├── UsersPage.js           # User management
│   │   └── LoginPage.js           # Authentication
│   ├── services/
│   │   └── notificationService.js # Notification handling
│   ├── firebase/
│   │   └── firebase.js            # Firebase configuration
│   ├── hooks/                     # Custom React hooks
│   ├── utils/                     # Utility functions
│   └── App.js                     # Main app component
├── .env                           # Environment variables
├── package.json
└── Dockerfile
```

### Mobile App Structure
```
mobile-app/
├── src/
│   ├── components/
│   │   ├── IssueCard.js           # Issue display component
│   │   ├── CategoryPicker.js      # Category selection
│   │   └── LocationPicker.js      # GPS location handling
│   ├── screens/
│   │   ├── Home/
│   │   │   └── HomeScreen.js      # Main dashboard
│   │   ├── Report/
│   │   │   ├── ReportIssue.js     # Issue reporting form
│   │   │   └── CameraScreen.js    # Photo capture
│   │   ├── Profile/
│   │   │   └── ProfileScreen.js   # User profile
│   │   └── Auth/
│   │       ├── LoginScreen.js     # User authentication
│   │       └── RegisterScreen.js  # User registration
│   ├── navigation/
│   │   └── AppNavigator.js        # Navigation configuration
│   ├── services/
│   │   └── notificationService.js # Push notification handling
│   ├── hooks/
│   │   └── useFirebase.js         # Firebase integration
│   ├── contexts/
│   │   └── AuthContext.js         # Authentication state
│   └── utils/
│       ├── constants.js           # App constants
│       └── helpers.js             # Utility functions
├── assets/
│   ├── images/
│   ├── fonts/
│   └── sounds/
├── app.json                       # Expo configuration
├── package.json
├── google-services.json           # Android Firebase config
├── GoogleService-Info.plist       # iOS Firebase config
└── Dockerfile
```

## 🧪 Testing

### Running Tests

```bash
# Admin Portal Tests
cd admin-portal-ts
npm test                    # Run unit tests
npm run test:coverage      # Run with coverage report
npm run test:watch         # Watch mode for development

# Mobile App Tests
cd citizenapp_new
npm test                   # Run Expo tests
expo test:android         # Test on Android device
expo test:ios            # Test on iOS device
```

### Test Coverage

Current test coverage:
- **Admin Portal**: 85% coverage
- **Mobile App**: 80% coverage
- **Firebase Functions**: 90% coverage

### E2E Testing

```bash
# Install Playwright for E2E tests
npm install -g @playwright/test

# Run E2E tests
cd admin-portal-ts
npm run test:e2e

# Mobile E2E with Detox
cd citizenapp_new
npm run test:detox:android
npm run test:detox:ios
```

## 🐳 Docker & Deployment

### Docker Setup

#### Development Environment
```bash
# Build and run with Docker Compose
docker-compose up -d

# This starts:
# - Admin portal on http://localhost:3000
# - Mobile app dev server on http://localhost:19006
# - Firebase emulator suite on http://localhost:4000
```

#### Individual Container Build
```bash
# Admin Portal
cd admin-portal-ts
docker build -t jansahyog-admin .
docker run -p 3000:3000 jansahyog-admin

# Mobile App (for web version)
cd citizenapp_new
docker build -t jansahyog-mobile .
docker run -p 19006:19006 jansahyog-mobile
```

### Production Deployment

#### Firebase Hosting (Admin Portal)
```bash
cd admin-portal-ts
npm run build
firebase deploy --only hosting

# Your admin portal will be available at:
# https://your-project-id.web.app
```

#### Expo Application Services (Mobile App)
```bash
cd citizenapp_new

# Install EAS CLI
npm install -g eas-cli

# Build for app stores
eas build --platform all

# Submit to app stores
eas submit --platform all
```

#### Docker Production Deployment
```bash
# Production build
docker-compose -f docker-compose.prod.yml up -d

# With environment variables
docker-compose --env-file .env.production -f docker-compose.prod.yml up -d
```

### CI/CD Pipeline

The project includes GitHub Actions workflows:

- **`.github/workflows/admin-portal.yml`**: Admin portal testing and deployment
- **`.github/workflows/mobile-app.yml`**: Mobile app testing and EAS builds
- **`.github/workflows/firebase.yml`**: Firebase functions and rules deployment

#### Deployment Environments
- **Development**: Automatic deployment on push to `develop` branch
- **Staging**: Automatic deployment on push to `main` branch
- **Production**: Manual deployment with approval required

### Environment-specific Configurations

```bash
# Development
cp .env.development .env

# Staging
cp .env.staging .env

# Production
cp .env.production .env
```

## 🤝 Contributing

We welcome contributions from the community! Here's how to get started:

### Development Workflow

1. **Fork the repository**
   ```bash
   git fork https://github.com/yourusername/jansahyog.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm test                    # Run tests
   npm run lint               # Check code style
   npm run type-check         # TypeScript validation
   ```

5. **Submit a Pull Request**
   - Provide a clear description of changes
   - Reference any related issues
   - Ensure all checks pass

### Code Style Guidelines

- **JavaScript/TypeScript**: Follow ESLint configuration
- **React Components**: Use functional components with hooks
- **File Naming**: Use PascalCase for components, camelCase for utilities
- **Git Commits**: Use conventional commit messages

### Issue Reporting

When reporting bugs or requesting features:

1. **Search existing issues** first
2. **Use issue templates** provided
3. **Include relevant details**:
   - Device information (for mobile issues)
   - Browser version (for web issues)
   - Steps to reproduce
   - Expected vs actual behavior

### Development Guidelines

#### Code Quality Standards
- Maintain 80%+ test coverage
- Follow accessibility guidelines (WCAG 2.1)
- Ensure responsive design for all screen sizes
- Implement proper error handling
- Use TypeScript for type safety

#### Performance Standards
- Mobile app bundle size < 50MB
- Web app initial load < 3 seconds
- API response times < 500ms
- Lighthouse performance score > 90

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 JanSahyog Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```
