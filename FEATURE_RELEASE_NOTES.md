# 🚀 SKYLD LDOS Feature Upgrades & Testing Guide

This document provides a comprehensive overview of all 4 major platform architectural upgrades, workflow diagrams, and exact navigation paths for testing.

---

## 📌 Executive Summary of Upgrades

1. **Streamlined Weekly Challenges & Pod Leader Upload (Upgrade 1 - Option 1):**
   - **Pod Structure:** 8 Members per Pod ($4 \text{ Buddy Pairs} \times 2 = 8$).
   - **Leadership Assignment:** The Admin can designate an official **Pod Leader** per Pod in `/admin/roster`.
   - **Single Point of Upload:** Only the designated Pod Leader can compile and upload the official **16-minute team video presentation**.
   - **Team Collaboration View:** Regular pod members see who their Pod Leader is, instructions to record their 2-minute sections, and a live preview of the final submitted team presentation.
   - **Mentor Consolidated Grading:** Mentors evaluate **1 unified video card per Pod** (rather than 8 fragmented submissions) with one team score awarded to all 8 members simultaneously.

2. **The Cross-Pod Peer Review Pivot (Upgrade 2):**
   - **Buddy Review (Internal to Pod):** Done by your daily study partner for accountability, growth, and peer coaching.
   - **Peer Review (External across Pods):** Algorithmically assigned to a student in a **different Pod** to eliminate grade inflation and simulate corporate interview feedback.
   - **Differentiated Review UI:** Distinct coaching form for Buddies vs. professional benchmark rubric (1–10 ⭐) for Cross-Pod Peers.

3. **The Reviewer Quarantine & AI Word Allocation Engine (Upgrade 3):**
   - **100-Day Lifetime Check:** A student is **never** assigned a word they have already learned in their personal history.
   - **7-Day Reviewer Quarantine:** Any word a student reviewed in someone else's video (as a **Buddy** or **Cross-Pod Peer**) in the last 7 days is **frozen/quarantined** for that student to eliminate memory copy-pasting and echo-chamber regurgitation.
   - **Same-Pod Daily Collision Prevention:** No two students in the same Pod receive the identical word on the same day.
   - **Automated Midnight Cron + Instant Fallback:** Words are assigned automatically every night via `/api/cron/daily-assignment`, with instant fallback when students open `/vault/learn`.
   - **Admin Live Quarantine Visualizer:** View active reviewer quarantines, vault candidate pool, and expiration dates on `/admin/dashboard`.

4. **The 16-Field Mastered Word Vault Library (Upgrade 4):**
   - **Automatic Permanent Archival:** Whenever a student completes their 10-step daily ritual, the word is immediately and permanently archived into their personal `/vault/library` with a 🟢 **`MASTERED`** badge.
   - **Interactive 16-Field Deep Dive Modal:** Clicking any word opens the full **16-Field Word Card** with IPA pronunciation, business/interview examples, collocations, common mistakes, and memory hooks.
   - **Dual-Tab Exploration:** 
     - ⭐ **My Mastered Words:** Personal vocabulary trophy case and review repository.
     - 🌐 **Global Vault:** Complete directory of published corporate vocabulary for review practice and 16-minute championship storytelling.
   - **Instant Search:** Search in real time across word names, meanings, and real-world business contexts.

---

## 🔑 Test Credentials Matrix

Universal password for all test accounts: **`password123`**

