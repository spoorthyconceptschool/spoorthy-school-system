import { collection, doc, setDoc, query, where, getDocs, limit, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// === INDEXING UTILS ===

// Generate simple prefix/token buckets for robust search
export function generateKeywords(text: string): string[] {
    if (!text) return [];

    const set = new Set<string>();
    const normalized = text.toLowerCase().trim();

    // 1. Full matches
    set.add(normalized);

    // 2. Tokenize by space
    const tokens = normalized.split(/\s+/);
    tokens.forEach(t => set.add(t));

    // 3. Generate Prefixes (min 2 chars) for each token
    // e.g. "Arjun" -> "ar", "arj", "arju", "arjun"
    tokens.forEach(token => {
        for (let i = 2; i <= token.length; i++) {
            set.add(token.substring(0, i));
        }
    });

    return Array.from(set);
}

// === INDEXING ACTIONS ===

export type SearchEntityType = "student" | "payment" | "teacher" | "notice" | "other" | "action";

export interface SearchIndexItem {
    id: string; // The ID of the search index doc (usually same as entity ID)
    entityId: string; // Ref to actual doc
    type: SearchEntityType;
    title: string;
    subtitle: string;
    url: string;
    keywords: string[];
    metadata?: any; // Extra fields like status, amount, etc.
}

// === STATIC FEATURES / INTENTS ===


// === STATIC FEATURES / INTENTS ===

const STATIC_FEATURES: SearchIndexItem[] = [
    // Dashboard & Overview
    { id: "nav-dashboard", entityId: "nav-dashboard", type: "action", title: "Admin Dashboard", subtitle: "Go to Home / Overview", url: "/admin", keywords: ["home", "main", "dashboard", "admin", "stats", "overview"] },

    // Student Management
    { id: "nav-students", entityId: "nav-students", type: "action", title: "Student Directory", subtitle: "Manage Students / Admissions", url: "/admin/students", keywords: ["student", "students", "admission", "enroll", "enrollment", "list", "directory", "register", "profile"] },
    { id: "nav-students-add", entityId: "nav-students-add", type: "action", title: "Add New Student", subtitle: "Open Admission Form", url: "/admin/students?action=add", keywords: ["add student", "new admission", "register student", "create student"] },
    { id: "nav-students-import", entityId: "nav-students-import", type: "action", title: "Import Students", subtitle: "Bulk Upload via CSV", url: "/admin/students?action=import", keywords: ["import", "bulk", "upload", "csv", "excel", "migrate"] },

    // Staff Members
    { id: "nav-teachers", entityId: "nav-teachers", type: "action", title: "Faculty Registry", subtitle: "Manage Teachers & Staff", url: "/admin/teachers", keywords: ["teacher", "teachers", "staff", "faculty", "employees", "educators", "mentors"] },
    { id: "nav-staff", entityId: "nav-staff", type: "action", title: "Support Staff", subtitle: "Manage Non-Teaching Staff", url: "/admin/staff", keywords: ["staff", "helper", "driver", "cleaner", "security", "admin staff"] },
    { id: "nav-payroll", entityId: "nav-payroll", type: "action", title: "Payroll & Salary", subtitle: "Process Staff Salaries", url: "/admin/salary", keywords: ["salary", "payroll", "pay", "wages", "payslip", "payment", "bank", "account", "ctc"] },
    { id: "nav-leaves", entityId: "nav-leaves", type: "action", title: "Leave Management", subtitle: "Approve/Reject Requests", url: "/admin/leaves", keywords: ["leave", "request", "approve", "reject", "permission", "vacation", "sick", "casual", "application"] },

    // Fee Management
    { id: "nav-fees", entityId: "nav-fees", type: "action", title: "Fee Management", subtitle: "Fee Dashboard & Collection", url: "/admin/fees", keywords: ["fees", "fee", "payment", "collection", "finance", "accounts", "revenue"] },
    { id: "nav-fees-structures", entityId: "nav-fees-structures", type: "action", title: "Fee Structures", subtitle: "Configure Class Fees", url: "/admin/fees/structures", keywords: ["structure", "fee set", "tuition", "term", "setup fees", "amount"] },
    { id: "nav-fees-pending", entityId: "nav-fees-pending", type: "action", title: "Pending Dues Report", subtitle: "View Defaulters & Arrears", url: "/admin/fees/pending", keywords: ["pending", "due", "dues", "arrears", "defaulters", "unpaid", "balance", "outstanding", "remind"] },
    { id: "nav-fees-custom", entityId: "nav-fees-custom", type: "action", title: "Custom Fees (Transport)", subtitle: "Manage Village/Transport Fees", url: "/admin/fees/custom", keywords: ["custom", "transport", "bus", "van", "village", "route", "charges", "optional"] },

    // Academics
    { id: "nav-timetable", entityId: "nav-timetable", type: "action", title: "Class Timetables", subtitle: "Manage Schedules & Periods", url: "/admin/timetable", keywords: ["timetable", "schedule", "routine", "period", "class time", "subject plan"] },
    { id: "nav-exams", entityId: "nav-exams", type: "action", title: "Examination Control", subtitle: "Schedule Exams & Marks", url: "/admin/exams", keywords: ["exam", "test", "mark", "grade", "result", "schedule", "date sheet", "hall ticket"] },
    { id: "nav-homework", entityId: "nav-homework", type: "action", title: "Homework & Diary", subtitle: "Assign & Review Tasks", url: "/admin/homework", keywords: ["homework", "diary", "assignment", "work", "task", "project"] },
    { id: "nav-attendance", entityId: "nav-attendance", type: "action", title: "Attendance Tracker", subtitle: "Student & Staff Attendance", url: "/admin/attendance", keywords: ["attendance", "present", "absent", "roll call", "register", "daily"] },

    // Master Data / Config
    { id: "nav-master", entityId: "nav-master", type: "action", title: "Master Data Center", subtitle: "Configure Classes, Subjects & Villages", url: "/admin/master-data", keywords: ["master", "data", "config", "setup", "classes", "subjects", "villages", "sections", "curriculum", "transport"] },

    // Website CMS
    { id: "nav-cms", entityId: "nav-cms", type: "action", title: "Website Manager", subtitle: "Edit School Website", url: "/admin/cms", keywords: ["cms", "website", "content", "news", "event", "gallery", "photo", "banner", "public"] },

    // Settings
    { id: "nav-settings", entityId: "nav-settings", type: "action", title: "Settings", subtitle: "Profile & System", url: "/admin/settings", keywords: ["setting", "password", "profile", "account", "security", "logout", "change"] },
];

function searchStaticFeatures(queryText: string): SearchIndexItem[] {
    const q = queryText.toLowerCase().trim();
    if (q.length < 2) return [];

    const results: SearchIndexItem[] = [];
    const queryTokens = q.split(/\s+/).filter(t => t.length > 1); // Split into words: "add", "student"

    // 1. Keyword Matching with Scoring
    STATIC_FEATURES.forEach(feature => {
        let score = 0;

        // Exact Phrase Match (Highest Priority)
        feature.keywords.forEach(k => {
            if (k === q) score += 100;
            else if (k.includes(q)) score += 50; // Keyword contains query ("student" contains "stu")
            else if (q.includes(k)) score += 40; // Query contains keyword ("add student" contains "student")
        });

        // Token Matching (handle "add student", "pending fees")
        // If ALL query tokens are found in feature keywords or title, it's a strong match
        let matchedTokens = 0;
        queryTokens.forEach(token => {
            const hit = feature.keywords.some(k => k.includes(token)) ||
                feature.title.toLowerCase().includes(token) ||
                feature.subtitle.toLowerCase().includes(token);
            if (hit) matchedTokens++;
        });

        if (matchedTokens === queryTokens.length) {
            score += 30;
        } else if (matchedTokens > 0) {
            score += 10 * matchedTokens;
        }

        if (score > 15) { // Threshold
            results.push({ ...feature, metadata: { score } });
        }
    });

    // Sort by score
    results.sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0));

    // 2. Dynamic Intents (Regex)

    // Class-specific Timetable: "class 10 timetable", "timetable for class 5"
    const classMatch = q.match(/class\s+(\d+|[a-zA-Z]+)/i);
    const intentTimetable = ["time", "schedule", "routine", "period"].some(k => q.includes(k));
    const intentStudents = ["student", "list", "directory", "children"].some(k => q.includes(k));
    const intentExams = ["exam", "test", "mark", "result"].some(k => q.includes(k));
    const intentFees = ["fee", "due", "pending", "paid"].some(k => q.includes(k));

    if (classMatch) {
        const className = classMatch[1];

        if (intentTimetable) {
            results.unshift({
                id: `intent-timetable-${className}`,
                entityId: `intent-timetable-${className}`,
                type: "action",
                title: `Timetable: Class ${className}`,
                subtitle: `View schedule for Class ${className}`,
                url: `/admin/timetable?class=${className}`,
                keywords: ["timetable", "class", className]
            });
        }

        if (intentStudents) {
            results.unshift({
                id: `intent-students-${className}`,
                entityId: `intent-students-${className}`,
                type: "action",
                title: `Student List: Class ${className}`,
                subtitle: `View students in Class ${className}`,
                url: `/admin/students?class=${className}`,
                keywords: ["students", "class", className]
            });
        }

        if (intentExams) {
            results.unshift({
                id: `intent-exams-${className}`,
                entityId: `intent-exams-${className}`,
                type: "action",
                title: `Exams: Class ${className}`,
                subtitle: `View exam schedule/marks for Class ${className}`,
                url: `/admin/exams?class=${className}`,
                keywords: ["exam", "class", className]
            });
        }

        if (intentFees) {
            results.unshift({
                id: `intent-fees-${className}`,
                entityId: `intent-fees-${className}`,
                type: "action",
                title: `Fee Status: Class ${className}`,
                subtitle: `View fee reports for Class ${className}`,
                url: `/admin/fees?class=${className}`, // Assuming fees page supports ?class= filter
                keywords: ["fee", "class", className]
            });
        }
    }

    return results.slice(0, 5); // Return top 5 static matches
}

// === SEARCH ACTIONS ===

/**
 * Global Typeahead Search
 * Queries the 'search_index' collection using 'array-contains'.
 */
export async function searchGlobal(searchTerm: string, limitCount = 5): Promise<SearchIndexItem[]> {
    if (!searchTerm || searchTerm.length < 2) return [];

    const normalizedQuery = searchTerm.toLowerCase().trim();
    const finalResults: SearchIndexItem[] = [];

    // 1. Get Static Features (Instant)
    const staticHits = searchStaticFeatures(normalizedQuery);
    finalResults.push(...staticHits);

    // 2. Get Firestore Data (Async)
    try {
        const q = query(
            collection(db, "search_index"),
            where("keywords", "array-contains", normalizedQuery),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        const dbHits = snapshot.docs.map(doc => doc.data() as SearchIndexItem);

        finalResults.push(...dbHits);

    } catch (error) {
        console.error("Global search failed:", error);
    }

    return finalResults;
}
