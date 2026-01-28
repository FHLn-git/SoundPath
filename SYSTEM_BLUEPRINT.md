# SoundPath (Label OS) - Comprehensive System Blueprint

**Document Type:** Technical Source of Truth for Gemini Gem System Instruction  
**Generated:** January 25, 2026  
**Version:** 1.0.0  
**Status:** Production-Ready SaaS Platform

---

## <TechStack>

### Frontend Technologies

**Core Framework:**
- **React**: `^18.2.0` - UI library
- **React DOM**: `^18.2.0` - React rendering
- **React Router DOM**: `^6.21.1` - Client-side routing

**Build Tool:**
- **Vite**: `^7.3.1` - Build tool and dev server
- **@vitejs/plugin-react**: `^4.2.1` - Vite React plugin

**Styling:**
- **Tailwind CSS**: `^3.3.6` - Utility-first CSS framework
- **PostCSS**: `^8.4.32` - CSS processing
- **Autoprefixer**: `^10.4.16` - CSS vendor prefixing

**UI Libraries:**
- **Framer Motion**: `^10.16.16` - Animation library
- **Lucide React**: `^0.294.0` - Icon library
- **@dnd-kit/core**: `^6.1.0` - Drag-and-drop core
- **@dnd-kit/sortable**: `^8.0.0` - Sortable drag-and-drop
- **@dnd-kit/utilities**: `^3.2.2` - Drag-and-drop utilities

**Backend Integration:**
- **@supabase/supabase-js**: `^2.91.0` - Supabase client library
- **@stripe/stripe-js**: `^8.6.4` - Stripe payment processing

**Optional Dependencies:**
- **@sentry/react**: `^7.91.0` - Error tracking (optional)

### Backend Technologies

**Database:**
- **PostgreSQL** (via Supabase) - Relational database
- **Supabase Auth** - Authentication service
- **Supabase Realtime** - Real-time subscriptions
- **Supabase Storage** - File storage (future use)

**Serverless Functions:**
- **Deno Runtime** - Edge Functions runtime
- **TypeScript** - Edge Functions language

**Extensions:**
- **uuid-ossp** - UUID generation extension

### Development Tools

**Testing:**
- **Vitest**: `^4.0.18` - Test runner
- **@vitest/ui**: `^4.0.18` - Test UI
- **@testing-library/react**: `^14.1.2` - React testing utilities
- **@testing-library/jest-dom**: `^6.1.5` - DOM matchers
- **@testing-library/user-event**: `^14.5.1` - User interaction simulation
- **jsdom**: `^23.0.1` - DOM environment for tests

**Code Quality:**
- **ESLint**: `^8.55.0` - Linter
- **eslint-plugin-react**: `^7.33.2` - React ESLint plugin
- **eslint-plugin-react-hooks**: `^4.6.0` - React Hooks linting
- **eslint-plugin-react-refresh**: `^0.4.5` - React Refresh linting
- **Prettier**: `^3.1.1` - Code formatter

**Type Definitions:**
- **@types/react**: `^18.2.43` - React TypeScript types
- **@types/react-dom**: `^18.2.17` - React DOM TypeScript types

### Third-Party APIs

**Payment Processing:**
- **Stripe** - Payment processor
  - Checkout sessions
  - Customer portal
  - Webhooks for subscription events

**Email Service:**
- **Resend** - Primary email provider
  - Team invites
  - Notifications
  - Transactional emails

**Analytics (Optional):**
- **PostHog** - Product analytics (configurable)
- **Sentry** - Error tracking (optional, custom system by default)

**Support Widget (Optional):**
- **Crisp** - Customer support chat (configurable)

### Hosting & Deployment

**Frontend Hosting:**
- **Vercel** - Frontend deployment platform
  - Automatic deployments from GitHub
  - Preview deployments for PRs
  - Edge network (global CDN)
  - Automatic HTTPS

**Backend Hosting:**
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database hosting
  - Edge Functions hosting
  - Realtime infrastructure
  - Auth service

**CI/CD:**
- **GitHub Actions** - Continuous integration/deployment
  - Automated testing
  - Linting and formatting checks
  - Automatic deployments

---

## <Architecture>

### Folder Structure