| Role | Account Email | Pod Assignment | Role in Pod |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@skyld.com` | Global Admin | System Administrator |
| **Mentor** | `mentor1@skyld.com` | Assigned to Pod Beta & Unit 1 | Pod Mentor & Master Evaluator |
| **Student A (Pod Leader)** | `rahul@skyld.com` | **Pod Beta** | 👑 Designated Pod Leader |
| **Student B (Pod Member)** | `priya@skyld.com` | **Pod Beta** | 👥 Pod Member (Rahul's Buddy) |
| **Student C (Cross-Pod Peer)** | `ananya@skyld.com` / `srikar@skyld.com` | **Pod A** | 🌐 External Cross-Pod Peer |

---

## 🧭 Step-by-Step Navigation & Testing Guide

### 1. Test Reviewer Quarantine & Live Admin Visualizer (Admin)
* **Login as:** `admin@skyld.com`
* **Navigation Path:** Sidebar $\rightarrow$ **Dashboard** (`/admin/dashboard`)
* **What to Test:**
  1. Scroll down to the **"Reviewer Quarantine & Anti-Copying Engine"** card.
  2. View live metrics:
     - **Word Vault Candidate Pool** (Total published words available).
     - **Active 7-Day Reviewer Quarantines** (Count of active holds).
     - **Learned Words in 100-Day Histories** (Permanent non-repeat archive).
  3. View the **Live Reviewer Freeze Ledger**:
     - See exact reviewer names (e.g. *Priya*), quarantined words (e.g. *Scrutinize*), review type (*BUDDY / PEER*), and the hold expiration date (e.g. *31/8/2026*).

---

### 2. Test Automated Word Allocation & Quarantine (Student)
* **Login as:** `priya@skyld.com` (or `rahul@skyld.com` / `ananya@skyld.com`)
* **Navigation Path:** Sidebar $\rightarrow$ **Word Vault $\rightarrow$ Learn** (`/vault/learn`)
* **What to Test:**
  1. Notice the page automatically runs the **3-Filter Allocation Engine**.
  2. Because Priya reviewed Rahul's "Scrutinize" video within the last 7 days, "Scrutinize" is **quarantined** for Priya.
  3. Priya is automatically assigned a fresh, non-quarantined, non-repeated word (e.g. *Ubiquitous* or *Candid*).

---

### 3. Test Mastered Word Vault Library & 16-Field Modal (Student / Reviewer)
* **Login as:** `priya@skyld.com` (or `rahul@skyld.com`)
* **Navigation Path:** Sidebar $\rightarrow$ **Word Vault $\rightarrow$ Library** (`/vault/library`)
* **What to Test:**
  1. **My Mastered Words Tab:** View all words completed or in-progress in daily rituals with 🟢 **MASTERED** or 🟡 **IN PROGRESS** badges.
  2. **Global Vault Tab:** Switch tabs to view the entire published corporate dictionary.
  3. **Interactive 16-Field Modal:** Click on any word card (e.g. *Scrutinize* or *Candid*). A full popup appears showing:
     - *IPA Phonetic Pronunciation*
     - *Business, Daily Life, and Placement Interview Examples*
     - *Word Family, Collocations, Synonyms & Antonyms*
     - *Common Mistakes to Avoid & Memory Tips*
     - *Reflection Questions & Communication Challenges*
  4. **Search Bar:** Type any keyword (e.g., "audit" or "candid") to filter words instantly by context.

---

### 4. Test Pod Leader Assignment (Admin)
* **Login as:** `admin@skyld.com`
* **Navigation Path:** Sidebar $\rightarrow$ **Roster & Hierarchy** (`/admin/roster`)
* **What to Test:**
  1. Locate the **"👑 Pod Leaders Management"** card.
  2. Notice **👑 Rahul** is designated as Leader for **Pod Beta**.
  3. You can change any pod's leader anytime from the dropdown.

---

### 5. Test Weekly Challenge Upload as Pod Leader (Rahul)
* **Login as:** `rahul@skyld.com`
* **Navigation Path:** Sidebar $\rightarrow$ **Championships** $\rightarrow$ **Round 2: Grand Pod Presentation** (`/vault/championship/round2`)
* **What to Test:**
  1. Notice the golden **`👑 Pod Leader Uploader`** badge.
  2. Rahul can record / upload the team's official **16-minute presentation** + notes for Master Judges.

---

### 6. Test Team Collaboration View as Pod Member (Priya)
* **Login as:** `priya@skyld.com`
* **Navigation Path:** Sidebar $\rightarrow$ **Championships** $\rightarrow$ **Round 2: Grand Pod Presentation** (`/vault/championship/round2`)
* **What to Test:**
  1. Notice Priya sees the **`Team Collaboration Mode`** card:
     - 👑 **Designated Pod Leader: Rahul**
     - Description: *"Each member of Pod Beta presents a 2-minute section ($8 \times 2\text{ mins} = 16\text{ mins}$). Your elected Pod Leader (Rahul) is authorized to compile and submit the official video."*
  2. Once Rahul uploads, Priya can watch the team video preview right on this page.

---

### 7. Test Consolidated Pod Evaluation (Mentor)
* **Login as:** `mentor1@skyld.com`
* **Navigation Path:** Sidebar $\rightarrow$ **Master Evaluations** (`/mentor/evaluations`)
* **What to Test:**
  1. Mentor sees **1 unified card per Pod** (`Pod Beta — 👑 Leader: Rahul`).
  2. Click **Start Evaluation** to watch the single 16-minute team video and submit 1 master score for all 8 members.

---

### 8. Test Cross-Pod Peer Review & Differentiated Forms
* **Navigation Path:** Sidebar $\rightarrow$ **Review Queue** (`/vault/review`)
* **What to Test:**
  1. **When reviewing a Study Buddy:** Renders **`🤝 In-Pod Buddy Review`** (Effort & Growth coaching form).
  2. **When reviewing a Cross-Pod Peer:** Renders **`🌐 Cross-Pod External Review`** (Corporate benchmark rubric 1–10).

---

## 🛠️ Code & Architecture Files Modified

* `src/lib/server/word_assignment.ts` — 3-Filter Quarantine & AI Allocation Engine (100-day history, 7-day reviewer quarantine, same-pod collision check).
* `src/app/api/cron/daily-assignment/route.ts` — Midnight automated cron worker for batch student word allocations.
* `src/app/actions/daily_ritual.ts` — Real-time on-demand quarantine allocation fallback (`getOrCreateTodayDailyRitual`).
* `src/app/vault/learn/page.tsx` — Student Daily Ritual connected to automated quarantine engine.
* `src/app/vault/library/page.tsx` — Mastered Word Vault Library connected to `daily_rituals` with interactive 16-field deep dive modal and dual-tab global exploration.
* `src/app/admin/dashboard/page.tsx` — Live Reviewer Quarantine & Allocation visualizer card.
* `src/types/admin.ts` & `src/app/actions/admin.ts` — Quarantine statistics API.
* `src/app/actions/admin_roster.ts` & `src/app/admin/roster/page.tsx` — Standalone Pod Leaders Management card.
* `src/app/actions/championships.ts` & `src/app/vault/championship/round2/page.tsx` — Pod Leader role gating for 16-minute weekly challenge.
* `src/app/mentor/evaluations/page.tsx` — Consolidated 1-card-per-pod evaluation interface.
* `src/app/vault/review/page.tsx` — Differentiated In-Pod Buddy vs. Cross-Pod Peer review styles.
* `vercel.json` — Midnight cron schedule registered.
