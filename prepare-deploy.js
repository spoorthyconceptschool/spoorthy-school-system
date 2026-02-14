const fs = require('fs');
const path = require('path');

const srcStatic = path.join(__dirname, '.next', 'static');
const destStatic = path.join(__dirname, '.next', 'standalone', '.next', 'static');
const srcPublic = path.join(__dirname, 'public');
const destPublic = path.join(__dirname, '.next', 'standalone', 'public');

// Function to copy directory recursively
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log("Preparing deployment package...");

// 1. Copy .next/static -> .next/standalone/.next/static
if (fs.existsSync(srcStatic)) {
    console.log("Copying static assets...");
    copyDir(srcStatic, destStatic);
} else {
    console.warn("Warning: .next/static not found. Build might have failed.");
}

// 2. Copy public -> .next/standalone/public
if (fs.existsSync(srcPublic)) {
    console.log("Copying public assets...");
    copyDir(srcPublic, destPublic);
} else {
    console.warn("Warning: public folder not found.");
}

console.log("Deployment package ready in .next/standalone");
console.log("Upload everything inside .next/standalone to your Hostinger server.");
