/**
 * ==============================================================================
 * 📜 GOOGLE APPS SCRIPT CHO THIỆP MỜI TỐT NGHIỆP UEH 2026
 * ==============================================================================
 * 
 * HƯỚNG DẪN 3 BƯỚC CÀI ĐẶT:
 * 1. Mở file Google Sheet bạn muốn lưu danh sách khách mời.
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) > Apps Script.
 * 3. Xóa hết code cũ trong đó, dán TOÀN BỘ nội dung file này vào và bấm Lưu (Ctrl+S).
 * 4. Bấm nút màu xanh "Triển khai" (Deploy) ở góc trên bên phải > "Tùy chọn triển khai mới" (New deployment).
 *    - Loại triển khai: Chọn "Ứng dụng web" (Web app).
 *    - Mô tả: RSVP Thiệp tốt nghiệp UEH
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)  <--- QUAN TRỌNG NHẤT!
 * 5. Bấm "Triển khai" (Deploy), cấp quyền truy cập nếu Google hỏi, sau đó copy đường link Web App (kết thúc bằng /exec).
 * 6. Dán link đó vào ô Cài đặt Google Sheet trong thiệp của bạn!
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // Nếu bảng tính mới tinh chưa có tiêu đề, tự động tạo tiêu đề đẹp mắt
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["STT", "Thời Gian Gửi", "Tên Khách Mời", "Quyết Định", "Trạng Thái", "Ghi Chú"]);
      var headerRange = sheet.getRange(1, 1, 1, 6);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#003B71");
      headerRange.setFontColor("#FFB800");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    
    // Đọc dữ liệu gửi từ thiệp HTML
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    
    var timestamp = data.timestamp || Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    var name = data.name || "Khách ẩn danh";
    var decision = data.rsvp || "Chưa rõ";
    var status = data.status || "";
    var note = data.note || "";
    var stt = sheet.getLastRow(); // Số thứ tự
    
    // Thêm 1 dòng mới vào Google Sheet
    sheet.appendRow([stt, timestamp, name, decision, status, note]);
    
    // Định dạng màu nhẹ cho dòng mới thêm
    var lastRow = sheet.getLastRow();
    var statusCell = sheet.getRange(lastRow, 4);
    if (status === "accept" || decision.indexOf("Đi") !== -1) {
      statusCell.setBackground("#DCFCE7").setFontColor("#15803D").setFontWeight("bold"); // Xanh lá
    } else {
      statusCell.setBackground("#FFE4E6").setFontColor("#BE123C").setFontWeight("bold"); // Đỏ hồng
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      "result": "success",
      "message": "Đã lưu phản hồi của " + name + " thành công!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "result": "error",
      "error": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm kiểm tra khi mở link Web App trên trình duyệt
function doGet(e) {
  return ContentService.createTextOutput("✅ Google Apps Script Web App nhận RSVP Thiệp tốt nghiệp UEH đang hoạt động tốt!");
}
