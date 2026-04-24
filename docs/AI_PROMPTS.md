# AI Prompts for Workshop Order Tracker

This project was built using structured prompts with AI tools like Google AI Studio.

---

## MASTER BASE PROMPT

Build a fully offline-first web application for workshop order tracking.

Requirements:
- Node.js + Express backend
- React frontend (Vite)
- SQLite local database
- Store images locally
- No cloud or external APIs

Core features:
- Customer management
- Order tracking
- Payment tracking
- Image storage
- Search system

---

## ORDER SYSTEM PROMPT

Each customer can have multiple orders.

Each order must support:
- product name
- payment status
- manufacturing status
- multiple images

Images should be:
- linked by product type
- shared across customers if names match

---

## IMAGE SYSTEM PROMPT

Implement hybrid image system:

- Shared images (linked to product type)
- Order-specific images (linked to order_id)

Images must NOT be deleted when order or customer is deleted.

Only allow manual deletion from gallery.

---

## FINANCIAL SYSTEM PROMPT

Implement payment tracking:

- total_amount
- paid_amount

Status:
- Unpaid
- Partial
- Paid

Financial summary must use only paid_amount.

---

## DELIVERY & URGENCY PROMPT

Add delivery tracking:

- delivery_date

Auto urgency:
- >3 days → Normal
- ≤2 days → Urgent
- overdue → Critical

Highlight urgent orders in UI.

---

## ORDER DESCRIPTION PROMPT

Add structured order details:

- description
- measurements
- materials
- instructions

Provide clean UI for entering and viewing these fields.

---

## ONE-CLICK SYSTEM PROMPT

Make app runnable with one click:

- Create start-app.bat
- Run backend + frontend together
- Auto open browser

---

## UI REFINEMENT PROMPT

Improve UI:
- card-based layout
- status badges
- urgency highlights
- clean spacing
- WhatsApp-like interface

---

## FINAL NOTE

These prompts are designed to build real offline systems with structured logic and no cloud dependency.