```
Label_OS/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline configuration
├── database/
│   ├── archive/                      # Archived migrations (reference only)
│   ├── migrations/                   # Feature-specific database migrations
│   │   ├── add-permissions-schema.sql
│   │   ├── add-personal-workspace-columns.sql
│   │   ├── add-recipient-user-id.sql
│   │   ├── add-rejection-reason-setting.sql
│   │   ├── admin-delete-user.sql
│   │   ├── agent-networking-schema.sql
│   │   ├── api-database-functions.sql
│   │   ├── archive-metrics-schema.sql
│   │   ├── contact-form-schema.sql
│   │   ├── error-logging-schema.sql
│   │   ├── find-orphaned-user-data.sql
│   │   ├── leave-label-function.sql
│   │   ├── multi-tenant-migration.sql
│   │   ├── multi-tier-subscription-capacity.sql
│   │   ├── onboarding-schema.sql
│   │   ├── public-submission-rls.sql
│   │   ├── rebrand-studiostosoundpath.sql
│   │   ├── refactor-permissions-schema.sql
│   │   ├── rls-policies-email-invites-memberships.sql
│   │   └── system-admin-schema.sql
│   └── schemas/                      # Core database schemas
│       ├── master-schema.sql         # Core tables, RLS, triggers
│       ├── rbac-schema.sql          # Role-based access control
│       ├── saas-schema.sql          # Subscription, billing, usage
│       └── supabase-schema.sql      # Legacy schema (reference)
├── docs/                             # Project documentation
├── public/                           # Static assets
│   ├── og-image.png
│   └── README.md
├── scripts/                          # Utility scripts
│   └── populate-test-data.js        # Test data generation
├── src/
│   ├── components/                   # Reusable React components
│   │   ├── AddDemoModal.jsx
│   │   ├── BottomNav.jsx
│   │   ├── CapacityOverlay.jsx
│   │   ├── Column.jsx
│   │   ├── ConfirmationModal.jsx
│   │   ├── ContactInbox.jsx
│   │   ├── Diagnostics.jsx
│   │   ├── EnergyEditor.jsx
│   │   ├── EnergyMeter.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── GapAlert.jsx
│   │   ├── GlobalSettings.jsx
│   │   ├── KanbanBoard.jsx
│   │   ├── LinkShield.jsx
│   │   ├── Login.jsx
│   │   ├── MobileLayout.jsx
│   │   ├── PermissionsModal.jsx
│   │   ├── PremiumOverlay.jsx
│   │   ├── PublicForm.jsx
│   │   ├── ReleaseSetupModal.jsx
│   │   ├── ResizableColumnHeader.jsx
│   │   ├── ReviseModal.jsx
│   │   ├── Sidebar.jsx
│   │   ├── StaffingAlert.jsx
│   │   ├── SupportWidget.jsx
│   │   ├── Toast.jsx
│   │   ├── TrackBrowser.jsx
│   │   ├── TrackCard.jsx
│   │   ├── TrackRow.jsx
│   │   ├── UpgradeOverlay.jsx
│   │   ├── UsageLimitAlert.jsx
│   │   └── UsageWarningBanner.jsx
│   ├── context/                      # React Context providers
│   │   ├── AppContext.jsx           # Tracks, artists, business logic
│   │   ├── AuthContext.jsx         # Authentication, user, permissions
│   │   └── BillingContext.jsx      # Subscriptions, plans, usage
│   ├── hooks/                        # Custom React hooks
│   │   ├── useGapDetection.js
│   │   ├── useMobile.js
│   │   ├── useResizableColumns.js
│   │   └── useUsageLimits.js
│   ├── lib/                          # Utility libraries
│   │   ├── analytics.js              # Analytics initialization
│   │   ├── emailService.js           # Email sending service
│   │   ├── emailValidation.js        # Email validation utilities
│   │   ├── errorLogger.js            # Error logging system
│   │   ├── errorTracking.js          # Error tracking initialization
│   │   ├── pagination.js             # Pagination utilities
│   │   ├── stripeClient.js          # Stripe integration
│   │   └── supabaseClient.js        # Supabase client initialization
│   ├── pages/                        # Route page components
│   │   ├── AdminDashboard.jsx       # SystemAdmin dashboard
│   │   ├── ApiKeys.jsx              # API key management
│   │   ├── ArtistDirectory.jsx      # Artist directory view
│   │   ├── Billing.jsx               # Billing and subscription management
│   │   ├── Calendar.jsx              # Release calendar
│   │   ├── Contact.jsx               # Contact page
│   │   ├── Dashboard.jsx             # Main dashboard (Kanban/Track Browser)
│   │   ├── DataExport.jsx           # Data export functionality
│   │   ├── DeleteAccount.jsx        # Account deletion
│   │   ├── EmailTest.jsx             # Email testing page
│   │   ├── FAQ.jsx                   # FAQ page
│   │   ├── GlobalPulse.jsx           # SystemAdmin global view
│   │   ├── HealthCheck.jsx           # Health check page
│   │   ├── HelpCenter.jsx           # Help center
│   │   ├── Landing.jsx               # Public landing page
│   │   ├── Launchpad.jsx             # Agent-centric launchpad
│   │   ├── NotFound.jsx              # 404 page
│   │   ├── Onboarding.jsx            # User onboarding flow
│   │   ├── PersonalOffice.jsx        # Personal workspace (legacy)
│   │   ├── PersonalOfficeSigned.jsx  # Personal signed tracks
│   │   ├── PersonalOfficeSubmitted.jsx # Personal submitted tracks
│   │   ├── PersonalPitched.jsx       # Personal pitched tracks
│   │   ├── PersonalSigned.jsx        # Personal signed tracks
│   │   ├── PhaseDetailView.jsx       # Phase-specific detail view
│   │   ├── PlanInfo.jsx              # Plan information page
│   │   ├── PopulateTestData.jsx      # Test data population UI
│   │   ├── PrivacyPolicy.jsx         # Privacy policy
│   │   ├── SecuritySettings.jsx     # Security settings
│   │   ├── SignUp.jsx                 # User signup page
│   │   ├── StaffAdmin.jsx            # Staff admin dashboard
│   │   ├── StaffManagement.jsx      # Staff management
│   │   ├── TermsOfService.jsx        # Terms of service
│   │   ├── Upcoming.jsx              # Upcoming releases
│   │   ├── Vault.jsx                 # Released tracks vault
│   │   ├── Webhooks.jsx              # Webhook management
│   │   └── Welcome.jsx               # Welcome page for new users
│   ├── test/                         # Test files
│   │   ├── App.test.jsx
│   │   ├── auth.test.js
│   │   ├── setup.js
│   │   └── tracks.test.js
│   ├── App.jsx                       # Main app component, routing
│   ├── index.css                     # Global styles, Tailwind imports
│   └── main.jsx                      # Application entry point
├── supabase/
│   └── functions/                    # Supabase Edge Functions
│       ├── api/
│       │   └── v1/
│       │       ├── artists/
│       │       │   └── index.ts      # Artists REST API
│       │       └── tracks/
│       │           └── index.ts      # Tracks REST API
│       ├── create-checkout-session/
│       │   └── index.ts              # Stripe checkout session creation
│       ├── create-portal-session/
│       │   └── index.ts              # Stripe customer portal
│       ├── health/
│       │   └── index.ts              # Health check endpoint
│       ├── send-email/
│       │   └── index.ts              # Email sending via Resend
│       ├── stripe-webhook/
│       │   └── index.ts              # Stripe webhook handler
│       └── webhook-delivery/
│           └── index.ts              # Webhook delivery service
├── .eslintrc.cjs                     # ESLint configuration
├── .gitignore                        # Git ignore rules
├── .prettierignore                   # Prettier ignore rules
├── .prettierrc                       # Prettier configuration
├── index.html                        # HTML entry point
├── package.json                      # Dependencies and scripts
├── package-lock.json                 # Locked dependencies
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── vercel.json                      # Vercel deployment configuration
└── vite.config.js                    # Vite build configuration
```

### Data Flow Architecture

#### Frontend to Backend Flow

1. **User Action** → React Component
2. **Component** → Context Hook (`useApp`, `useAuth`, `useBilling`)
3. **Context** → Supabase Client (`supabaseClient.js`)
4. **Supabase Client** → Supabase API (REST or Realtime)
5. **Supabase API** → PostgreSQL Database (with RLS enforcement)
6. **Database Trigger** → Automatic updates (votes, usage counts)
7. **Realtime Subscription** → Frontend update (all connected clients)

#### State Management Flow

**Three-Tier Context Architecture:**

1. **AuthContext** (`src/context/AuthContext.jsx`)
   - Manages: User authentication, staff profile, memberships, active organization
   - State: `user`, `staffProfile`, `memberships`, `activeOrgId`, `activeMembership`
   - Functions: `signIn`, `signUp`, `signOut`, `switchOrganization`, `hasPermission`, `canVote`, etc.

2. **AppContext** (`src/context/AppContext.jsx`)
   - Manages: Tracks, artists, staff, business logic
   - State: `tracks`, `loading`, `cognitiveLoadCache`, `companyHealthCache`
   - Functions: `loadTracks`, `addTrack`, `moveTrack`, `voteOnTrack`, `getAllArtists`, `getCognitiveLoad`, etc.

3. **BillingContext** (`src/context/BillingContext.jsx`)
   - Manages: Subscriptions, plans, usage, invoices
   - State: `subscription`, `plan`, `usage`, `invoices`, `paymentMethods`, `plans`
   - Functions: `loadSubscriptionData`, `createCheckoutSession`, `hasFeature`, etc.

**Data Synchronization:**
- **Real-time**: Supabase Realtime subscriptions on `tracks` and `votes` tables
- **Optimistic Updates**: UI updates immediately, syncs with server
- **Caching**: Cognitive load and company health metrics cached (30-60 seconds)

#### Agent-Centric Architecture

**Dual Workspace System:**

1. **Personal View** (`activeOrgId === null`)
   - Data: `organization_id IS NULL`, `recipient_user_id = user_id`
   - Permissions: Full Owner permissions (all checks return `true`)
   - Routes: `/launchpad`, `/personal/pitched`, `/personal/signed`
   - Context: Personal inbox, personal rolodex

2. **Label Workspace** (`activeOrgId` set)
   - Data: `organization_id = activeOrgId`
   - Permissions: From `memberships.permissions_json` based on role
   - Routes: `/dashboard`, `/artists`, `/admin`, etc.
   - Context: Organization tracks, team collaboration

**Workspace Switching:**
- User can switch between Personal and Label workspaces
- `switchOrganization(orgId)` sets `activeOrgId`
- `clearWorkspace()` sets `activeOrgId` to `null` (Personal view)
- Tracks reload automatically when workspace changes

---

## <CoreFeatures>

### Authentication & User Management

**Primary Files:**
- `src/context/AuthContext.jsx` - Authentication state management
- `src/pages/SignUp.jsx` - User registration
- `src/components/Login.jsx` - User login
- `src/pages/Onboarding.jsx` - User onboarding flow
- `src/pages/Welcome.jsx` - Welcome page for new users

**Features:**
- Email/password authentication via Supabase Auth
- Staff profile creation on signup
- Multi-organization membership support
- Role-based access control (Owner, Manager, Scout, SystemAdmin)
- Granular permissions system
- Session management with automatic refresh
- Password strength requirements
- Email verification (optional)

**Database Tables:**
- `auth.users` (Supabase managed)
- `staff_members` - User profiles
- `memberships` - User-organization relationships
- `invites` - Team invitation system

