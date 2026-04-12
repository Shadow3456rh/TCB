# Setup Guide — Files to Create After Cloning

After cloning this repo, you need to create **3 files** manually. These are excluded from git for security.

---

## 1. `backend/.env`

Copy from the example and fill in your Firebase project ID:

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

```env
# Firebase
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
FIREBASE_PROJECT_ID=your-firebase-project-id

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# App
ENVIRONMENT=development
```

---

## 2. `backend/firebase-credentials.json`

This is your Firebase **service account key**. To get it:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. **Project Settings** → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Save the downloaded JSON as `backend/firebase-credentials.json`

The file looks like this (DO NOT share this):
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

---

## 3. `frontend/.env`

Copy from the example and fill in your Firebase web config:

```bash
cp frontend/.env.example frontend/.env
```

Then edit `frontend/.env`:

```env
# Firebase (get these from Firebase Console → Project Settings → General → Web App)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Backend API
VITE_API_BASE_URL=http://localhost:8000
```

To find these values:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Project Settings** → **General**
3. Scroll to **"Your apps"** → Select your web app (or create one)
4. Copy the `firebaseConfig` values

---

## Firebase Setup Checklist

In Firebase Console, make sure these are enabled:

- [ ] **Authentication** → **Sign-in method** → **Email/Password** → **Enabled**
- [ ] **Cloud Firestore** → **Create database** (start in test mode for dev)

---

## Prerequisites

- **Node.js 18+** — for the frontend
- **Python 3.10–3.12** — for the backend (⚠️ Python 3.14 has compatibility issues)
- **Ollama** — install from [ollama.com](https://ollama.com), then run:
  ```bash
  ollama pull llama3.2:3b
  ```

---

## Quick Start After Setup

**Terminal 1 — Backend:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 — Ollama (if not already running):**
```bash
ollama serve
```

Then open **http://localhost:5173**

---

## Summary

| File | What It Is | Where to Get It |
|------|-----------|----------------|
| `backend/.env` | Backend config | Copy from `.env.example`, fill in project ID |
| `backend/firebase-credentials.json` | Firebase service account key | Firebase Console → Service Accounts → Generate Key |
| `frontend/.env` | Frontend Firebase config | Firebase Console → Project Settings → Web App config |
