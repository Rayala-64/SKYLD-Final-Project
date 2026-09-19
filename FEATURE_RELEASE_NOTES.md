# 🚀 SKYLD LDOS — Complete System Architecture & Master Presentation Guide

Welcome to the **SKYLD LDOS (Learning & Development Operating System)** master documentation. This document covers all enterprise features, pedagogical architectures, end-to-end testing workflows, and the executive jury presentation guide.

---

## 📑 Table of Contents
1. [Platform Core Architecture & 5 Key Upgrades](#-1-platform-core-architecture--5-key-upgrades)
2. [Deep Dive on Core Features](#-2-deep-dive-on-core-features)
   - [A. Weekly Championship Submission Deadlines & Auto-Archival](#a-weekly-championship-submission-deadlines--auto-archival)
   - [B. 100-Word Enterprise Semester Vault & AI Seeder](#b-100-word-enterprise-semester-vault--ai-seeder)
   - [C. Unified Live Review Queue & Anti-Copying Tracker](#c-unified-live-review-queue--anti-copying-tracker)
   - [D. In-Pod Same-Day Word Diversity & Student Dashboard Sync](#d-in-pod-same-day-word-diversity--student-dashboard-sync)
   - [E. Pod Leader 16-Minute Video Studio & Mentor Grading](#e-pod-leader-16-minute-video-studio--mentor-grading)
3. [Test Credentials Matrix](#-3-test-credentials-matrix)
4. [Step-by-Step Guided Testing Tour](#-4-step-by-step-guided-testing-tour)
5. [Executive Jury Presentation & Demo Pitch Guide](#-5-executive-jury-presentation--demo-pitch-guide)

---

# 🏛️ 1. Platform Core Architecture & 5 Key Upgrades

```
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   SKYLD LDOS CORE ARCHITECTURE                                   │
 └──────────────────────────────────┬─────────────────────────────┬─────────────────────────────────┘
                                    │                             │
                                    ▼                             ▼
                    ┌──────────────────────────────┐ ┌──────────────────────────────┐
                    │      DAILY RITUAL ENGINE     │ │  WEEKLY POD CHAMPIONSHIPS    │
                    ├──────────────────────────────┤ ├──────────────────────────────┤
                    │ • 10-Step Micro-Learning     │ │ • 8 Members per Pod          │
                    │ • 3-Filter Anti-Copying      │ │ • 16-Min Unified Pod Video   │
                    │ • Buddy & Cross-Pod Reviews  │ │ • 👑 Pod Leader Uploader     │
                    │ • Mastered Words Vault       │ │ • Live Deadline Enforcement  │
                    └──────────────────────────────┘ └──────────────────────────────┘
```

### The 5 Pillar Upgrades Implemented:
1. **Weekly Challenge Deadlines & Auto-Archival:** Admin sets submission deadlines with auto-lockouts and automated archival of past challenges.
2. **100-Word Enterprise Semester Vault:** 100 curated corporate vocabulary words spanning 3 difficulty levels with all 16 rich pedagogical fields.
3. **Unified Live Review Queue & Anti-Copying Tracker:** A single, transparent Admin ledger tracking submissions, reviewer statuses, and 7-day anti-echo quarantine dates.
4. **Personalized In-Pod Word Diversity & Dashboard Sync:** No two pod-mates receive the same word on the same day; Home Dashboard instantly reflects the student's personalized word.
5. **Streamlined 16-Minute Video Studio & Mentor Evaluations:** Pod Leader uploads a single 16-minute unified presentation, which Master Mentors evaluate using enterprise rubric scoring (1–10).

---

# 🔍 2. Deep Dive on Core Features

---

### A. Weekly Championship Submission Deadlines & Auto-Archival

* **The Problem Solved:** Unmanaged weekly competitions lead to late submissions and ambiguous challenge states.
* **The Architecture:**
  1. When Admin launches a weekly challenge (`/admin/dashboard` $\rightarrow$ **Championships**), they specify the **Topic Title**, **Challenge Description**, and a **Hard Submission Deadline**.
  2. The system sets `active = true` on the new challenge and **automatically deactivates all past challenges** (`active = false`).
  3. **Real-time Deadline Badges:** Displayed on `/vault/championship` (Round 2 Card) and `/vault/championship/round2` (Uploader and Team Collaboration views).
  4. **Strict Deadline Locking:** If the deadline expires, the Pod Leader upload interface locks automatically to preserve competition integrity.

---

### B. 100-Word Enterprise Semester Vault & AI Seeder

* **The Problem Solved:** Manual data entry for a 100-day semester is error-prone and tedious.
* **The Architecture:**
  1. **100 Curated Words:** Structured across Level 1 (Foundational), Level 2 (Intermediate), and Level 3 (Advanced Corporate).
  2. **16 Rich Pedagogical Fields per Word:**
     * Phonetics (`ipa_pronunciation`, `word_type`)
     * Meaning & Context (`meaning`, `synonyms`, `antonyms`, `word_family`, `common_collocations`)
     * 3-Tier Examples (`business_example`, `daily_life_example`, `interview_example`)
     * Cognitive Retention (`memory_tip`, `common_mistakes`, `related_concepts`)
     * Execution (`reflection_question`, `communication_challenge`)
  3. **1-Click AI Bulk Seeder:** Admin can click **"🚀 AI Bulk Seed 100 Words"** in `/admin/words` to populate or update the entire database.

---

### C. Unified Live Review Queue & Anti-Copying Tracker

* **The Problem Solved:** Having multiple fragmented tables for reviews and quarantines caused administrative confusion.
* **The Architecture:**
  1. **Top Metric Cards:**
     * **`100` Total Vault Words:** Active curriculum pool in the database.
     * **`5` Active Missions in Queue:** Daily rituals submitted awaiting peer/buddy feedback.
     * **`15` Completed Daily Missions:** Total rituals completed across student histories.
  2. **Unified Single-Table Ledger:**
     * **Student (Speaker):** Who recorded the video.
     * **Pod / Word:** Pod name and today's vocabulary word.
     * **Buddy Reviewer:** Internal pod partner status (`🟢 Done` / `🟡 Pending`).
     * **Peer Reviewer:** External cross-pod reviewer status (`🟢 Done` / `🟡 Pending`).
     * **🛡️ 7-Day Anti-Echo Hold:** Displays the exact quarantine hold date (e.g. *🔒 "Scrutinize" frozen until Aug 31, 2026*).
     * **Submitted:** Exact timestamp.

---

### D. In-Pod Same-Day Word Diversity & Student Dashboard Sync

* **The Problem Solved:** If two students in the same Pod receive the same word on the same day, they cannot meaningfully review each other without spoiling the learning experience.
* **The 3-Filter Allocation Engine:**
  1. **Filter 1 (100-Day History):** Excludes words the student previously learned.
  2. **Filter 2 (7-Day Reviewer Quarantine):** Excludes words the student watched/reviewed in peer videos in the last 7 days.
  3. **Filter 3 (In-Pod Collision Prevention):** Excludes words assigned to any pod-mate on the same day.
* **Dashboard Synchronization:** `/vault/dashboard` calls `assignDailyWordForStudent`, ensuring the preview card on the Home Dashboard matches `/vault/learn` for each individual student.

---

### E. Pod Leader 16-Minute Video Studio & Mentor Grading

* **The Problem Solved:** Having 8 students upload 8 separate video clips created chaotic grading overhead for mentors.
* **The Solution:**
  1. **Pod Structure:** 8 students per Pod (4 Buddy Pairs).
  2. **Pod Leader Role:** The designated leader (e.g. Rahul in Pod Beta) compiles and uploads the official **16-minute unified presentation** (2 mins per member).
  3. **Team Collaboration View:** Non-leader members see their leader's name, presentation instructions, and a live preview of the submitted team video.
  4. **Mentor Grading Interface (`/mentor/evaluations`):** Mentors watch the single 16-minute video, grade the team on a 1–10 scale, provide qualitative remarks, and award points to all 8 members simultaneously.

---

# 🔑 3. Test Credentials Matrix

Universal password for all test accounts: **`password123`**

| Role | Account Email | Pod Assignment | Specific Role |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@skyld.com` | Global System | Oversees Vault, Deadlines & Roster |
| **Master Mentor** | `mentor1@skyld.com` | Pod Beta & Pod A | Evaluates 16-Min Championship Videos |
| **Student 1 (Pod Leader)** | `rahul@skyld.com` | **Pod Beta** | 👑 Designated Leader (Uploads Round 2 Video) |
| **Student 2 (Pod Member)** | `priya@skyld.com` | **Pod Beta** | 👥 Pod Member (Rahul's Buddy) |
| **Student 3 (Pod Member)** | `nikhil@skyld.com` | **Pod Beta** | 👥 Pod Member |
| **Student 4 (Pod Member)** | `suresh@skyld.com` | **Pod Beta** | 👥 Pod Member |
| **Student 5 (Pod Leader)** | `ananya@skyld.com` | **Pod A** | 👑 Designated Leader (Pod A) |
| **Student 6 (Pod Member)** | `srikar@skyld.com` | **Pod A** | 👥 Pod Member (Ananya's Buddy) |

---

# 🧭 4. Step-by-Step Guided Testing Tour

Follow this quick walkthrough to test all features:

### Step 1: Verify System Admin Dashboard
1. Log in as `admin@skyld.com` / `password123`.
2. Go to `/admin/dashboard`:
   * Verify top metrics: **`100` Total Vault Words**, **`5` Active Missions**, **`15` Completed Missions**.
   * Inspect the **Live Review Queue & Anti-Copying Tracker** table $\rightarrow$ notice the `🛡️ 7-Day Anti-Echo Hold` dates (e.g. *Holds until Aug 31, 2026*).
3. Click the **Curriculum** tab $\rightarrow$ scroll through all 100 enterprise corporate words.
4. Click the **Championships** tab $\rightarrow$ set a new Weekly Challenge Topic and choose a Submission Deadline.

---

### Step 2: Test Student Word Diversity & Dashboard Sync
1. Log in as **Rahul** (`rahul@skyld.com` / `password123`):
   * Open **Dashboard** (`/vault/dashboard`) $\rightarrow$ See his personalized word: **`Stalemate`**.
   * Click **Start Daily Mission** (`/vault/learn`) $\rightarrow$ Matches **`Stalemate`**.
2. Log in as **Priya** (`priya@skyld.com` / `password123`):
   * Open **Dashboard** (`/vault/dashboard`) $\rightarrow$ See her distinct word: **`Delineate`** (Different word in the same Pod!).
3. Log in as **Ananya** (`ananya@skyld.com` / `password123`):
   * Open **Dashboard** (`/vault/dashboard`) $\rightarrow$ See her distinct word: **`Keen`**.

---

### Step 3: Test Pod Leader vs. Member in Championship Round 2
1. Log in as **Rahul (👑 Pod Leader)**:
   * Go to **Championships $\rightarrow$ Round 2** (`/vault/championship/round2`).
   * Verify the **Pod Leader Uploader** is enabled with the active deadline badge.
   * Drag-and-drop an MP4 video file $\rightarrow$ see instant upload progress and playable video preview.
2. Log in as **Priya (Pod Member)**:
   * Go to **Championships $\rightarrow$ Round 2** (`/vault/championship/round2`).
   * Verify the **Team Collaboration Mode** is active, displaying *"👑 Pod Leader: Rahul"* and instructions.

---

### Step 4: Test Mentor 16-Minute Video Evaluation
1. Log in as **Dr. Sri Ram (Master Mentor)** (`mentor1@skyld.com` / `password123`).
2. Go to **Master Evaluations** (`/mentor/evaluations`).
3. View the assigned Pod cards (Pod Beta, Pod A).
4. Click **Start Evaluation** on Pod Beta:
   * Play the uploaded 16-minute video.
   * Select a rubric score (e.g., 9/10).
   * Enter mentor qualitative feedback and click **Submit Score**.
   * Pod standings and points update across the entire batch!

---

# 🎤 5. Executive Jury Presentation & Demo Pitch Guide

When presenting to evaluators or company leadership, use this 3-act narrative:

### 🎬 Act 1: The Problem in Corporate Learning
> *"Traditional corporate vocabulary and communication training fails because of two problems: **isolation** (students memorize words without speaking) and **the echo chamber** (students copy words from peers without deep synthesis)."*

### 🎬 Act 2: The SKYLD Solution
> *"SKYLD LDOS introduces the **Pod & Peer Operating System**:*
> * *1. **The 3-Filter Anti-Copying Engine:** Enforces a 100-day unique history, an automated 7-day freeze on words seen in peer videos, and prevents pod-mate collisions.*
> * *2. **Dual-Review Feedback Loop:** Daily accountability with an internal Pod Buddy, and objective corporate grading with an external Cross-Pod Peer.*
> * *3. **100-Word Enterprise Semester Vault:** 100 corporate vocabulary words equipped with 16 pedagogical dimensions.*
> * *4. **The 16-Minute Pod Championship:** Pod Leaders synthesize collective team presentations for master mentor evaluations."*

### 🎬 Act 3: Live System Demonstration
1. **Show Admin Intelligence:** Open `/admin/dashboard` $\rightarrow$ Show the **Live Review Queue & Anti-Copying Tracker** with live 7-day hold dates.
2. **Show Student Personalization:** Log in as Rahul $\rightarrow$ show his unique word (`Stalemate`); log in as Priya $\rightarrow$ show her unique word (`Delineate`).
3. **Show Championship Round 2 & Mentor Review:** Demonstrate Rahul uploading the Pod video, followed by Mentor Dr. Sri Ram grading the team video live in `/mentor/evaluations`.

---
*SKYLD LDOS — Built with Next.js, Supabase, TailwindCSS, and Enterprise Pedagogical Engineering.*