### Track Pipeline Management

**Primary Files:**
- `src/context/AppContext.jsx` - Track state and business logic
- `src/pages/Dashboard.jsx` - Main dashboard view
- `src/components/KanbanBoard.jsx` - Drag-and-drop board
- `src/components/TrackBrowser.jsx` - High-density list view
- `src/components/TrackCard.jsx` - Track card component
- `src/components/TrackRow.jsx` - Track row component
- `src/components/AddDemoModal.jsx` - Add track modal
- `src/pages/PhaseDetailView.jsx` - Phase-specific detail view

**Pipeline Phases:**
1. **Inbox** - Initial submission
2. **Second Listen** - Energy rating, voting
3. **Team Review** - Collaborative voting
4. **Contracting** - Contract signing, target release date
5. **Upcoming** - Scheduled releases
6. **Vault** - Released tracks with earnings

**Features:**
- Track CRUD operations
- Phase transitions with permission checks
- Energy level rating (0-5)
- Voting system (+1/-1, one vote per staff per track)
- Link validation (SoundCloud)
- Watchlist functionality
- Archive with rejection reasons
- Real-time synchronization
- Usage limit enforcement

**Database Tables:**
- `tracks` - Track data
- `votes` - Voting records
- `artists` - Artist profiles
- `listen_logs` - Cognitive load tracking

### Artist Directory

**Primary Files:**
- `src/pages/ArtistDirectory.jsx` - Artist directory view
- `src/context/AppContext.jsx` - Artist data management

**Features:**
- Artist profile view
- Conversion rate calculation (signed/submitted)
- Total signed and submitted counts
- Dominant genre calculation
- Filtered track list by artist
- Artist search and filtering

**Database Tables:**
- `artists` - Artist profiles
- `tracks` - Tracks linked to artists

### Staff Management

**Primary Files:**
- `src/pages/StaffAdmin.jsx` - Staff admin dashboard
- `src/pages/StaffManagement.jsx` - Staff management interface
- `src/components/PermissionsModal.jsx` - Permission editing modal
- `src/context/AppContext.jsx` - Staff management functions

**Features:**
- Staff invitation system (email)
- Role management (Owner, Manager, Scout)
- Granular permissions editing
- Staff removal (deactivation, preserves history)
- Cognitive load tracking
- Activity metrics
- Online status tracking

**Database Tables:**
- `staff_members` - Staff profiles
- `memberships` - Staff-organization relationships
- `invites` - Invitation records
- `listen_logs` - Activity tracking

### Analytics & Metrics

**Primary Files:**
- `src/pages/StaffAdmin.jsx` - Staff metrics display
- `src/pages/Dashboard.jsx` - Company health display
- `src/context/AppContext.jsx` - Metrics calculation functions

**Features:**
- **Cognitive Load Tracking**: Daily/weekly/monthly listens per staff
- **Company Health**: Staff fatigue, demo volume, health score
- **Staff Metrics**: Energy assignments, voting participation, listens
- **Conversion Metrics**: Artist conversion rates
- **Activity Tracking**: Last active timestamps, online status

**Database Tables:**
- `listen_logs` - Listen event tracking
- `tracks` - Track data for metrics
- `votes` - Voting data for metrics

### Subscription & Billing

**Primary Files:**
- `src/context/BillingContext.jsx` - Billing state management
- `src/pages/Billing.jsx` - Billing management UI
- `src/pages/PlanInfo.jsx` - Plan information page
- `src/lib/stripeClient.js` - Stripe integration
- `supabase/functions/create-checkout-session/index.ts` - Checkout session creation
- `supabase/functions/create-portal-session/index.ts` - Customer portal
- `supabase/functions/stripe-webhook/index.ts` - Webhook handler

**Features:**
- Subscription plan management (Free, Starter, Pro, Enterprise, Agent)
- Usage tracking (tracks, staff, storage, API calls)
- Usage limit enforcement
- Stripe checkout integration
- Customer portal for subscription management
- Invoice history
- Payment method management
- Trial period management
- Subscription status tracking

**Database Tables:**
- `plans` - Subscription plans
- `subscriptions` - Organization subscriptions
- `organization_usage` - Real-time usage tracking
- `invoices` - Billing invoices
- `payment_methods` - Stored payment methods

### API & Webhooks

**Primary Files:**
- `supabase/functions/api/v1/tracks/index.ts` - Tracks REST API
- `supabase/functions/api/v1/artists/index.ts` - Artists REST API
- `src/pages/ApiKeys.jsx` - API key management
- `src/pages/Webhooks.jsx` - Webhook management
- `supabase/functions/webhook-delivery/index.ts` - Webhook delivery service

**Features:**
- REST API for tracks and artists (CRUD)
- API key authentication (hashed keys)
- Rate limiting based on subscription plan
- Webhook endpoint management
- Webhook event delivery with retry logic
- Signature verification (HMAC-SHA256)
- Delivery status tracking

**Database Tables:**
- `api_keys` - API authentication keys
- `webhooks` - Webhook endpoints
- `webhook_deliveries` - Delivery tracking

### Email System

**Primary Files:**
- `src/lib/emailService.js` - Email service and templates
- `supabase/functions/send-email/index.ts` - Email sending Edge Function

**Features:**
- Team invite emails
- Track submission notifications
- Trial ending warnings
- Subscription expiration notifications
- HTML email templates
- Resend API integration
- Email queue fallback

**Email Templates:**
- Team invite
- Track submitted
- Trial ending
- Subscription expired

### Public Submission Form

**Primary Files:**
- `src/components/PublicForm.jsx` - Public submission form
- `src/pages/Contact.jsx` - Contact form

**Features:**
- Public track submission (no authentication required)
- Organization-specific submission URLs
- Form validation
- Short note/comment field
- Artist and track metadata collection

### Admin Dashboard

**Primary Files:**
- `src/pages/AdminDashboard.jsx` - SystemAdmin dashboard
- `src/pages/GlobalPulse.jsx` - Global system view

**Features:**
- All organizations overview
- Revenue metrics (MRR, total revenue)
- Subscription status monitoring
- Trial organization tracking
- Past due subscription alerts
- System-wide analytics

### Data Export & Account Management

**Primary Files:**
- `src/pages/DataExport.jsx` - Data export functionality
- `src/pages/DeleteAccount.jsx` - Account deletion
- `src/pages/SecuritySettings.jsx` - Security settings

**Features:**
- CSV/JSON data export
- Account deletion workflow
- Password strength requirements
- Security settings UI (2FA placeholder, session management placeholder)

### Launchpad (Agent-Centric Hub)

**Primary Files:**
- `src/pages/Launchpad.jsx` - Agent-centric launchpad

**Features:**
- Personal workspace access
- Organization switcher
- Invite notifications
- Create organization button
- Quick access to personal inbox/rolodex
- Network features (if enabled)

### Mobile Optimization

**Primary Files:**
- `src/components/MobileLayout.jsx` - Mobile layout wrapper
- `src/components/BottomNav.jsx` - Bottom navigation
- `src/hooks/useMobile.js` - Mobile detection hook

**Features:**
- Responsive design
- Mobile-optimized navigation
- Touch-friendly interactions
- Bottom navigation bar
- Collapsible sidebar

---

## <DataSchema>

### Core Tables

#### `organizations`
Multi-tenant organizations (labels)

**Columns:**
- `id` (UUID, PRIMARY KEY) - Organization identifier
- `name` (TEXT, UNIQUE, NOT NULL) - Organization name
- `require_rejection_reason` (BOOLEAN, DEFAULT true) - Settings flag
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Unique constraint on `name`

**Relationships:**
- One-to-many with `tracks`
- One-to-many with `artists`
- One-to-many with `memberships`
- One-to-many with `subscriptions`

#### `staff_members`
User profiles linked to Supabase Auth

