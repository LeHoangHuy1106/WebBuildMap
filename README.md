# Thất Nghiệp Về Quê • World Map Builder v11

## Sử dụng
- `standalone.html`: mở trực tiếp bằng Chrome/Edge, tất cả sprite nhúng trong một file.
- `index.html`: source tách asset. Giữ nguyên thư mục `tiles`, `bikes`, `traffic_lights`.

## Thay đổi v11
1. Fix dừng xe: b.t nội suy tâm-đến-tâm (ranh giới ô ở t=0.5). Stop line giờ đặt TRƯỚC ranh giới 0.5, xét kích thước sprite. Xe đã được xanh cho vượt vạch/đã vượt vạch/đã vào ô giao lộ sẽ được đi tiếp cho dù đèn chuyển đỏ. Không lùi xe.
2. Mưa/tuyết làm tối cảnh nhẹ theo intensity. Mưa tối xanh; tuyết xám xanh, không làm cảnh sáng lên.
3. Full Sprite Shadow cache cho xe, cột đèn, cầu; hệ thống hỗ trợ thêm cảnh quan trong `sceneObjects` bằng image/sprite, worldX/worldY, drawWidth/drawHeight, anchorX/Y. Không tạo bóng cho nền `road`, `sidewalk`, `river`.
4. Còn giữ giao thông hai chế độ trái/phải, ngày/đêm, thời tiết và import/export JSON.
