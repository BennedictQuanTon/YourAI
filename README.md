# YourAI v4.0 (Enterprise Edition) - Monorepo AI Assistant

[![Enterprise Setup](https://img.shields.io/badge/Architecture-Enterprise--grade-D4AF37?style=for-the-badge)](https://github.com/yourdomain/yourai)
[![Zero-Cost Corporate Stack](https://img.shields.io/badge/Stack-Zero--Cost-blue?style=for-the-badge)](https://github.com/yourdomain/yourai)
[![PWA Standalone Ready](https://img.shields.io/badge/PWA-Standalone-success?style=for-the-badge)](https://github.com/yourdomain/yourai)

**YourAI v4.0** là giải pháp điều hành công việc, quản trị dự án thông minh tích hợp AI Agent và Lõi tính toán điểm GPA song hệ (Việt Nam - Úc) chuẩn chỉnh sản phẩm dành cho doanh nghiệp lớn (Production-ready). 

Dự án được triển khai dưới dạng **Monorepo** với thiết kế giao diện theo chuẩn **PWA (Progressive Web App)** sang trọng bậc nhất (**Luxury Design System**), mang lại trải nghiệm mượt mà từ MacBook màn hình lớn xuống màn hình di động iPhone (Add to Homescreen) không qua trung gian.

---

## 📖 Sơ Đồ Kiến Trúc Hệ Thống (System Topology & UML)

### 1. Kiến Trúc Phân Tán (System Architecture Topology)
```mermaid
graph TD
    %% Tầng Client (PWA)
    subgraph Client_Layer ["Tầng Client & Giao Diện PWA"]
        Mac["MacBook 14 Web Browser (Montserrat & Playfair)"]
        iOS["iPhone PWA - Add to Homescreen (Service Worker)"]
    end
    
    %% Tầng API & Auth
    subgraph API_Layer ["API Gateway & Bảo Mật"]
        Cloudflare["Cloudflare WAF / DNS (Proxy & SSL)"]
        Gateway["FastAPI REST/WebSocket Router"]
        RateLimit[("Upstash Redis Rate Limit (Token Bucket)")]
    end
    
    %% Tầng Core Services
    subgraph Core_Services ["Lõi Nghiệp Vụ - Asyncpg"]
        TaskService["Smart Task & Scheduler Service"]
        GPAService["Dual-Scale GPA Engine (VN-AU)"]
        ProjectService["Project Hub & Delegation Service"]
    end
    
    %% Tầng AI & Message Queue
    subgraph Async_Workers ["Xử Lý Bất Đồng Bộ & AI"]
        Worker["ARQ Background Worker (Redis)"]
        AIAgent["Gemini AI Executive Agent"]
    end
    
    %% Tầng Data & Cloud
    subgraph Data_Layer ["Lưu Trữ & External APIs"]
        Supabase[("Supabase PostgreSQL (Row Level Security - RLS)")]
        Resend["Resend SMTP API (Jinja2 Templates)"]
        WebPush["VAPID Web Push Notification Service"]
    end
    
    %% Luồng kết nối
    Mac -->|HTTPS| Cloudflare
    iOS -->|HTTPS| Cloudflare
    Cloudflare -->|Lọc Traffic| Gateway
    Gateway <-->|Check Limit| RateLimit
    Gateway --> TaskService
    Gateway --> GPAService
    Gateway --> ProjectService
    TaskService <-->|asyncpg Pool| Supabase
    GPAService <-->|asyncpg Pool| Supabase
    ProjectService <-->|asyncpg Pool| Supabase
    TaskService -->|Push Delayed Job| Worker
    ProjectService -->|Push Bulk Mail| Worker
    Worker -->|Fire API| Resend
    Worker -->|Send Push| WebPush
    Gateway -->|Function Calling Prompt| AIAgent
    AIAgent -->|JSON Schema Response| Gateway
```

### 2. Sơ Đồ Thực Thể Quan Hệ (Entity Relationship Diagram - ERD)
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
        string avatar "TEXT Base64 Profile Picture"
        string bio "VARCHAR(500) Biography"
        string reset_code "4-digit temporary OTP"
        timestamp reset_code_expires_at "OTP expiration (60s)"
        timestamp last_password_reset_at "Last successful reset date (3-day throttle)"
        timestamp created_at
    }
    USER_SETTINGS {
        uuid user_id PK, FK
        string primary_color_hex "Default: #D4AF37"
        int border_radius_pt "Default: 12"
        string app_border_style "Default: solid"
        string gpa_scale "Default: VN (VN/AU)"
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
        string role "Custom user-typed role (e.g., PM, Developer, etc.)"
        string status "pending / active / vacation"
    }
    TASKS {
        uuid id PK
        uuid project_id FK "Nullable"
        uuid user_id FK
        string title
        string status "todo / done"
        int energy_cost "Scale 1-10"
        timestamp deadline_at
        string assigned_to "Assignee name/email"
        string project_link "Resource web url"
        timestamp assigned_date "Assigned date"
        string reminder_email "SMTP Alert target email"
        timestamp reminder_at "AI reminder scheduled datetime"
        string location "Physical/virtual location"
        boolean is_online "Whether virtual meeting/zoom"
        string type "chore / lịch học / dự án"
        string additional_info "Detailed notes/context"
    }
    GPA_YEARS {
        uuid id PK
        uuid user_id FK
        string year_name "e.g., Năm 1, Năm 2"
    }
    GPA_TERMS {
        uuid id PK
        uuid year_id FK
        string term_name "e.g., Học kỳ 1, Học kỳ 2"
    }
    GPA_SUBJECTS {
        uuid id PK
        uuid term_id FK
        string subject_name
        int credits
        numeric final_score_vn "10-scale score"
        numeric final_score_au "7-scale score"
    }
    GPA_COMPONENTS {
        uuid id PK
        uuid subject_id FK
        uuid task_id FK "Nullable"
        string component_name "e.g., Assignment 1, Exam"
        numeric weight "Percentage e.g., 30.00"
        numeric score_achieved "10-scale component score"
    }
```

### 3. Luồng Dữ Liệu Gọi Hàm AI (Data Flow - DFD Level 1)
```mermaid
graph LR
    User((Người Dùng)) -- "1. Prompt (VD: Tạo task BKI)" --> Auth[FastAPI Auth Guard]
    Auth -- "2. Check Session & Rate Limit" --> Gateway[FastAPI Router]
    Gateway -- "3. Prompt + Tool JSON Schemas" --> Gemini[Google Gemini API]
    Gemini -- "4. Trả về: call_function(create_task, args)" --> Gateway
    Gateway -- "5. Dịch JSON thành SQL Query" --> DB[(Supabase PostgreSQL)]
    DB -- "6. Confirm Insert" --> Gateway
    Gateway -- "7. Tính toán hẹn giờ (Delta Time)" --> Redis[(Upstash Redis Queue)]
    Redis -. "8. Trì hoãn cho đến khi hết hạn (ETA)" .-> Worker[ARQ Background Worker]
    Worker -- "9. Fetch Email Template" --> Template[Jinja2 Engine]
    Template -- "10. Trigger Sending" --> Resend[Resend SMTP]
    Resend -- "11. Email Delivered" --> User
```

### 4. Sơ Đồ Tuần Tự Điều Phối Bulk Mail (Sequence Diagram)
```mermaid
sequenceDiagram
    autonumber
    actor PM as Project Manager
    participant App as PWA (MacBook/iOS)
    participant API as FastAPI Backend
    participant LLM as Gemini API
    participant DB as Supabase DB
    participant Mail as Resend SMTP

    PM->>App: Gõ: "Nhắc team nộp báo cáo vòng 1"
    App->>API: POST /api/v1/agent/chat {text, project_id}
    API->>API: Xác thực JWT & Kiểm tra Rate Limit (Redis)
    API->>LLM: Gửi Prompt + tool_definition (send_bulk_mail)
    activate LLM
    LLM-->>API: Trả về JSON: call_function(send_bulk_mail, {intent})
    deactivate LLM
    API->>DB: Query `project_members` lấy danh sách Email
    DB-->>API: Trả về [member1@hcmut.edu.vn, tobias@...]
    API->>API: Compile Jinja2 Template lồng ghép biến {{name}}
    API->>Mail: HTTP POST /emails (Bulk Dispatch List)
    Mail-->>API: 200 OK (Queued by Resend)
    API-->>App: JSON {status: "success", action: "bulk_mail"}
    App-->>PM: Đổi màu Banner thành Xanh (Success) + Rung máy
```

### 5. Quy Trình Xác Thực OTP 4 Số & Đồng Bộ Dữ Liệu Tự Động (PWA & Offline Fallback Security Flow)
```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng PWA
    participant Client as Frontend (Auth.jsx)
    participant API as FastAPI Backend (auth.py)
    participant DB as SQLite / Supabase PostgreSQL
    participant Sync as Dynamic Sync Engine

    Note over Sync,DB: Hoạt động đồng bộ khi khởi chạy máy chủ
    Sync->>DB: Truy vấn dữ liệu từ Supabase PostgreSQL (nếu online)
    DB-->>Sync: Trả về Users, Settings, Projects, Tasks
    Sync->>DB: Upsert (merge) toàn bộ dữ liệu vào SQLite local (yourai.db)

    Note over User,Client: Luồng Yêu cầu Quên Mật Khẩu (Forgot Password)
    User->>Client: Nhập email & Gửi yêu cầu
    Client->>API: POST /forgot-password {email}
    API->>DB: Kiểm tra trường last_password_reset_at
    alt Đã đổi mật khẩu trong vòng 3 ngày qua
        API-->>Client: Báo lỗi 400 (Chặn đổi mật khẩu liên tục)
        Client-->>User: Hiển thị thông báo chờ còn lại (ngày, giờ, phút)
    else Hợp lệ (quá 3 ngày hoặc chưa đổi bao giờ)
        API->>API: Sinh mã OTP 4 số ngẫu nhiên
        API->>API: Thiết lập thời gian hết hạn của mã là 60 giây
        API->>DB: Lưu reset_code & reset_code_expires_at
        API-->>Client: Trả về 200 OK (Mã OTP đã được gửi qua Resend)
        Client->>Client: Kích hoạt màn hình Reset & khởi chạy Timer 60s thời gian thực
    end

    Note over User,Client: Luồng Đặt lại Mật khẩu & Đếm ngược 60s
    alt Đếm ngược thời gian thực chạm 0 (Hết 60s)
        Client->>Client: Báo lỗi hết hạn OTP & tự động chuyển hướng về trang Login
    else Nhập OTP 4 số & Mật khẩu mới trong vòng 60s
        User->>Client: Nhập 4 ô vuông OTP + Mật khẩu độ phức tạp cao
        Client->>API: POST /reset-password {email, token, new_password}
        API->>DB: Xác minh mã & thời hạn (< 60s)
        API->>API: Kiểm tra độ mạnh mật khẩu (8 ký tự, 1 số, 1 ký tự đặc biệt)
        API->>DB: Lưu mật khẩu băm, cập nhật last_password_reset_at = UTCNow
        API-->>Client: Trả về 200 OK (Đặt lại mật khẩu thành công)
        Client-->>User: Thông báo thành công & tự động chuyển về trang Login
    end
```

### 6. Vòng Đời Trạng Thái Công Việc (State Machine)
```mermaid
graph TD
    Start([Tạo mới - Create Task]) --> TODO[TODO]
    TODO -->|Bắt đầu làm| IN_PROGRESS[IN PROGRESS]
    IN_PROGRESS -->|Tạm nghỉ| TODO
    IN_PROGRESS -->|Gặp vướng mắc| BLOCKED[BLOCKED]
    BLOCKED -->|Giải quyết xong| IN_PROGRESS
    IN_PROGRESS -->|Xác nhận hoàn thành| DONE[DONE]
    DONE -->|Mở lại| TODO
    
    TODO -->|Xóa/Hủy| ARCHIVED[ARCHIVED]
    IN_PROGRESS -->|Hủy| ARCHIVED
    BLOCKED -->|Hủy| ARCHIVED
    DONE -->|Đóng dự án| ARCHIVED
    ARCHIVED --> End([Kết thúc])
    
```


### 7. Lên Lịch Tự Động & Bắn Mail (BPMN Workflow)
```mermaid
graph TD
    subgraph Lane_1 ["Lane 1: Project Manager (Người Dùng)"]
        Start((Bắt đầu)) --> Assign[Điền Form Giao Việc & Email]
        Assign --> Toggle[Bật công tắc 'Automation Email']
        Toggle --> Submit[Bấm Xác Nhận]
    end
    subgraph Lane_2 ["Lane 2: Core Engine (FastAPI & DB)"]
        Submit --> AuthCheck{JWT Hợp lệ?}
        AuthCheck -->|No| Reject[Báo lỗi 401]
        AuthCheck -->|Yes| SaveDB[Lưu Task vào Database]
        SaveDB --> SaveStatus[Lưu Member Status = Pending]
        SaveStatus --> CalcTime[Tính thời điểm trừ lùi 24h]
        CalcTime --> SetTimer((Đẩy Job vào Redis))
    end
    subgraph Lane_3 ["Lane 3: Background Worker & External"]
        SetTimer -. Chờ đến ETA .-> PopJob[Worker Kéo Job Ra]
        PopJob --> Render[Render Jinja2 HTML Template]
        Render --> CallAPI[Gọi Resend HTTP API]
        CallAPI --> SMTP[Resend Server xử lý DKIM/SPF]
        SMTP --> End((Thành viên nhận Mail))
    end
```

---

## 🛠️ Bộ Tech Stack Tối Ưu Chi Phí Doanh Nghiệp (Zero-Cost Stack)

- **Cloudflare CDN & WAF**: Proxy ẩn IP, chống DDoS, tối ưu Edge caching tài nguyên tĩnh.
- **FastAPI (Lõi Asyncpg + SQLAlchemy)**: High-performance async gateway, tự động sinh tài liệu Swagger OpenAPI chuyên nghiệp.
- **Supabase Auth & PostgreSQL + RLS**: Hệ thống nhận dạng người dùng mạnh mẽ kết hợp cô lập dữ liệu cấp độ DB lõi (Row Level Security).
- **Upstash Redis (Rate Limiter & ARQ)**: Giới hạn tần suất và quản lý hàng đợi công việc bất đồng bộ (3-strike exponential backoff retry).
- **Service Worker PWA & Web Push (VAPID)**: Kích hoạt ứng dụng ngoại tuyến (Offline) và gửi thông báo trực tiếp trên iOS/macOS không cần SDK nặng nề.
- **Google Gemini API**: Trí tuệ nhân tạo nhận dạng hàm (Function Calling) và trích xuất cấu trúc dữ liệu tiếng Việt.

---

## 📂 Cấu Trúc Dự Án (Enterprise Monorepo Directory)

```text
├── backend-engine/                 # Lõi FastAPI + ARQ Worker
│   ├── app/
│   │   ├── api/                    # Tầng REST API Routers
│   │   │   ├── dependencies/       # get_db(), get_current_user()
│   │   │   └── v1/                 # Các routers chức năng v1
│   │   ├── core/                   # Cấu hình hệ thống, rate limiter
│   │   ├── db/                     # asyncpg engine, ORM models
│   │   ├── schemas/                # Validate Pydantic Schemas
│   │   ├── services/               # Lõi GPA math, Gemini AI, Resend SMTP
│   │   └── worker/                 # ARQ background workers & jobs
│   ├── templates/                  # Thư mục chứa mẫu email sang trọng
│   ├── requirements.txt            # Quản lý thư viện Python
│   └── main.py                     # Khởi chạy ứng dụng
│
├── frontend-pwa/                   # PWA React App
│   ├── public/                     # manifest.json, service-worker.js, logo.png
│   ├── src/                        # Core network, App.jsx, index.css
│   └── vite.config.js              # Cấu hình Vite bundler
```

---

## 🚀 Hướng Dẫn Chạy Cài Đặt & Vận Hành (Quickstart)

### 1. Khởi Chạy Backend (FastAPI Engine)
Di chuyển vào thư mục backend và cài đặt thư viện cần thiết:
```bash
cd backend-engine
pip install -r requirements.txt
```

Cấu hình các API Key và kết nối cơ sở dữ liệu trong file `.env` (Mặc định đã được thiết lập chạy SQLite local cực nhanh để kiểm thử):
```bash
# Chạy server Uvicorn local
python main.py
```
*Tru cập Swagger API docs tại:* `http://localhost:8000/docs`

### 2. Khởi Chạy Frontend (PWA App)
Di chuyển vào thư mục frontend và cài đặt dependencies:
```bash
cd frontend-pwa
npm install
npm run dev
```
*Truy cập bảng điều khiển giao diện tại:* `http://localhost:5173`

---

## 🎨 Hệ Thống Thiết Kế Luxury UI/UX Design System
- **Accents Vàng Kim**: `#D4AF37` (Classic Gold) đem lại vẻ lịch lãm và quý phái.
- **Nghệ Thuật Chữ**: Sự kết hợp giữa `Playfair Display` cổ điển quyền lực và `Montserrat` tối giản hiện đại.
- **Surface**: Alabaster White (`#FAF9F6`) dịu mắt phối hợp hiệu ứng mờ nhòe kính cường lực (**Glassmorphism**) đem lại chiều sâu vô song cho giao diện.

---

## 🔒 Cô Lập Dữ Liệu Đa Tài Khoản & Khởi Tạo Trạng Thái Về 0 (Zero-State Workspace)

Để đáp ứng tiêu chuẩn kiến trúc Enterprise-grade, hệ thống đảm bảo cô lập dữ liệu 100% giữa các người dùng:
1. **Database Level Isolation**: Tất cả các truy vấn thông tin công việc (`TASKS`), dự án (`PROJECTS`), cấu hình giao diện (`USER_SETTINGS`), và học tập (`GPA_YEARS`, `GPA_TERMS`, `GPA_SUBJECTS`, `GPA_COMPONENTS`) trên backend đều được lọc nghiêm ngặt qua khóa ngoại `user_id == current_user.id`. Đảm bảo người dùng này tuyệt đối không thể xem hay sửa đổi dữ liệu của người dùng khác.
2. **Zero-State Workspace**: Trạng thái mặc định ban đầu của Dashboard khi người dùng mới đăng ký hoàn toàn trống rỗng (`0 tasks`, `0 projects`, `0 subjects`). Giúp người dùng có toàn quyền thiết lập và cá nhân hóa lộ trình của riêng mình mà không bị chồng lấn hay ảnh hưởng bởi các giá trị mock cũ.

---

## 📸 Minh Chứng Thực Nghiệm & Visual Test Suite

Dưới đây là hình ảnh thực tế ghi lại từ Suite Kiểm thử Trình duyệt Tự động (Browser Subagent) về giao diện đăng nhập split-screen thương lưu và thông báo trạng thái:

### 1. Giao Diện Đăng Nhập Luxury Split-Screen Welcome Page
Sử dụng thiết kế chia đôi màn hình tối giản thanh lịch: Cột trái Obsidian-Dark mang biểu trưng logo thương hiệu YourAI ở tâm dọc và châm ngôn *"Elegance in Productivity"* vàng gold; Cột phải Pure-White với ô nhập liệu dạng kẻ chân thanh mảnh, tính năng **Remember me** tự động lưu trữ thông tin đăng nhập bảo mật trong localStorage, và nút bấm *"ENTER WORKSPACE"* sang trọng:

![Luxury Split-Screen Welcome Page](./artifacts/logo_auth_remember_me.png)

### 2. Thông Báo Đăng Xuất Thành Công (Secure Logout Redirect)
Khi người dùng bấm nút "Đăng xuất" ở góc trái sidebar, phiên làm việc sẽ bị chấm dứt ngay lập tức trên cookies bảo mật, đưa người dùng trở lại màn hình đăng nhập kèm thông báo Toast Gold-Black *"Đăng xuất thành công!"*:

![Secure Logout Redirect](./artifacts/final_auth_success.png)
