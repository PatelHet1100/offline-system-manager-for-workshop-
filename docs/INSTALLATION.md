# Installation Guide

Follow these steps to run the Workshop Order Tracker locally.

---

## 1. Install Requirements

Install Node.js (LTS version)

Download from:
https://nodejs.org/

After installing, verify:

node -v
npm -v

---

## 2. Download Project

Clone the repository:

git clone https://github.com/PatelHet1100/offline-system-manager-for-workshop.git

OR download ZIP and extract it.

---

## 3. Open Project Folder

cd workshop-order-tracker

---

## 4. Install Dependencies

npm install

---

## 5. Run the Application

npm run dev

---

## 6. Open in Browser

Open:

http://localhost:5173
or
https://localhost:3000

---

## 7. One-Click Start (Recommended)

Go to:

scripts/start-app.bat

Double-click it.

This will:
- Start backend
- Start frontend
- Open browser automatically

---

## 8. Data Storage

All data is stored locally:

/data/
   workshop.db
   /images/

---

## Important Notes

- Do NOT delete workshop.db
- Do NOT manually edit database files
- Use the app interface only

---

## Troubleshooting

If dependencies fail:

npm install

If port error occurs:

Restart terminal and run again

---

## You're Ready

Your app is now fully running locally.
