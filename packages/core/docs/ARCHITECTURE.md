# MemberBase — Architecture & Developer Guide

## Overview

MemberBase is a white-label SaaS membership platform. Operators can run it for any club, gym, or community by changing a single config file. Members get a portal, admins get a dashboard.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth + Storage) · Tailwind CSS v4 · shadcn/ui · Zod v4 · React Hook Form · Sonner (toasts)

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # /login, /register — centered layout, no sidebar
│   ├── (dashboard)/     # /admin/* — sidebar layout for operators
│   └── (portal)/        # /portal/* — top-nav layout for members
├── actions/             # Server Actions — auth, validation, business logic
├── services/            # DB query helpers called by actions
├── components/
│   ├── ui/              # shadcn base components (don't edit directly)
│   ├── shared/          # Reusable across admin + portal
│   ├── admin/           # Admin-only (sidebar, forms)
│   └── portal/          # Portal-only (nav, member cards)
├── hooks/               # Client-side hooks (useProfile, useSubscription)
├── lib/
│   ├── supabase/        # client.ts · server.ts · middleware.ts
│   ├── validations/     # Zod schemas (auth, content, membership)
│   └── theme.ts         # themeConfig loader
├── stores/              # Zustand (reserved for future use)
└── types/
    └── database.ts      # All TypeScript interfaces for DB entities
```

---

## Data Model

### Core Tables

| Table | Description |
|---|---|
| `profiles` | Extends `auth.users` — stores role, full_name, avatar_url, phone |
| `membership_plans` | Plans defined by the operator (name, price, duration, features) |
| `subscriptions` | Links users to plans, tracks status (active/pending/expired/cancelled) |
| `payment_proofs` | SINPE/transfer receipts uploaded by members, reviewed by admin |
| `content` | Articles, videos, files, links — gated by plan |
| `content_plans` | M2M junction: content ↔ plans |
| `content_categories` | Optional taxonomy for content (color-coded) |
| `community_posts` | Forum-style posts by members |
| `community_comments` | Threaded comments on posts |
| `login_attempts` | Rate limiting — tracks failed login attempts per email |

### Key Relationships

```
auth.users (Supabase)
    └── profiles (1:1 via trigger on signup)
        └── subscriptions (1:N)
            └── membership_plans (N:1)
        └── payment_proofs (1:N)
        └── community_posts (1:N)
            └── community_comments (1:N)

