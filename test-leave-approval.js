// Test script to verify leave approval API
const testLeaveApproval = async () => {
    try {
        // You'll need to replace this with a real token from your browser
        const token = "YOUR_TOKEN_HERE";
        const leaveId = "YOUR_LEAVE_ID_HERE";

        const response = await fetch("http://localhost:3001/api/admin/leaves/approve", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                leaveId: leaveId,
                action: "APPROVE"
            })
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", data);
    } catch (error) {
        console.error("Error:", error);
    }
};

// Instructions:
// 1. Open browser console on http://localhost:3001/admin/leaves
// 2. Copy this entire script
// 3. Get your token by typing: await firebase.auth().currentUser.getIdToken()
// 4. Get a leave ID from the page (inspect the button's onclick handler)
// 5. Replace YOUR_TOKEN_HERE and YOUR_LEAVE_ID_HERE above
// 6. Paste and run this script in the console
