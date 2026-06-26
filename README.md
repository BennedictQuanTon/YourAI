# YourAI v4.0 — Enterprise AI Productivity Platform

[![Architecture](https://img.shields.io/badge/Architecture-Enterprise--Grade-D4AF37?style=for-the-badge)](https://github.com/BennedictQuanTon/YourAI)
[![Stack](https://img.shields.io/badge/Stack-Zero--Cost-blue?style=for-the-badge)](https://github.com/BennedictQuanTon/YourAI)
[![PWA](https://img.shields.io/badge/PWA-Standalone-success?style=for-the-badge)](https://github.com/BennedictQuanTon/YourAI)
[![License](https://img.shields.io/badge/License-MIT-lightgrey?style=for-the-badge)](./LICENSE)

**YourAI v4.0** is a production-ready, enterprise-grade AI assistant and smart project management platform built as a monorepo. It integrates an AI-powered executive agent (Google Gemini), intelligent task scheduling, team project delegation with automated email workflows, and a specialized Dual-Scale GPA Engine that computes academic results simultaneously on both the Vietnamese (10-point) and Australian (7-point) grading scales.

The frontend is delivered as a **Progressive Web App (PWA)** using a bespoke **Luxury Design System** — usable from a full MacBook screen down to an iPhone homescreen without any app store dependency.

---

## Table of Contents

- [Core Features](#core-features)
- [System Architecture](#system-architecture)
- [Data Model (ERD)](#data-model-erd)
- [AI Agent Data Flow](#ai-agent-data-flow)
- [Authentication & Security Flow](#authentication--security-flow)
- [Workflow Diagrams](#workflow-diagrams)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Design System](#design-system)
- [Security & Data Isolation](#security--data-isolation)
- [Screenshots](#screenshots)

---

## Core Features

| Feature | Description |
|---|---|
| **AI Executive Agent** | Type natural language commands in Vietnamese or English; Gemini AI interprets intent and executes actions (create tasks, send emails, manage projects) via function calling. |
| **Smart Task Scheduler** | Full-featured calendar (month/week/day) with drag-and-drop rescheduling, color-coded task types, location tracking, and AI-powered reminder emails. |
| **Project Management** | Create projects, manage team members, track statuses, and visualize progress on an interactive 30-day Gantt chart. |
| **Automated Email Workflows** | Bulk-dispatch project notifications and deadline reminders to team members via Resend SMTP, orchestrated through an ARQ background worker with exponential-backoff retry. |
| **Dual-Scale GPA Engine** | Hierarchical academic tracker (Year → Term → Subject → Component) that calculates weighted GPAs on both the Vietnamese 10-point and Australian 7-point grading scales simultaneously. |
| **PWA & Offline Support** | Service Worker provides offline caching and a native-app homescreen experience on iOS and macOS with VAPID Web Push notifications. |
| **Luxury Dashboard** | Live Ho Chi Minh City clock, SVG donut/line charts for task and workload analytics, academic GPA rings, and project health quadrants. |
| **Secure Authentication** | JWT HttpOnly cookies, bcrypt password hashing, 4-digit OTP reset with 60-second expiry, 3-day re-reset throttle, and full per-user data isolation. |

---

## System Architecture

```mermaid
graph TD
    subgraph Client_Layer ["Client Layer — PWA"]
        Mac["MacBook Web Browser"]
        iOS["iPhone — Add to Homescreen (Service Worker)"]
    end

    subgraph API_Layer ["API Gateway & Security"]
        Cloudflare["Cloudflare WAF / DNS (Proxy & SSL)"]
        Gateway["FastAPI REST / WebSocket Router"]
        RateLimit[("Upstash Redis — Token Bucket Rate Limiter")]
    end

    subgraph Core_Services ["Core Business Services"]
        TaskService["Smart Task & Scheduler Service"]
        GPAService["Dual-Scale GPA Engine (VN / AU)"]
        ProjectService["Project Hub & Delegation Service"]
    end

    subgraph Async_Workers ["Async Processing & AI"]
        Worker["ARQ Background Worker (Redis)"]
        AIAgent["Gemini AI Executive Agent"]
    end

    subgraph Data_Layer ["Data & External APIs"]
        Supabase[("Supabase PostgreSQL — Row Level Security")]
        Resend["Resend SMTP API (Jinja2 Templates)"]
        WebPush["VAPID Web Push Notification Service"]
    end

    Mac -->|HTTPS| Cloudflare
    iOS -->|HTTPS| Cloudflare
    Cloudflare -->|Filter Traffic| Gateway
    Gateway <-->|Rate Check| RateLimit
    Gateway --> TaskService
    Gateway --> GPAService
    Gateway --> ProjectService
    TaskService <-->|asyncpg Pool| Supabase
    GPAService <-->|asyncpg Pool| Supabase
    ProjectService <-->|asyncpg Pool| Supabase
    TaskService -->|Enqueue Delayed Job| Worker
    ProjectService -->|Enqueue Bulk Mail| Worker
    Worker -->|HTTP| Resend
    Worker -->|VAPID| WebPush
    Gateway -->|Function-Calling Prompt| AIAgent
    AIAgent -->|JSON Schema Response| Gateway
```

---

## Data Model (ERD)

```mermaid
erDiagram
    USERS ||--o{ USER_SETTINGS : configures
    USERS ||--o{ PROJECTS : manages
    USERS ||--o{ TASKS : owns
    PROJECTS ||--o{ PROJECT_MEMBERS : includes
    PROJECTS ||--o{ TASKS : contains
    USERS ||--o{ GPA_YEARS : studies
    GPA_YEARS ||--o{ GPA_TERMS : divided_into
    GPA_TERMS ||--o{ GPA_SUBJECTS : registers
    GPA_SUBJECTS ||--o{ GPA_COMPONENTS : assessed_by
    GPA_COMPONENTS |o--o| TASKS : linked_to

    USERS {
        uuid id PK "Supabase Auth ID"
        string email UK
        string full_name
        string avatar "Base64 profile picture"
        string bio "VARCHAR(500)"
        string reset_code "4-digit OTP"
        timestamp reset_code_expires_at "60-second expiry"
        timestamp last_password_reset_at "3-day throttle"
        timestamp created_at
    }
    USER_SETTINGS {
        uuid user_id PK, FK
        string primary_color_hex "Default: #D4AF37"
        int border_radius_pt "Default: 12"
        string app_border_style "Default: solid"
        string gpa_scale "VN or AU"
    }
    PROJECTS {
        uuid id PK
        uuid manager_id FK
        string title
        timestamp timeline_start
        timestamp timeline_end
        string status "active / completed / on_hold"
    }
    PROJECT_MEMBERS {
        uuid id PK
        uuid project_id FK
        string email
        string full_name
        string role "e.g. PM, Developer, Designer"
        string status "pending / active / vacation"
    }
    TASKS {
        uuid id PK
        uuid project_id FK "Nullable"
        uuid user_id FK
        string title
        string status "todo / done"
        int energy_cost "Scale 1–10"
        timestamp deadline_at
        string assigned_to
        string project_link
        timestamp reminder_at
        string reminder_email
        string location
        boolean is_online
        string type "chore / academic / project"
        string additional_info
    }
    GPA_YEARS {
        uuid id PK
        uuid user_id FK
        string year_name "e.g. Year 1"
    }
    GPA_TERMS {
        uuid id PK
        uuid year_id FK
        string term_name "e.g. Semester 1"
        date start_date
        date end_date
    }
    GPA_SUBJECTS {
        uuid id PK
        uuid term_id FK
        string subject_name
        int credits
        numeric final_score_vn "10-point scale"
        numeric final_score_au "7-point scale"
    }
    GPA_COMPONENTS {
        uuid id PK
        uuid subject_id FK
        uuid task_id FK "Nullable"
        string component_name "e.g. Assignment 1, Final Exam"
        numeric weight "Percentage, e.g. 30.00"
        numeric score_achieved "10-point scale"
    }
```

---

## AI Agent Data Flow

```mermaid
graph LR
    User((User)) -- "1. Natural language prompt" --> Auth[FastAPI Auth Guard]
    Auth -- "2. Validate session & rate limit" --> Gateway[FastAPI Router]
    Gateway -- "3. Prompt + Tool JSON schemas" --> Gemini[Google Gemini API]
    Gemini -- "4. Return: call_function(action, args)" --> Gateway
    Gateway -- "5. Translate JSON to SQL query" --> DB[(Supabase PostgreSQL)]
    DB -- "6. Confirm write" --> Gateway
    Gateway -- "7. Compute schedule delta time" --> Redis[(Upstash Redis Queue)]
    Redis -. "8. Delay until ETA" .-> Worker[ARQ Background Worker]
    Worker -- "9. Fetch Jinja2 template" --> Template[Template Engine]
    Template -- "10. Trigger SMTP send" --> Resend[Resend API]
    Resend -- "11. Email delivered" --> User
```

---

## Authentication & Security Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as PWA User
    participant Client as Frontend (Auth.jsx)
    participant API as FastAPI Backend (auth.py)
    participant DB as SQLite / Supabase PostgreSQL
    participant Sync as Dynamic Sync Engine

    Note over Sync,DB: Runs on server startup
    Sync->>DB: Query Supabase PostgreSQL (if online)
    DB-->>Sync: Return Users, Settings, Projects, Tasks
    Sync->>DB: Upsert all records into local SQLite (yourai.db)

    Note over User,Client: Forgot Password Flow
    User->>Client: Enter email and submit request
    Client->>API: POST /forgot-password {email}
    API->>DB: Check last_password_reset_at
    alt Password changed within the last 3 days
        API-->>Client: 400 Error — cooldown active
        Client-->>User: Display remaining wait time (days, hours, minutes)
    else Valid (over 3 days or never reset)
        API->>API: Generate 4-digit OTP
        API->>API: Set expiry to 60 seconds
        API->>DB: Save reset_code & reset_code_expires_at
        API-->>Client: 200 OK — OTP sent via Resend
        Client->>Client: Activate reset screen with live 60s countdown
    end

    Note over User,Client: Password Reset Flow
    alt Countdown reaches 0 (expired)
        Client->>Client: Show OTP expiry error and redirect to login
    else User enters OTP and new password within 60 seconds
        User->>Client: Fill 4-box OTP + new password
        Client->>API: POST /reset-password {email, token, new_password}
        API->>DB: Verify code and expiry (< 60s)
        API->>API: Validate password strength (8 chars, 1 digit, 1 special)
        API->>DB: Save hashed password, set last_password_reset_at = UTCNow
        API-->>Client: 200 OK — reset successful
        Client-->>User: Success toast, redirect to login
    end
```

---

## Workflow Diagrams

### Bulk Mail Sequence (AI-triggered)

```mermaid
sequenceDiagram
    autonumber
    actor PM as Project Manager
    participant App as PWA (MacBook / iOS)
    participant API as FastAPI Backend
    participant LLM as Gemini API
    participant DB as Supabase DB
    participant Mail as Resend SMTP

    PM->>App: Type: "Remind the team to submit round 1 report"
    App->>API: POST /api/v1/agent/chat {text, project_id}
    API->>API: Validate JWT & check rate limit (Redis)
    API->>LLM: Send prompt + tool definition (send_bulk_mail)
    activate LLM
    LLM-->>API: Return JSON: call_function(send_bulk_mail, {intent})
    deactivate LLM
    API->>DB: Query project_members for email list
    DB-->>API: Return [member1@email.com, member2@email.com, ...]
    API->>API: Compile Jinja2 template with {{name}} variables
    API->>Mail: HTTP POST /emails (bulk dispatch)
    Mail-->>API: 200 OK (queued by Resend)
    API-->>App: JSON {status: "success", action: "bulk_mail"}
    App-->>PM: Success banner + haptic feedback
```

### Automated Scheduling & Email Dispatch (BPMN)

```mermaid
graph TD
    subgraph Lane_1 ["Lane 1: Project Manager"]
        Start((Start)) --> Assign[Fill task assignment form + email]
        Assign --> Toggle[Enable 'Automation Email' toggle]
        Toggle --> Submit[Confirm and submit]
    end
    subgraph Lane_2 ["Lane 2: Core Engine (FastAPI & DB)"]
        Submit --> AuthCheck{JWT valid?}
        AuthCheck -->|No| Reject[Return 401 Unauthorized]
        AuthCheck -->|Yes| SaveDB[Save task to database]
        SaveDB --> SaveStatus[Set member status = pending]
        SaveStatus --> CalcTime[Calculate ETA minus 24 hours]
        CalcTime --> SetTimer((Enqueue job to Redis))
    end
    subgraph Lane_3 ["Lane 3: Background Worker & External Services"]
        SetTimer -. Wait until ETA .-> PopJob[Worker dequeues job]
        PopJob --> Render[Render Jinja2 HTML template]
        Render --> CallAPI[Call Resend HTTP API]
        CallAPI --> SMTP[Resend processes DKIM / SPF]
        SMTP --> End((Member receives email))
    end
```

### Task Lifecycle (State Machine)

```mermaid
graph TD
    Start([Create Task]) --> TODO[TODO]
    TODO -->|Begin work| IN_PROGRESS[IN PROGRESS]
    IN_PROGRESS -->|Pause| TODO
    IN_PROGRESS -->|Blocked| BLOCKED[BLOCKED]
    BLOCKED -->|Resolved| IN_PROGRESS
    IN_PROGRESS -->|Confirm complete| DONE[DONE]
    DONE -->|Reopen| TODO
    TODO -->|Cancel| ARCHIVED[ARCHIVED]
    IN_PROGRESS -->|Cancel| ARCHIVED
    BLOCKED -->|Cancel| ARCHIVED
    DONE -->|Close project| ARCHIVED
    ARCHIVED --> End([End])
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | Component-based PWA UI |
| **Routing & State** | React Hooks (no external router) | Lightweight SPA state management |
| **Calendar** | FullCalendar 6 | Interactive scheduling views |
| **Icons** | lucide-react | Consistent SVG icon set |
| **Image Editing** | react-easy-crop | Round avatar cropping |
| **HTTP Client** | Axios | API communication with cookie support |
| **Backend** | FastAPI + Uvicorn | High-performance async REST API |
| **ORM** | SQLAlchemy 2.0 (asyncpg) | Async database access |
| **Primary Database** | Supabase PostgreSQL (RLS) | Production data store with row-level security |
| **Local Database** | SQLite (aiosqlite) | Development fallback + offline sync |
| **Auth** | python-jose + bcrypt | JWT signing and password hashing |
| **AI** | Google Gemini 1.5 Flash | Natural language function calling |
| **Background Jobs** | ARQ + Upstash Redis | Async task queue with exponential-backoff retry |
| **Email** | Resend SMTP + Jinja2 | Transactional and bulk HTML emails |
| **Push Notifications** | pywebpush (VAPID) | Native web push on iOS/macOS |
| **Rate Limiting** | Token bucket (Redis / in-memory) | Per-route abuse protection |
| **CDN / WAF** | Cloudflare | DDoS protection, edge caching, SSL |
| **PWA** | Service Worker + Web App Manifest | Offline support, homescreen install |

---

## Project Structure

```
YourAI/
├── backend-engine/                  # FastAPI application
│   ├── app/
│   │   ├── api/
│   │   │   ├── dependencies/        # Auth dependency injection (get_current_user)
│   │   │   └── v1/                  # REST API routers
│   │   │       ├── auth.py          # Register, login, profile, OTP password reset
│   │   │       ├── tasks.py         # Task CRUD
│   │   │       ├── projects.py      # Project + member management, bulk mail
│   │   │       ├── gpa.py           # GPA hierarchy CRUD + score calculation
│   │   │       └── agent.py         # AI chat endpoint (Gemini function calling)
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic settings from .env
│   │   │   ├── security.py          # JWT helpers
│   │   │   └── rate_limit.py        # Token-bucket rate limiter
│   │   ├── db/
│   │   │   ├── models.py            # SQLAlchemy ORM models
│   │   │   └── session.py           # Async engine, session factory, get_db()
│   │   ├── schemas/
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── gpa_math.py          # GPA computation (VN ↔ AU conversion)
│   │   │   ├── llm_parser.py        # Gemini function calling + heuristic fallback
│   │   │   ├── mail_service.py      # Jinja2 rendering + Resend SMTP dispatch
│   │   │   └── sync_service.py      # Bidirectional SQLite ↔ Postgres sync
│   │   └── worker/
│   │       ├── main.py              # ARQ WorkerSettings
│   │       ├── tasks.py             # Email + push tasks with retry/backoff
│   │       └── trigger.py           # Job enqueuing with local-async fallback
│   ├── templates/
│   │   ├── bulk_mail.html           # Luxury gold/black email template
│   │   └── custom_remind.html       # Custom HTML reminder shell template
│   ├── .env.example                 # Environment variable reference
│   ├── requirements.txt
│   └── main.py                      # App factory, router registration, startup
│
└── frontend-pwa/                    # React PWA application
    ├── public/
    │   ├── manifest.json            # PWA manifest (standalone, icons)
    │   ├── service-worker.js        # Cache-first offline shell + VAPID push
    │   └── logo.png
    ├── src/
    │   ├── core/
    │   │   └── network.js           # Axios instance (auth interceptors)
    │   ├── components/
    │   │   ├── Auth.jsx             # Login, register, OTP reset UI
    │   │   ├── Sidebar.jsx          # Collapsible navigation
    │   │   ├── Dashboard.jsx        # Analytics, clock, charts
    │   │   ├── AiExecutiveAgent.jsx # AI chat terminal + email/task consoles
    │   │   ├── Scheduler.jsx        # FullCalendar with drag/drop
    │   │   ├── Projects.jsx         # Project management + Gantt chart
    │   │   ├── GpaIntelligence.jsx  # GPA tracker (VN/AU dual scale)
    │   │   └── Settings.jsx         # Profile editor + avatar crop
    │   ├── App.jsx                  # Root state container, routing logic
    │   └── main.jsx                 # React root render
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- A Supabase project (or use the bundled SQLite for local development)
- A Google AI Studio API key (for the Gemini agent)
- A Resend account (for email functionality)

### 1. Backend Setup

```bash
cd backend-engine

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys (see Environment Variables section)

# Start the server
python main.py
```

The API will be available at `http://localhost:8000`.
Interactive API documentation is available at `http://localhost:8000/docs`.

> **Note:** The server falls back to a local SQLite database (`yourai.db`) automatically if the Supabase connection is unavailable, making it fully functional for local development with no external dependencies.

### 2. Frontend Setup

```bash
cd frontend-pwa

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

### 3. Background Worker (Optional — required for scheduled emails)

```bash
cd backend-engine
source venv/bin/activate

# Run the ARQ worker
python -m arq app.worker.main.WorkerSettings
```

> **Note:** Email sending also works without a running worker — the trigger falls back to an asyncio task in the main server process when Redis is unavailable.

---

## Environment Variables

Copy `backend-engine/.env.example` to `backend-engine/.env` and fill in the values:

```env
# Application
APP_ENV=development          # development | production
SECRET_KEY=your-secret-key   # JWT signing key

# Database (leave blank to use local SQLite)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Redis (leave blank to use in-memory rate limiting and local job dispatch)
REDIS_URL=redis://localhost:6379

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Resend SMTP (leave blank to enable mock/print mode)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# VAPID Web Push (optional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Supabase (optional — for Postgres sync)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

---

## Design System

The application uses a custom Luxury Design System built around three core principles:

| Token | Value | Usage |
|---|---|---|
| **Gold Accent** | `#D4AF37` (Classic Gold) | Primary buttons, rings, highlights |
| **Surface** | `#FAF9F6` (Alabaster White) | Page backgrounds, card surfaces |
| **Dark** | `#1A1A1A` (Obsidian) | Auth panel, sidebar, dark elements |
| **Heading Font** | `Playfair Display` | Page titles, section headers |
| **Body Font** | `Montserrat` | All UI text, labels, inputs |
| **Glassmorphism** | `backdrop-filter: blur(20px)` | Cards, modals, overlays |
| **Border Radius** | 12px (user-configurable) | All interactive elements |

---

## Security & Data Isolation

### User Data Isolation

All database queries for tasks, projects, GPA data, and user settings are strictly filtered by `user_id = current_user.id` at the backend service layer. It is architecturally impossible for one authenticated user to read or modify another user's data.

### Authentication Security

- Passwords are hashed with **bcrypt** before storage.
- Sessions use **JWT tokens** stored in **HttpOnly cookies**, preventing JavaScript access.
- Password reset uses a **4-digit OTP** valid for **60 seconds only**.
- A **3-day cooldown** between password resets prevents abuse.
- Passwords must be at least **8 characters** and include at least one digit and one special character.
- Legacy or plaintext passwords are **automatically upgraded to bcrypt** on the next successful login.

### Rate Limiting

| Route Category | Limit |
|---|---|
| Public endpoints | 5 requests / minute |
| AI agent chat | 20 requests / 10 minutes |
| Bulk mail dispatch | 1 request / 30 minutes |

---

## Screenshots

### Luxury Split-Screen Login

A split-screen design: an Obsidian-dark left panel with the YourAI logo and the tagline *"Elegance in Productivity"*, paired with a clean white right panel featuring underline-style inputs and a gold *"ENTER WORKSPACE"* button. Includes a secure **Remember Me** feature backed by localStorage.

![Luxury Split-Screen Login](./artifacts/logo_auth_remember_me.png)

### Secure Logout Confirmation

When the user signs out, the session is immediately invalidated and the user is redirected to the login screen with a gold-black toast notification confirming the logout.

![Secure Logout Redirect](./artifacts/auth_testing_result.png)

---

## License

This project is licensed under the MIT License.