**Columns:**
- `id` (TEXT, PRIMARY KEY) - Staff identifier (format: `staff_<uuid_prefix>_<timestamp>`)
- `name` (TEXT, NOT NULL) - Display name
- `role` (TEXT, NOT NULL) - Role: 'Owner', 'Manager', 'Scout', or 'SystemAdmin'
- `bio` (TEXT) - Profile biography
- `organization_id` (UUID) - Legacy organization link (NULL for agents)
- `organization_name` (TEXT) - Legacy organization name
- `auth_user_id` (UUID, REFERENCES auth.users) - Links to Supabase Auth
- `last_active_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last activity timestamp
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp

**Constraints:**
- `role` CHECK constraint: IN ('Owner', 'Manager', 'Scout', 'SystemAdmin')
- Foreign key to `auth.users` with CASCADE delete

**Indexes:**
- Primary key on `id`
- Index on `auth_user_id`
- Index on `organization_id`

**Relationships:**
- One-to-one with `auth.users` (via `auth_user_id`)
- One-to-many with `memberships` (via `user_id`)

#### `memberships`
Many-to-many relationship between users and organizations

**Columns:**
- `id` (UUID, PRIMARY KEY) - Membership identifier
- `user_id` (TEXT, REFERENCES staff_members.id) - Staff member ID
- `organization_id` (UUID, REFERENCES organizations.id) - Organization ID
- `role` (TEXT, NOT NULL) - Role in this organization
- `permissions_json` (JSONB, DEFAULT '{}') - Granular permissions
- `active` (BOOLEAN, DEFAULT true) - Membership status
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `role` CHECK constraint: IN ('Owner', 'Manager', 'Scout')
- Unique constraint on (`user_id`, `organization_id`)

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `organization_id`
- Index on `active`

**Relationships:**
- Many-to-one with `staff_members`
- Many-to-one with `organizations`

#### `tracks`
Demo submissions and releases

**Columns:**
- `id` (UUID, PRIMARY KEY) - Track identifier
- `artist_id` (UUID, REFERENCES artists.id) - Linked artist
- `artist_name` (TEXT, NOT NULL) - Denormalized artist name
- `title` (TEXT, NOT NULL) - Track title
- `sc_link` (TEXT) - SoundCloud link
- `genre` (TEXT) - Music genre
- `bpm` (INTEGER, DEFAULT 128) - Beats per minute
- `energy` (INTEGER, DEFAULT 0) - Energy rating (0-5)
- `status` (TEXT, NOT NULL, DEFAULT 'inbox') - Pipeline phase
- `column` (TEXT, NOT NULL, DEFAULT 'inbox') - Legacy phase field
- `votes` (INTEGER, DEFAULT 0) - Calculated vote total
- `organization_id` (UUID, REFERENCES organizations.id) - NULL for personal, set for label
- `recipient_user_id` (TEXT, REFERENCES staff_members.id) - For personal inbox
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `moved_to_second_listen` (TIMESTAMPTZ) - Timestamp when moved to Second Listen
- `target_release_date` (DATE) - Planned release date
- `release_date` (DATE) - Actual release date
- `contract_signed` (BOOLEAN, DEFAULT false) - Contract status
- `total_earnings` (NUMERIC(10, 2), DEFAULT 0) - Revenue tracking
- `watched` (BOOLEAN, DEFAULT false) - Watchlist flag
- `archived` (BOOLEAN, DEFAULT false) - Archive status
- `spotify_plays` (INTEGER, DEFAULT 0) - External metrics
- `rejection_reason` (TEXT) - Archive reason
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `status` values: 'inbox', 'second-listen', 'team-review', 'contracting', 'upcoming', 'vault', 'archive'
- Foreign key to `artists` with SET NULL on delete
- Foreign key to `organizations` with CASCADE delete
- Foreign key to `staff_members` with SET NULL on delete

**Indexes:**
- Primary key on `id`
- Index on `status`
- Index on `artist_id`
- Index on `artist_name`
- Index on `release_date`
- Index on `organization_id`
- Index on `recipient_user_id`

**Relationships:**
- Many-to-one with `artists`
- Many-to-one with `organizations` (nullable)
- Many-to-one with `staff_members` (nullable, for personal inbox)
- One-to-many with `votes`
- One-to-many with `listen_logs`

#### `artists`
Artist profiles

**Columns:**
- `id` (UUID, PRIMARY KEY) - Artist identifier
- `name` (TEXT, NOT NULL) - Artist name
- `bio` (TEXT) - Artist biography
- `primary_genre` (TEXT) - Main genre
- `profitability_score` (NUMERIC(5, 2), DEFAULT 0) - Calculated metric
- `organization_id` (UUID, REFERENCES organizations.id) - NULL for personal, set for label
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- Unique constraint on (`name`, `organization_id`) - Artists unique per organization/personal workspace
- Foreign key to `organizations` with CASCADE delete

**Indexes:**
- Primary key on `id`
- Index on `organization_id`

**Relationships:**
- Many-to-one with `organizations` (nullable)
- One-to-many with `tracks`

#### `votes`
Staff voting records

**Columns:**
- `id` (UUID, PRIMARY KEY) - Vote identifier
- `track_id` (UUID, REFERENCES tracks.id) - Track being voted on
- `staff_id` (TEXT, REFERENCES staff_members.id) - Staff member voting
- `vote_type` (INTEGER, NOT NULL) - -1 (downvote) or 1 (upvote)
- `organization_id` (UUID, REFERENCES organizations.id) - For RLS isolation
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `vote_type` CHECK constraint: IN (-1, 1)
- Unique constraint on (`track_id`, `staff_id`) - One vote per staff per track
- Foreign key to `tracks` with CASCADE delete
- Foreign key to `organizations` with CASCADE delete

**Indexes:**
- Primary key on `id`
- Index on `track_id`
- Index on `staff_id`
- Index on `organization_id`
- Unique index on (`track_id`, `staff_id`)

**Relationships:**
- Many-to-one with `tracks`
- Many-to-one with `staff_members`
- Many-to-one with `organizations`

#### `listen_logs`
Cognitive load tracking

**Columns:**
- `id` (UUID, PRIMARY KEY) - Log identifier
- `staff_id` (TEXT, REFERENCES staff_members.id) - Staff member
- `track_id` (UUID, REFERENCES tracks.id) - Track listened to
- `organization_id` (UUID, REFERENCES organizations.id) - For RLS isolation
- `listened_at` (TIMESTAMPTZ, DEFAULT NOW()) - Listen timestamp
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp

**Indexes:**
- Primary key on `id`
- Index on `staff_id`
- Index on `track_id`
- Index on `listened_at`
- Index on `organization_id`

**Relationships:**
- Many-to-one with `staff_members`
- Many-to-one with `tracks`
- Many-to-one with `organizations`

### SaaS Tables

#### `plans`
Subscription plans

**Columns:**
- `id` (TEXT, PRIMARY KEY) - Plan ID: 'free', 'starter', 'pro', 'enterprise', 'agent'
- `name` (TEXT, NOT NULL) - Display name
- `description` (TEXT) - Plan description
- `price_monthly` (NUMERIC(10, 2), NOT NULL, DEFAULT 0) - Monthly price
- `price_yearly` (NUMERIC(10, 2)) - Yearly price
- `currency` (TEXT, DEFAULT 'USD') - Currency code
- `interval` (TEXT, DEFAULT 'month') - Billing interval: 'month' or 'year'
- `stripe_price_id_monthly` (TEXT) - Stripe monthly price ID
- `stripe_price_id_yearly` (TEXT) - Stripe yearly price ID
- `paddle_plan_id` (TEXT) - Paddle plan ID (future use)
- `features` (JSONB, DEFAULT '{}') - Feature flags
- `limits` (JSONB) - Usage limits (tracks, staff, storage, API calls)
- `trial_days` (INTEGER, DEFAULT 0) - Trial period in days
- `active` (BOOLEAN, DEFAULT true) - Plan availability
- `sort_order` (INTEGER, DEFAULT 0) - Display order
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `interval` CHECK constraint: IN ('month', 'year')

**Indexes:**
- Primary key on `id`
- Index on `active`

#### `subscriptions`
Organization subscriptions

**Columns:**
- `id` (UUID, PRIMARY KEY) - Subscription identifier
- `organization_id` (UUID, REFERENCES organizations.id, UNIQUE) - One subscription per organization
- `plan_id` (TEXT, REFERENCES plans.id) - Current plan
- `status` (TEXT, NOT NULL, DEFAULT 'trialing') - Subscription status
- `current_period_start` (TIMESTAMPTZ, NOT NULL) - Billing period start
- `current_period_end` (TIMESTAMPTZ, NOT NULL) - Billing period end
- `cancel_at_period_end` (BOOLEAN, DEFAULT false) - Cancel at period end flag
- `canceled_at` (TIMESTAMPTZ) - Cancellation timestamp
- `trial_start` (TIMESTAMPTZ) - Trial start timestamp
- `trial_end` (TIMESTAMPTZ) - Trial end timestamp
- `stripe_subscription_id` (TEXT, UNIQUE) - Stripe subscription ID
- `stripe_customer_id` (TEXT) - Stripe customer ID
- `paddle_subscription_id` (TEXT) - Paddle subscription ID (future use)
- `paddle_customer_id` (TEXT) - Paddle customer ID (future use)
- `billing_interval` (TEXT, DEFAULT 'month') - Billing interval: 'month' or 'year'
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `status` CHECK constraint: IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')
- `billing_interval` CHECK constraint: IN ('month', 'year')
- Unique constraint on `organization_id` - One active subscription per organization

**Indexes:**
- Primary key on `id`
- Index on `organization_id`
- Index on `status`
- Index on `stripe_subscription_id`
- Unique index on `organization_id`

**Relationships:**
- Many-to-one with `organizations`
- Many-to-one with `plans`
- One-to-many with `invoices`

#### `organization_usage`
Real-time usage tracking

**Columns:**
- `organization_id` (UUID, PRIMARY KEY, REFERENCES organizations.id) - Organization identifier
- `tracks_count` (INTEGER, DEFAULT 0) - Current track count
- `staff_count` (INTEGER, DEFAULT 0) - Current staff count
- `storage_bytes` (BIGINT, DEFAULT 0) - Storage usage in bytes
- `api_calls_count` (INTEGER, DEFAULT 0) - API calls this month
- `api_calls_reset_at` (TIMESTAMPTZ, DEFAULT NOW() + INTERVAL '1 month') - API reset timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Indexes:**
- Primary key on `organization_id`

**Relationships:**
- One-to-one with `organizations`

#### `api_keys`
API authentication keys

**Columns:**
- `id` (UUID, PRIMARY KEY) - Key identifier
- `organization_id` (UUID, REFERENCES organizations.id) - Organization owner
- `name` (TEXT, NOT NULL) - Key name/description
- `key_hash` (TEXT, UNIQUE, NOT NULL) - SHA-256 hashed API key
- `key_prefix` (TEXT, NOT NULL) - First 8 characters for display
- `last_used_at` (TIMESTAMPTZ) - Last usage timestamp
- `expires_at` (TIMESTAMPTZ) - Expiration timestamp
- `revoked_at` (TIMESTAMPTZ) - Revocation timestamp
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `created_by` (TEXT, REFERENCES staff_members.id) - Creator staff ID

**Indexes:**
- Primary key on `id`
- Index on `organization_id`
- Index on `key_hash`
- Index on `key_prefix`
- Unique index on `key_hash`

**Relationships:**
- Many-to-one with `organizations`
- Many-to-one with `staff_members` (creator)

#### `webhooks`
Webhook endpoints

**Columns:**
- `id` (UUID, PRIMARY KEY) - Webhook identifier
- `organization_id` (UUID, REFERENCES organizations.id) - Organization owner
- `url` (TEXT, NOT NULL) - Webhook URL
- `events` (TEXT[], NOT NULL) - Event types array
- `secret` (TEXT, NOT NULL) - HMAC signature secret
- `active` (BOOLEAN, DEFAULT true) - Enable/disable flag
- `last_triggered_at` (TIMESTAMPTZ) - Last delivery timestamp
- `failure_count` (INTEGER, DEFAULT 0) - Consecutive failure count
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Indexes:**
- Primary key on `id`
- Index on `organization_id`
- Index on `active` (partial, WHERE active = true)

**Relationships:**
- Many-to-one with `organizations`
- One-to-many with `webhook_deliveries`

#### `webhook_deliveries`
Webhook delivery tracking

**Columns:**
- `id` (UUID, PRIMARY KEY) - Delivery identifier
- `webhook_id` (UUID, REFERENCES webhooks.id) - Webhook endpoint
- `event_type` (TEXT, NOT NULL) - Event type
- `payload` (JSONB, NOT NULL) - Event payload
- `status` (TEXT, NOT NULL, DEFAULT 'pending') - Delivery status
- `response_status` (INTEGER) - HTTP response status code
- `response_body` (TEXT) - HTTP response body
- `attempt_number` (INTEGER, DEFAULT 1) - Retry attempt number
- `next_retry_at` (TIMESTAMPTZ) - Next retry timestamp
- `delivered_at` (TIMESTAMPTZ) - Successful delivery timestamp
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp

**Constraints:**
- `status` CHECK constraint: IN ('pending', 'success', 'failed')

**Indexes:**
- Primary key on `id`
- Index on `webhook_id`
- Index on `status`
- Index on `next_retry_at` (partial, WHERE status = 'failed')

**Relationships:**
- Many-to-one with `webhooks`

#### `invoices`
Billing invoices

**Columns:**
- `id` (UUID, PRIMARY KEY) - Invoice identifier
- `organization_id` (UUID, REFERENCES organizations.id) - Organization
- `subscription_id` (UUID, REFERENCES subscriptions.id) - Related subscription
- `invoice_number` (TEXT, UNIQUE, NOT NULL) - Invoice number
- `amount` (NUMERIC(10, 2), NOT NULL) - Invoice amount
- `currency` (TEXT, DEFAULT 'USD') - Currency code
- `status` (TEXT, NOT NULL, DEFAULT 'draft') - Invoice status
- `due_date` (TIMESTAMPTZ) - Due date
- `paid_at` (TIMESTAMPTZ) - Payment timestamp
- `stripe_invoice_id` (TEXT, UNIQUE) - Stripe invoice ID
- `paddle_invoice_id` (TEXT, UNIQUE) - Paddle invoice ID (future use)
- `pdf_url` (TEXT) - PDF download URL
- `hosted_invoice_url` (TEXT) - Stripe hosted invoice URL
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `status` CHECK constraint: IN ('draft', 'open', 'paid', 'void', 'uncollectible')

**Indexes:**
- Primary key on `id`
- Index on `organization_id`
- Index on `subscription_id`
- Index on `status`
- Unique index on `invoice_number`
- Unique index on `stripe_invoice_id`

**Relationships:**
- Many-to-one with `organizations`
- Many-to-one with `subscriptions`

#### `payment_methods`
Stored payment methods

**Columns:**
- `id` (UUID, PRIMARY KEY) - Payment method identifier
- `organization_id` (UUID, REFERENCES organizations.id) - Organization
- `stripe_payment_method_id` (TEXT) - Stripe payment method ID
- `paddle_payment_method_id` (TEXT) - Paddle payment method ID (future use)
- `type` (TEXT) - Payment type: 'card', 'bank_account', 'paypal'
- `last4` (TEXT) - Last 4 digits
- `brand` (TEXT) - Card brand (visa, mastercard, etc.)
- `exp_month` (INTEGER) - Expiration month
- `exp_year` (INTEGER) - Expiration year
- `is_default` (BOOLEAN, DEFAULT false) - Default payment method flag
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `type` CHECK constraint: IN ('card', 'bank_account', 'paypal')

**Indexes:**
- Primary key on `id`
- Index on `organization_id`

**Relationships:**
- Many-to-one with `organizations`

#### `audit_logs`
Audit trail

**Columns:**
- `id` (UUID, PRIMARY KEY) - Log identifier
- `organization_id` (UUID, REFERENCES organizations.id) - Organization (nullable)
- `user_id` (TEXT, REFERENCES staff_members.id) - User who performed action
- `action` (TEXT, NOT NULL) - Action type (e.g., 'track.created')
- `resource_type` (TEXT) - Resource type (e.g., 'track', 'subscription')
- `resource_id` (TEXT) - Resource identifier
- `changes` (JSONB) - Before/after changes
- `ip_address` (INET) - User IP address
- `user_agent` (TEXT) - Browser user agent
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp

**Indexes:**
- Primary key on `id`
- Index on `organization_id`
- Index on `user_id`
- Index on `action`
- Index on `created_at`

**Relationships:**
- Many-to-one with `organizations` (nullable)
- Many-to-one with `staff_members` (nullable)

#### `feature_flags`
Feature flag management

**Columns:**
- `id` (UUID, PRIMARY KEY) - Flag identifier
- `key` (TEXT, UNIQUE, NOT NULL) - Feature key
- `name` (TEXT, NOT NULL) - Display name
- `description` (TEXT) - Feature description
- `enabled` (BOOLEAN, DEFAULT false) - Global enable flag
- `rollout_percentage` (INTEGER, DEFAULT 0) - Rollout percentage (0-100)
- `organization_ids` (UUID[]) - Specific organizations to enable
- `plan_ids` (TEXT[]) - Plans that have this feature
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `rollout_percentage` CHECK constraint: >= 0 AND <= 100

**Indexes:**
- Primary key on `id`
- Unique index on `key`

#### `email_queue`
Email queue for async sending

**Columns:**
- `id` (UUID, PRIMARY KEY) - Queue item identifier
- `to_email` (TEXT, NOT NULL) - Recipient email
- `subject` (TEXT, NOT NULL) - Email subject
- `html` (TEXT) - HTML content
- `text` (TEXT) - Plain text content
- `status` (TEXT, NOT NULL, DEFAULT 'pending') - Queue status
- `sent_at` (TIMESTAMPTZ) - Sent timestamp
- `error_message` (TEXT) - Error message if failed
- `retry_count` (INTEGER, DEFAULT 0) - Retry attempt count
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `status` CHECK constraint: IN ('pending', 'sent', 'failed')

**Indexes:**
- Primary key on `id`
- Index on `status`
- Index on `created_at`

#### `invites`
Team invitation system

**Columns:**
- `id` (UUID, PRIMARY KEY) - Invite identifier
- `organization_id` (UUID, REFERENCES organizations.id) - Organization
- `email` (TEXT, NOT NULL) - Invitee email
- `role` (TEXT, NOT NULL) - Assigned role
- `permissions_json` (JSONB) - Assigned permissions
- `token` (TEXT, UNIQUE, NOT NULL) - Invite token
- `invited_by` (TEXT, REFERENCES staff_members.id) - Inviter staff ID
- `accepted_at` (TIMESTAMPTZ) - Acceptance timestamp
- `expires_at` (TIMESTAMPTZ) - Expiration timestamp
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()) - Creation timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()) - Last update timestamp

**Constraints:**
- `role` CHECK constraint: IN ('Owner', 'Manager', 'Scout')
- Unique constraint on (`organization_id`, `email`) - One invite per email per organization

**Indexes:**
- Primary key on `id`
- Index on `organization_id`
- Index on `email`
- Index on `token`
- Unique index on (`organization_id`, `email`)

**Relationships:**
- Many-to-one with `organizations`
- Many-to-one with `staff_members` (inviter)

### Database Functions

#### Core Functions

**`get_user_organization_id()`**
- Returns: UUID (organization_id)
- Purpose: Get user's organization ID (prevents RLS recursion)
- Security: SECURITY DEFINER (bypasses RLS)
- Language: plpgsql

**`recalculate_track_votes()`**
- Returns: TRIGGER
- Purpose: Recalculate track vote totals when votes change
- Trigger: AFTER INSERT/UPDATE/DELETE on `votes`
- Language: plpgsql

**`update_staff_last_active()`**
- Returns: TRIGGER
- Purpose: Update `last_active_at` when user interacts with tracks
- Trigger: AFTER INSERT/UPDATE on `tracks`
- Security: SECURITY DEFINER
- Language: plpgsql

**`update_updated_at_column()`**
- Returns: TRIGGER
- Purpose: Generic function to update `updated_at` timestamps
- Language: plpgsql

#### SaaS Functions

**`get_organization_subscription(org_id UUID)`**
- Returns: TABLE (subscription_id, plan_id, plan_name, status, current_period_end, trial_end, limits, features)
- Purpose: Get active subscription for organization
- Security: SECURITY DEFINER
- Language: plpgsql

**`get_organization_usage(org_id UUID)`**
- Returns: TABLE (tracks_count, staff_count, storage_bytes, api_calls_count, api_calls_reset_at)
- Purpose: Get current usage statistics
- Security: SECURITY DEFINER
- Language: plpgsql

**`check_usage_limit(org_id UUID, limit_type TEXT)`**
- Returns: BOOLEAN
- Purpose: Check if organization is within usage limits
- Security: SECURITY DEFINER
- Language: plpgsql

**`has_feature_access(org_id UUID, feature_key TEXT)`**
- Returns: BOOLEAN
- Purpose: Check if organization has access to a feature
- Security: SECURITY DEFINER
- Language: plpgsql

**`get_user_memberships(user_id_param TEXT)`**
- Returns: TABLE (membership_id, organization_id, organization_name, role, permissions_json, is_active)
- Purpose: Get all active memberships for a user
- Security: SECURITY DEFINER
- Language: plpgsql

**`get_active_membership(user_id_param TEXT, org_id_param UUID)`**
- Returns: TABLE (membership_id, organization_id, organization_name, role, permissions_json, is_active)
- Purpose: Get active membership for user in specific organization
- Security: SECURITY DEFINER
- Language: plpgsql

**`create_invite(...)`**
- Parameters: organization_id_param, email_param, role_param, permissions_json_param, invited_by_param
- Returns: UUID (invite_id)
- Purpose: Create team invite (handles duplicates)
- Security: SECURITY DEFINER
- Language: plpgsql

**`update_membership_role(...)`**
- Parameters: user_id_param, organization_id_param, new_role_param
- Returns: UUID (membership_id)
- Purpose: Update membership role (Owner only)
- Security: SECURITY DEFINER
- Language: plpgsql

**`deactivate_membership(...)`**
- Parameters: user_id_param, organization_id_param
- Returns: VOID
- Purpose: Deactivate membership (removes staff, preserves history)
- Security: SECURITY DEFINER
- Language: plpgsql

**`update_membership_permissions(...)`**
- Parameters: user_id_param, organization_id_param, permissions_json_param
- Returns: UUID (membership_id)
- Purpose: Update granular permissions
- Security: SECURITY DEFINER
- Language: plpgsql

### Database Triggers

**`trigger_update_tracks_count`**
- Table: `tracks`
- Event: AFTER INSERT OR DELETE
- Function: `update_tracks_count()`
- Purpose: Update `organization_usage.tracks_count`

**`trigger_update_staff_count`**
- Table: `memberships`
- Event: AFTER INSERT OR UPDATE OR DELETE
- Function: `update_staff_count()`
- Purpose: Update `organization_usage.staff_count`

**`recalculate_votes_on_vote_change`**
- Table: `votes`
- Event: AFTER INSERT OR UPDATE OR DELETE
- Function: `recalculate_track_votes()`
- Purpose: Recalculate track vote totals

**`update_tracks_updated_at`**
- Table: `tracks`
- Event: BEFORE UPDATE
- Function: `update_updated_at_column()`
- Purpose: Update `updated_at` timestamp

**`update_staff_activity`**
- Table: `tracks`
- Event: AFTER INSERT OR UPDATE
- Function: `update_staff_last_active()`
- Purpose: Update staff `last_active_at`

### Row Level Security (RLS)

**All tables have RLS enabled** with policies that:

1. Use `get_user_organization_id()` to prevent infinite recursion
2. Filter by `organization_id` for multi-tenant isolation
3. Allow SystemAdmin to see all data (global view)
4. Isolate personal data by `recipient_user_id`

**Key Policies:**
- Staff can view their own organization's data
- Staff can insert/update their own organization's data
- Owners can update organization settings
- SystemAdmin can view all data (when `activeOrgId === null` and `role === 'SystemAdmin'`)

---

## <EnvironmentAndSecurity>

### Environment Variables

#### Frontend Environment Variables (Vite - must be prefixed with `VITE_`)

**Required:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous/public key

**Optional but Recommended:**
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (for payments)
- `VITE_RESEND_API_KEY` - Resend API key (for email - can use edge function instead)
- `VITE_RESEND_FROM_EMAIL` - From email address for Resend
- `VITE_SITE_URL` - Site URL for redirects (defaults to `window.location.origin`)
- `VITE_ANALYTICS_PROVIDER` - Analytics provider (e.g., 'posthog')
- `VITE_ANALYTICS_API_KEY` - Analytics API key
- `VITE_POSTHOG_HOST` - PostHog host URL (if using PostHog)
- `VITE_SUPPORT_PROVIDER` - Support widget provider (e.g., 'crisp')
- `VITE_SUPPORT_API_KEY` - Support widget API key

#### Supabase Edge Functions Environment Variables

**Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin access)

**Stripe Integration:**
- `STRIPE_SECRET_KEY` - Stripe secret key (for checkout/portal sessions)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature secret

**Email Service:**
- `RESEND_API_KEY` - Resend API key (for email sending)
- `RESEND_FROM_EMAIL` - Default from email address (optional)

**Optional:**
- `SUPABASE_ANON_KEY` - Supabase anonymous key (for JWT validation in some functions)

### Authentication Flow

#### Sign Up Flow

1. User submits email/password on `SignUp.jsx`
2. `AuthContext.signUp()` called
3. Supabase Auth creates `auth.users` record
4. `staff_members` record created automatically with:
   - `id`: `staff_<uuid_prefix>_<timestamp>`
   - `name`: From signup form
   - `role`: 'Scout' (default)
   - `auth_user_id`: Links to `auth.users.id`
   - `organization_id`: NULL (agent-centric)
5. User redirected to `/welcome` (if no memberships) or `/launchpad`

#### Sign In Flow

1. User submits email/password on `Login.jsx`
2. `AuthContext.signIn()` called
3. Supabase Auth validates credentials
4. Session created (JWT token stored in browser)
5. `loadStaffProfile()` fetches `staff_members` record
6. `loadMemberships()` fetches all active memberships
7. User starts in Personal view (`activeOrgId = null`)
8. User redirected to `/launchpad` (Personal view) or `/dashboard` (if organization selected)

#### Session Management

- **JWT Tokens**: Supabase Auth manages JWT tokens
- **Automatic Refresh**: Supabase client automatically refreshes tokens
- **Session Storage**: Tokens stored in browser (localStorage)
- **Expiration**: Configurable in Supabase Auth settings
- **Refresh Logic**: `supabase.auth.getSession()` and `supabase.auth.refreshSession()`

#### Authorization Flow

**Permission Checks:**

1. **Personal View** (`activeOrgId === null`):
   - All permission checks return `true` (full Owner permissions)
   - User has complete control over personal workspace

2. **Label Workspace** (`activeOrgId` set):
   - Permissions fetched from `activeMembership.permissions_json`
   - Role-based checks: `hasPermission(['Owner', 'Manager'])`
   - Granular checks: `canVote()`, `canSetEnergy()`, `canAdvanceOffice()`, etc.

**Permission Functions:**
- `hasPermission(requiredRoles)` - Check role-based permission
- `canVote()` - Check voting permission
- `canSetEnergy()` - Check energy setting permission
- `canAdvanceLobby()` - Check inbox → second-listen permission
- `canAdvanceOffice()` - Check second-listen → team-review permission
- `canAdvanceContract()` - Check team-review → contracting permission
- `canAccessArchive()` - Check archive access permission
- `canAccessVault()` - Check vault access permission
- `canEditReleaseDate()` - Check release date editing permission
- `canViewMetrics()` - Check metrics viewing permission

**RLS Enforcement:**

- All database queries automatically filtered by `organization_id`
- Personal data filtered by `recipient_user_id` when `organization_id IS NULL`
- SystemAdmin can bypass RLS when `activeOrgId === null` and `role === 'SystemAdmin'`
- Policies use `get_user_organization_id()` to prevent infinite recursion

### API Authentication

**API Key Authentication:**
- API keys stored hashed (SHA-256) in `api_keys.key_hash`
- Key prefix (first 8 chars) displayed to user
- Full key shown only once on creation
- Keys can be revoked or expired
- Rate limiting based on subscription plan

**Webhook Authentication:**
- HMAC-SHA256 signature verification
- Secret stored per webhook in `webhooks.secret`
- Signature in `X-Webhook-Signature` header
- Format: `sha256=<hex_digest>`

### Security Headers

**Vercel Configuration** (`vercel.json`):
- `X-Content-Type-Options: nosniff` - Prevent MIME type sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer policy
- `Permissions-Policy: geolocation=(), microphone=(), camera=()` - Feature permissions

---

## <CurrentRoadmap>

### TODO Comments Found in Codebase

#### High Priority

1. **Email Notification for Trial Ending** (`supabase/functions/stripe-webhook/index.ts:235`)
   - TODO: Send email notification to organization owner when trial ends
   - Status: Webhook handler exists, email sending needs implementation

2. **Invite Code Input** (`src/pages/Welcome.jsx:175`)
   - TODO: Implement invite code input
   - Status: Invite system exists, but welcome page doesn't have input field

#### Medium Priority

3. **Notes Field for Tracks** (`src/components/PublicForm.jsx:224-227`)
   - Comment: "For now, we'll add it as a comment - you might want to add a notes field to tracks"
   - Status: Short note field exists in form but not stored in database

#### Future Enhancements (Documented)

4. **2FA Implementation** (`src/pages/SecuritySettings.jsx`)
   - Placeholder UI exists, implementation needed
   - Status: UI ready, backend implementation pending

5. **SSO for Enterprise** (`docs/SAAS_IMPLEMENTATION_SUMMARY.md`)
   - Feature flag exists, implementation needed
   - Status: Schema ready, integration pending

6. **Session Management UI** (`src/pages/SecuritySettings.jsx`)
   - Placeholder UI exists, implementation needed
   - Status: UI ready, backend implementation pending

7. **Help Center Content** (`docs/SAAS_IMPLEMENTATION_SUMMARY.md`)
   - Help center page exists, content needs to be written
   - Status: Page structure ready, content pending

8. **API Documentation** (`docs/SAAS_IMPLEMENTATION_SUMMARY.md`)
   - REST API exists, documentation needs to be written
   - Status: API endpoints ready, documentation pending

9. **Data Export Enhancement** (`src/pages/DataExport.jsx`)
   - Basic export exists, could be enhanced with more formats
   - Status: CSV/JSON export works, could add more formats

10. **Analytics Integration** (`src/lib/analytics.js`)
    - Analytics initialization exists, but PostHog/Mixpanel integration pending
    - Status: Infrastructure ready, provider integration pending

### Unfinished Features

1. **Stripe Integration** (Partially Complete)
   - Checkout session creation: ✅ Complete
   - Customer portal: ✅ Complete
   - Webhook handler: ✅ Complete
   - Invoice sync: ✅ Complete
   - Payment method management: ⚠️ Schema ready, UI pending
   - Status: Core integration complete, payment method UI needs implementation

2. **Webhook Delivery System** (Complete but could be enhanced)
   - Webhook management UI: ✅ Complete
   - Delivery service: ✅ Complete
   - Retry logic: ✅ Complete
   - Status: Fully functional, could add more event types

3. **Error Tracking** (Custom System Implemented)
   - Custom error logger: ✅ Complete
   - Error tracking initialization: ✅ Complete
   - Sentry integration: ⚠️ Optional, not required
   - Status: Custom system works, Sentry is optional enhancement

4. **Mobile Optimization** (Mostly Complete)
   - Responsive design: ✅ Complete
   - Mobile layout: ✅ Complete
   - Bottom navigation: ✅ Complete
   - Touch optimization: ✅ Complete
   - Status: Fully functional on mobile

5. **Testing Coverage** (Basic Coverage)
   - Test infrastructure: ✅ Complete
   - Auth tests: ✅ Complete
   - Track tests: ✅ Complete
   - Component tests: ✅ Complete
   - E2E tests: ⚠️ Not implemented
   - Status: Unit tests exist, E2E tests pending

### Known Limitations

1. **Email Service**: Uses Resend via Edge Function, with fallback to email queue
2. **Payment Processing**: Stripe integration complete, but payment method UI needs work
3. **Analytics**: Custom system implemented, but PostHog/Mixpanel integration optional
4. **2FA/SSO**: UI placeholders exist, backend implementation pending
5. **API Rate Limiting**: Basic implementation, could be enhanced with Redis
6. **Webhook Retries**: Exponential backoff implemented, but could add more sophisticated retry logic

---

## <StyleGuide>

### Coding Patterns

#### Component Structure

**Functional Components with Hooks:**
```jsx
import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'

