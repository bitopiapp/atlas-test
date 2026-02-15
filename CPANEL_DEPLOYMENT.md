# cPanel Deployment Guide

## Prerequisites
- cPanel hosting account with Node.js support
- MongoDB Atlas account (already set up)
- Your project files

## Step-by-Step Deployment

### 1. Prepare Files for Upload
Before uploading, you need these files:
- `index.js`
- `package.json`
- `package-lock.json`
- `.env` (with your credentials)
- `models/` folder (user.js, teacher.js, course.js)

**DO NOT upload:**
- `node_modules/` folder (cPanel will install dependencies)
- `.gitignore`
- `CPANEL_DEPLOYMENT.md`

---

### 2. Upload Files to cPanel

**Option A: File Manager**
1. Log in to cPanel
2. Open **File Manager**
3. Navigate to your domain directory (usually `public_html` or `your-domain.com`)
4. Create a new folder for your app (e.g., `api` or `myapp`)
5. Upload all project files (except `node_modules`)

**Option B: FTP**
1. Use FileZilla or any FTP client
2. Connect using your cPanel FTP credentials
3. Upload all files to the desired directory

---

### 3. Set Up Node.js App in cPanel

1. Go to cPanel → **Setup Node.js App**
2. Click **Create Application**
3. Configure:
   - **Node.js version**: 18.x or higher
   - **Application mode**: Production
   - **Application root**: Path where you uploaded files (e.g., `api` or `myapp`)
   - **Application URL**: Your domain or subdomain (e.g., `api.yourdomain.com`)
   - **Application startup file**: `index.js`

4. Click **Create**

---

### 4. Configure Environment Variables

In the Node.js App settings:
1. Scroll to **Environment Variables** section
2. Add these variables:

| Variable | Value |
|----------|-------|
| `PORT` | (Leave empty - cPanel auto-assigns) |
| `NODE_ENV` | `production` |
| `MONGO_URI` | `mongodb+srv://ubiswas_db_user:pkjH1htJdIQ40cUA@cluster0.xzf4lqu.mongodb.net/yourdbname?retryWrites=true&w=majority` |

**IMPORTANT:** Add your database name after `.mongodb.net/` (e.g., `atlas_db`)

---

### 5. Install Dependencies

In cPanel Node.js App interface:
1. Look for **Run NPM Install** button
2. Click it to install dependencies
3. Wait for installation to complete

---

### 6. Start the Application

1. Click **Start** button in cPanel Node.js App interface
2. Wait for status to show "Running"
3. Note the assigned port (if shown)

---

### 7. Test Your API

Visit your domain:
- Health check: `https://yourdomain.com/api/`
- Get users: `https://yourdomain.com/api/users`
- Get teachers: `https://yourdomain.com/api/teachers`
- Get courses: `https://yourdomain.com/api/courses`

---

## Alternative: Using SSH (if available)

If your cPanel has SSH access:

```bash
# 1. SSH into your server
ssh username@yourdomain.com

# 2. Navigate to your app directory
cd public_html/api

# 3. Install dependencies
npm install --production

# 4. Start the app (cPanel handles this, or use PM2)
npm start
```

---

## MongoDB Atlas Configuration

Make sure your MongoDB Atlas is configured:
1. Go to MongoDB Atlas → **Network Access**
2. Add IP: `0.0.0.0/0` (allow all) OR your server's IP
3. Go to **Database Access** → Verify user credentials

---

## Troubleshooting

### App not starting?
- Check Node.js version (must be 18+)
- Verify `MONGO_URI` is correct
- Check cPanel error logs

### Database connection failed?
- Verify MongoDB Atlas IP whitelist includes your server
- Test connection string in MongoDB Compass
- Check username/password in `MONGO_URI`

### 502 Bad Gateway?
- App may have crashed - check logs
- Restart the Node.js app from cPanel
- Verify startup file is `index.js`

### Port conflicts?
- cPanel automatically assigns ports
- Don't hardcode PORT in your app (use `process.env.PORT`)

---

## Post-Deployment Checklist

- [ ] App is running in cPanel
- [ ] Health endpoint (`/`) returns JSON response
- [ ] MongoDB connection successful
- [ ] Can create users/teachers/courses via API
- [ ] Error messages appear with details (check browser console)
- [ ] SSL certificate is active (HTTPS)

---

## Need Help?

Contact your hosting provider if:
- Node.js feature is not available
- You need SSH access
- Port configuration issues
- SSL certificate setup

---

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/users` | Get all users |
| POST | `/users` | Create user |
| GET | `/users/:id` | Get user by ID |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| GET | `/teachers` | Get all teachers |
| POST | `/teachers` | Create teacher |
| GET | `/teachers/:id` | Get teacher by ID |
| PUT | `/teachers/:id` | Update teacher |
| DELETE | `/teachers/:id` | Delete teacher |
| GET | `/courses` | Get all courses |
| POST | `/courses` | Create course |
| GET | `/courses/:id` | Get course by ID |
| PUT | `/courses/:id` | Update course |
| DELETE | `/courses/:id` | Delete course |

---

**Your app is now live on cPanel! 🚀**
