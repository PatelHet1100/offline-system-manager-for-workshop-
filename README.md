# 🚀 offline-system-manager-for-workshop (Offline-First)

A fully offline, local-first order management system designed for small workshops and manufacturing businesses.

This system allows you to track:
- Customers
- Orders
- Payments
- Images (product references + order-specific)
- Delivery timelines
- Financial summaries

---

## 🧠 Core Philosophy

Your data stays on your computer. No cloud. No subscriptions. Full control.

---

## ✨ Features

### 📋 Order Management
- Create, edit, and delete orders
- Multiple orders per customer
- Full edit support

### 🧾 Structured Order Details
- Description
- Measurements
- Materials / Patterns
- Special instructions

### 🖼️ Smart Image System
- Shared product images across customers
- Order-specific images
- Central gallery with search
- Manual image deletion only

### 💰 Financial Tracking
- Tracks only paid amount
- Supports partial payments
- Customer-wise breakdown

### ⏱️ Delivery & Urgency System
- Delivery date tracking
- Auto urgency detection:
  - Normal
  - Urgent (≤ 2 days)
  - Critical (overdue)

### 💾 Backup System
- Export full backup (DB + images)
- Fully offline storage

---

## 🧰 Tech Stack

- Backend: Node.js + Express
- Frontend: React + Vite + Tailwind
- Database: SQLite
- Storage: Local filesystem

---

## 📦 Installation

See: docs/INSTALLATION.md

---

## ▶️ Usage

Run:

npm install  
npm run dev  

OR:

Double-click:

scripts/start-app.bat

---

## 💾 Data Storage

/data/
   workshop.db
   /images/

Do NOT delete these files manually.

---

## 🔐 Data Safety

- No cloud usage
- No external APIs
- Full local control

---

## 🧪 Status

Production-ready for single-device use

---

## 📈 Future Roadmap

- Multi-device sync
- Desktop app (.exe)
- Analytics dashboard
- Auto-backup system

---

## 🤖 AI Reproducibility

See: docs/AI_PROMPTS.md

---

## 📄 License

MIT

---

## ⚡ Philosophy

Build systems that solve real problems — not just code that runs.
