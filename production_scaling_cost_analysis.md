# SKYLD: Production Scaling & Cost Analysis

This document provides a beginner-friendly, technically realistic analysis of how SKYLD will scale as usage grows. It breaks down the cause-and-effect relationship of cloud costs and outlines a roadmap from development to production.

*(Note: All costs have been converted to Indian Rupees (INR) at an approximate exchange rate of ₹84 = $1 USD for easier estimation).*

---

## 1. Current State: Confirmed vs. Recommended
Before discussing scaling, we must look at what is currently built into the SKYLD codebase versus what will be needed as the app grows.

### 🔍 Confirmed From Code (Currently Implemented)
- **Framework & Hosting:** Next.js (React 19, Next 16.3) structured to run on Vercel/Netlify.
- **Database & Backend:** Supabase (PostgreSQL for data, Auth for users, Storage for the `videos` bucket).
- **AI Processing:** Google Generative AI (Gemini) integrated via `@google/generative-ai`.
- **Background Tasks:** Vercel Crons configured in `vercel.json` (`/api/cron/accountability`, `/api/cron/process-ai`, `/api/cron/cleanup-videos`, `/api/cron/daily-assignment`).
- **Video Handling:** Direct uploads of WebM/MP4 files to Supabase Storage, which are later downloaded for AI analysis.

### 🏗️ Recommended for Future Scaling (Not Yet Implemented)
- **Monitoring & Error Tracking:** Tools like Sentry or DataDog to automatically catch errors before users report them.
- **Dedicated Notifications:** A service like Resend (email) or OneSignal (push) for student accountability reminders.
- **Advanced CI/CD:** Automated testing pipelines (e.g., GitHub Actions) to prevent broken code from reaching production.
- **Advanced Caching Strategy:** Redis (e.g., Upstash) to remember common data and avoid hitting the database.

---

## 2. The Chain of Scaling
To understand scaling, you don't need a computer science degree. You just need to follow the chain of events. As you go from **1 → 10 → 100 → 1,000 → 10,000 students**, every action follows this path:

> **User Action** → **Technical Resource** → **Infrastructure Load** → **Billable Resource** → **Potential Cost**

**Example:**
1. **User Action:** A student clicks "Submit Video".
2. **Technical Resource:** The browser uploads a 10MB WebM file to the server.
3. **Infrastructure Load:** The server receives the file and saves it to a hard drive.
4. **Billable Resource:** Cloud Storage (GBs stored) + Bandwidth (GBs transferred over the internet).
5. **Potential Cost:** A fraction of a cent per upload, but it multiplies by thousands of students daily.

---

## 3. Component Breakdown: How SKYLD Makes Money Disappear

### Next.js & Vercel/Netlify Hosting
- **What it does:** Serves your website and runs your Server Actions (API routes).
- **Why SKYLD needs it:** It's the brain connecting the user's browser to your database and AI.
- **Cost drivers:** 
  - **Serverless Execution:** Think of serverless like a taxi. You only pay while the meter is running (when a user requests a page). If 1,000 students log in at 8:00 AM, Vercel spins up 1,000 "taxis" at once.
  - **Bandwidth (CDN):** Sending HTML, CSS, and Javascript from edge servers to the user's browser.
- **Does cost increase?** Yes, strictly with **Requests** and **Compute Time**.

### Supabase (PostgreSQL, Auth, Storage)
- **What it does:** Stores user profiles, progress, and video files.
- **Why SKYLD needs it:** It is the memory of the application.
- **Cost drivers:**
  - **Database Size:** How many text records you store (cheap).
  - **Storage:** How many gigabytes of video you hold (expensive).
  - **Bandwidth:** Sending videos back out to the AI or teachers to watch (very expensive).
  - **Database Queries:** (Think of this as asking a librarian for a book). Without **Indexes** (a library catalog system), the database has to scan every book to find what you want, which uses massive CPU.
  - **Connection Pooling:** If 1,000 students ask the database a question at once, it crashes unless you have a "queue manager" (Connection Pooler) to organize them.
- **Does cost increase?** Yes, primarily based on **Storage Data** and **Data Transfer**.

### Gemini AI
- **What it does:** Analyzes student pronunciation and provides feedback.
- **Why SKYLD needs it:** The core value proposition of the app.
- **Cost drivers:** Cloud AI is billed by **Tokens**. 1 token is roughly 3/4 of a word. However, for video, AI charges by the *second* of video processed. 
- **Does cost increase?** Yes, directly with **Usage** (how long the videos are, and how many are submitted).

### Cron / Background Jobs
- **What it does:** Runs scheduled tasks (like `/api/cron/process-ai` every 5 minutes).
- **Why SKYLD needs it:** To process videos in the background without making the student wait on a loading screen.
- **Cost drivers:** It simply triggers Vercel serverless functions.
- **Does cost increase?** Not really with users, it mostly costs a flat rate based on the schedule frequency.

---

## 4. Hypothetical Scaling Calculations

Let's imagine SKYLD has **1,000 active students**, and each student practices **5 words per day** with a **10-second video** each.

