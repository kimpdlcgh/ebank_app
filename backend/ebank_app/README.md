# 🏦 SG FINTECH - Enterprise Banking Dashboard

A comprehensive, secure banking dashboard built with **React**, **TypeScript**, and **Firebase**, featuring both client and administrative interfaces with real-time data synchronization and enterprise-grade security.

## 🌟 Live Demo

🚀 **[View Live Application](#)** *(Link will be updated after deployment)*

## 📋 Table of Contents
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Security](#-security)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)

## ✨ Features

### 👤 Client Portal
- 🔐 **Secure Authentication** - Username/email login with role-based access
- 💰 **Account Overview** - Real-time balance and account information  
- 📊 **Transaction Management** - View history, deposits, withdrawals, transfers
- 💳 **E-Wallet Integration** - Digital wallet management (PayPal, Venmo, etc.)
- 👤 **Profile Management** - Update personal information and security settings
- 📈 **Reports & Analytics** - Financial insights and statements
- 🆘 **Help & Support** - Integrated support system with FAQ and live chat

### 🔧 Admin Portal
- 📊 **Administrative Dashboard** - Comprehensive system overview with analytics
- 👥 **User Management** - Create, edit, and manage user accounts
- 🏦 **Account Management** - Monitor and manage all client accounts
- 💸 **Transaction Oversight** - Review and manage all transactions
- 🔑 **Password Reset System** - Secure password reset workflow
- 🌍 **Country Management** - Manage supported countries and regions
- 📋 **Support Management** - Handle customer support requests and FAQ management
- ⚙️ **System Settings** - Configure system-wide settings and parameters

### 🔐 Security Features
- **Role-Based Access Control** (Client, Admin, Super Admin)
- **Firebase Authentication** with email verification
- **Secure password policies** with strength validation
- **Real-time data synchronization** between admin and client interfaces
- **Enterprise-grade security** with secure API endpoints
- **Audit logging** for all administrative actions

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and context
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing with protected routes
- **Lucide React** - Beautiful, customizable icons

### Backend & Database
- **Firebase Authentication** - User authentication and management
- **Firestore** - NoSQL database for real-time data
- **Firebase Storage** - File and document storage
- **Firebase Security Rules** - Database security and permissions

### Development Tools
- **Vite** - Fast build tool and dev server
- **ESLint** - Code linting and quality
- **PostCSS** - CSS processing
- **React Hot Toast** - Beautiful notifications

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ 
- **npm** or **yarn**
- **Firebase Account** (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ebank_dashboard.git
   cd ebank_dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication, Firestore, and Storage
   - Copy your Firebase configuration
   - Update `src/config/firebase.ts` with your config

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

### Default Access
- **Admin Access**: `/admin-access` - Create admin account first
- **Client Access**: `/client-login` - Accounts created by admin

## 📁 Project Structure

```
ebank_dashboard/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── client/         # Client-specific components
│   │   ├── admin/          # Admin-specific components
│   │   ├── ui/             # Base UI components
│   │   └── modals/         # Modal components
│   ├── pages/              # Page components
│   │   ├── auth/           # Authentication pages
│   │   ├── client/         # Client dashboard pages
│   │   └── admin/          # Admin dashboard pages
│   ├── contexts/           # React contexts (Auth, Config)
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Business logic and API calls
│   ├── utils/              # Helper functions and utilities
│   ├── types/              # TypeScript type definitions
│   └── config/             # Configuration files
├── public/                 # Static assets
├── firestore.rules        # Database security rules
├── firebase.json          # Firebase configuration
└── package.json
```

## 🚀 Deployment

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts to connect your GitHub repo
```

### Option 2: Netlify
```bash
# Build the project
npm run build

# Deploy dist/ folder to Netlify
# Or connect your GitHub repo for auto-deployment
```

### Option 3: Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Deploy
npm run build
firebase deploy
```

## 🔐 Security

This application implements enterprise-grade security measures:

- **Authentication**: Firebase Auth with email verification
- **Authorization**: Role-based access control (RBAC)
- **Database Security**: Firestore security rules
- **Input Validation**: Comprehensive form validation
- **XSS Protection**: Content Security Policy headers
- **Audit Logging**: All admin actions are logged

## 📸 Screenshots

### Client Dashboard
![Client Dashboard](screenshots/client-dashboard.png)

### Admin Panel
![Admin Panel](screenshots/admin-panel.png)

### Transaction Management
![Transaction Management](screenshots/transactions.png)

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- 📧 Email: support@sgfintech.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/ebank_dashboard/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/ebank_dashboard/wiki)

## 🙏 Acknowledgments

- Firebase for backend services
- Tailwind CSS for styling
- Lucide React for icons
- React community for excellent libraries

---

**Made with ❤️ by SG FINTECH Team**