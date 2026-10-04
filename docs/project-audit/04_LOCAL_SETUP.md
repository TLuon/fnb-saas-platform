# 04 — HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL (LOCAL SETUP GUIDE)

> **Môi trường khuyến nghị:** Windows 10/11 với PowerShell 5.1+ / PowerShell 7+  
> **Node.js:** v20.x hoặc v24.x (Đã kiểm thử thực tế trên Node v24.16.0 & NPM 11.13.0)  

---

## 1. BƯỚC 1: CLONE SOURCE CODE

Mở PowerShell tại thư mục làm việc mong muốn và chạy:
```powershell
# Clone trực tiếp nhánh connectfix về thư mục connectfix2
git clone --branch connectfix --single-branch https://github.com/TLuon/fnb-saas-platform.git connectfix2
cd connectfix2
```

Kiểm tra trạng thái Git để đảm bảo ở đúng nhánh:
```powershell
git branch -vv
git status
```

---

## 2. BƯỚC 2: CẤU HÌNH MÔI TRƯỜNG (.ENV) AN TOÀN

Dự án là monorepo, cần 3 file môi trường riêng biệt cho từng service. Tuyệt đối không commit các file `.env` chứa secret lên Git (các file này đã được khai báo trong `.gitignore`).

### 2.1. Cấu hình Backend (`backend/api/.env`)
Tạo file `backend/api/.env` từ file mẫu `backend/api/.env.example`:
```ini
PORT=3001
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
JWT_ISSUER=https://<your-project>.supabase.co/auth/v1
REDIS_URL=redis://127.0.0.1:6379
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
```

> [!NOTE]
> `backend/api/.env` yêu cầu `SUPABASE_SERVICE_ROLE_KEY` cho các tác vụ quản trị và kiểm thử. Không chia sẻ file này ra ngoài.

### 2.2. Cấu hình Staff Dashboard (`apps/staff-dashboard/.env`)
Tạo file `apps/staff-dashboard/.env`:
```ini
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 2.3. Cấu hình Customer PWA (`apps/customer-pwa/.env.local`)
Tạo file `apps/customer-pwa/.env.local`:
```ini
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

---

## 3. BƯỚC 3: CÀI ĐẶT DEPENDENCIES

Tại thư mục gốc của monorepo (`E:\CNPM\connectfix2`):
```powershell
npm install
```
*Lệnh trên sẽ tự động cài đặt và liên kết (link) toàn bộ các gói trong `apps/*`, `backend/*` và `packages/*`.*

---

## 4. BƯỚC 4: KHỞI CHẠY HỆ THỐNG TRÊN LOCALHOST

Khởi chạy 3 terminal riêng biệt (hoặc chạy qua Background task / VS Code tasks):

### Terminal 1: Khởi chạy Backend API (Port 3001)
```powershell
cd E:\CNPM\connectfix2\backend\api
npm run build
npm run start
# Hoặc chạy chế độ watch: npm run start:dev
```
👉 Server sẽ lắng nghe tại: `http://localhost:3001/api/v1`

### Terminal 2: Khởi chạy Staff Dashboard (Port 5173)
```powershell
cd E:\CNPM\connectfix2\apps\staff-dashboard
npm run dev
```
👉 Truy cập giao diện quản lý / POS: `http://localhost:5173`

### Terminal 3: Khởi chạy Customer PWA (Port 3000)
```powershell
cd E:\CNPM\connectfix2\apps\customer-pwa
npm run dev
```
👉 Truy cập giao diện khách đặt món: `http://localhost:3000`

---

## 5. TÀI KHOẢN ĐĂNG NHẬP THỬ NGHIỆM ĐÃ SẴN SÀNG

| Vai trò | Email đăng nhập | Mật khẩu | Phạm vi quyền hạn |
|:---|:---|:---|:---|
| **OWNER (Chủ quán)** | `owner.runtime@example.com` | `abc12345` | Toàn quyền: Menu, Báo cáo, Nhân viên, Kho, Ca, Sơ đồ bàn |
| **STAFF (Thu ngân POS)** | `staff.runtime@example.com` | `abc12345` | Bán hàng POS, Live Floor Map, Danh sách đơn, Mở/Đóng ca |
| **KITCHEN (Bếp)** | `bep.runtime@example.com` | `bep12345` | Màn hình Bếp KDS (`/kds/kitchen`) |
| **BAR (Pha chế)** | `bar.runtime@example.com` | `bar12345` | Màn hình Bar KDS (`/kds/bar`) |