### Video Storage & Bandwidth Math
- **Upload Size:** 10 seconds of compressed WebM = ~2 MB.
- **Daily Uploads:** 1,000 students × 5 videos = 5,000 videos/day.
- **Daily Storage Added:** 5,000 videos × 2 MB = 10,000 MB (10 GB/day).
- **Monthly Storage:** 10 GB × 30 days = **300 GB / month**.
- **Bandwidth:** To process the AI, the backend must download the video. That's another 300 GB/month of "Egress" (Data Transfer out of Supabase).
- *Cost Reality:* Standard cloud storage is cheap (~₹1.70/GB), but bandwidth is pricier (~₹7.50/GB). Expect around ₹2,500 - ₹4,200/month just for 1,000 users' video plumbing.

### Gemini AI Math (Based on Gemini 1.5 Flash Estimates)
- **Input:** AI treats 1 second of video as ~260 tokens. 
- **10 sec video** = 2,600 input tokens.
- **Daily Tokens:** 5,000 videos × 2,600 tokens = 13 Million Input Tokens / day.
- **Monthly Tokens:** 390 Million tokens / month.
- *Cost Reality:* Gemini 1.5 Flash is highly cost-effective (e.g., ₹6.30 per 1M tokens). 390M tokens × ₹6.30 = **~₹2,500/month**. 
- *(Note: If you use Gemini 1.5 Pro, costs could be 10x higher. Flash is recommended for scale).*

---

## 5. Cloud Economics: Business Context

### Infra Costs vs. Employee Costs
As a beginner, a ₹16,800 cloud bill might seem scary. However, **cloud infrastructure is the cheapest part of your business**. 
- A ₹16,800/month cloud bill supports thousands of users.
- A single software engineer in a global context can cost anywhere from ₹50,000 to ₹12,00,000+/month.
- **Rule of thumb:** Never spend 3 days of expensive developer time to save ₹800/month on cloud costs. 

### Who Pays?
In an EdTech B2B model (selling to schools), you charge the school a "per seat" license (e.g., ₹800 - ₹1,000/student/year). 
If the cloud cost per active student is ₹12.50/month (₹150/year), your gross margin is over 80%. This is highly sustainable.

### Major SKYLD Cost Risks
1. **The Infinite AI Loop:** If a background job fails and retries processing the same video 100 times a minute, it will burn through AI tokens instantly.
2. **Video Hoarding:** If you don't delete old videos, your Supabase storage will grow infinitely. *Good news: Your codebase already has a `/api/cron/cleanup-videos` job!*
3. **Uncompressed Video:** If students upload 100MB 4K videos from iPhones instead of compressed 2MB WebM files, your bandwidth costs will multiply by 50x.

---

## 6. The Realistic Roadmap

### Phase 1: Development & Pilot (1 - 100 Users)
- **Focus:** Finding product-market fit. Does the AI actually help them learn?
- **Infrastructure:** Use free tiers for Vercel, Supabase, and Gemini. 
- **What to ignore:** Don't worry about caching, optimization, or perfect architecture.
- **Where to spend money:** UI/UX design and talking to users.

### Phase 2: Beta (500 - 1,000 Users)
- **Focus:** Stability and Bug Fixing.
- **Infrastructure:** Upgrade to Vercel Pro (~₹1,700/mo) and Supabase Pro (~₹2,100/mo). You will hit the free tier limits here.
- **What to monitor:** Keep an eye on Supabase database CPU. Make sure your queries are fast. Add **Sentry** here to catch errors automatically.

### Phase 3: Production (5,000 - 10,000 Users)
- **Focus:** Unit Economics and Reliability.
- **Infrastructure:** AI costs will become a real line item (₹17,000 - ₹42,000/mo). Video bandwidth will get heavy. 
- **What to upgrade:** Implement **Redis Caching** so the database isn't hit for every single page load. Move videos to a dedicated CDN (like Cloudflare) to slash bandwidth costs.
- **Where to spend money:** Security audits, database backups (Point-in-Time Recovery), and automated testing.

### Phase 4: Scale (100,000+ Users)
- **Focus:** Margin optimization and Enterprise Compliance.
- **Infrastructure:** You will likely need to move away from "Serverless" for video processing to dedicated servers (AWS EC2/Docker) because running heavy video manipulation on Vercel becomes too expensive at this scale.

---

# 📑 Executive Summary

**SKYLD Current State**
SKYLD is built on a modern, serverless stack (Next.js, Supabase, Gemini). It is structurally sound for early growth, utilizing cloud-native patterns like Server Actions and background crons. 

**What Scaling Means for SKYLD**
For SKYLD, scaling is almost entirely a **Video and AI problem**. The text and database aspects are negligible in cost. Every new user directly scales the amount of video uploaded, the bandwidth used to move that video, and the AI tokens required to analyze it.

**Biggest Risks**
1. **Uncapped Video Sizes:** Allowing huge video uploads will destroy bandwidth budgets.
2. **Runaway AI Crons:** Bugs in background jobs pinging Gemini unnecessarily.
3. **Database Bottlenecks:** A lack of database indexes causing 1,000 simultaneous users to lock up the application during a morning classroom session.

**Current Recommendation**
Do not over-engineer right now. The current architecture easily supports the first 1,000 users for under ₹8,400/month. Ensure video compression on the client-side (browser) is aggressive before uploading, and ensure the `cleanup-videos` cron job is actually functioning to delete old media.

**Future Architecture**
At 10,000+ users, the architecture should evolve to include Cloudflare (to cache videos and absorb bandwidth), Redis (to reduce database load), and a dedicated queuing system to replace Vercel crons for managing AI processing reliability.
