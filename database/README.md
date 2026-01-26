# Database Files

This directory contains all database-related SQL files organized by purpose.

## Structure

### `schemas/`
Main database schema files. These are comprehensive, production-ready schemas that can be run multiple times safely.

- **`master-schema.sql`** - Complete database schema with all tables, RLS policies, functions, and triggers
- **`saas-schema.sql`** - SaaS billing, subscriptions, usage tracking, and admin features
- **`rbac-schema.sql`** - Role-Based Access Control (RBAC) implementation
- **`supabase-schema.sql`** - Original Supabase schema (may be superseded by master-schema.sql)

### `migrations/`
Feature-specific migrations and schema additions. These files add specific functionality to the database.

- `multi-tenant-migration.sql` - Multi-tenant organization support
- `onboarding-schema.sql` - User onboarding flow
- `universal-profiles-schema.sql` - User profiles across organizations
- `system-admin-schema.sql` - System admin functionality
- `agent-networking-schema.sql` - Agent networking features
- `contact-form-schema.sql` - Public contact form
- `api-database-functions.sql` - API-related database functions
- And other feature-specific migrations...

### `archive/`
One-off fixes, updates, and test/debug scripts that have likely already been applied to production.

**Note:** Files in this directory are kept for reference but should not be run on production databases unless you're troubleshooting a specific issue.

- `fix-*.sql` - One-off bug fixes (likely already applied)
- `update-*.sql` - Schema updates (likely already applied)
- `test-*.sql` - Test/debug scripts
- `check-*.sql` - Diagnostic scripts

## Usage

### For New Installations
1. Run `schemas/master-schema.sql` first
2. Run `schemas/saas-schema.sql` for billing features
3. Run `schemas/rbac-schema.sql` for access control
4. Run any needed migrations from `migrations/` as required

### For Existing Installations
- Only run migrations from `migrations/` that haven't been applied yet
- Files in `archive/` are for reference only
