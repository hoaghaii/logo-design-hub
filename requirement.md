# Freelance Design Platform — Requirements Document

## 1. Project Overview

Marketplace kết nối **Client** (người cần thiết kế) với **Designer** (freelancer). Client đăng job, Designer apply, 2 bên có thể deal giá qua giao diện riêng, sau đó tạo Order có escrow mock payment và deadline tự động.

---

## 2. Actors

| Actor | Vai trò |
|---|---|
| **Client** | Đăng job, chọn Designer, review và thanh toán |
| **Designer** | Browse job, apply kèm portfolio, submit file thiết kế |
| **System** | Xử lý escrow logic, deadline tự động, file lock |

---

## 3. Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend + Backend | Next.js (App Router) |
| Database | Supabase (PostgreSQL) |
| Realtime / Webhook | Supabase Realtime (Postgres Changes) |
| File Storage | Supabase Storage |
| Deploy | Vercel |
| Auth | Supabase Auth |

---

## 4. User Flow

```
Client đăng job (tiêu đề, mô tả, budget, deadline gợi ý)
       ↓
Designer browse danh sách job → apply kèm portfolio mẫu + cover note
       ↓
Client xem danh sách applicants → chọn 1 Designer
       ↓
       ┌──────────────────────────────────────┐
       │ [Optional] Designer gửi Deal Request │
       │   → Đề xuất giá khác + ghi chú      │
       │   → Supabase Realtime notify Client  │
       │   → Client accept / counter-offer    │
       │   → Realtime notify lại Designer     │
       │   → 2 bên confirm → giá chốt         │
       │ [Nếu không deal] giữ nguyên budget   │
       └──────────────────────────────────────┘
       ↓
Tạo Order (giá chốt, % ký quỹ, deadline)
       ↓  ← Realtime notify cả 2: Order active
Client mock pay deposit (bấm "Confirm Pay" — không tích hợp cổng thật)
       ↓  ← Realtime notify Designer: bắt đầu làm
Designer submit file thiết kế
       ↓  ← Realtime notify Client: có file cần review
Client review
  ├─ Accept → mock pay phần còn lại → Designer nhận full
  └─ Reject → hoàn deposit về ví mock, file bị lock (không dùng được)
       ↓
Nếu Designer miss deadline
  → System auto đổi trạng thái order → hoàn deposit
  ← Realtime notify cả 2
```

---

## 5. Database Schema

### users
```sql
id           uuid PRIMARY KEY
email        text UNIQUE
full_name    text
role         enum('client', 'designer')
avatar_url   text
bio          text
created_at   timestamp
```

### portfolios (của Designer)
```sql
id           uuid PRIMARY KEY
designer_id  uuid REFERENCES users(id)
title        text
image_url    text
category     text
created_at   timestamp
```

### jobs
```sql
id           uuid PRIMARY KEY
client_id    uuid REFERENCES users(id)
title        text
description  text
budget       numeric
status       enum('open', 'in_progress', 'completed', 'cancelled')
created_at   timestamp
```

### applications
```sql
id           uuid PRIMARY KEY
job_id       uuid REFERENCES jobs(id)
designer_id  uuid REFERENCES users(id)
cover_note   text
portfolio_ids uuid[]
status       enum('pending', 'accepted', 'rejected')
created_at   timestamp
```

### deal_requests
```sql
id              uuid PRIMARY KEY
application_id  uuid REFERENCES applications(id)
proposed_by     uuid REFERENCES users(id)
proposed_price  numeric
note            text
status          enum('pending', 'accepted', 'countered', 'rejected')
created_at      timestamp
```

### orders
```sql
id               uuid PRIMARY KEY
job_id           uuid REFERENCES jobs(id)
client_id        uuid REFERENCES users(id)
designer_id      uuid REFERENCES users(id)
final_price      numeric
deadline         timestamp
contract_address text                  -- mock: 0x + hex từ order id
status           enum('pending_escrow', 'active', 'submitted', 'completed', 'rejected', 'refunded')
created_at       timestamp
```

### transactions
> Xem chi tiết ở **mục 8.4**

