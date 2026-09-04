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

## II. Lỗi Nghiêm trọng duy nhất còn sót lại (Task Fix 1)

Mặc dù code đã được dọn dẹp rất kỹ, tôi vẫn dò ra được **1 lỗi logic cực kỳ nghiêm trọng** về luồng vận hành CSKH. Lỗi này **chưa từng được ghi nhận** trong bất kỳ tài liệu MD nào trước đây của B2.

### 1. Lỗi Logic: Vô hiệu hóa luồng giao dịch Unmatched
- **Module:** `Reservation` (Webhook) & `Support`
- **Tập tin:** `reservation.service.ts` và `support.service.ts`
- **Chi tiết Vấn đề:** 
  - Tại hàm webhook `processMockPayment`, nếu giao dịch chuyển khoản không khớp mã đặt bàn, hệ thống sẽ chèn dòng mới vào bảng `payment_transactions` nhưng **hoàn toàn bỏ trống `tenant_id`** (do payload webhook giả lập không có thông tin này).
  - Trái lại, tại hàm `listUnmatched` và `suggestMatch` của Support API, luồng xử lý lại **bắt buộc** query với điều kiện `.eq('payment_transactions.tenant_id', user.tenant_id)`.
- **Hậu quả:** Tất cả các giao dịch rác/không khớp mã đều không có chủ (không có `tenant_id`), nên API của nhân viên Support tại các chi nhánh sẽ vĩnh viễn không bao giờ nhìn thấy các giao dịch này để xử lý đối soát. Luồng tính năng Maker-Checker do B2 vất vả xây dựng bị tê liệt hoàn toàn trên thực tế.
- **Hướng giải quyết Đề xuất:** 
  - (Cấp độ API): Webhook URL có thể thiết kế dạng `/reservations/webhook/mock-payment/:tenantId` để nhận diện tiền thuộc về tenant nào.
  - (Cấp độ Database): Cho phép Admin/Support cấp cao (Global) được xem các giao dịch `tenant_id = null`.
