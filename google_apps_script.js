/**
 * ==============================================================================
 * 📜 GOOGLE APPS SCRIPT CHO THIỆP MỜI TỐT NGHIỆP UEH 2026
 * ĐỒNG BỘ REAL-TIME ĐÁM MÂY & QUẢN LÝ RSVP KHÁCH MỜI
 * ==============================================================================
 * 
 * HƯỚNG DẪN CẬP NHẬT TRONG 30 GIÂY:
 * 1. Mở file Google Sheet của bạn.
 * 2. Vào menu: Tiện ích mở rộng (Extensions) > Apps Script.
 * 3. Xóa toàn bộ code cũ, dán TOÀN BỘ file này vào rồi bấm Lưu (Ctrl+S).
 * 4. Bấm "Triển khai" (Deploy) > "Quản lý bản triển khai" (Manage deployments)
 *    > Bấm biểu tượng cây bút chỉnh sửa > Mục "Phiên bản" (Version) chọn "Phiên bản mới" (New version)
 *    > Bấm "Triển khai" (Deploy) là xong!
 */

// Xử lý gửi dữ liệu lên Google Sheet (Lưu phản hồi RSVP hoặc Đồng bộ nội dung sửa đổi)
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
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
    
    // -------------------------------------------------------------
    // TÍNH NĂNG 1: LƯU CẤU HÌNH ĐỒNG BỘ REAL-TIME TỪ CHỦ TIỆC
    // -------------------------------------------------------------
    if (data && (data.action === 'save_config' || data.type === 'config')) {
      var configSheet = ss.getSheetByName("Config");
      if (!configSheet) {
        configSheet = ss.insertSheet("Config");
        configSheet.appendRow(["THỜI GIAN CẬP NHẬT", "DỮ LIỆU CẤU HÌNH ĐÁM MÂY (JSON)"]);
        var cfgHeader = configSheet.getRange(1, 1, 1, 2);
        cfgHeader.setFontWeight("bold").setBackground("#003B71").setFontColor("#FFB800");
        configSheet.setColumnWidth(1, 180);
        configSheet.setColumnWidth(2, 600);
      }
      
      var nowStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      configSheet.getRange(2, 1).setValue(nowStr);
      configSheet.getRange(2, 2).setValue(JSON.stringify(data.config || {}));
      
      return ContentService.createTextOutput(JSON.stringify({
        "result": "success",
        "message": "Đã lưu và đồng bộ cấu hình thành công lên Google Sheet!",
        "updated_at": nowStr
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // -------------------------------------------------------------
    // TÍNH NĂNG 2: LƯU PHẢN HỒI RSVP CỦA KHÁCH MỜI
    // -------------------------------------------------------------
    var sheet = ss.getSheetByName("RSVP");
    if (!sheet) {
      // Nếu chưa có tab RSVP, tạo hoặc dùng sheet hiện tại
      sheet = ss.getActiveSheet();
      if (sheet.getName() === "Config") {
        sheet = ss.insertSheet("RSVP");
      }
    }
    
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

// Xử lý lấy dữ liệu cấu hình về cho điện thoại khách mời
function doGet(e) {
  try {
    // Nếu yêu cầu lấy cấu hình đám mây
    if (e && e.parameter && (e.parameter.action === 'get_config' || e.parameter.get === 'config')) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var configSheet = ss.getSheetByName("Config");
      var configData = {};
      
      if (configSheet && configSheet.getLastRow() >= 2) {
        var rawJson = configSheet.getRange(2, 2).getValue();
        try {
          configData = JSON.parse(rawJson);
        } catch (parseErr) {
          configData = {};
        }
      }
      
      var callback = e.parameter.callback;
      var outputJson = JSON.stringify({
        "status": "success",
        "data": configData
      });

      if (callback) {
        return ContentService.createTextOutput(callback + "(" + outputJson + ")")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      
      return ContentService.createTextOutput(outputJson).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Mặc định kiểm tra kết nối Web App
    return ContentService.createTextOutput("✅ Google Apps Script Web App nhận RSVP và Đồng bộ Real-Time đang hoạt động hoàn hảo!");
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
