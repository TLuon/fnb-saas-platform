# SETUP.md — Hướng Dẫn Cài Đặt Môi Trường

## 0. Cấu trúc monorepo & khởi tạo khung 3 ứng dụng

Dùng **npm workspaces** (không cần Turborepo cho quy mô đồ án) để B1/B2 và F1/F2 dùng chung `node_modules`, đỡ lệch version.

```bash
mkdir fnb-saas-platform
cd fnb-saas-platform
git init
mkdir apps
mkdir docs
```

> Nếu dùng PowerShell trên Windows, thay phần tạo thư mục bằng `New-Item -ItemType Directory -Force apps, docs`. Các lệnh `cd` bên dưới có thể chạy lần lượt trong PowerShell.

Tạo `package.json` gốc:
```json
{
  "name": "fnb-saas-platform",
  "private": true,
  "workspaces": ["apps/*"]
}
```

**Khởi tạo từng app (chạy 1 lần, người đầu tiên setup xong commit lên cho cả nhóm pull về):**

```bash
# Backend — NestJS
cd apps
npx @nestjs/cli new api --package-manager npm
# chọn "npm" khi được hỏi

# Staff Dashboard — React + Vite
npm create vite@latest staff-dashboard -- --template react-ts

# Customer PWA — Next.js
npx create-next-app@latest customer-pwa --typescript --app --tailwind
cd ..
```

Sau bước này bạn có đúng cấu trúc `apps/api`, `apps/staff-dashboard`, `apps/customer-pwa` mà `CODING_CONVENTION.md` mục 1.1/2.1 mô tả — copy 11 file `.md` tài liệu vào `docs/` rồi commit lần đầu lên GitHub trước khi bắt đầu code (xem hướng dẫn tạo repo đã trao đổi trước đó).

## 1. Yêu cầu tiên quyết

