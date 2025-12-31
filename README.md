# 🏏 Cricket AI Platform

An intelligent cricket platform that allows users to **create players**, **store career stats**, and **interact with an AI analyst** to compare players, analyze performance, and explore real-time cricket data.

Built using **Node.js, TypeScript, AWS Cognito, DynamoDB, WebSockets, Vector Search (Qdrant), and AI models**.

---

## 🚀 Features

### 🔐 Authentication (AWS Cognito)

* User registration & confirmation
* Secure login / logout
* Access & refresh tokens stored as HTTP-only cookies
* Fully protected APIs & WebSocket connections

---

### 🧑‍🏏 Player Management

* Create custom cricket players
* Store detailed stats:

  * Batting & bowling
  * Matches, runs, wickets
  * Format-wise stats (TEST / ODI / T20)
* Stored securely in **DynamoDB**

---

### 🧠 AI Player Insights (WebSocket)

* Chat with an **AI Cricket Analyst**
* Ask questions like:

  * *“Compare my players, who is best?”*
  * *“Who is a better all-rounder?”*
  * *“Analyze batting vs bowling impact”*
* Uses:

  * Player stats from DynamoDB
  * Vector search (Qdrant)
  * AI model (Groq)

#### Modes

* **Normal Chat Mode** – behaves like a general chatbot
* **Player AI Insights Mode** – fetches & analyzes your players automatically

---

### 🔍 Vector Search (RAG)

* Player data embedded using MiniLM
* Stored in **Qdrant**
* Enables semantic search & comparison
* Fallback logic if no vectors are found

---

### 🌍 Real-Time Cricket Browser (REST API)

Uses **CricAPI (Free Tier)**:

* Matches
* Series
* Players

Single API with dynamic parameters:

```
/api/cricket?type=matches
/api/cricket?type=series
/api/cricket?type=players
```

Handles:

* Rate-limit blocking
* API usage limits
* Error responses shown clearly in UI

---

## 🏗️ Tech Stack

### Backend

* Node.js + TypeScript
* Express
* WebSocket (ws)
* AWS Cognito
* DynamoDB
* Qdrant (Vector DB)
* Groq AI
* CricAPI

### Frontend

* React + TypeScript
* MUI
* WebSocket client
* REST APIs

---

## 📁 Project Structure

```
node-backend/
├── src/
│   ├── ai/                # AI logic (Groq, prompts, brain)
│   ├── middleware/        # Auth & JWT verification
│   ├── rag/               # Embeddings, vector search
│   ├── routes/            # Auth, players, insights
│   ├── websocket/         # WebSocket server
│   ├── server.ts          # App entry point
│
react-frontend/
├── src/
│   ├── api/               # REST API calls
│   ├── components/        # UI components
│   ├── pages/             # App screens
│
```

---

## ⚙️ Environment Variables

### Backend (`.env`)

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173

AWS_REGION=ap-south-1
COGNITO_USER_POOL_ID=xxxx
COGNITO_CLIENT_ID=xxxx
COGNITO_CLIENT_SECRET=xxxx

PLAYERS_TABLE_NAME=PlayersTable
GROQ_API_KEY=xxxx

QDRANT_URL=http://qdrant:6333
CRIC_API_KEY=xxxx
```

---

### Frontend (`.env`)

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_BASE_URL=ws://localhost:3000
```

---

## ▶️ Running Locally

### 1️⃣ Start Qdrant

```bash
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  qdrant/qdrant
```

---

### 2️⃣ Backend

```bash
cd node-backend
npm install
npm run dev
```

---

### 3️⃣ Frontend

```bash
cd react-frontend
npm install
npm run dev
```

---

## 🧪 API Examples

### Login

```http
POST /auth/login
```

### Get Players

```http
GET /api/players
```

### WebSocket Payload

```json
{
  "prompt": "Compare my players who is best",
  "enableAIInsights": true
}
```

---

## 🔐 Security Notes

* Cookies are **HTTP-only**
* CORS restricted to allowed origins
* WebSocket requires valid Cognito access token
* No wildcard origins allowed

---

## ⚠️ CricAPI Limits (Free Tier)

* 100 requests/day
* Auto-blocked for 15 minutes if exceeded
* UI shows:

  * Rate limit exceeded
  * Block duration
  * Remaining quota

---

## 🧭 Future Enhancements

* Live match commentary
* Team-level AI analysis
* Player similarity graphs
* Match outcome prediction
* Premium API support

---

## 👨‍💻 Author

**Pradeep Reddy Thati**
Cricket + AI + Cloud Engineering
