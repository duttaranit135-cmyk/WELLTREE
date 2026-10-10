# Family Health Guardian - Frontend

> **"One Family. One Health Center. One Trusted Guardian."**

Family Health Guardian is a secure, role-aware, consent-driven healthcare web application designed to help families collectively coordinate member medical records with granular privacy boundaries and emergency guardian access.

---

## Overview

The Family Health Guardian frontend interfaces with:
1. **Supabase Auth**: For user registration, credential authentication, session tokens, and security.
2. **FastAPI Backend API** (`/api/v1`): For profile synchronization, family group rosters, member assignments, and mutual consent grant/revoke workflows.
3. **Supabase PostgreSQL & RLS**: Ensuring zero data leakage between unauthorized family circles.

---

## Tech Stack

- **Core Framework**: React 18+ with TypeScript & Vite
- **Server State & Cache**: [TanStack Query v5](https://tanstack.com/query/latest) (API caching, automatic query invalidation, background synchronization)
- **Client Routing**: [React Router v6/v7](https://reactrouter.com/) (Protected and public route guards)
- **Authentication**: [@supabase/supabase-js](https://supabase.com/docs/reference/javascript) (JWT session lifecycle and event listener)
- **HTTP Client**: [Axios](https://axios-http.com/) (Configured with automated Supabase JWT bearer token interceptors and 401 handling)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) with custom healthcare design system (Medical Teal, Soft Indigo, Amber, Crimson)
- **Form Management & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Toasts**: [React Hot Toast](https://react-hot-toast.com/)

---

## Prerequisites

Before starting, ensure you have:
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** package manager
- **Backend API**: Running instance of the Family Health Guardian FastAPI backend at `http://127.0.0.1:8000`
- **Supabase Project**: An active Supabase project with Email Auth enabled

---

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lycants06r/WELLTREE-TRAIL.git
   cd WELLTREE-TRAIL
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your Supabase project credentials and backend API URL.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

## Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL for the FastAPI backend service | `http://127.0.0.1:8000/api/v1` |
| `VITE_SUPABASE_URL` | Supabase Project API URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon client key | `your-supabase-anon-key` |

---

## Available Scripts

- `npm run dev`: Runs the Vite local development server with hot-module replacement.
- `npm run build`: Compiles TypeScript and builds the production bundle in `dist/`.
- `npm run preview`: Locally previews the production build output.
- `npm run lint`: Runs code analysis with Oxlint.

---

## Project Structure

```text
src/
├── components/
│   ├── auth/            # ProtectedRoute guard and authentication components
│   ├── layout/          # Navbar, DashboardLayout, AuthLayout, PageHeader, Footer
│   ├── ui/              # Reusable design system primitives:
│   │                    # Button, Input, Select, Badge, Card, Modal, Avatar,
│   │                    # Tooltip, EmptyState, ConfirmDialog, LoadingSpinner,
│   │                    # ErrorBoundary
│   ├── profile/         # User profile components
│   ├── families/        # Family circle cards and forms
│   └── consents/        # Consent management components
├── context/
│   └── AuthContext.tsx  # Global authentication context & Supabase session lifecycle
├── hooks/
│   ├── useAuth.ts       # Authentication context consumer
│   ├── useAuthGuard.ts  # Route protection hook
│   ├── useProfile.ts    # Profile queries and update mutations
│   ├── useFamilies.ts   # Family queries, create/add/remove member mutations
│   └── useConsents.ts   # Consent queries and update/create mutations
├── lib/
│   ├── api.ts           # Axios client configured with JWT interceptors
│   ├── supabase.ts      # Supabase client initialization
│   ├── utils.ts         # Utility functions: cn, formatDate, getInitials, getRoleBadgeColor
│   └── services/        # Isolated API service methods (profile, family, consent, health)
├── pages/
│   ├── LandingPage.tsx        # Public marketing & feature highlights (/)
│   ├── LoginPage.tsx          # User sign-in (/login)
│   ├── RegisterPage.tsx       # User sign-up & strength meter (/register)
│   ├── ForgotPasswordPage.tsx # Password recovery (/forgot-password)
│   ├── DashboardPage.tsx      # Main health hub & metrics (/dashboard)
│   ├── FamiliesPage.tsx       # Family directory & creation modal (/families)
│   ├── CreateFamilyPage.tsx   # Standalone family creation form (/families/create)
│   ├── FamilyDetailPage.tsx   # Roster, RBAC controls & member modal (/families/:id)
│   ├── ConsentsPage.tsx       # Dual-tab mutual consent management (/consents)
│   ├── ProfilePage.tsx        # Profile view, meter & edit form (/profile)
│   └── NotFoundPage.tsx       # 404 page with dynamic home redirect (*)
├── styles/
│   └── globals.css      # Tailwind base and design system directives
├── types/
│   └── index.ts         # Comprehensive TypeScript models and domain types
├── App.tsx              # Router, QueryClientProvider, and ErrorBoundary
└── main.tsx             # Application DOM mount
```

---

## API Integration

The application connects to the following FastAPI endpoints:

### System & Health
- `GET /health`: Verifies backend service status.

### Profiles
- `GET /api/v1/profiles/me`: Fetches active user profile credentials.
- `PUT /api/v1/profiles/me`: Updates user name, birth date, gender, phone, and avatar.

### Families & Members
- `GET /api/v1/families`: Lists all family groups the user belongs to.
- `POST /api/v1/families`: Creates a new family circle (creator assigned as `ADMIN`).
- `GET /api/v1/families/{family_id}`: Retrieves family details and member roster.
- `POST /api/v1/families/{family_id}/members`: Adds a member by UUID (`ADMIN` only).
- `DELETE /api/v1/families/{family_id}/members/{user_id}`: Removes a member or leaves family.

### Consents & Guardian Permissions
- `GET /api/v1/consents`: Lists mutual consents (where user is granter or grantee).
- `POST /api/v1/consents`: Creates a new consent request (`READ_ONLY` or `FULL_ACCESS`).
- `PATCH /api/v1/consents/{consent_id}`: Accepts (`ACTIVE`), denies (`DENIED`), or revokes (`REVOKED`) access.

---

## License

This project is built for the **Family Health Guardian** platform. All rights reserved &copy; 2024.
