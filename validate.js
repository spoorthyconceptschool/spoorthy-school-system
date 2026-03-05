require('ts-node').register();
const { CreateStudentSchema } = require('./src/lib/enterprise/schemas.ts');

const payload = {
    studentName: "RAJESH",
    parentName: "RAJESH",
    parentMobile: "9398699430",
    villageId: "test",
    villageName: "KNG",
    classId: "test",
    className: "A",
    sectionId: "test",
    sectionName: "1",
    dateOfBirth: "",
    gender: "select",
    transportRequired: false,
    academicYear: "2025-2026"
};

const result = CreateStudentSchema.safeParse(payload);
if (!result.success) {
    console.log("Validation Failed:");
    console.dir(result.error.issues, { depth: null });
} else {
    console.log("Validation Success!");
}
