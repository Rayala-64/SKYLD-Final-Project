<div align="center">
  <img src="https://via.placeholder.com/150x150/1f2937/ffffff?text=SKYLD" alt="SKYLD Logo" width="120" height="120" style="border-radius: 20px;" />
  <br/>
  <h1>SKYLD Word Vault™</h1>
  <p><strong>A Premium AI-Powered EdTech Modular Monolith</strong></p>
  <p>Building the future of vocabulary mastery through structured reflection, speech practice, social engagement, and real-time AI feedback.</p>
</div>

<hr />

## 🌟 Executive Summary

**SKYLD Word Vault™** is a highly secure, scalable, and premium web application designed to bridge the gap between passive vocabulary learning and active communication. By utilizing **Google Gemini AI** and **Supabase**, this platform creates a rich, interactive daily learning loop for students, while providing Mentors and Administrators with powerful oversight tools.

Built as a **Modular Monolith** using **Next.js 15 (App Router)**, it balances the rapid iteration speed of a monolith with the organizational clarity needed for enterprise scaling.

---

## 🏗️ Architecture Workflow

The system is built on a robust, serverless-first architecture optimized for performance, security, and scalability.

### System Architecture
```mermaid
graph TD
    A[Frontend: Next.js 15 App Router] -->|Server Actions| B[(Supabase PostgreSQL)]
    A -->|Direct Upload| C[Supabase Storage]
    A -->|AI API Calls| D{Google Gemini Flash}
    
    subgraph Security Layer
    B -->|Row Level Security| E[Students: Limited Read/Write]
    B -->|Row Level Security| F[Mentors: Pod Data]
    B -->|Row Level Security| G[Admins: Global Access]
    A -->|Service Role Bypass| B
    end
```

### End-to-End Data Flow (Daily Mission)
```mermaid
sequenceDiagram
    participant S as Student
    participant N as Next.js Client
    participant SA as Server Action
    participant G as Gemini AI
    participant DB as Supabase DB
    participant ST as Supabase Storage

    S->>N: Types written reflection
    N->>SA: analyzeReflection()
    SA->>G: Analyzes text quality
    G-->>SA: JSON Score & Feedback
    SA-->>N: Updates UI
    
    S->>N: Records speech video
    N->>ST: Uploads video directly to private bucket
    N->>SA: analyzeSpeech()
    SA->>G: Analyzes spoken speech
    G-->>SA: JSON Fluency Metrics
    SA-->>N: Updates UI
    
    N->>SA: submitDailyMission()
    Note over SA,DB: Escalates to Admin Service Role to bypass strict RLS
    SA->>DB: Atomic Transaction: Saves submission, awards XP, evaluates Badges
    DB-->>SA: Success
    SA-->>N: Triggers Mission Complete UI
```

### 1. The Stack
- **Frontend & API:** Next.js 15 (React 18), Tailwind CSS, Framer Motion, Shadcn UI
- **Backend & Database:** Supabase (PostgreSQL), Supabase Auth, Supabase Storage
- **AI Engine:** Google Gemini (1.5 Flash) via `@google/generative-ai` with **Zod** schema validation for deterministic structured outputs.

### 2. Data Flow & Security (RLS)
The application employs a strict **Role-Based Access Control (RBAC)** model defined at the database layer using Postgres Row Level Security (RLS).
* **Students** can only read their assigned Word Cards, communicate with their own Pod, and write to their own Submissions.
* **Mentors** are assigned to "Pods" (cohorts) and can only query data for students within their specific Pod. Video reviews use **dynamic, short-lived Signed URLs**, ensuring media cannot be leaked publicly.
* **Admins** have global read/write access to manage users, generate secure invite codes, post global announcements, and author content.

---

## ✨ Feature Breakdown