- Node.js ≥ 20.x, npm ≥ 10.x
- Tài khoản [Supabase](https://supabase.com) (free tier đủ dùng cho đồ án)
- Redis (chạy local qua Docker, hoặc dùng free tier của Upstash cho môi trường không cài được Docker)
- Git

## 2. Tạo Supabase Project

1. Tạo project mới trên Supabase Dashboard, ghi lại: `Project URL`, `anon public key`, `service_role key` (giữ bí mật, không commit).
2. B1 chép DDL vào `apps/api/database/migrations/001_init.sql`, kiểm tra trên branch trước rồi chạy file đó trong **SQL Editor**. Không chạy trực tiếp nhiều bản copy khác nhau từ Markdown. Từ lần thứ 2 trở đi, mọi thay đổi schema phải là file `00X_*.sql` mới, không sửa lại migration đã chạy.
3. Chạy tiếp script trong `ERD.md` (mục 3: Triggers & Functions).
4. Chạy toàn bộ script trong `RLS_POLICIES.md` (helper functions, bật RLS, tạo policy).
5. Vào **Authentication → Hooks** → chọn loại hook **"Custom Access Token"** → trỏ vào function `custom_access_token_hook` đã tạo ở bước 4 → Save. Test lại bằng cách login thử và decode JWT ở jwt.io — phải thấy `role_app`, `tenant_id` trong payload; nếu không thấy, hook chưa được bật đúng chỗ.
6. Vào **Database → Replication** → chỉ bật Realtime cho bảng `tables`. Các event KDS, Group-Order và Support do Socket.IO phát thủ công theo `REALTIME_EVENTS.md`.

## 3. Redis

**Local (Docker):**
```bash
docker run -d --name fnb-redis -p 6379:6379 redis:7-alpine
```

**Hoặc dùng Upstash (không cần Docker):** tạo database free tại upstash.com, lấy connection string dạng `rediss://...`.

## 4. Cài package theo từng tính năng đặc thù

Chạy `npm install` cơ bản (mục 8) chỉ cài dependency mặc định của từng framework — **chưa đủ** cho các tính năng riêng của đề tài. Cài thêm:

### `apps/api` (NestJS)
```bash
cd apps/api
npm install @supabase/supabase-js ioredis
npm install class-validator class-transformer
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install otplib qrcode
npm install -D @types/qrcode
```
- `@supabase/supabase-js` — gọi Postgres qua Supabase client (tôn trọng RLS bằng JWT của user, xem `RLS_POLICIES.md` mục 5)
- `ioredis` — Redis client cho Reservation lock + Group-Order session
- `@nestjs/websockets` + `socket.io` — dựng Gateway cho các kênh `kds:*`, `group_order:*` và `support:*` (xem mục 5 bên dưới)
- `otplib` — sinh/xác thực mã TOTP cho Coffee Pass (`API_CONTRACT.md` mục 6)
- `qrcode` — sinh ảnh QR từ chuỗi VietQR mock

### `apps/staff-dashboard` (Vite React)
```bash
cd apps/staff-dashboard
npm install @supabase/supabase-js @tanstack/react-query axios socket.io-client zustand
```

### `apps/customer-pwa` (Next.js)
```bash
cd apps/customer-pwa
npm install @supabase/supabase-js @tanstack/react-query axios socket.io-client zustand
```

## 5. Dựng Socket.IO Gateway cho event nghiệp vụ (bắt buộc, không thể bỏ qua)

`REALTIME_EVENTS.md` quy định `tables:*` dùng Supabase Realtime. Các event `kds:*`, `group_order:*` và `support:*` phải tự dựng WebSocket Gateway trong `apps/api`:

```typescript
// apps/api/src/common/gateways/app.gateway.ts
// Pseudocode: implement AuthenticatedSocket, authorizeChannel and the JWT
// middleware/guard in the NestJS common module before enabling this gateway.
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: ['http://localhost:5173', 'http://localhost:3001'] } })
export class AppGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('join')
  join(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() body: { channel: string }) {
    // Validate channel against socket.user.tenant_id, branch_id and role_app.
    const channel = this.authorizeChannel(socket.user, body.channel);
    socket.join(channel);
  }

  emitGroupOrderUpdate(tenantId: string, tableId: string, payload: unknown) {
    this.server.to(`group_order:${tenantId}:${tableId}`).emit('group_order_cart_updated', payload);
  }

  emitSupportEvent(tenantId: string, event: string, payload: unknown) {
    this.server.to(`support:${tenantId}`).emit(event, payload);
  }
}
```
`AuthenticatedSocket` phải được gắn JWT user ở handshake bằng Socket.IO middleware/guard. Không tin `tenant_id`, `branch_id` hoặc role do client gửi. `authorizeChannel` chỉ cho `CUSTOMER` join đúng group-order của tenant/table đã được kiểm tra; `STAFF`/`OWNER` join đúng branch KDS; `SUPPORT`/`OWNER` join support của tenant. Inject `AppGateway` vào `OrderService`/`GroupOrderService`/`SupportService` và chỉ emit sau khi ghi Redis/Postgres thành công.

## 6. CORS

NestJS mặc định chặn cross-origin. Vì 3 app chạy 3 cổng khác nhau (`3000` API, `5173` staff-dashboard, `3001` customer-pwa), thêm vào `apps/api/src/main.ts`:

```typescript
app.enableCors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
});
```

Socket.IO phải dùng cùng allow-list origin và JWT guard như HTTP API; không dùng `origin: '*'` khi triển khai.

## 7. Biến môi trường

### `apps/api/.env` (NestJS)
```env
PORT=3000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx   # chỉ dùng cho job hệ thống, KHÔNG forward ra route người dùng
REDIS_URL=redis://localhost:6379
JWT_ISSUER=https://xxxx.supabase.co/auth/v1
MOCK_WEBHOOK_SECRET=change-me
```

### `apps/staff-dashboard/.env`
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

### `apps/customer-pwa/.env.local`
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
```

## 8. Cài đặt & chạy local

```bash
# Từ thư mục gốc (nhờ npm workspaces, chỉ cần 1 lần install ở root cũng được)
npm install

# Backend
cd apps/api && npm run start:dev          # http://localhost:3000

# Staff dashboard
cd apps/staff-dashboard && npm run dev    # http://localhost:5173

# Customer PWA
cd apps/customer-pwa && npm run dev       # http://localhost:3001
```

## 9. Seed dữ liệu mẫu (use case quán cà phê)

Tạo file `apps/api/database/seed.sql`, chạy trong Supabase SQL Editor **sau khi** đã chạy xong các migration `001_init.sql`, `002_functions.sql` và `003_rls.sql`. SQL Editor chạy bằng quyền quản trị database, nhưng không đưa `service_role` key vào source code:

```sql
-- 1. Tenant + Branch
INSERT INTO tenants (id, name, subdomain) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Cà Phê Đồ Án', 'cafe-do-an');

INSERT INTO branches (id, tenant_id, name, address) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Chi nhánh Quận 7', '123 Nguyễn Văn Linh, Q7, TP.HCM');

-- 2. User nội bộ mẫu — LƯU Ý: auth_user_id phải trỏ đúng UUID có thật trong
-- auth.users (tạo trước qua Supabase Dashboard > Authentication > Add user,
-- hoặc gọi /auth/register rồi tự UPDATE role thủ công vì register chỉ tạo CUSTOMER —
-- xem ghi chú bảo mật ở API_CONTRACT.md mục 1). Thay 3 UUID placeholder bên dưới
-- bằng auth_user_id thật trước khi chạy.
INSERT INTO users (auth_user_id, tenant_id, branch_id, full_name, role, phone, is_active) VALUES
  ('AUTH-UUID-OWNER-PLACEHOLDER', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Nguyễn Văn Chủ', 'OWNER', '0900000001', TRUE),
  ('AUTH-UUID-STAFF-PLACEHOLDER', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Trần Thị Nhân Viên', 'STAFF', '0900000002', TRUE),
  ('AUTH-UUID-SUPPORT-PLACEHOLDER', '11111111-1111-1111-1111-111111111111', NULL, 'Lê Văn CSKH', 'SUPPORT', '0900000003', TRUE);

-- 3. Floor + Tables (rải tọa độ để demo Floor Editor)
INSERT INTO floors (id, branch_id, name, floor_level) VALUES
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Tầng trệt', 1);

INSERT INTO tables (floor_id, table_code, capacity, pos_x, pos_y) VALUES
  ('33333333-3333-3333-3333-333333333333', 'B01', 2, 50, 50),
  ('33333333-3333-3333-3333-333333333333', 'B02', 2, 180, 50),
  ('33333333-3333-3333-3333-333333333333', 'B03', 4, 310, 50),
  ('33333333-3333-3333-3333-333333333333', 'B04', 4, 50, 180),
  ('33333333-3333-3333-3333-333333333333', 'B05', 6, 180, 180),
  ('33333333-3333-3333-3333-333333333333', 'B06', 2, 310, 180),
  ('33333333-3333-3333-3333-333333333333', 'B07', 4, 50, 310),
  ('33333333-3333-3333-3333-333333333333', 'B08', 4, 180, 310);

-- 4. Categories + Products
INSERT INTO categories (id, tenant_id, name, kitchen_station) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Đồ uống', 'BAR'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Đồ ăn', 'KITCHEN');

INSERT INTO products (tenant_id, category_id, name, price) VALUES
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Cà phê sữa đá', 29000),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Trà đào cam sả', 39000),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Bạc xỉu', 32000),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Matcha đá xay', 45000),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Bánh mì que pate', 25000),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Bánh croissant', 35000),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Sandwich gà nướng', 42000),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Khoai tây chiên', 28000);
```

> Vì `auth_user_id` phụ thuộc Supabase Auth (không tạo trước bằng SQL thuần được), thứ tự đúng là: (1) tạo 3 tài khoản OWNER/STAFF/SUPPORT qua **Supabase Dashboard → Authentication → Add user** (email/password tùy chọn), (2) copy UUID của từng user, (3) thay vào 3 chỗ placeholder ở trên rồi mới chạy phần `INSERT INTO users`.

## 10. Kiểm tra nhanh sau khi setup

1. Gọi `POST /auth/login` với user OWNER seed sẵn → nhận JWT → decode tại jwt.io kiểm tra có đủ `role_app`, `tenant_id`.
2. Gọi `GET /floors/:id/tables` → phải trả đúng 8 bàn đã seed.
3. Mở 2 tab trình duyệt (Staff dashboard + Customer PWA), đổi trạng thái 1 bàn từ Staff → xác nhận Customer thấy realtime cập nhật theo `table_status_changed`.
4. Thử khóa cùng 1 bàn từ 2 tab Customer → tab thứ 2 phải nhận `ERR_2002_TABLE_LOCKED`.
5. Gọi `POST /auth/register` với `tenant_subdomain` hợp lệ và body cố tình chèn thêm field `"role": "OWNER"` → xác nhận backend **bỏ qua field này hoàn toàn**, tài khoản tạo ra vẫn chỉ là `CUSTOMER` trong bảng `customers` (không lọt vào `users`) — xem `API_CONTRACT.md` mục 1.
6. Mở 2 tab Customer PWA cùng join 1 bàn qua `POST /group-order/join` → thêm món ở tab 1 → xác nhận tab 2 nhận `group_order_cart_updated` qua Socket.IO Gateway (mục 5) trong vòng dưới 1 giây.