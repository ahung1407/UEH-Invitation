# 📋 Hướng Dẫn Kết Nối Google Sheet Nhận Phản Hồi (RSVP) Thiệp Tốt Nghiệp

Hệ thống cho phép bạn gửi link thiệp mời cho nhiều bạn bè. Khi bạn bè bấm **"Đi chứ, chắc chắn tới!"** hoặc **"Tiếc quá hôm đó bận rùi"** ở slide cuối, dữ liệu sẽ tự động ghi vào Google Sheet của bạn theo thời gian thực!

---

## 🚀 Bước 1: Tạo Google Sheet & Dán Mã Script (1 phút)

1. Mở trình duyệt, truy cập [sheets.new](https://sheets.new) để tạo 1 file Google Sheet mới (Đặt tên ví dụ: *Khách Mời Tốt Nghiệp UEH 2026*).
2. Trên thanh menu trên cùng, chọn: **Tiện ích mở rộng (Extensions)** > **Apps Script**.
3. Xóa hết tất cả code mẫu có sẵn trong trình soạn thảo Apps Script.
4. Mở file [google_apps_script.js](file:///d:/thiep/google_apps_script.js), copy toàn bộ nội dung và dán vào Apps Script.
5. Bấm icon chiếc đĩa mềm hoặc phím `Ctrl + S` để lưu lại.

---

## 🌐 Bước 2: Triển Khai Thành Ứng Dụng Web (Web App)

1. Bấm nút màu xanh **Triển khai (Deploy)** ở góc trên bên phải > chọn **Tùy chọn triển khai mới (New deployment)**.
2. Tại mục bánh răng (chọn loại), chọn: **Ứng dụng web (Web app)**.
3. Điền các thông tin như sau:
   - **Mô tả**: `RSVP Thiệp UEH`
   - **Thực thi dưới dạng (Execute as)**: `Tôi (địa chỉ email của bạn)`
   - **Ai có quyền truy cập (Who has access)**: `Bất kỳ ai (Anyone)` *(QUAN TRỌNG: Phải chọn mục này để bạn bè gửi được phản hồi mà không bị bắt đăng nhập)*.
4. Bấm nút **Triển khai (Deploy)**.
5. Nếu Google hiển thị bảng yêu cầu cấp quyền:
   - Bấm **Ủy quyền truy cập (Authorize access)** > Chọn tài khoản Google của bạn.
   - Bấm **Nâng cao (Advanced)** > Bấm tiếp dòng chữ nhỏ **Đi tới Dự án (không an toàn)**.
   - Bấm **Cho phép (Allow)**.
6. Khi triển khai thành công, Google sẽ cung cấp **URL của ứng dụng web** (dạng `https://script.google.com/macros/s/AKfycb.../exec`).
7. Bấm **Sao chép (Copy)** URL này.

---

## 🔗 Bước 3: Dán Link Vào Thiệp Của Bạn

1. Mở thiệp `index.html` trên trình duyệt (hoặc mở đường link trang web của bạn).
2. Dưới thanh điều hướng cuối cùng, bấm vào icon bảng tính màu xanh lá (`btn-admin-rsvp` - **Quản lý RSVP & Google Sheet**).
3. Chuyển sang tab **⚙️ Google Sheet**.
4. Dán đường link Web App vừa copy ở Bước 2 vào ô input > Bấm **Lưu Link Google Sheet**.
5. Bấm nút **🧪 Gửi Thử 1 Dòng Test** để kiểm tra: Mở lại Google Sheet, bạn sẽ thấy 1 dòng test xuất hiện ngay lập tức với màu sắc nổi bật!

---

## 🎁 Tính Năng Tặng Thêm Cho Chủ Nhân Thiệp:

### 1. Tạo Link Cá Nhân Hóa Cho Từng Bạn:
- Trong bảng Quản lý RSVP, chọn tab **🔗 Tạo Link Gửi**:
  - Nhập tên người bạn muốn gửi (ví dụ: `Ngọc Mai`).
  - Chọn ảnh chụp kỷ niệm riêng với người bạn đó (tùy chọn).
  - Nhập lời nhắn nhủ riêng (tùy chọn).
  - Bấm **"Tạo & Sao Chép Link Thiệp Riêng"**.
  - Link sẽ tự động có dạng `https://.../?to=Ngọc+Mai`.
  - Khi bạn Ngọc Mai mở link đó lên, ở slide 3 sẽ tự động hiện chữ **"Thân mời Ngọc Mai ❤️"** và khi Mai bấm RSVP thì tên Mai sẽ được tự động điền sẵn!

### 2. Xem & Xuất Danh Sách Ngay Trong Thiệp:
- Mọi phản hồi đều được lưu dự phòng cả trên máy của bạn.
- Bạn có thể xem thống kê: Tổng bao nhiêu người trả lời, bao nhiêu người đi, bao nhiêu người bận.
- Bấm nút **Tải file Excel (.CSV)** bất kỳ lúc nào để tải danh sách về máy tính.
