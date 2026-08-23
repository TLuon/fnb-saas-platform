# CODING_CONVENTION.md — Quy Ước Code

## 1. Backend — NestJS

### 1.1. Cấu trúc thư mục (chia theo module nghiệp vụ, khớp `TASK_ASSIGNMENT.md`)

```
src/
  common/              # guard, decorator, interceptor dùng chung (@Roles, TenantGuard, ResponseInterceptor)
  config/              # supabase.config.ts, redis.config.ts
  modules/
    auth/
    floor/               # floors + tables
    reservation/         # reservations + payment mock
    order/               # orders + order_items + KDS
    group-order/         # Redis session
    wallet/              # wallet + coffee-pass
    cdp/                 # loyalty + reports
    support/             # unmatched + tickets
  main.ts
```

Mỗi module con theo chuẩn NestJS: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/` (interface TypeScript khớp `ERD.md`, không dùng ORM entity decorator vì query qua Supabase client).

### 1.2. Quy ước đặt tên

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| File | kebab-case | `unmatched-transaction.service.ts` |
| Class | PascalCase | `UnmatchedTransactionService` |
| DTO | PascalCase + hậu tố `Dto` | `CreateReservationDto`, `ApproveUnmatchedTxDto` |
| Biến/hàm | camelCase | `getSuggestedCustomers()` |
| Route path | kebab-case, số nhiều | `/support/unmatched`, `/coffee-pass` |
| Cột DB / JSON field | snake_case (khớp `ERD.md`, **không** map sang camelCase ở tầng response để tránh lệch với `API_CONTRACT.md`) | `table_id`, `csat_score` |
| Error code | `ERR_<nhóm 1 chữ số>xxx_UPPER_SNAKE` | xem `ERROR_CODES.md` |

### 1.3. Guard & decorator bắt buộc

- `@UseGuards(SupabaseAuthGuard, TenantGuard, RolesGuard)` trên mọi controller trừ route đánh dấu `@Public()`
- `@Roles('OWNER', 'STAFF')` khai báo role cho phép — đối chiếu cột **Role** trong `API_CONTRACT.md`
- Mọi service query Supabase phải forward JWT của request hiện tại (không dùng `service_role` key trong request path của user) — xem `RLS_POLICIES.md` mục 5

### 1.4. Validation & response

- DTO validate bằng `class-validator` + `ValidationPipe({ whitelist: true })`
- Toàn bộ response bọc qua `ResponseInterceptor` theo envelope tại `API_CONTRACT.md`
- Exception filter toàn cục map lỗi nghiệp vụ sang `ERROR_CODES.md`, không để lộ stack trace ở production

## 2. Frontend — React (Vite) / Next.js

### 2.1. Cấu trúc thư mục (2 ứng dụng riêng biệt trong 1 monorepo)

```
apps/
  staff-dashboard/     # Owner + Staff + Support — React (Vite), SPA nội bộ
    src/
      features/
        floor-editor/
        pos/
        cdp/
        support/
      components/
      hooks/
      lib/api-client.ts
      lib/realtime-client.ts
  customer-pwa/        # Customer — Next.js (PWA)
    app/
      (auth)/
      reservation/
      menu/
      wallet/
```

### 2.2. Quy ước

- Component: PascalCase file + export mặc định — `FloorEditorCanvas.tsx`
- Hook tự viết: `use` + camelCase — `useTableRealtime.ts`
- State server (API data): TanStack Query, key theo pattern `[resource, id]` — vd. `['tables', floorId]`
- State realtime cục bộ (không qua server cache): Zustand hoặc Context riêng cho từng kênh trong `REALTIME_EVENTS.md`
- Không gọi trực tiếp Supabase client cho nghiệp vụ ghi dữ liệu tài chính (đặt cọc, thanh toán) từ FE — luôn qua NestJS API để đảm bảo chạy Redis lock/Trigger đúng thứ tự (xem `SPEC.md` mục 3 — đây là Redis lock đơn giản mô phỏng Redlock, TTL 10 phút, không phải Redlock Algorithm đầy đủ nhiều Redis instance); Supabase Realtime chỉ dùng để **subscribe/đọc**

## 3. Git Workflow

- Branch: `feature/<module>-<mô tả ngắn>` — vd. `feature/floor-editor-drag-drop`, `feature/support-maker-checker`
- Commit: Conventional Commits — `feat(order): thêm endpoint submit-kitchen`, `fix(reservation): sửa TTL Redis lock`
- Xem phân công thực tế theo module tại `PLAN_BE.md` (backend) và `PLAN_FE.md` (frontend) — PR review chéo giữa 2 người cùng phía (B1↔B2, F1↔F2) theo quy tắc mỗi file đã nêu
- Không merge thẳng vào `main` — bắt buộc qua PR, tối thiểu 1 approve

## 4. Testing tối thiểu (phù hợp thời lượng đồ án)

- Không viết test tự động toàn diện; xác minh qua gọi API thật (Postman/Thunder Client) theo đúng `API_CONTRACT.md`, log kết quả vào `PROGRESS.md` của từng thành viên (tự tạo thêm nếu cần, không nằm trong 9 file chuẩn)
- Bắt buộc test tay 2 luồng có race condition: khóa bàn trùng lúc (`ERR_2002_TABLE_LOCKED`) và duyệt Maker-Checker trùng người (`ERR_6002_SELF_APPROVAL`)
