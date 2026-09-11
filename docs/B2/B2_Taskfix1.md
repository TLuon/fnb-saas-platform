# B2 Code Review & Task Fix 1 (Cập nhật sau khi Sync)

Sau khi đồng bộ hoàn toàn nhánh `bedev` từ GitHub, tôi đã review lại toàn bộ source code của Backend và đối chiếu với các tài liệu trong `docs/B2/`. 

Phát hiện một sự **bất đồng bộ lớn giữa Code và Tài liệu**: Code thực tế đã được cập nhật và vá lỗi rất tốt, đi trước và vượt xa những gì tài liệu báo cáo.

## I. Tình trạng đồng bộ hóa giữa Code và Tài liệu (Docs)

Các tài liệu `B2_REVIEW_REPORT.md` và `B2_FINAL.md` hiện đang bị **LỖI THỜI (Out-of-sync)** so với code hiện hành. Cụ thể, 6 lỗi từng được liệt kê trong báo cáo là "Known Risks / Blockers / Chưa sửa xong" thì thực tế **ĐÃ ĐƯỢC FIX HOÀN TOÀN TRONG CODE**:

1. **Lỗi khóa ngoại Group Order**: Đã được fix (Bổ sung truy vấn lấy đúng `customer.id` thay vì truyền `user.sub`).
2. **Lỗi Realtime Group Order**: Đã được fix (Đã bổ sung handler `@SubscribeMessage('join_group_order')` trong `realtime.gateway.ts`).
3. **Lỗi Query Support CSAT**: Đã được fix (Đã thêm filter `.eq('tenant_id', user.tenant_id)` vào câu lệnh truy vấn).
4. **Rủi ro Atomicity Wallet**: Đã được xử lý triệt để (Đã chuyển sang dùng duy nhất hàm RPC `fn_pay_order_wallet` để bảo đảm DB Transaction).
5. **Rủi ro bảo mật TOTP Replay Attack**: Đã được fix xuất sắc (Sử dụng lệnh `SET NX EX` của Redis để khóa chống dùng lại mã trong cửa sổ 30s).
6. **Lỗi dư thừa Guards**: Đã được dọn dẹp sạch sẽ khỏi các Controller.

👉 **Kết luận phần 1:** Team Backend đã làm rất tốt việc khắc phục lỗi. Tuy nhiên, cần cập nhật lại các file MD để ghi nhận những nỗ lực này, tránh việc Tester hoặc team khác đọc báo cáo cũ rồi hiểu lầm code vẫn còn lỗi.

---

## II. Cập nhật Bổ sung (False Positive Về Lỗi Unmatched Transaction)

Trong lần rà soát ban đầu, có nghi ngờ về **1 lỗi logic cực kỳ nghiêm trọng** liên quan đến việc bỏ trống `tenant_id` khi nhận Webhook giao dịch rác (Unmatched transaction). Cụ thể, nghi ngờ rằng hàm webhook `processMockPayment` chèn dòng mới vào bảng `payment_transactions` nhưng không có `tenant_id`, khiến API Support không thể truy xuất được các giao dịch này.

**Tuy nhiên, sau khi kiểm tra lại mã nguồn thực tế (Cross-check Codebase):**
Lỗi này **ĐÃ ĐƯỢC ĐỘI NGŨ LẬP TRÌNH FIX TRIỆT ĐỂ** và không còn tồn tại trong hệ thống.
- **Tại `reservation.controller.ts`**: Webhook API đã được thiết kế đúng như đề xuất, hỗ trợ nhận `tenantId` linh hoạt qua `Param` (VD: `/reservations/webhook/mock-payment/:tenantId`), `Query`, `Header` (`x-tenant-id`), hoặc `Body`.
- **Tại `reservation.service.ts`**: Hàm `processMockPayment` đã trích xuất `tenantId` và gán chính xác `tenant_id` này khi `insert` vào bảng `payment_transactions` đối với các giao dịch UNMATCHED.
- **Tại Test Case (`support.spec.ts`)**: Team Backend đã viết đầy đủ các kịch bản kiểm thử nhằm đảm bảo hệ thống chặn đứng mọi trường hợp `tenant_id` là null hoặc sai lệch.

👉 **Kết luận phần 2:** Không phát hiện thêm lỗi logic nghiêm trọng nào. Luồng Maker-Checker hoạt động hoàn hảo trong phạm vi thiết kế. Tài liệu này được cập nhật để đính chính báo cáo cũ, hệ thống Backend hiện tại đã đạt độ ổn định và đồng bộ dữ liệu xuất sắc, hoàn toàn sẵn sàng cho quá trình tích hợp với Frontend.
