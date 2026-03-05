import { EnterpriseStudentService } from "./src/lib/services/enterprise/student-service";
import { CreateStudentPayload } from "./src/lib/enterprise/schemas";

async function reproduce() {
    const testPayload: CreateStudentPayload = {
        studentName: "Test Student " + Date.now(),
        parentName: "Test Parent",
        parentMobile: "9876543210",
        villageId: "test_village",
        classId: "test_class",
        sectionId: "test_section",
        academicYear: "2026-2027",
        dateOfBirth: "2015-01-01",
        gender: "male",
        transportRequired: false
    };

    console.log("Attempting to create student...");
    try {
        const result = await EnterpriseStudentService.createStudent(testPayload, "ADMIN_UID");
        console.log("Success:", JSON.stringify(result));
    } catch (e: any) {
        console.error("REPRODUCTION_FAILED:", e.stack);
        process.exit(1);
    }
}

reproduce();
