# 🚀 SKYLD LDOS Feature Upgrades & Testing Guide

This document provides an overview of the latest platform features, architecture changes, and exact navigation paths for testing.

---

## 📌 Executive Summary of Upgrades

1. **Streamlined Weekly Challenges & Pod Leader Upload (Upgrade 1 - Option 1):**
   - **Pod Structure:** 8 Members per Pod ($4 \text{ Buddy Pairs} \times 2 = 8$).
   - **Leadership Assignment:** The Admin can designate an official **Pod Leader** per Pod.
   - **Single Point of Upload:** Only the designated Pod Leader can compile and upload the official **16-minute team video presentation**.
   - **Team Collaboration View:** Regular pod members see who their Pod Leader is, instructions to record their 2-minute sections, and a live preview of the final submitted team presentation.
   - **Mentor Consolidated Grading:** Mentors evaluate **1 unified video card per Pod** (rather than 8 fragmented submissions) with one team score.

2. **The Cross-Pod Peer Review Pivot (Upgrade 2):**
   - **Buddy Review (Internal to Pod):** Done by your daily study buddy for accountability, growth, and peer coaching.
   - **Peer Review (External across Pods):** Algorithmically assigned to a student in a **different Pod** to eliminate grade inflation and simulate corporate interview feedback.
   - **Differentiated Review UI:** Distinct coaching form for Buddies vs. professional benchmark rubric for Cross-Pod Peers.

3. **Standalone Pod Leaders Management Card:**
   - A dedicated management card on `/admin/roster` allows the Admin to assign or change the Pod Leader for any Pod in real time.

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

### 1. Test Pod Leader Assignment (Admin)
* **Login as:** `admin@skyld.com`
* **Navigation Path:** Sidebar $\rightarrow$ **Roster & Hierarchy** (`/admin/roster`)
* **What to Test:**
  1. Scroll to the center card titled **"👑 Pod Leaders Management"**.
  2. Locate **Pod Beta** in the table.
  3. Verify **👑 Rahul** is selected as the Pod Leader.
  4. Try changing the leader to another member and notice the real-time update.

---

### 2. Test Weekly Challenge Upload as Pod Leader (Rahul)
* **Login as:** `rahul@skyld.com`
* **Navigation Path:** 
  * Option A: Sidebar $\rightarrow$ **Championships** $\rightarrow$ **Round 2: Grand Pod Presentation** (`/vault/championship/round2`)
  * Option B: Direct URL $\rightarrow$ `/vault/challenge`
* **What to Test:**
  1. Notice the golden **`👑 Pod Leader Uploader`** badge.
  2. Notice the message: *"As the designated Pod Leader for Pod Beta, you are authorized to compile and submit the official 16-minute video."*
  3. Rahul can use the active Video Recorder / Uploader, add submission notes, and click **Submit to Master Judges**.

---

### 3. Test Team Collaboration View as Pod Member (Priya)
* **Login as:** `priya@skyld.com`
* **Navigation Path:** 
  * Option A: Sidebar $\rightarrow$ **Championships** $\rightarrow$ **Round 2: Grand Pod Presentation** (`/vault/championship/round2`)
  * Option B: Direct URL $\rightarrow$ `/vault/challenge`
* **What to Test:**
  1. Notice that Priya does **NOT** get a redundant upload button.
  2. Instead, she sees the **`Team Collaboration Mode`** card:
     - 👑 **Designated Pod Leader: Rahul**
     - Description: *"Each member of Pod Beta presents a 2-minute section ($8 \times 2\text{ mins} = 16\text{ mins}$). Your elected Pod Leader (Rahul) is authorized to compile and submit the official video."*
  3. Once Rahul uploads, Priya can watch the team video preview right on this page.

---

### 4. Test Consolidated Pod Evaluation (Mentor)
* **Login as:** `mentor1@skyld.com`
* **Navigation Path:** Sidebar $\rightarrow$ **Master Evaluations** (`/mentor/evaluations`)
* **What to Test:**
  1. Mentor sees **1 unified card per Pod** (`Pod Beta — 👑 Leader: Rahul`).
  2. Click **Start Evaluation** to watch the single 16-minute team video.
  3. Score the Pod (0–10) and write coaching feedback for the team.
  4. On submit, all 8 pod members receive their score and points simultaneously.

---

### 5. Test Cross-Pod Peer Review & Differentiated Forms
* **Navigation Path:** Sidebar $\rightarrow$ **Review Queue** (`/vault/review`)
* **What to Test:**
  1. **When reviewing a Study Buddy:**
     - Header: **`🤝 In-Pod Buddy Review`**
     - Form: *"What did your buddy do well today?"* + *"One challenge for tomorrow's ritual"* + **Effort & Consistency Score (1–10)**.
  2. **When reviewing a Cross-Pod Peer:**
     - Header: **`🌐 Cross-Pod External Review`**
     - Form: *"Delivery & Vocabulary Strengths"* + *"Corporate Placement / Interview Polish Tip"* + **Professional Benchmark Score (1–10)**.

---

## 🛠️ Code & Architecture Files Modified

* `src/app/actions/admin_roster.ts` — Pod Leader assignment action (`assignPodLeader`).
* `src/app/actions/championships.ts` — Failsafe Pod Leader permission checks and consolidated Mentor evaluation data query.
* `src/app/actions/daily_ritual.ts` — Cross-Pod Peer Review assignment algorithm.
* `src/app/admin/roster/page.tsx` — Standalone Pod Leaders Management card & clean Organization Tree.
* `src/app/vault/challenge/page.tsx` — Dynamic Pod Leader vs. Pod Member role gating.
* `src/app/vault/championship/round2/page.tsx` — Dynamic Grand Pod Presentation 16-min submission view.
* `src/app/mentor/evaluations/page.tsx` — Consolidated 1-card-per-pod evaluation interface with Leader details.
* `src/app/vault/review/page.tsx` — Differentiated review styles (Buddy coaching vs. Cross-Pod external benchmark).