### deliverables
```sql
id           uuid PRIMARY KEY
order_id     uuid REFERENCES orders(id)
file_url     text
is_locked    boolean DEFAULT false
submitted_at timestamp
```

---

## 6. Supabase Realtime — Sự kiện cần lắng nghe

| Bảng thay đổi | Sự kiện | Ai nhận |
|---|---|---|
| `deal_requests` INSERT | Designer gửi deal request | Client |
| `deal_requests` UPDATE (status = countered/accepted) | Client phản hồi | Designer |
| `orders` INSERT | Order / hợp đồng được khởi tạo | Cả 2 |
| `orders` UPDATE (status = active) | Client đã ký quỹ vào Escrow | Designer |
| `deliverables` INSERT | Designer nộp sản phẩm | Client |
| `orders` UPDATE (status = completed) | Client duyệt — Escrow giải ngân | Designer |
| `orders` UPDATE (status = rejected) | Client từ chối — Escrow hoàn tiền | Designer |
| `orders` UPDATE (status = refunded) | System auto hoàn tiền (miss deadline) | Cả 2 |

---

## 7. Tính năng chi tiết

### Auth
- [ ] Đăng ký / Đăng nhập bằng Supabase Auth
- [ ] Chọn role khi đăng ký (Client / Designer)

### Designer
- [ ] Tạo / chỉnh sửa profile
- [ ] Upload ảnh mẫu portfolio (Supabase Storage)
- [ ] Browse danh sách job
- [ ] Apply vào job (chọn portfolio mẫu + cover note)
- [ ] Gửi Deal Request (optional, có thể bỏ qua)
- [ ] Xem Order đang active
- [ ] Submit file thiết kế
- [ ] Nhận thông báo realtime

### Client
- [ ] Đăng job (tiêu đề, mô tả, budget)
- [ ] Xem danh sách applicants
- [ ] Chọn Designer
- [ ] Accept / Counter deal request
- [ ] Tạo Order → sinh mock contract address
- [ ] **Ký quỹ vào Escrow** (bấm button, loading 2s, balance trừ)
- [ ] Xem trạng thái escrow theo từng bước
- [ ] Review file → **Duyệt (giải ngân)** / **Từ chối (hoàn tiền)**
- [ ] Nhận thông báo realtime

### System / Tự động
- [ ] Cron job (hoặc Supabase Edge Function scheduled) check deadline mỗi giờ
- [ ] Nếu `order.deadline < now` và `status = active` → đổi status thành `refunded`
- [ ] Nếu rejected → `deliverable.is_locked = true`

---

## 8. Mock Crypto Escrow Payment

> Mô phỏng hệ thống ký quỹ hợp đồng thông minh (Smart Contract Escrow). Không tích hợp blockchain thật — toàn bộ là mock UI + DB, nhưng UX phải giống hệt crypto escrow thực tế.

---

### 8.1. Luồng 6 bước (theo ảnh)

```
BƯỚC 1 — TẠO VIỆC
  Client tạo job với mô tả, ngân sách, thời hạn
  → Job được đăng lên marketplace

BƯỚC 2 — NHẬN VIỆC
  Designer apply → Client chọn → (optional) deal giá
  → Cả 2 xác nhận điều khoản
  → Hệ thống tạo "Hợp đồng thông minh" mock (order record)

BƯỚC 3 — KÝ QUỸ (Escrow)
  Client nạp tiền vào Escrow mock
  → UI hiển thị: "Tiền đã được khóa trong Escrow Contract"
  → Hiện mock contract address (ví dụ: 0xABCD...1234)
  → Wallet balance của Client bị trừ
  → Realtime notify Designer: "Escrow đã được nạp, bắt đầu thực hiện"

BƯỚC 4 — THỰC HIỆN
  Designer làm việc → upload file → submit lên hệ thống
  → UI hiển thị: "Sản phẩm đã được nộp, đang chờ Client duyệt"
  → Realtime notify Client

BƯỚC 5 — DUYỆT / TỪ CHỐI
  Client xem file → chọn Duyệt hoặc Từ chối

BƯỚC 6 — GIẢI NGÂN / HOÀN TIỀN
  ├─ Duyệt   → "Escrow tự động giải ngân" → Designer nhận tiền
  └─ Từ chối → "Escrow hoàn tiền tự động" → Client nhận lại tiền
                                           → File bị lock
  Nếu miss deadline → System tự động hoàn tiền (giải phóng escrow)
```

