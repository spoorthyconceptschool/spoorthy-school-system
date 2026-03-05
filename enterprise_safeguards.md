# Enterprise School Safeguards (ESS)

This document outlines the critical safeguards implemented in the Spoorthy School System to prevent data corruption, accidental deletion, and system regressions. 

## 1. Data Protection Rules
- **Master Data Immunity**: Foundational records (Classes, Villages, Subjects, Sections, Roles) must NEVER be deleted by automated purge scripts or "factory resets." They can only be managed manually via the Master Data interface.
- **Cascading Deletion**: Deletion of a critical entity (like a Teacher or Student) must be a "Hard Delete" that cleans up:
    - Firebase Auth User
    - Search Index
    - Linked RTDB Assignments (e.g., Class Teacher ID)
    - Firestore Profile

## 2. Safe Purge Protocol
The `purge-data` API uses the `SYSTEM_STAY_ALIVE_COLLECTIONS` list to filter out structural data. 
> [!IMPORTANT]
> When adding new collections to the database, always ask: **Is this operational data (fees) or structural data (settings)?**
> - If structural, add it to the `SYSTEM_STAY_ALIVE_COLLECTIONS` array in `src/app/api/admin/purge-data/route.ts`.

## 3. ID Generation Integrity
- All sequence counters are stored in the `counters` collection.
- During a "Full System Purge," counters are reset to `0`, ensuring new IDs start from the beginning (e.g., `SHS0001`).
- Never delete the `counters` collection; only reset the `current` field.

## 4. Verification Workflow
Before deploying major updates, run the database integrity script:
```bash
# Example (if implemented)
npm run validate:integrity
```

## 5. Master Data Dependencies
The following features depend on the existence of specific Master Data. Deleting these manually will break the system:
- **Student Admission**: Depends on `master_villages`, `classes`, and `sections`.
- **Teacher Assignment**: Depends on `classes`, `sections`, and `subjects`.
- **Attendance**: Depends on `class_sections`.
