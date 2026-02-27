import { z } from 'zod';

/**
 * Enterprise Schema Definitions
 * Strict shapes and types defining the core domain models. 
 * Use these across the API to reject malformed requests instantly.
 */

// 1. Core Common Tyopes
const AppStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED", "SUSPENDED"]);
const MoneySchema = z.number().int().min(0).describe("Store money as integers (cents/paise) to prevent floating point errors");

// 2. Student Schemas
export const CreateStudentSchema = z.object({
    studentName: z.string().min(2, "Name must be at least 2 characters").max(100),
    parentName: z.string().max(100).optional(),
    parentMobile: z.string().regex(/^\d{10}$/, "Must be strictly 10 digits"),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").or(z.literal("")).optional(),
    gender: z.enum(["male", "female", "other", "select"]).optional(),
    villageId: z.string().min(1),
    villageName: z.string().optional(),
    classId: z.string().min(1),
    className: z.string().optional(),
    sectionId: z.string().min(1),
    sectionName: z.string().optional(),
    transportRequired: z.boolean().optional(),
    academicYear: z.string().min(4),
    admissionNumber: z.string().optional(),
    address: z.string().max(500).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional()
});

export type CreateStudentPayload = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = CreateStudentSchema.partial().extend({
    status: AppStatusSchema.optional(),
    versionContentHash: z.string().optional().describe("For optimistic concurrency control")
});

export type UpdateStudentPayload = z.infer<typeof UpdateStudentSchema>;

// 3. Attendance Schemas
export const MarkDailyAttendanceSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    classId: z.string().min(1),
    sectionId: z.string().min(1),
    records: z.record(z.string(), z.enum(['P', 'A'])), // Map of studentId -> 'P' | 'A'
});

export type MarkDailyAttendancePayload = z.infer<typeof MarkDailyAttendanceSchema>;

// 4. Ledger & Finance Schemas
export const FeeLedgerEntrySchema = z.object({
    studentId: z.string().min(1),
    type: z.enum(['CREDIT', 'DEBIT']), // Debit = Fee Charged, Credit = Payment Received
    amount: MoneySchema,
    feeCategoryId: z.string().uuid("Ensures ledger maps strictly to accounting codes"),
    description: z.string().min(5).max(255),
    referenceId: z.string().optional().describe("E.g., external razorpay transaction id or manual receipt num")
});

export type FeeLedgerEntryPayload = z.infer<typeof FeeLedgerEntrySchema>;

// 5. Shared Validation Middlewares
/**
 * Validator helper to safely parse API bodies and throw standard Enterprise error responses.
 */
export function validateEnterpriseSchema<T>(schema: z.ZodSchema<T>, data: any): { success: boolean, data?: T, errors?: string[] } {
    const result = schema.safeParse(data);
    if (!result.success) {
        return {
            success: false,
            errors: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        };
    }
    return { success: true, data: result.data };
}