const ComponentName = () => {
  const { tracks, addTrack } = useApp()
  const { user, staffProfile } = useAuth()
  const [state, setState] = useState(null)
  
  useEffect(() => {
    // Side effects
  }, [dependencies])
  
  return (
    // JSX
  )
}

export default ComponentName
```

#### Context Usage Pattern

**Custom Hooks for Context:**
```jsx
// Context file
export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

// Usage in components
const { tracks, addTrack } = useApp()
```

#### Error Handling Pattern

**Try-Catch with User Feedback:**
```jsx
try {
  const result = await someAsyncOperation()
  setToast({ isVisible: true, message: 'Success!', type: 'success' })
} catch (error) {
  console.error('Error:', error)
  setToast({ isVisible: true, message: error.message, type: 'error' })
}
```

#### Async Operations Pattern

**Loading States:**
```jsx
const [loading, setLoading] = useState(true)

useEffect(() => {
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchData()
      setData(data)
    } finally {
      setLoading(false)
    }
  }
  loadData()
}, [])
```

### Naming Conventions

#### Files and Directories

- **Components**: PascalCase, e.g., `TrackCard.jsx`, `AddDemoModal.jsx`
- **Pages**: PascalCase, e.g., `Dashboard.jsx`, `ArtistDirectory.jsx`
- **Context**: PascalCase with "Context" suffix, e.g., `AppContext.jsx`, `AuthContext.jsx`
- **Hooks**: camelCase with "use" prefix, e.g., `useMobile.js`, `useUsageLimits.js`
- **Utilities**: camelCase, e.g., `emailService.js`, `stripeClient.js`
- **Directories**: lowercase, e.g., `components/`, `pages/`, `lib/`

#### Variables and Functions

- **Variables**: camelCase, e.g., `trackId`, `organizationId`, `activeOrgId`
- **Functions**: camelCase, e.g., `addTrack()`, `loadTracks()`, `getCognitiveLoad()`
- **Constants**: UPPER_SNAKE_CASE, e.g., `GENRES`, `EXPECTATION_CAP`
- **Component Props**: camelCase, e.g., `trackId`, `onClick`, `isVisible`
- **State Variables**: camelCase with "set" prefix for setters, e.g., `const [tracks, setTracks] = useState([])`

#### Database Naming

- **Tables**: snake_case, plural, e.g., `staff_members`, `organization_usage`
- **Columns**: snake_case, e.g., `organization_id`, `created_at`, `last_active_at`
- **Functions**: snake_case, e.g., `get_user_organization_id()`, `check_usage_limit()`
- **Indexes**: `idx_<table>_<column>`, e.g., `idx_tracks_status`, `idx_staff_members_auth_user_id`

#### API Naming

- **Endpoints**: kebab-case, e.g., `/api/v1/tracks`, `/api/v1/artists`
- **Edge Functions**: kebab-case, e.g., `create-checkout-session`, `stripe-webhook`
- **Event Types**: dot-separated, e.g., `track.created`, `subscription.updated`

### UI Component Libraries

#### Tailwind CSS

**Usage Pattern:**
```jsx
<div className="flex items-center justify-between p-4 bg-gray-950 text-white">
  <h1 className="text-2xl font-bold">Title</h1>
  <button className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600">
    Click Me
  </button>
