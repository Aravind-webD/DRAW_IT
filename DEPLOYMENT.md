# 🚀 Deployment Guide: DrawBoard Multiplayer

To make your game accessible from anywhere (without WiFi), we will split the app into two parts:
1.  **Frontend (UI)** → Hosted on **Vercel** (Best for React)
2.  **Backend (Game Server)** → Hosted on **Render** (Essential for Multiplayer Sockets)

---

## Part 1: Deploy the Backend (Render)
*Render has a free tier that supports Node.js and WebSockets (required for your game).*

1.  **Push your code to GitHub** (if you haven't already).
2.  Go to [dashboard.render.com](https://dashboard.render.com) and sign up/login.
3.  Click **New +** and select **Web Service**.
4.  Connect your GitHub repository.
5.  **Configure Settings**:
    *   **Root Directory**: `server` (Important! This tells Render to look in the server folder)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
    *   **Instance Type**: Select "Free"
6.  **Environment Variables**:
    *   Scroll down to "Environment Variables".
    *   Add `FRONTEND_URL` with value `https://your-vercel-app-name.vercel.app` (You can update this later after deploying Vercel).
    *   Add `MONGODB_URI` if you are using the database features.
7.  Click **Create Web Service**.
    *   Render will start building. Once finished, it will give you a URL like `https://drawboard-server.onrender.com`.
    *   **Copy this URL**.

---

## Part 2: Deploy the Frontend (Vercel)
*Vercel is the fastest way to host your frontend React app.*

1.  Go to [vercel.com](https://vercel.com) and sign up/login.
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  **Configure Project**:
    *   **Framework Preset**: Vite (should be auto-detected).
    *   **Root Directory**: Leave as `./` (default).
5.  **Environment Variables**:
    *   Click the "Environment Variables" section.
    *   Add `VITE_API_URL`
    *   Value: The **Render URL** you copied in Part 1 (e.g., `https://drawboard-server.onrender.com`).
    *   *Note: Do NOT add a trailing slash `/` at the end.*
6.  Click **Deploy**.

---

## Part 3: Final Connection
1.  Once Vercel is deployed, you will get your final App URL (e.g., `https://drawboard-game.vercel.app`).
2.  Go back to **Render Dashboard** -> Your Web Service -> **Environment**.
3.  Update the `FRONTEND_URL` variable to match your new Vercel URL.
4.  Render will automatically restart the server.

✅ **Done!** You can now share the Vercel link with anyone, and play together over the internet!
