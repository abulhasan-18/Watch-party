# 🌐 Strapi + Next.js Fullstack Project

## 📖 Overview
This project is a **full-stack web application** built with **Strapi** as the backend (Headless CMS) and **Next.js** as the frontend (React framework).  
It demonstrates how to manage content in Strapi and render it dynamically in a Next.js frontend.

Initially, both backend and frontend ran **locally**, but later I migrated them to the **cloud**:
- **Frontend** → Hosted on **Vercel**
- **Backend** → Hosted on **Strapi Cloud (Free Trial)**

---

## ⚙️ Tech Stack
- **Frontend:** [Next.js](https://nextjs.org/) 🚀  
- **Backend:** [Strapi](https://strapi.io/) 🖥️  
- **Database:** Default Strapi DB / Configured DB  
- **Deployment:**  
  - Vercel (Frontend)  
  - Strapi Cloud (Backend)

---

## 🛠 Development Journey
### 1. Local Setup
- Created a **Strapi backend** to manage content.  
- Built a **Next.js frontend** to fetch & display data via Strapi REST API/GraphQL.  

### 2. Cloud Migration
- Deployed **frontend on Vercel** with automatic CI/CD from GitHub.  
- Migrated **backend to Strapi Cloud (Free Trial)** for production hosting.  

### 3. Integration
- Updated API calls in frontend → connected to **Strapi Cloud backend**.  
- Verified smooth **end-to-end flow** in production.  

---

## 🚀 Deployment Links
- 🔗 **Frontend (Next.js):** [Live Demo on Vercel](#)  
- 🔗 **Backend (Strapi):** [Strapi Cloud Admin](#)  

---

## ✨ Key Learnings
- Setting up **Strapi + Next.js fullstack architecture**.  
- Deploying frontend & backend on **different cloud providers**.  
- Managing **CORS, environment variables, and API URLs** during migration.  
- Building a setup that easily moves from **local development → production cloud**.  

---

## 📌 How to Run Locally
1. **Clone repo**  
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo

   npm install   # for Next.js
   cd backend && npm install   # for Strapi

   # In /backend
   npm run develop

   # In /frontend
   npm run dev