</div>
```

**Custom Utilities** (`src/index.css`):
- `.glass-morphism` - Glass morphism effect
- `.glow-green` - Green glow effect
- `.glow-red` - Red glow effect
- `.scrollbar-hide` - Hide scrollbar
- `.mobile-table-scroll` - Mobile table scrolling
- `.sidebar-transition` - Sidebar transition
- `.tooltip-enter` - Tooltip animation

**Color Scheme:**
- Background: `bg-gray-950` (dark)
- Text: `text-white`
- Primary: `bg-blue-500`, `text-blue-500`
- Success: `bg-green-500`, `text-green-500`
- Error: `bg-red-500`, `text-red-500`
- Warning: `bg-yellow-500`, `text-yellow-500`
- Custom: `neon-purple` (#a855f7), `recording-red` (#ef4444)

#### Framer Motion

**Usage Pattern:**
```jsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

#### Lucide React Icons

**Usage Pattern:**
```jsx
import { Plus, Eye, Calendar } from 'lucide-react'

<Plus className="w-5 h-5" />
<Eye className="w-5 h-5 text-gray-400" />
```

### Code Formatting

#### Prettier Configuration (`.prettierrc`)

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

#### ESLint Configuration (`.eslintrc.cjs`)

- React recommended rules
- React Hooks rules
- React Refresh rules
- No unused variables (warn, ignore `_` prefix)
- Console warnings (allow `warn` and `error`)

