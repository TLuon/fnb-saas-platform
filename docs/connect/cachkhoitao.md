Để chạy toàn bộ hệ thống lên và test giả lập các API (Mock API) cũng như xem giao diện Frontend, bạn hãy mở 3 Tab Terminal riêng biệt trong VS Code và chạy các lệnh sau nhé:

1. Khởi chạy Backend (Mock Server)
Hiện tại dự án đang giả lập dữ liệu API và WebSocket (KDS) bằng một file Mock Server độc lập thay vì backend thật.

Mở Terminal 1, di chuyển vào thư mục staff-dashboard và chạy:
bash
cd apps/staff-dashboard
node mock-server.js
👉 Máy chủ API giả lập này sẽ chạy trên cổng http://localhost:3000 và liên tục bắn event WebSocket kds_new_ticket mỗi 15 giây để bạn test tính năng màn hình KDS thực tế.

2. Khởi chạy Frontend: Staff Dashboard (Nhân viên/Chủ quán)
Dự án Staff Dashboard sử dụng Vite (React).

Mở Terminal 2, và chạy lệnh:
bash
cd apps/staff-dashboard
npm run dev
👉 Trang quản lý (Staff Dashboard) sẽ mở ở cổng mặc định http://localhost:5173. Nó sẽ tự động gọi API tới cổng 3000 (Mock Server) ở trên.

3. Khởi chạy Frontend: Customer PWA (Khách hàng)
Dự án Customer PWA sử dụng Next.js.

Mở Terminal 3, và chạy lệnh:
bash
cd apps/customer-pwa
npm run dev
👉 Trang dành cho khách hàng sẽ mở ở cổng http://localhost:3001 (hoặc cổng trống tiếp theo).

Lưu ý khi test:

Bạn hãy vào trang KDS (Bếp) trên Staff Dashboard (http://localhost:5173). Cứ mỗi 15 giây, bạn sẽ thấy ticket món ăn mới (được bắn từ mock-server.js qua Socket.IO) tự động nhảy vào cột Chờ chế biến (QUEUED) mà không cần F5 load lại trang!
Sau này khi Backend Supabase thực tế được hoàn thiện, chúng ta chỉ việc xoá file mock-server.js đi và đổi biến VITE_API_URL trong file .env trỏ về API thật là xong. Hệ thống Frontend không cần phải thay đổi gì thêm.
2:25 PM
bạn chạy ngầm và đưa các đường link cho tôi đi 
2:30 PM
Tôi đã chạy ngầm toàn bộ cả 3 dịch vụ cho bạn rồi! 🚀

Dưới đây là các đường link để bạn truy cập và test trực tiếp trên trình duyệt của mình:

🔗 1. Staff Dashboard (Giao diện Chủ quán / Nhân viên / Bếp)

Link truy cập: http://localhost:5173
Ghi chú: Bạn có thể vào tab KDS trên này để theo dõi các đơn hàng liên tục được đẩy vào mỗi 15 giây.
🔗 2. Customer PWA (Giao diện Khách hàng đặt món)

Link truy cập: http://localhost:3001
🔗 3. Mock API Server (Chạy ngầm)

Link API Endpoint (nếu bạn muốn dùng Postman để test API): http://localhost:3000
Bạn có thể mở đồng thời 2 tab trình duyệt localhost:5173 và localhost:3001 lên để trải nghiệm thử hệ thống nhé!

(Lưu ý: Quá trình build lần đầu lúc mới vào web có thể mất khoảng vài giây).