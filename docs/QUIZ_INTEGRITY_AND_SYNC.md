# Quiz Data Integrity & Smart Sync Architecture

## 1. Overview
This document details the comprehensive overhaul of the quiz data system performed in February 2026. The goal was to resolve persistent data mismatches ("Ghost Documents"), fix localization issues (Browser Auto-Translate), and implement a high-performance, real-time synchronization strategy between the Admin tool and Student clients.

---

## 2. Root Cause Analysis
We identified three critical issues causing the "Data Mismatch":

### A. Ghost Documents (Legacy Data)
- **Issue**: Old, malformed documents from previous development phases remained in Firestore.
- **Symptom**: Students would see "Question 1" from a deprecated chapter instead of the new curriculum, or see images mismatched with text.
- **Solution**: Performed a **Total Purge** (delete all 2600+ docs) and **Reseed** from the local SSOT (Single Source of Truth) data files.

### B. Browser Auto-Translation
- **Issue**: Google Chrome's auto-translate feature was corrupting data on the client side.
- **Symptom**: "a" became "에이", "b" became "비", and math symbols were mangled.
- **Solution**: Added `<html lang="ko" class="notranslate">` to `index.html`.

### C. Stale Cache (The "Invisible" Wall)
- **Issue**: Even after fixing the DB, students saw old data because their browsers aggressively cached the Firestore results.
- **Symptom**: Admin updates were not reflected unless the student performed a "Hard Refresh".
- **Solution**: Implemented **Smart Versioned Sync**.

---

## 3. Smart Sync Architecture (New Caching Policy)

We moved from a naive "Cache Forever" or "No Cache" approach to a **Hybrid Real-time Invalidation** strategy.

### Core Concept
> **"Heavy Data is Cached, Lightweight Metadata is Watched."**

### Implementation Details

#### 1. Admin Signal (The Trigger)
When a teacher saves a quiz in the Admin Tool:
1. The Quiz document is updated.
2. **Crucially**, the parent **Unit** document's `lastUpdated` timestamp is bumped to `serverTimestamp()`.

#### 2. Student Client (The Watchdog)
- **`useQuizzes` Hook**: 
  - `staleTime`: **30 Minutes** (Very aggressive caching for speed).
  - `gcTime`: **60 Minutes**.
- **`useSmartSync` Hook**:
  - Uses Firestore `onSnapshot` to listen *only* to the **Unit** document.
  - **Logic**: If `unit.lastUpdated` changes, it immediately calls `queryClient.invalidateQueries(['quizzes', unitId])`.

### Benefits
| Feature | Old System | New Smart Sync |
| :--- | :--- | :--- |
| **Loading Speed** | Fast (if cached) | **Instant** (Local Cache) |
| **Update Latency** | Hours/Days (until refresh) | **< 1 Second** (Real-time) |
| **Network Cost** | High (if no cache) | **Minimal** (Metadata only) |

---

## 4. History Scrubbing (Data Repair)
We also cleaned up the *User History* collection, which had become polluted with test data.

- **Target**: Strings like "비를 분해하는 방법", "No stroke found", "범죄자".
- **Action**: A specialized script scanned all user histories and corrected these titles to match the current curriculum (e.g., "3. 비를 읽는 여러가지 방법").
- **Prevention**: The new `QuizEditor` ensures only valid titles are saved.

---

## 5. Maintenance Guide

### How to Force a Global Refresh?
If you need to force *every* student to re-download *everything* (e.g., after a major curriculum change:
1. Go to Admin Console.
2. Update the `lastUpdated` field of the target **Units** (or all units).
3. The `useSmartSync` hook on every client will catch this and re-fetch the data automatically.

### Debugging Mismatches
If a student still reports seeing "Old Data":
1. Check the **Unit ID** in the Admin Tool.
2. Verify the `lastUpdated` timestamp in Firestore for that Unit.
3. If the timestamp is old, simply "Edit & Save" any quiz in that unit to bump the version.
