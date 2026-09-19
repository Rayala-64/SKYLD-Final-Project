# Implement Buddy and Pod Dashboards with strict RLS

This plan outlines the architecture for introducing Buddy and Pod dashboards while guaranteeing that cross-user access is strictly read-only and confined to the Pod boundary.

## User Review Required

> [!WARNING]  
> Modifying RLS policies affects the root security of the application. Please review the proposed RLS rules carefully to ensure they match your expected business logic (e.g. students in the same pod can view each other's submissions, streaks, and XP, but cannot modify them).

## Proposed Changes

### Database & RLS (Supabase)
We will create a new migration file to update the Row Level Security (RLS) policies. Because buddies are strictly within the same pod, granting Pod-level read access inherently grants Buddy-level read access. We will implement these policies:

#### [NEW] `supabase/migrations/20260830_pod_buddy_access.sql`
- **Users Table (SELECT):** Allow a user to read another user's profile if they belong to the same `pod_id`.
- **Submissions Table (SELECT):** Allow a user to read submissions of anyone in their `pod_id`.
- **Streaks & XP Transactions (SELECT):** Allow a user to read streaks and XP of anyone in their `pod_id`.
- **Pod Messages (SELECT & INSERT):** Enforce that users can only read and write messages in the `pod_messages` table if the message's `pod_id` matches the user's `pod_id`.
- *Note: All `INSERT`, `UPDATE`, and `DELETE` policies on core tables (users, submissions, etc.) will remain restricted to the owner only. Mentors will retain their existing mentor-level access.*

### Frontend - Server Actions
We will update or add Server Actions to securely fetch data for buddies and pods. The database RLS will act as the ultimate safeguard, but the server actions will fetch the correct lists.

#### [MODIFY] `src/app/actions/pod_actions.ts` (or similar)
- Add `getPodMembers()` to fetch the roster of the current user's pod.
- Add `getPodMessages()` and `sendPodMessage()` for the Pod chat.

#### [MODIFY] `src/app/actions/dashboard_actions.ts`
- Ensure the existing `getStudentDashboardData(userId)` can accept a `userId` argument. If a student tries to fetch a `userId` outside their pod, Supabase RLS will return zero rows, ensuring security.

### Frontend - Pages & UI

#### [NEW] `src/app/vault/dashboard/buddy/page.tsx`
- A specific view allowing a user to see their buddy's progress. It will reuse the existing dashboard UI components but pass the `buddy_id` as the target user. It will explicitly hide "Submit", "Edit", and other action buttons, leaving only the read-only view.

#### [MODIFY/NEW] `src/app/vault/pod/page.tsx`
- Build out the Common Pod Dashboard.
- **Section 1: Pod Leaderboard / Roster:** Display all members in the pod, their current XP, and streaks.
- **Section 2: Pod Chat:** A real-time (or simple server-action based) chat interface interfacing with the `pod_messages` table. Both students and the pod mentor can chat here.

## Verification Plan

### Automated/Security Verification
- Attempt to fetch submissions for a student in Pod A using an authenticated session for a student in Pod B -> **Must fail (return empty).**
- Attempt to `UPDATE` a buddy's submission using their submission ID -> **Must fail (Postgres RLS error).**

### Manual Verification
1. Login as Student A. Verify they can see Student B (Buddy) progress.
2. Verify Student A cannot edit Student B's profile or submit missions for them.
3. Login as Pod Mentor. Verify they can see the Pod dashboard and send messages.
4. Login as Student C (different Pod). Verify they cannot see Student A or B on the Pod Dashboard.
