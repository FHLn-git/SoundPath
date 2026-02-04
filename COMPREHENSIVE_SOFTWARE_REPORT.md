# SoundPath – Comprehensive Software Report

**Generated:** January 25, 2026  
**Version:** 1.0.0  
**Status:** Production-Ready SaaS Platform

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Application Overview](#application-overview)
3. [Core Architecture](#core-architecture)
4. [Database Schema & Data Model](#database-schema--data-model)
5. [Authentication & Authorization](#authentication--authorization)
6. [Core Business Logic](#core-business-logic)
7. [User Interface & Experience](#user-interface--experience)
8. [SaaS Features & Billing](#saas-features--billing)
9. [API & Integrations](#api--integrations)
10. [Deployment & Infrastructure](#deployment--infrastructure)
11. [Security Implementation](#security-implementation)
12. [Performance & Optimization](#performance--optimization)
13. [Development Workflow](#development-workflow)
14. [Technical Stack](#technical-stack)

---

## Executive Summary

**SoundPath** is a comprehensive, production-ready SaaS platform designed for record labels and A&R (Artists & Repertoire) professionals to manage the complete demo submission and artist discovery pipeline. The application has evolved from a simple demo tracker into a full-featured, multi-tenant SaaS platform with agent-centric architecture, subscription billing, REST API, webhooks, and enterprise-grade security.

### Key Highlights

- **Agent-Centric Architecture**: Users exist as independent agents who can optionally join or create label workspaces
- **Multi-Tenant SaaS**: Complete subscription system with usage limits, billing, and feature flags
- **Full-Stack Application**: React frontend, Supabase backend, Edge Functions for serverless operations
- **Production Infrastructure**: Deployed on Vercel with CI/CD, health monitoring, and security headers
- **Enterprise Features**: REST API, webhooks, audit logs, role-based access control (RBAC)

---

## Application Overview

### Purpose

SoundPath streamlines the A&R workflow for record labels by providing:

1. **Demo Pipeline Management**: Track demos through stages from initial submission to release
2. **Team Collaboration**: Voting, commenting, and collaborative decision-making
3. **Artist Relationship Management**: Maintain a rolodex of artists with conversion metrics
4. **Analytics & Insights**: Staff performance metrics, cognitive load tracking, company health
5. **Subscription Management**: Multi-tier plans with usage limits and feature gating

### Target Users

- **A&R Scouts**: Discover and submit new talent
- **A&R Managers**: Review submissions, manage team, make signing decisions
- **Label Owners**: Oversee operations, manage subscriptions, view analytics
- **Independent Agents**: Use personal workspace to manage their own pipeline
- **System Administrators**: Platform-wide oversight and management

### Core Workflow

```
Demo Submission → Inbox → Second Listen → Team Review → Contracting → Upcoming → Vault
```

Each phase has specific actions:
- **Inbox**: Initial submission, link validation
- **Second Listen**: Energy rating, voting (+1/-1)
- **Team Review**: Collaborative voting, discussion
- **Contracting**: Target release date, contract signing
- **Upcoming**: Scheduled releases
- **Vault**: Released tracks with earnings data

---

## Core Architecture

### Agent-Centric Design

The application uses an **agent-centric architecture** where:

1. **Users are Independent Agents**: Every user starts with a personal workspace
2. **Optional Label Membership**: Agents can join or create label organizations
3. **Dual Workspace System**:
   - **Personal View** (`activeOrgId === null`): Personal inbox, personal rolodex, full owner permissions
   - **Label Workspace** (`activeOrgId` set): Organization tracks, team collaboration, role-based permissions

### Data Isolation

- **Personal Data**: `organization_id IS NULL`, `recipient_user_id = user_id`
- **Label Data**: `organization_id = organization_id`
- **RLS Policies**: Enforce complete data isolation at database level

### Application Structure

```
SoundPath/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route pages
│   ├── context/            # React Context providers
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility libraries
├── database/               # Database schemas and migrations
│   ├── schemas/            # Core schemas (master, saas, rbac)
│   └── migrations/         # Feature-specific migrations
├── supabase/                # Supabase configuration
│   └── functions/          # Edge Functions (serverless)
└── public/                  # Static assets
```

### State Management

**React Context API** (no Redux):
- `AuthContext`: Authentication, user profile, memberships, permissions
- `AppContext`: Tracks, artists, staff, business logic
- `BillingContext`: Subscriptions, plans, usage, invoices

### Real-Time Updates

- **Supabase Realtime**: PostgreSQL change notifications
- **Automatic Sync**: Track changes propagate to all connected clients
- **Optimistic Updates**: UI updates immediately, syncs with server

---

## Database Schema & Data Model

### Core Tables

#### 1. **organizations**
Multi-tenant organizations (labels)
- `id` (UUID): Primary key
- `name` (TEXT): Organization name (unique)
- `require_rejection_reason` (BOOLEAN): Settings flag

#### 2. **staff_members**
User profiles linked to Supabase Auth
- `id` (TEXT): Staff ID (primary key)
- `name` (TEXT): Display name
- `role` (TEXT): 'Owner', 'Manager', 'Scout', or 'SystemAdmin'
- `auth_user_id` (UUID): Links to `auth.users`
- `organization_id` (UUID): NULL for agents, set for legacy users
- `bio` (TEXT): Profile bio
- `last_active_at` (TIMESTAMPTZ): Activity tracking

#### 3. **memberships**
Many-to-many relationship between users and organizations
- `id` (UUID): Primary key
- `user_id` (TEXT): References `staff_members.id`
- `organization_id` (UUID): References `organizations.id`
- `role` (TEXT): Role in this organization
- `permissions_json` (JSONB): Granular permissions
- `active` (BOOLEAN): Membership status

#### 4. **tracks**
Demo submissions and releases
- `id` (UUID): Primary key
- `artist_id` (UUID): References `artists.id`
- `artist_name` (TEXT): Denormalized for quick access
- `title` (TEXT): Track title
- `sc_link` (TEXT): SoundCloud link
- `genre` (TEXT): Music genre
- `bpm` (INTEGER): Beats per minute
- `energy` (INTEGER): 0-5 energy rating
- `status` (TEXT): Pipeline phase
- `column` (TEXT): Legacy phase field (synced with status)
- `votes` (INTEGER): Calculated vote total
- `organization_id` (UUID): NULL for personal, set for label
- `recipient_user_id` (TEXT): For personal inbox
- `moved_to_second_listen` (TIMESTAMPTZ): Timestamp
- `target_release_date` (DATE): Planned release
- `release_date` (DATE): Actual release
- `contract_signed` (BOOLEAN): Contract status
- `total_earnings` (NUMERIC): Revenue tracking
- `watched` (BOOLEAN): Watchlist flag
- `archived` (BOOLEAN): Archive status
- `spotify_plays` (INTEGER): External metrics
- `rejection_reason` (TEXT): Archive reason

#### 5. **artists**
Artist profiles
- `id` (UUID): Primary key
- `name` (TEXT): Artist name (unique per organization)
- `bio` (TEXT): Artist biography
- `primary_genre` (TEXT): Main genre
- `profitability_score` (NUMERIC): Calculated metric
- `organization_id` (UUID): NULL for personal, set for label

#### 6. **votes**
Staff voting records
- `id` (UUID): Primary key
- `track_id` (UUID): References `tracks.id`
- `staff_id` (TEXT): References `staff_members.id`
- `vote_type` (INTEGER): -1 (downvote) or 1 (upvote)
- `organization_id` (UUID): For RLS isolation
- `UNIQUE(track_id, staff_id)`: One vote per staff per track

#### 7. **listen_logs**
Cognitive load tracking
- `id` (UUID): Primary key
- `staff_id` (TEXT): References `staff_members.id`
- `track_id` (UUID): References `tracks.id`
- `organization_id` (UUID): For RLS isolation
- `listened_at` (TIMESTAMPTZ): Timestamp

### SaaS Tables

#### 8. **plans**
Subscription plans
- `id` (TEXT): 'free', 'starter', 'pro', 'enterprise', 'agent'
- `name` (TEXT): Display name
- `price_monthly` (NUMERIC): Monthly price
- `price_yearly` (NUMERIC): Yearly price
- `limits` (JSONB): Usage limits (tracks, staff, storage, API calls)
- `features` (JSONB): Feature flags
- `trial_days` (INTEGER): Trial period

#### 9. **subscriptions**
Organization subscriptions
- `id` (UUID): Primary key
- `organization_id` (UUID): References `organizations.id`
- `plan_id` (TEXT): References `plans.id`
- `status` (TEXT): 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
- `current_period_start` (TIMESTAMPTZ): Billing period start
- `current_period_end` (TIMESTAMPTZ): Billing period end
- `trial_start` (TIMESTAMPTZ): Trial start
- `trial_end` (TIMESTAMPTZ): Trial end
- `stripe_subscription_id` (TEXT): Stripe subscription ID
- `stripe_customer_id` (TEXT): Stripe customer ID
- `billing_interval` (TEXT): 'month' or 'year'

#### 10. **organization_usage**
Real-time usage tracking
- `organization_id` (UUID): Primary key
- `tracks_count` (INTEGER): Current track count
- `staff_count` (INTEGER): Current staff count
- `storage_bytes` (BIGINT): Storage usage
- `api_calls_count` (INTEGER): API usage
- `api_calls_reset_at` (TIMESTAMPTZ): Reset timestamp

#### 11. **api_keys**
API authentication keys
- `id` (UUID): Primary key
- `organization_id` (UUID): References `organizations.id`
- `name` (TEXT): Key name
- `key_hash` (TEXT): Hashed API key (unique)
- `key_prefix` (TEXT): First 8 chars for display
- `last_used_at` (TIMESTAMPTZ): Usage tracking
- `expires_at` (TIMESTAMPTZ): Expiration
- `revoked_at` (TIMESTAMPTZ): Revocation timestamp

#### 12. **webhooks**
Webhook endpoints
- `id` (UUID): Primary key
- `organization_id` (UUID): References `organizations.id`
- `url` (TEXT): Webhook URL
- `events` (TEXT[]): Event types to listen for
- `secret` (TEXT): Signature verification secret
- `active` (BOOLEAN): Enable/disable
- `last_triggered_at` (TIMESTAMPTZ): Last delivery
- `failure_count` (INTEGER): Retry tracking

#### 13. **webhook_deliveries**
Webhook delivery tracking
- `id` (UUID): Primary key
- `webhook_id` (UUID): References `webhooks.id`
- `event_type` (TEXT): Event type
- `payload` (JSONB): Event payload
- `status` (TEXT): 'pending', 'success', 'failed'
- `response_status` (INTEGER): HTTP status code
- `attempt_number` (INTEGER): Retry count
- `next_retry_at` (TIMESTAMPTZ): Next retry time

#### 14. **invoices**
Billing invoices
- `id` (UUID): Primary key
- `organization_id` (UUID): References `organizations.id`
- `subscription_id` (UUID): References `subscriptions.id`
- `invoice_number` (TEXT): Unique invoice number
- `amount` (NUMERIC): Invoice amount
- `status` (TEXT): 'draft', 'open', 'paid', 'void', 'uncollectible'
- `stripe_invoice_id` (TEXT): Stripe invoice ID
- `pdf_url` (TEXT): PDF download URL
- `hosted_invoice_url` (TEXT): Stripe hosted invoice URL

#### 15. **audit_logs**
Audit trail
- `id` (UUID): Primary key
- `organization_id` (UUID): References `organizations.id`
- `user_id` (TEXT): References `staff_members.id`
- `action` (TEXT): Action type (e.g., 'track.created')
- `resource_type` (TEXT): Resource type
- `resource_id` (TEXT): Resource ID
- `changes` (JSONB): Before/after changes
- `ip_address` (INET): User IP
- `user_agent` (TEXT): Browser info

### Database Functions

#### Core Functions

1. **`get_user_organization_id()`**
   - Returns user's organization ID (prevents RLS recursion)
   - Uses `SECURITY DEFINER` to bypass RLS

2. **`recalculate_track_votes()`**
   - Trigger function that recalculates track vote totals
   - Runs on INSERT/UPDATE/DELETE of votes

3. **`update_staff_last_active()`**
   - Updates `last_active_at` when user interacts with tracks
   - Triggered on track INSERT/UPDATE

4. **`update_updated_at_column()`**
   - Generic function to update `updated_at` timestamps
   - Used by multiple tables

#### SaaS Functions

5. **`get_organization_subscription(org_id)`**
   - Returns active subscription for organization
   - Includes plan details, limits, features

6. **`get_organization_usage(org_id)`**
   - Returns current usage statistics
   - Tracks, staff, storage, API calls

7. **`check_usage_limit(org_id, limit_type)`**
   - Checks if organization is within usage limits
   - Returns BOOLEAN
   - Used before allowing resource creation

8. **`has_feature_access(org_id, feature_key)`**
   - Checks if organization has access to a feature
   - Based on subscription plan and feature flags

9. **`get_user_memberships(user_id)`**
   - Returns all active memberships for a user
   - Includes organization details, role, permissions

10. **`get_active_membership(user_id, org_id)`**
    - Returns active membership for user in specific organization
    - Used for permission checks

11. **`create_invite(...)`**
    - Creates team invite (SECURITY DEFINER)
    - Handles duplicate invites (ON CONFLICT)

12. **`update_membership_role(...)`**
    - Updates membership role (Owner only)
    - SECURITY DEFINER function

13. **`deactivate_membership(...)`**
    - Deactivates membership (removes staff)
    - Preserves historical data

14. **`update_membership_permissions(...)`**
    - Updates granular permissions
    - Owner only

### Database Triggers

1. **`update_tracks_count`**
   - Updates `organization_usage.tracks_count` on track INSERT/DELETE
   - Automatic usage tracking

2. **`update_staff_count`**
   - Updates `organization_usage.staff_count` on membership changes
   - Handles active/inactive transitions

3. **`recalculate_votes_on_vote_change`**
   - Recalculates track votes when votes change
   - Ensures vote totals are always accurate

4. **`update_tracks_updated_at`**
   - Updates `tracks.updated_at` on track UPDATE

5. **`update_staff_activity`**
   - Updates `staff_members.last_active_at` on track interaction

### Row Level Security (RLS)

**All tables have RLS enabled** with policies that:

1. **Use `get_user_organization_id()`**: Prevents infinite recursion
2. **Filter by organization**: Users only see their organization's data
3. **SystemAdmin bypass**: System admins can see all data
4. **Personal data isolation**: Personal inbox tracks isolated by `recipient_user_id`

**Key Policies:**
- Staff can view their own organization's data
- Staff can insert/update their own organization's data
- Owners can update organization settings
- SystemAdmin can view all data (global view)

---

## Authentication & Authorization

### Authentication Flow

1. **Sign Up**
   - User creates account with email/password
   - Supabase Auth creates `auth.users` record
   - `staff_members` record created automatically
   - User starts in Personal view (no organization)

2. **Sign In**
   - Email/password authentication via Supabase Auth
   - Session stored in browser (localStorage)
   - Staff profile loaded from `staff_members`
   - Memberships loaded from `memberships` table

3. **Session Management**
   - Supabase handles session refresh automatically
   - Session expires after configured time
   - `onAuthStateChange` listener updates app state

### Authorization Model

#### Role-Based Access Control (RBAC)

**Roles:**
- **SystemAdmin**: Platform-wide access, can see all organizations
- **Owner**: Full control of organization, can manage staff, billing, settings
- **Manager**: Can manage tracks, staff (limited), view metrics
- **Scout**: Can submit tracks, vote, basic operations

#### Permission System

**Granular Permissions** (stored in `memberships.permissions_json`):

- `can_vote`: Vote on tracks in Second Listen
- `can_set_energy`: Set energy level on tracks
- `can_advance_lobby`: Move tracks from Inbox to Second Listen
- `can_advance_office`: Move tracks from Second Listen to Team Review
- `can_advance_contract`: Move tracks to Contracting phase
- `can_access_archive`: View archived tracks
- `can_access_vault`: View vault tracks
- `can_edit_release_date`: Edit release dates
- `can_view_metrics`: View staff/admin metrics

**Permission Checks:**
- Personal view (`activeOrgId === null`): All permissions return `true` (full Owner)
- Label workspace: Permissions from `activeMembership.permissions_json`

#### Multi-Organization Support

Users can belong to multiple organizations via `memberships` table:
- Each membership has its own role and permissions
- User can switch between organizations
- `activeOrgId` determines current workspace context

### Invite System

1. **Owner creates invite**:
   - Email, role, permissions specified
   - Invite record created in `invites` table
   - Email sent with invite link

2. **User accepts invite**:
   - If user exists: Invite appears in Launchpad
   - If new user: Sign up with invite token
   - Membership created automatically
   - User can access organization

3. **Invite Management**:
   - Invites expire after configured time
   - Duplicate invites handled (ON CONFLICT)
   - Invite status tracked (pending, accepted, expired)

---

## Core Business Logic

### Track Pipeline

#### Phase Flow

```
inbox → second-listen → team-review → contracting → upcoming → vault
```

**Phase Transitions:**
- **Inbox → Second Listen**: Requires `can_advance_lobby` permission
- **Second Listen → Team Review**: Requires energy level set, `can_advance_office` permission
- **Team Review → Contracting**: Requires `can_advance_contract` permission
- **Contracting → Upcoming**: Requires contract signed, target release date set
- **Upcoming → Vault**: Automatic on release date (heartbeat process)

#### Track Operations

1. **Add Track**
   - Artist created/retrieved from `artists` table
   - Track inserted with `organization_id` or `recipient_user_id`
   - Usage limit checked before insertion
   - Real-time notification sent to all clients

2. **Move Track**
   - Status and column updated
   - `moved_to_second_listen` timestamp set if moving to Second Listen
   - Permission checks enforced
   - Vault limit checked if moving to vault

3. **Vote on Track**
   - One vote per staff member per track (enforced by UNIQUE constraint)
   - Vote can be changed (delete old, insert new)
   - Vote total recalculated by database trigger
   - Real-time sync to all clients

4. **Archive Track**
   - `archived` flag set to true
   - `rejection_reason` required if organization setting enabled
   - Track moved to archive phase
   - Historical data preserved

5. **Set Energy Level**
   - Energy rating 0-5 (lightning bolt indicator)
   - Required before advancing from Second Listen
   - Permission: `can_set_energy`

### Artist Management

#### Artist Directory

- **Conversion Rate**: `(signed tracks / total submitted) * 100`
- **Total Signed**: Count of tracks with `contract_signed = true`
- **Total Submitted**: Count of all tracks by artist
- **Dominant Genre**: Most common genre across artist's tracks

#### Artist Operations

1. **Auto-Creation**: Artists created automatically when track added
2. **Deduplication**: Artists unique per organization (or personal workspace)
3. **Profile View**: Shows all tracks by artist, conversion metrics

### Staff Management

#### Staff Operations (Owner Only)

1. **Add Staff**
   - Invite sent via email
   - Staff limit checked before invite creation
   - Default permissions based on role

2. **Update Role**
   - Role changed in `memberships` table
   - Permissions updated based on new role

3. **Remove Staff**
   - Membership deactivated (not deleted)
   - Historical data preserved (listen_logs, votes)
   - Staff count decremented

4. **Update Permissions**
   - Granular permissions updated in `permissions_json`
   - Changes take effect immediately

### Analytics & Metrics

#### Cognitive Load Tracking

**Purpose**: Monitor staff workload and prevent burnout

**Metrics:**
- **Daily Listens**: Tracks listened to today
- **Weekly Listens**: Tracks listened to this week
- **Monthly Listens**: Tracks listened to this month

**Status Levels:**
- **Optimal** (Green): Within healthy range
- **Warning** (Yellow): Approaching limit (90% of threshold)
- **Fatigued** (Orange): Exceeded limit (100+ daily, 1000+ weekly, 5000+ monthly)
- **Sleeping** (Blue): Low activity relative to demo volume

**Calculation:**
- Hard cap: 60 listens per day (expectation cap)
- Relative percentage: Listens vs incoming demos
- Status based on thresholds and relative performance

#### Company Health

**Metrics:**
- **Total Staff**: Active membership count
- **Daily Demos**: Tracks submitted today
- **Demos per Staff**: Average workload
- **Fatigued Staff Count**: Staff with 1000+ weekly listens
- **Staffing Alert**: Demos per staff > 60 (expectation cap)
- **Company Health Score**: 0-100 based on fatigue and staffing

#### Staff Metrics

**Per-Staff Metrics:**
- **Average Energy Assigned**: Average energy level set
- **Voting Participation Rate**: Percentage of tracks voted on
- **Total Tracks Voted**: Count of tracks with votes
- **Weekly Listens**: Listen count for the week
- **Online Status**: Active in last 5 minutes

### Usage Limits & Enforcement

#### Limit Types

1. **Tracks**: Maximum tracks per organization
2. **Staff**: Maximum staff members per organization
3. **Contacts**: Maximum unique artists (contacts)
4. **Vault Tracks**: Maximum tracks in vault
5. **Storage**: Maximum storage (bytes) - future use
6. **API Calls**: Maximum API calls per month

#### Enforcement

- **Pre-Creation Checks**: `check_usage_limit()` called before resource creation
- **Automatic Tracking**: Triggers update usage counts
- **UI Warnings**: Usage limit alerts shown when approaching limits
- **Upgrade Prompts**: Upgrade overlay shown when limit reached

#### Plan Limits

**Free Plan:**
- 50 tracks
- 2 staff
- 500 MB storage
- No API access

**Starter Plan:**
- 500 tracks
- 10 staff
- 5 GB storage
- 50,000 API calls/month

**Pro Plan:**
- 5,000 tracks
- 50 staff
- 50 GB storage
- 500,000 API calls/month

**Enterprise Plan:**
- Unlimited tracks
- 999 staff
- Unlimited storage
- Unlimited API calls

**Agent Plan:**
- 200 tracks
- 1 staff (personal)
- 2 GB storage
- 10,000 API calls/month

---

## User Interface & Experience

### Design System

**Framework**: Tailwind CSS  
**Icons**: Lucide React  
**Animations**: Framer Motion  
**Color Scheme**: Dark theme (gray-950 background)

### Key Components

#### 1. **KanbanBoard**
- Drag-and-drop track management
- Phase columns (Inbox, Second Listen, etc.)
- Track cards with metadata
- Resizable columns

#### 2. **TrackBrowser**
- High-density list view (Rekordbox-style)
- Columns: Artist, Title, Genre, BPM, Energy, Votes, Links
- Search and filter
- Monospace font for alignment

#### 3. **EnergyMeter**
- 5-segment lightning bolt indicator
- Neon yellow color
- 0-5 energy levels
- Click to edit

#### 4. **LinkShield**
- SoundCloud link validator
- Green glow for active links
- Red for broken/invalid links
- Click to open in new tab

#### 5. **Sidebar**
- Dynamic navigation based on workspace
- Personal view: Personal Dashboard, Personal Rolodex, Profile
- Label workspace: Full feature set
- Workspace indicator (Personal vs Role • Label Name)

#### 6. **MobileLayout**
- Responsive design for mobile
- Bottom navigation bar
- Collapsible sidebar
- Touch-optimized interactions

### Pages

#### 1. **Landing** (`/`)
- Public landing page
- Sign up / Sign in CTAs
- Feature highlights

#### 2. **Launchpad** (`/launchpad`)
- Agent-centric hub
- Personal workspace access
- Organization switcher
- Invite notifications
- Create organization button

#### 3. **Dashboard** (`/dashboard`)
- Main workspace view
- Kanban board or track browser
- Quick stats
- Upcoming releases
- Watched tracks
- Company health (Owner only)

#### 4. **Artist Directory** (`/artists`)
- List of all artists
- Conversion metrics
- Filter by genre
- Click to view artist profile

#### 5. **Staff Admin** (`/admin`)
- Staff list with metrics
- Cognitive load indicators
- Activity meters
- Online status

#### 6. **Billing** (`/billing`)
- Current plan display
- Usage vs limits
- Invoice history
- Payment methods
- Upgrade/downgrade options

#### 7. **API Keys** (`/api-keys`)
- Create API keys
- View key prefixes
- Revoke keys
- Usage statistics

#### 8. **Webhooks** (`/webhooks`)
- Create webhook endpoints
- Select events
- View delivery history
- Retry failed deliveries

#### 9. **Admin Dashboard** (`/admin/dashboard`) - SystemAdmin only
- All organizations
- Revenue metrics (MRR, total revenue)
- Subscription status
- Trial organizations
- Past due subscriptions

### User Flows

#### New User Signup
1. User signs up with email/password
2. `staff_members` record created
3. Redirected to `/welcome` (if no memberships) or `/launchpad`
4. User in Personal view (can create organization or use personal workspace)

#### Create Organization
1. User clicks "Create Label" in Launchpad
2. Organization created
3. Membership created with Owner role
4. User can switch to organization workspace

#### Accept Invite
1. User receives email invite
2. If existing user: Invite appears in Launchpad
3. If new user: Sign up with invite token
4. Membership created automatically
5. User can access organization

#### Track Submission Flow
1. User clicks "Add Demo"
2. Modal opens with form (Artist, Title, Link, Genre, BPM)
3. Track created in current workspace (Personal or Label)
4. Track appears in Inbox column
5. Real-time sync to all team members

#### Track Advancement Flow
1. Scout moves track to Second Listen
2. Manager sets energy level
3. Team votes (+1/-1)
4. Manager moves to Team Review
5. Owner moves to Contracting
6. Owner sets target release date, marks contract signed
7. Track moves to Upcoming
8. On release date, track automatically moves to Vault

---

## SaaS Features & Billing

### Subscription System

#### Plans

1. **Free Plan**
   - 50 tracks
   - 2 staff members
   - Basic tracking
   - No API access
   - No analytics

2. **Starter Plan** ($29.95/month)
   - 500 tracks
   - 10 staff members
   - Analytics
   - API access (50K calls/month)
   - 14-day trial

3. **Pro Plan** ($99.95/month)
   - 5,000 tracks
   - 50 staff members
   - Advanced analytics
   - API access (500K calls/month)
   - Webhooks
   - Custom branding
   - Priority support
   - 14-day trial

4. **Enterprise Plan** ($299/month)
   - Unlimited tracks
   - 999 staff members
   - All features
   - SSO
   - White label
   - Dedicated support
   - 30-day trial

5. **Agent Plan** ($14.95/month)
   - 200 tracks
   - 1 staff (personal)
   - Personal inbox
   - Network features
   - 14-day trial

#### Subscription Lifecycle

1. **Trial Period**
   - Organization starts on trial
   - Full feature access during trial
   - Trial end date tracked
   - Email notification before trial ends

2. **Active Subscription**
   - Regular billing (monthly/yearly)
   - Usage limits enforced
   - Feature access based on plan

3. **Past Due**
   - Payment failed
   - Limited access (grace period)
   - Email notifications
   - Automatic retry

4. **Canceled**
   - Subscription canceled
   - Access until period end
   - Data preserved
   - Can reactivate

### Billing Integration

#### Stripe Integration (Ready, Needs Configuration)

**Edge Functions:**
- `create-checkout-session`: Creates Stripe checkout session
- `create-portal-session`: Creates Stripe customer portal session
- `stripe-webhook`: Handles Stripe webhook events

**Webhook Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.trial_will_end`

**Database Updates:**
- Subscription status synced from Stripe
- Invoices created on successful payment
- Payment methods stored

### Feature Flags

**System-Wide Feature Flags:**
- `advanced_analytics`: Advanced analytics dashboard
- `api_access`: REST API access
- `webhooks`: Webhook notifications
- `sso`: Single sign-on
- `custom_branding`: Custom branding
- `white_label`: White label features

**Plan-Based Features:**
- Features enabled based on subscription plan
- `has_feature_access()` function checks access
- UI components check feature access before rendering

### Usage Tracking

**Automatic Tracking:**
- Tracks: Incremented on INSERT, decremented on DELETE
- Staff: Incremented on active membership, decremented on deactivation
- Storage: Future implementation
- API Calls: Tracked per API request

**Usage Dashboard:**
- Visual progress bars (usage vs limit)
- Percentage indicators
- Warnings at 80% and 100%
- Upgrade prompts when limit reached

---

## API & Integrations

### REST API

**Base URL**: `https://[project].supabase.co/functions/v1/api/v1`

#### Authentication

**API Key Authentication:**
- API keys stored hashed in database
- Key prefix displayed to user (first 8 chars)
- Keys can be revoked
- Keys can expire

**Request Headers:**
```
Authorization: Bearer sk_live_xxxxxxxxxxxxx
Content-Type: application/json
```

#### Endpoints

##### Tracks API

**GET `/tracks`**
- List tracks with pagination
- Query params: `page`, `limit`, `status`, `artist_id`
- Returns: Array of tracks with metadata

**GET `/tracks/:id`**
- Get single track
- Returns: Track object with full details

**POST `/tracks`**
- Create new track
- Body: `artist_name`, `title`, `sc_link`, `genre`, `bpm`, `energy`
- Returns: Created track object

**PUT `/tracks/:id`**
- Update track
- Body: Partial track object
- Returns: Updated track object

**DELETE `/tracks/:id`**
- Delete track
- Returns: Success message

##### Artists API

**GET `/artists`**
- List artists
- Query params: `page`, `limit`
- Returns: Array of artists

**GET `/artists/:id`**
- Get single artist
- Returns: Artist object with tracks

**POST `/artists`**
- Create artist
- Body: `name`, `bio`, `primary_genre`
- Returns: Created artist object

**PUT `/artists/:id`**
- Update artist
- Body: Partial artist object
- Returns: Updated artist object

**DELETE `/artists/:id`**
- Delete artist
- Returns: Success message

#### Rate Limiting

- **Free Plan**: No API access
- **Starter Plan**: 50,000 calls/month
- **Pro Plan**: 500,000 calls/month
- **Enterprise Plan**: Unlimited

**Rate Limit Headers:**
```
X-RateLimit-Limit: 50000
X-RateLimit-Remaining: 49950
X-RateLimit-Reset: 1640995200
```

#### Error Responses

**400 Bad Request:**
```json
{
  "error": "Validation error",
  "details": "Missing required field: title"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid API key"
}
```

**403 Forbidden:**
```json
{
  "error": "Rate limit exceeded"
}
```

**404 Not Found:**
```json
{
  "error": "Track not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

### Webhooks

#### Webhook Events

**Track Events:**
- `track.created`: Track created
- `track.updated`: Track updated
- `track.deleted`: Track deleted
- `track.moved`: Track moved between phases

**Artist Events:**
- `artist.created`: Artist created
- `artist.updated`: Artist updated

**Vote Events:**
- `vote.added`: Vote added to track

**Subscription Events:**
- `subscription.created`: Subscription created
- `subscription.updated`: Subscription updated
- `subscription.canceled`: Subscription canceled

#### Webhook Delivery

**Delivery Process:**
1. Event occurs in application
2. Webhook delivery record created
3. HTTP POST to webhook URL with payload
4. Signature verification (HMAC-SHA256)
5. Retry on failure (exponential backoff)

**Retry Logic:**
- Max 5 retries
- Delays: 1s, 5s, 15s, 1m, 5m
- Marked as failed after max retries

**Webhook Payload:**
```json
{
  "event": "track.created",
  "timestamp": "2026-01-25T10:00:00Z",
  "data": {
    "id": "uuid",
    "artist_name": "Artist Name",
    "title": "Track Title",
    "status": "inbox"
  }
}
```

**Signature Verification:**
```
X-Webhook-Signature: sha256=xxxxxxxxxxxxx
```

### Email Service

**Provider**: Resend (with Supabase fallback)

**Email Templates:**
- Team invites
- Track submissions
- Trial ending warnings
- Subscription expiration
- Password reset (Supabase)

**Email Queue:**
- Failed emails queued for retry
- Retry logic with exponential backoff
- Error logging

---

## Deployment & Infrastructure

### Hosting

**Frontend**: Vercel
- Automatic deployments from GitHub
- Preview deployments for PRs
- Edge network (global CDN)
- Automatic HTTPS

**Backend**: Supabase
- PostgreSQL database
- Edge Functions (Deno runtime)
- Realtime subscriptions
- Storage (future use)
- Auth service

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`):

**Triggers:**
- Push to `main` → Production deployment
- Push to `develop` → Staging deployment
- Pull requests → Lint and test

**Steps:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run linter (`npm run lint`)
5. Run tests (`npm test`)
6. Check formatting (`npm run format:check`)
7. Build (`npm run build`)
8. Deploy to Vercel

### Environment Variables

**Frontend (.env):**
```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon_key]
VITE_SITE_URL=https://soundpath.app
VITE_RESEND_API_KEY=[resend_key]
VITE_RESEND_FROM_EMAIL=noreply@soundpath.app
VITE_STRIPE_PUBLISHABLE_KEY=[stripe_key]
```

**Supabase Edge Functions:**
```env
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service_key]
STRIPE_SECRET_KEY=[stripe_secret]
STRIPE_WEBHOOK_SECRET=[webhook_secret]
RESEND_API_KEY=[resend_key]
```

### Security Headers

**Vercel Configuration** (`vercel.json`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### Health Monitoring

**Health Check Endpoint**: `/health`

**Checks:**
- Database connectivity
- Supabase service status
- Edge Functions status

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-25T10:00:00Z",
  "services": {
    "database": "ok",
    "realtime": "ok",
    "storage": "ok"
  }
}
```

### Database Migrations

**Migration Strategy:**
- Idempotent migrations (can run multiple times)
- Schema files in `database/schemas/`
- Feature migrations in `database/migrations/`
- Archive old migrations in `database/archive/`

**Migration Order:**
1. `master-schema.sql` - Core schema
2. `saas-schema.sql` - SaaS features
3. `rbac-schema.sql` - RBAC (if needed)
4. Feature migrations as needed

### Backup & Recovery

**Supabase Backups:**
- Automatic daily backups
- Point-in-time recovery (PITR)
- Manual backup triggers available

**Data Export:**
- CSV export for tracks, artists
- JSON export for full data
- GDPR-compliant data export

---

## Security Implementation

### Authentication Security

1. **Password Requirements**
   - Minimum 8 characters
   - Encourages: uppercase, lowercase, numbers, symbols
   - Strength indicator in UI

2. **Session Management**
   - JWT tokens (Supabase Auth)
   - Automatic token refresh
   - Session expiration

3. **Email Verification**
   - Optional (can be disabled)
   - Confirmation email sent on signup

### Authorization Security

1. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Policies enforce organization isolation
   - SystemAdmin bypass for global view

2. **API Security**
   - API keys hashed (bcrypt)
   - Key prefixes only (full key shown once)
   - Revocable keys
   - Expiring keys

3. **Webhook Security**
   - HMAC-SHA256 signature verification
   - Secret stored per webhook
   - Signature in `X-Webhook-Signature` header

### Data Protection

1. **Encryption**
   - Data encrypted at rest (Supabase)
   - TLS in transit
   - API keys hashed

2. **Input Validation**
   - Client-side validation
   - Server-side validation (database constraints)
   - SQL injection prevention (parameterized queries)

3. **XSS Prevention**
   - React escapes by default
   - Content Security Policy headers
   - No `dangerouslySetInnerHTML` usage

### Audit Logging

**Audit Logs Table:**
- All actions logged
- User ID, IP address, user agent
- Before/after changes (JSONB)
- Timestamp

**Logged Actions:**
- Track created/updated/deleted
- Subscription changes
- Staff management
- Permission changes
- API key creation/revocation

---

## Performance & Optimization

### Frontend Optimization

1. **Code Splitting**
   - Lazy loading for routes
   - Dynamic imports for heavy components
   - React.lazy() for page components

2. **Caching**
   - Cognitive load cache (30 seconds)
   - Company health cache (60 seconds)
   - Browser caching for static assets

3. **Optimistic Updates**
   - UI updates immediately
   - Server sync in background
   - Rollback on error

4. **Pagination**
   - API endpoints support pagination
   - Configurable page sizes (default: 50, max: 100)
   - Infinite scroll ready

### Database Optimization

1. **Indexes**
   - All foreign keys indexed
   - Status columns indexed
   - Organization ID indexed
   - Composite indexes for common queries

2. **Query Optimization**
   - Count queries use `count: 'exact', head: true`
   - Selective field queries (not `SELECT *`)
   - Efficient joins with Supabase

3. **Trigger Optimization**
   - Triggers only fire on necessary changes
   - Batch updates where possible

### Real-Time Optimization

1. **Selective Subscriptions**
   - Only subscribe to relevant tables
   - Filter by organization_id
   - Unsubscribe on unmount

2. **Debouncing**
   - Search input debounced
   - Vote updates debounced (if needed)

### Monitoring

**Error Tracking** (Ready for integration):
- Sentry integration available
- Error boundaries in React
- Console error logging

**Performance Monitoring:**
- Vercel Analytics (available)
- Supabase dashboard metrics
- Database query performance

---

## Development Workflow

### Local Development

**Prerequisites:**
- Node.js 18+
- npm or yarn
- Supabase account
- Git

**Setup:**
1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env` file with Supabase credentials
4. Run database schemas in Supabase SQL Editor
5. Start dev server: `npm run dev`

**Development Server:**
- Vite dev server on `http://localhost:5173`
- Hot module replacement (HMR)
- Fast refresh

### Testing

**Test Framework**: Vitest + React Testing Library

**Test Commands:**
- `npm test` - Run tests
- `npm run test:ui` - Test UI
- `npm run test:coverage` - Coverage report

**Test Files:**
- `src/test/auth.test.js` - Authentication tests
- `src/test/tracks.test.js` - Track management tests
- `src/test/App.test.jsx` - Component tests

### Code Quality

**Linting**: ESLint
- React hooks rules
- React best practices
- No unused variables

**Formatting**: Prettier
- Automatic formatting on save
- Consistent code style

**Commands:**
- `npm run lint` - Check linting
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code
- `npm run format:check` - Check formatting

### Git Workflow

**Branches:**
- `main` - Production
- `develop` - Staging
- `feature/*` - Feature branches

**Commit Messages:**
- Conventional commits preferred
- Clear, descriptive messages

### Database Development

**Schema Changes:**
1. Create migration file in `database/migrations/`
2. Test in local Supabase instance
3. Run in staging Supabase
4. Deploy to production

**Migration Best Practices:**
- Idempotent migrations
- Backward compatible when possible
- Test rollback procedures

---

## Technical Stack

### Frontend

- **React 18.2.0**: UI framework
- **React Router DOM 6.21.1**: Client-side routing
- **Vite 7.3.1**: Build tool and dev server
- **Tailwind CSS 3.3.6**: Utility-first CSS
- **Framer Motion 10.16.16**: Animations
- **Lucide React 0.294.0**: Icons
- **@dnd-kit**: Drag-and-drop

### Backend

- **Supabase**: Backend-as-a-Service
  - PostgreSQL database
  - Edge Functions (Deno)
  - Realtime subscriptions
  - Auth service
  - Storage (future)

### Database

- **PostgreSQL**: Relational database
- **Row Level Security (RLS)**: Data isolation
- **Triggers**: Automatic updates
- **Functions**: Business logic
- **Extensions**: uuid-ossp

### Payment Processing

- **Stripe**: Payment processor (ready for integration)
- **Stripe.js**: Client-side Stripe integration
- **Stripe Webhooks**: Subscription events

### Email Service

- **Resend**: Primary email provider
- **Supabase Email**: Fallback option
- **Email Queue**: Retry logic

### Development Tools

- **Vitest 4.0.18**: Test runner
- **ESLint 8.55.0**: Linter
- **Prettier 3.1.1**: Formatter
- **TypeScript**: Type checking (in Edge Functions)

### Deployment

- **Vercel**: Frontend hosting
- **GitHub Actions**: CI/CD
- **Supabase**: Backend hosting

### Monitoring & Analytics

- **Sentry** (optional): Error tracking
- **Vercel Analytics** (available): Performance monitoring
- **Supabase Dashboard**: Database metrics

---

## Conclusion

SoundPath is a comprehensive, production-ready SaaS platform that provides record labels and A&R professionals with a complete solution for managing the demo submission and artist discovery pipeline. The application features:

- **Agent-centric architecture** for flexible workspace management
- **Multi-tenant SaaS** with subscription billing and usage limits
- **Enterprise-grade security** with RLS, API keys, and audit logging
- **Real-time collaboration** with Supabase Realtime
- **REST API and webhooks** for integrations
- **Production infrastructure** with CI/CD and monitoring

The platform is ready for production deployment with Stripe integration being the primary remaining task. All core features are implemented, tested, and documented.

---

**Report Generated**: January 25, 2026  
**Application Version**: 1.0.0  
**Status**: Production-Ready