content (N:M) membership_plans  via content_plans
```

### Important FK Note
`community_posts.user_id` has **two FKs**: one to `auth.users(id)` (Supabase standard) and one to `profiles(id)` (required for PostgREST to navigate the `profiles` join in queries like `author:profiles(full_name)`).

---

## Authentication & Authorization

### Flow

1. User submits login form → `signIn` Server Action
2. Rate limit check via `count_recent_login_attempts()` RPC (max 5 failures / 15 min)
3. `supabase.auth.signInWithPassword()` — Supabase handles JWT
4. On failure: record attempt in `login_attempts`, cleanup old records
5. On success: query `profiles.role` → redirect to `/admin` or `/portal/dashboard`

### Route Protection (middleware.ts)

```
/admin/*  → must be authenticated + role === 'admin'
/portal/* → must be authenticated (any role)
/login    → if authenticated, redirect to correct dashboard
/register → if authenticated, redirect to correct dashboard
```

The middleware reads and refreshes the Supabase session on every request using `@supabase/ssr`.

### Server-side Rule
Every Server Action calls `getCurrentUser()` first. **Never trust role data from the client.** Role is always re-fetched from `profiles` in the DB.

---

## Server Actions Pattern

All actions follow this structure and return `ActionResult<T>`:

```typescript
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string | Record<string, string[]> };

export async function exampleAction(input: unknown): Promise<ActionResult<T>> {
  // 1. Verify authentication
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  // 2. Verify authorization
  if (user.role !== "admin") return { success: false, error: "Sin permisos" };

  // 3. Validate input with Zod
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  // 4. Execute business logic (via service layer)
  // 5. Revalidate affected routes
  // 6. Return typed result
}
```

**Actions vs Services:**
- `actions/` — auth check + validation + revalidatePath + return ActionResult
- `services/` — raw DB queries, no auth, no revalidation, throws on error

---

## White-Label System

### How it works

1. `theme.config.ts` holds all client-specific settings: brand name, colors, SINPE number, enabled features
2. `ThemeProvider` (client component in root layout) reads `themeConfig.colors` and injects them as CSS custom properties at runtime
3. `globals.css` has the same values as `:root` defaults — ensures SSR renders correctly without color flash
4. All components use Tailwind utilities that reference CSS variables (`text-primary`, `bg-accent`, etc.)

### Deploying for a new client (GymBase, etc.)

1. Clone the repo
2. Edit `theme.config.ts` — change brand name, colors, SINPE, enabled features
3. Create a new Supabase project and update `.env.local`
4. Run migrations: `supabase/migrations/001` through `007` in order
5. Deploy

### Feature Flags

```typescript
// theme.config.ts
features: {
  community: true,   // forum module
  content: true,     // content library
  // Add new modules here, default: false
}
```

---

## Migrations Log

| File | Description |
|---|---|
| `001_initial_schema.sql` | profiles, membership_plans, subscriptions, payment_proofs, content, content_plans |
| `002_rls_policies.sql` | Row Level Security policies for all tables |
| `003_functions_triggers.sql` | `handle_new_user()` trigger, `get_admin_stats()` function |
| `004_storage_policies.sql` | Supabase Storage policies for payment proof uploads |
| `005_content_categories.sql` | content_categories table + category_id FK on content |
| `006_community.sql` | community_posts, community_comments + FK to profiles (PostgREST fix) |
| `007_login_rate_limiting.sql` | login_attempts table + `count_recent_login_attempts()` RPC |

---

## Key Components Reference

### Shared

| Component | Props | Description |
|---|---|---|
| `KPICard` | icon, iconBg, iconColor, value, label, description, linkHref | Admin dashboard metric cards |
| `PlanCard` | plan, isActive, onSelect, isLoading | Displays a membership plan with price and features |
| `ContentCard` | id, title, type, category, description, linkHref | Content library item |
| `PostCard` | id, title, author, date, commentCount, isPinned | Community feed item |
| `StatusBadge` | status | Color-coded badge for subscription/content/comment states |
| `AlertBanner` | variant, title, description, actionLabel, actionHref | Left-bordered alert strip |

### Admin

| Component | Description |
|---|---|
| `AdminSidebar` | Nav with active state, community toggle via feature flag |
| `PlanForm` | Create/edit membership plans (controlled, Zod validated) |
| `ContentClient` | Full content CRUD: create, toggle published, delete |
| `PaymentsClient` | Review + approve/reject payment proofs |
| `PlansClient` | Plan management with inline edit |
| `CommunityModerationActions` | Pin/hide/delete posts from admin panel |

### Portal

| Component | Description |
|---|---|
| `PortalNav` | Top navbar with user menu, active links |
| `MembershipClient` | Shows subscription status, handles upload of payment proof |
| `PlansPortalClient` | Plan selection with active plan highlight |
| `CategoryFilter` | Client-side filter pills for content categories |
| `CommentForm` | Adds comments to community posts |
| `DeletePostButton` | Author-only post deletion with confirmation |

---

## RLS Summary

All tables have RLS enabled. Key policies:

- `profiles` — users read/update their own; admins read all
- `subscriptions` — users read their own; admins CRUD all
- `payment_proofs` — users insert/read their own; admins read/update all
- `content` — admins CRUD; members SELECT only published content in their plan
- `community_posts` — members INSERT; users read their own; admins CRUD all visible
- `community_comments` — members INSERT; read visible; admins update visibility
- `login_attempts` — anon INSERT only; no SELECT (reads via SECURITY DEFINER function)

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

The service role key is **not needed** at runtime — all privilege escalation is done via `SECURITY DEFINER` Postgres functions called through the anon client.

---

## Conventions

| Rule | Short version |
|---|---|
| Language | Code in English, comments in Spanish |
| Types | No `any`. Explicit return types always |
| Auth | Verify user server-side on every action |
| Validation | Zod on every action before DB access |
| RLS | Every new table needs RLS + policies |
| Colors | CSS variables only, never hardcoded |
| Brand | Always from `themeConfig`, never hardcoded |
| Loading | Skeleton components, not empty spinners |
| Errors | Generic message to client, full error to server logs |
| New modules | Behind feature flag in `theme.config.ts` |
| Queries | Select only needed columns, never `select('*')` |
| Functions | Max 40 lines, max 3 nesting levels |
