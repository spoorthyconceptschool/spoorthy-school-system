
# Deploying to Hostinger (VPS or Node.js Hosting)

Since Hostinger supports Node.js applications, we have prepared a **standalone** build that contains everything needed to run your Next.js application without a complex build step on the server.

## Step 1: Prepare the Files

We have already run the build locally.

1.  Locate the folder: `.next/standalone` inside your project directory.
2.  (Optional) Zip the contents of `.next/standalone` for easier upload.

## Step 2: Upload Files

1.  Log in to your Hostinger Control Panel (hPanel).
2.  Go to **File Manager** or use **FTP/SFTP**.
3.  Navigate to your web root (usually `public_html` or a subfolder if using Node.js app manager).
4.  Upload all the files and folders from inside `.next/standalone`.
    *   This should include `server.js`, `.next`, `public`, `package.json`, etc.

## Step 3: Configure Environment Variables

1.  Create a `.env` file in the same directory where you uploaded the files.
2.  Copy the contents of your local `.env.local` into this file.
3.  Start your Node.js application.

## Step 4: Run the Application (VPS)

If you are on a VPS, SSH into your server:

```bash
cd /path/to/your/app
# Install production dependencies (if slightly different environment)
npm install --production

# Start the server using PM2 (recommended)
pm2 start server.js --name "spoorthy-school" --portfolio 3000
```

## Step 5: Configure Nginx / Apache (VPS)

You need to proxy requests from port 80/443 to the Node.js app running on port 3000.

**Nginx Example:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 4 (Alternative): Hostinger Node.js App Manager (Shared Hosting)

If you are using Hostinger's Node.js specific hosting (not VPS):

1.  Go to **Websites > Manage > Node.js**.
2.  **Create Application**:
    *   **Application Root**: The folder where you uploaded `.next/standalone`.
    *   **Application Startup File**: `server.js`.
    *   **Application Port**: Leave default or auto-assigned.
3.  Click **Create**.
4.  Once created, click **Enter to Application** (creates virtual environment) or install dependencies via the UI if prompted `npm install`.
5.  Click **Start App**.

## Troubleshooting

*   **Images Missing?** Ensure the `public` folder and `.next/static` folder were correctly copied. Our `prepare-deploy.js` script handles this, so uploading `.next/standalone` contents directly should work.
*   **500 Errors?** Check the application logs in Hostinger or run `node server.js` manually in SSH to see error output.