---

### 8.2. Mock UI cần có

**Trang Escrow / Thanh toán (`/orders/[id]/escrow`)**
- Hiển thị **mock contract address**: `0x` + random hex string gắn với order id
- Hiển thị trạng thái escrow theo từng bước với icon + màu sắc:
  ```
  ● Hợp đồng khởi tạo       ✅
  ● Tiền đã vào Escrow       ✅ (sau khi Client ký quỹ)
  ● Đang thực hiện           🔄 (sau khi Designer nhận)
  ● Sản phẩm đã nộp          ✅ (sau khi Designer submit)
  ● Chờ duyệt                🔄
  ● Giải ngân / Hoàn tiền    ✅ / ❌
  ```
- Hiển thị **Wallet Balance** của user hiện tại (mock, lưu trong DB)
- Button **"Ký quỹ vào Escrow"** → sau khi bấm hiện loading giả 2 giây → cập nhật trạng thái
- Button **"Giải ngân"** (Accept) hoặc **"Hoàn tiền"** (Reject)

---

### 8.3. Mock Wallet

Mỗi user có `wallet_balance` trong DB. Khi tạo tài khoản, seed sẵn một số tiền mock (ví dụ 10,000,000 VND hoặc 1000 USDT).

```sql
-- Thêm vào bảng users
wallet_balance  numeric DEFAULT 10000000
```

Các thao tác trừ/cộng tiền đều cập nhật trực tiếp vào `wallet_balance` và ghi log vào `transactions`.

---

### 8.4. DB — transactions cập nhật

```sql
id              uuid PRIMARY KEY
order_id        uuid REFERENCES orders(id)
from_user_id    uuid REFERENCES users(id)
to_user_id      uuid REFERENCES users(id)   -- null nếu vào escrow
type            enum('escrow_lock', 'escrow_release', 'escrow_refund')
amount          numeric
contract_address text                        -- mock hex string
tx_hash         text                         -- mock hash (random)
status          enum('pending', 'confirmed')
created_at      timestamp
```

> `tx_hash` mock ví dụ: `0x3f8a...d291` — hiển thị trên UI cho giống explorer blockchain

---

### 8.5. Luồng DB khi từng bước xảy ra

| Bước | Hành động DB |
|---|---|
| Client ký quỹ | `wallet_balance` Client trừ, ghi `transactions` (escrow_lock), `orders.status = active` |
| Designer submit | `deliverables` INSERT, `orders.status = submitted` |
| Client duyệt | `wallet_balance` Designer cộng, ghi `transactions` (escrow_release), `orders.status = completed` |
| Client từ chối | `wallet_balance` Client cộng lại, ghi `transactions` (escrow_refund), `orders.status = rejected`, `deliverable.is_locked = true` |
| Miss deadline | System tự động: giống từ chối, `orders.status = refunded` |

---

## 9. Các trang (Pages)

```
/                        Landing page
/auth/login
/auth/register

/jobs                    Danh sách job (Designer xem)
/jobs/[id]               Chi tiết job + nút Apply
/jobs/create             Client tạo job mới
/jobs/manage             Client quản lý job đã đăng

/applications/[jobId]    Client xem applicants của 1 job

/deal/[applicationId]    Giao diện deal giá (nếu có)

/orders                  Danh sách order của user
/orders/[id]             Chi tiết order
/orders/[id]/escrow      Trang Escrow — hiển thị contract, trạng thái 6 bước, wallet

/profile/[userId]        Trang profile Designer
/profile/edit            Chỉnh sửa profile của mình

/notifications           Danh sách thông báo
```

---

## 10. Out of Scope (MVP)

- Thanh toán thật
- Rating / Review
- Admin dashboard
- Dispute resolution
- Search nâng cao / filter phức tạp
- Email notification