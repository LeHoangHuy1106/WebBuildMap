# Camera / Render v26

- Camera đã có sẵn trong source: `cam.x, cam.y`, `zoom`, và hàm `toScreen`; đây là phép biến đổi world -> screen. V26 giữ nguyên vì không cần thay camera.
- Wheel zoom gọi `zoomTo()` rồi `requestDraw()`, Canvas redraw trực tiếp từ `Image` nguồn; không sử dụng CSS `transform: scale()` phóng bitmap đã render.
- V25 mặc định `sharpPixels=true`: tắt anti-aliasing và dễ xuất hiện pixelation trên ảnh vẽ tay. V26 mặc định Smooth (`imageSmoothingEnabled=true, imageSmoothingQuality='high'`); Pixel vẫn bật được cho pixel-art.
- V26 giới hạn DPR theo thiết bị và chế độ: Eco 1x, Auto tối đa 2x, Ultra tối đa 3x; tối đa 12 megapixel và kích thước 8192 px/cạnh để tránh sử dụng VRAM quá mức.
- Render trực tiếp từ file PNG gốc không có nghĩa 500% vẫn nét tuyệt đối. `tree_01.png` chỉ 95x95, khi zoom lớn thiếu dữ liệu ảnh gốc là chuyện không thể tránh. Cần bản gốc kích thước lớn hơn hoặc vector.
- Chỉnh sort duy nhất tại **Asset > ⚙**; `asset_sort_y.json`, trục X giữa ảnh.
- Source v26 không nén hoặc thay đổi PNG gốc, vì không được làm sai art style.
- Bộ nguồn là web HTML/Canvas, không phải project Unity.