### Import Organization

**Standard Import Order:**
1. React and React-related imports
2. Third-party libraries
3. Context hooks
4. Components
5. Utilities
6. Styles

**Example:**
```jsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Eye } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import TrackCard from '../components/TrackCard'
import { supabase } from '../lib/supabaseClient'
import './styles.css'
```

### TypeScript in Edge Functions

**Edge Functions use TypeScript:**
- Deno runtime with TypeScript support
- Type definitions for Supabase and Stripe
- Interface definitions for request/response types

**Example:**
```typescript
interface ApiKey {
  id: string
  organization_id: string
  name: string
  expires_at: string | null
  revoked_at: string | null
}
```

### Database Query Patterns

**Supabase Query Pattern:**
```jsx
const { data, error } = await supabase
  .from('tracks')
  .select('*, artists(name)')
  .eq('organization_id', activeOrgId)
  .order('created_at', { ascending: false })

if (error) {
  console.error('Error:', error)
  return
}

// Use data
```

**Real-time Subscription Pattern:**
```jsx
const channel = supabase
  .channel('tracks-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'tracks' },
    () => {
      loadTracks() // Reload on change
    }
  )
  .subscribe()

// Cleanup
return () => {
  supabase.removeChannel(channel)
}
```

---

**Document Status:** Complete  
**Last Updated:** January 25, 2026  
**Version:** 1.0.0