### 🎓 For Students (The Vault & Social Loop)
* **The 6-Step Daily Mission:** A structured learning path: `Discover -> Practice Quiz -> Apply (Sentence) -> Reflect -> Speak (Video) -> Result`.
* **Gamification Engine:** Real-time XP tracking via centralized secure server actions, dynamic Leveling, Streaks, and Daily Quests (e.g. "Maintain Streak").
* **Word Vault & Learning Path:** A beautifully designed "Vault" archiving all past learned vocabulary, and a visual Learning Path tracking progress from Foundations to Master Communicator.
* **The Pod Hub:** A dedicated space for students to view their cohort's leaderboard, track the total "Pod Score", and chat on the real-time Pod Message Board.
* **Study Buddy:** A dashboard widget that tracks an assigned partner's daily progress to encourage mutual accountability.
* **AI Coach:** Instant grading and constructive feedback on written text and spoken language, securely parsed and validated for UI rendering.
* **Secure Video Recording:** Browser-based WebRTC recording that uploads directly to a private cloud bucket.
* **Premium Dashboard & Landing Page:** High-converting modern startup landing page featuring rich animations, glassmorphism, and clear CTAs.

### 👨‍🏫 For Mentors (The Dashboard)
* **Pod Management:** View activity statuses and streaks for a cohort of students at a glance.
* **Deep-Dive Student Profiles:** Access a specialized mentor view of a student's entire historic archive, including exact AI scores and feedback.
* **Private Notes System:** Leave hidden, private observations on a student's profile. Mentors can "Flag" a note for urgent review.
* **Pod Communication:** Mentors have access to the Pod Hub to broadcast messages directly to their students.

### 👑 For Administrators (The CMS)
* **AI Auto-Generation:** When an Admin authors a new Word Card, the system automatically prompts Gemini in the background to generate multiple-choice practice quiz questions and saves them to the database.
* **Global Announcements:** Admins can pin important broadcast messages directly to the top of all Student Dashboards.
* **Global User Directory:** Real-time visibility into all platform users, roles, and pod assignments.
* **Invite System:** Generate secure, single-use invite codes to onboard new mentors and students safely.

---

## 🚀 How to Run Locally

Get the project running on your local machine in just a few minutes.

### 1. Prerequisites
- Node.js 18+
- npm or yarn
- A [Supabase](https://supabase.com/) account
- A [Google Gemini](https://ai.google.dev/) API Key

### 2. Clone & Install
```bash
git clone https://github.com/srikareddz2105/SKYLD-project.git
cd skyld-word-vault
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Database Setup (Supabase)
1. Go to your Supabase project's **SQL Editor**.
2. Copy the exact contents of `supabase/schema.sql` and run it. This creates all tables, enums (including `level` and `submission_status`), RLS policies, and the private `videos` storage bucket.

### 5. Seed Mock Data
Populate your local environment with dummy users, word cards, and test submissions:
```bash
npx ts-node -O '{"module":"commonjs"}' supabase/seed.ts
```
*(Note: Seed script contains default local accounts and must NOT be run in production! Default local password: `skyld_local_dev_123!`)*

### 6. Start the Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to view the application!

---

## 🌐 Production Deployment Guide (For Managers)

Deploying the SKYLD Word Vault™ to production is seamless and highly secure, utilizing Vercel's edge network and Supabase's managed Postgres.

### Step 1: Prepare Supabase (Backend)
1. Create a new production project in Supabase.
2. Navigate to the SQL Editor and run the entirety of `supabase/schema.sql` to instantiate the production tables and RLS rules.
3. Under **Authentication > URL Configuration**, add your intended production domain (e.g., `https://skyld.vercel.app`) as the Site URL and allowed callback URL.

### Step 2: Prepare Vercel (Frontend)
1. Log into [Vercel](https://vercel.com) and click **Add New Project**.
2. Import this GitHub repository.
3. In the **Environment Variables** section, add the following securely:
   - `NEXT_PUBLIC_SUPABASE_URL`: (From Supabase Project Settings > API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (From Supabase Project Settings > API)
   - `SUPABASE_SERVICE_ROLE_KEY`: (From Supabase Project Settings > API - **CRITICAL:** Do NOT prefix this with `NEXT_PUBLIC_` as it bypasses RLS for admin tasks).
   - `GEMINI_API_KEY`: Your Google AI Studio API key.

### Step 3: Deploy
1. Click **Deploy**. Vercel will automatically run the Next.js production build (`npm run build`).
2. Once complete, your application is live on the edge network.
3. Access the platform using the provided Vercel domain. To create your first Admin, sign up securely through the app using a strong password, then manually change your role to `admin` in the Supabase `users` table via the Supabase Dashboard. After this, you can use the Admin Dashboard to generate secure invites for others.

---

<div align="center">
  <p>Built with ❤️ for the future of education.</p>
</div>
 
