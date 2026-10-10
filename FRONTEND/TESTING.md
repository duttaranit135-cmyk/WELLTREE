# Family Health Guardian - Verification & Test Checklist

Use this checklist to perform smoke testing, quality assurance, and verification across the Family Health Guardian application.

---

## 1. Application Initialization & Routing

- [ ] **App loads without console errors**: Navigating to `http://localhost:5173/` displays no React or TypeScript warnings in the browser developer console.
- [ ] **Landing page renders correctly**: Hero section, Features grid, and How It Works steps display with proper typography and icons.
- [ ] **Can navigate to login page**: Clicking "Sign In" routes to `/login`.
- [ ] **404 page shows for unknown routes**: Navigating to an invalid URL (e.g. `/invalid-route-xyz`) displays the custom 404 page with a "Go Home" or "Go to Dashboard" button.
- [ ] **Unauthenticated route protection**: Directly typing `/dashboard`, `/families`, `/consents`, or `/profile` into an unauthenticated browser redirects to `/login`.

---

## 2. Authentication & Session Lifecycle

- [ ] **Can register a new account**:
  - Fill in Full Name, Email, Password, and Confirm Password on `/register`.
  - Password strength meter dynamically updates color and progress bar.
  - Submitting shows a success toast and routes to `/login`.
- [ ] **Can login with credentials**:
  - Valid email and password triggers "Welcome back!" toast and routes to `/dashboard`.
  - Invalid credentials trigger error toast from Supabase without crashing.
- [ ] **Logout works and redirects**:
  - Clicking the user avatar dropdown in the Navbar and selecting "Sign Out" cleans up sessions and navigates to `/login`.

---

## 3. Dashboard Hub

- [ ] **Dashboard loads with real-time data**:
  - Shows welcome greeting with user's name.
  - Stat cards display counts for Family Circles, Active Consents, Pending Requests, and Profile Completion.
  - Shows skeleton loaders while initial data queries are resolving.
  - Shortcut buttons navigate cleanly to Create Family and Consent Hub.

---

## 4. User Profile Management

- [ ] **Profile page shows user info**:
  - Displays avatar with initials fallback, email, date of birth, gender, and phone number.
  - Profile completion progress bar shows accurate percentage.
- [ ] **Can edit and save profile**:
  - Clicking "Edit Profile" reveals the form.
  - Updating name, phone, or date of birth and clicking "Save Changes" triggers `useUpdateProfile` mutation.
  - Displays "Profile updated successfully!" toast and refreshes view mode.

---

## 5. Family Hub & Member Management

- [ ] **Families page lists families**:
  - Shows cards with role badges (ADMIN in indigo, GUARDIAN in amber, MEMBER in emerald).
  - Empty state displays if no families exist with a "Create Family" CTA.
- [ ] **Can create a new family**:
  - Clicking "Create Family" opens modal or routes to `/families/create`.
  - Entering name and description creates family and shows success toast.
- [ ] **Family detail shows members**:
  - Navigating to `/families/:id` displays family metadata, creator ID, and members table.
- [ ] **Can add members (as ADMIN)**:
  - "Add Member" button is visible only if current user is ADMIN.
  - Entering a valid UUID user ID and selecting role adds member with toast confirmation.
- [ ] **Can remove members**:
  - Clicking "Remove" opens a confirmation dialog.
  - Warning alert is displayed if the sole remaining ADMIN attempts to leave.

---

## 6. Consent Management Center

- [ ] **Consents page shows tabs**:
  - "Consents I Granted" vs "Access Granted to Me" tabs with count badges and active indicators.
- [ ] **Can create new consent**:
  - Clicking "Grant Access" opens modal with Family dropdown, Grantee UUID, and permission selection (View Only vs Full Access).
  - Submitting creates consent in `PENDING` status.
- [ ] **Can accept/deny/revoke consents**:
  - Granter can accept pending request → status changes to `ACTIVE`.
  - Granter can deny pending request → confirmation dialog opens, status changes to `DENIED`.
  - Granter can revoke active permission → confirmation dialog opens, status changes to `REVOKED`.

---

## 7. Responsiveness & UI Polish

- [ ] **Mobile responsive on all pages**:
  - Mobile (320px–768px): Single-column layouts, hamburger menu toggle, card view instead of tables.
  - Tablet (768px–1024px): 2-column grids and side-by-side metric cards.
  - Desktop (1024px+): 3/4-column grids, desktop navigation bar with dropdown.
- [ ] **Toast notifications appear for actions**:
  - Green toasts for successful creations and updates.
  - Red toasts for network or API errors with descriptive messages.
- [ ] **Confirmation dialogs for destructive actions**:
  - Revoking access, denying access, removing members, and leaving families require explicit user confirmation.
