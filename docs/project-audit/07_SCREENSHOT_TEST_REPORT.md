# BÁO CÁO NGẮN KẾT QUẢ KIỂM THỬ GIAO DIỆN & HÌNH ẢNH MINH CHỨNG
*(Visual E2E Test Report & Screenshot Evidence)*

* **Dự án:** F&B SaaS Platform (`fnb-saas-platform`)
* **Nhánh:** `connectfix`
* **Môi trường thực thi:** Localhost (Backend: `:3001`, Staff Dashboard: `:5173`, Customer PWA: `:3000`)
* **Phương thức kiểm thử:** Tự động hóa trình duyệt qua Edge/Chromium Headless & DevTools Protocol
* **Tổng số test cases chụp minh chứng:** **20 / 20 Test Cases (100% PASS)**

---

## 1. PHÂN HỆ THU NGÂN & BÁN HÀNG (STAFF POS & OPERATIONS)

| Mã Case | Tên Test Case | File Ảnh Minh Chứng | Kết quả |
| :--- | :--- | :--- | :---: |
| **TC-STF-02.1** | Màn hình bán hàng POS & Danh mục món | [01_staff_pos.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/01_staff_pos.png) | **PASS** |
| **TC-STF-02.2** | Chọn món vào giỏ hàng & Tính tổng tiền | [02_pos_item_added.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/02_pos_item_added.png) | **PASS** |
| **TC-STF-04.1** | Modal Thanh toán đa phương thức (CASH & VIETQR) | [03_pos_payment_modal.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/03_pos_payment_modal.png) | **PASS** |
| **TC-STF-03.1** | Sơ đồ bàn trực quan (Live Floor Map) | [04_staff_floor_map.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/04_staff_floor_map.png) | **PASS** |
| **TC-STF-02.3** | Lịch sử hóa đơn & Đơn hàng đã hoàn tất | [05_staff_orders_history.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/05_staff_orders_history.png) | **PASS** |

---

## 2. PHÂN HỆ BẾP & PHA CHẾ (KITCHEN & BAR KDS)

| Mã Case | Tên Test Case & Tài khoản đăng nhập | File Ảnh Minh Chứng | Kết quả |
| :--- | :--- | :--- | :---: |
| **TC-KDS-01** | Màn hình điều phối chế biến Bếp (`bep@example.com`) | [06_kds_kitchen.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/06_kds_kitchen.png) | **PASS** |
| **TC-KDS-02** | Màn hình điều phối pha chế Bar (`bar@example.com`) | [07_kds_bar.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/07_kds_bar.png) | **PASS** |

---

## 3. PHÂN HỆ CHỦ QUÁN & QUẢN TRỊ (OWNER & MANAGER DASHBOARD)

| Mã Case | Tên Test Case (Tài khoản `owner.runtime@example.com`) | File Ảnh Minh Chứng | Kết quả |
| :--- | :--- | :--- | :---: |
| **TC-OWN-07** | Báo cáo Doanh thu, Đơn hàng & Biểu đồ Analytics | [08_owner_analytics.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/08_owner_analytics.png) | **PASS** |
| **TC-OWN-01** | Quản lý Thực đơn, Món ăn & Ảnh Cloudinary CDN | [09_owner_menu_management.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/09_owner_menu_management.png) | **PASS** |
| **TC-OWN-03** | Quản lý Tồn kho nguyên liệu & Công thức BOM | [10_owner_inventory.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/10_owner_inventory.png) | **PASS** |
| **TC-OWN-04** | Quản lý Ca làm việc & Khai báo tiền két đầu/cuối ca | [11_owner_shifts.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/11_owner_shifts.png) | **PASS** |
| **TC-OWN-06** | Phân tích Khách hàng CDP & Customer 360 | [12_owner_cdp.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/12_owner_cdp.png) | **PASS** |
| **TC-OWN-02** | Biên tập Sơ đồ bàn kéo thả (Floor Editor Canvas) | [13_owner_floor_editor.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/13_owner_floor_editor.png) | **PASS** |

---

## 4. PHÂN HỆ KHÁCH HÀNG (CUSTOMER PWA)

| Mã Case | Tên Test Case | File Ảnh Minh Chứng | Kết quả |
| :--- | :--- | :--- | :---: |
| **TC-CUS-01** | Trang chủ Khách hàng gọi món | [14_customer_home.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/14_customer_home.png) | **PASS** |
| **TC-CUS-02** | Menu điện tử, Danh mục món & Tùy chọn Modifier | [15_customer_menu.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/15_customer_menu.png) | **PASS** |
| **TC-CUS-04** | Sơ đồ tầng & Chọn vị trí ngồi Dine-in | [16_customer_floors.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/16_customer_floors.png) | **PASS** |
| **TC-CUS-07** | Đặt bàn trực tuyến & Tiền cọc trực tuyến | [17_customer_reservation.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/17_customer_reservation.png) | **PASS** |
| **TC-CUS-09** | Ví điện tử E-Wallet (Ví chính & Ví Promo) | [18_customer_wallet.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/18_customer_wallet.png) | **PASS** |
| **TC-CUS-08** | Gói nước Coffee Pass (TOTP Dynamic QR Code) | [19_customer_coffee_pass.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/19_customer_coffee_pass.png) | **PASS** |
| **TC-CUS-03** | Giỏ hàng & Thanh toán đơn hàng Online | [20_customer_cart.png](file:///E:/CNPM/connectfix2/docs/project-audit/screenshots/20_customer_cart.png) | **PASS** |

---

## 5. TỔNG KẾT
1. **Toàn bộ 20 kịch bản kiểm thử giao diện** trải rộng qua cả 4 vai trò (**Thu ngân, Bếp, Bar, Chủ quán**) và **Customer PWA** đều đã được hệ thống tự động đăng nhập, điều hướng và ghi lại ảnh chụp màn hình đầy đủ.
2. Tất cả ảnh chụp gốc định dạng PNG độ phân giải cao được lưu trữ tập trung tại thư mục:
   `docs/project-audit/screenshots/`
3. Không phát hiện lỗi sập trang (crash), lỗi console block hiển thị hay lỗi phân quyền khi đăng nhập đúng vai trò tương ứng.
