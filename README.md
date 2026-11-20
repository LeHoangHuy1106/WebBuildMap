# Thất Nghiệp Về Quê | Map Builder v26 - HiDPI / Asset Library / Sort Y

**Build từ source v24**, giữ tất cả chức năng Deco, Buildings, NPC, Vehicles, Road.

## Sort Layer mới

- Truy cập **Asset > Deco** (hoặc Vehicles / Pedestrians / Buildings / Roads).
- Mỗi thẻ asset có nút **⚙ Settings** riêng nằm dưới ảnh.
- Với Deco, Houses, Vehicles và Pedestrians: kéo **chấm vàng** theo trục Y trong cửa sổ Settings (X cố định giữa ảnh, hiển thị `X = 0`).
- Sort Y mặc định: Deco 100%, Houses 100%, Bike 76%, Pedestrian 97% để giữ nguyên vị trí sắp lớp trước đây. Không đổi vị trí/vùng va chạm của asset.
- Road tiles luôn nằm ở lớp nền; Interior/ClosedDoor là phần ghép House, vì vậy các nhóm này có nút Settings để xem ảnh nhưng không chỉnh Sort Y độc lập.
- Chọn **Áp dụng cho asset** cập nhật mọi bản sao ngay và tự lưu trong localStorage phiên bản v25.
- Nút **Xuất cấu hình chung** xuất file `asset_sort_y.json` chứa *tất cả* cài đặt sort Y.
- Để lưu cho source/gửi cho người khác, đặt file vào `Asset/Sprites/asset_sort_y.json` rồi chạy `python scan_assets.py` + `python build_standalone.py`.
- Chỉ sửa Sort ở thư viện Asset. Popup **Trang trí theo ô** chỉ chỉnh vị trí, kích thước, góc xoay và bản sao, không còn form Sort X/Y.
- File `decorations.json` giữ schema cũ, tất cả đối tượng đã đặt tiếp tục dùng chung sort Y theo asset.

## Chạy dự án

```sh
python scan_assets.py
python build_standalone.py
```

Mở `index.html` thông qua HTTP server trong thư mục source (`python -m http.server 8000`), hoặc `standalone.html` offline. Bản standalone đóng gói asset trực tiếp vào HTML. Chỉnh thay đổi rồi rebuild bằng hai lệnh trên.

## Asset hình ảnh

Giữ nguyên các ảnh PNG có sẵn (không làm giảm chất lượng art). Xem `ASSET_OPTIMIZATION_PLAN.md` cho phân tích pipeline tối ưu tiếp theo.

## Tương thích

`scan_assets.py` có thể đọc file v24 `Asset/Sprites/Deco/deco_sort_points.json` làm fallback khi không tồn tại `asset_sort_y.json`, chuyển Y vào registry v25. File mới là nguồn cấu hình duy nhất; X không chỉnh.


## v26: UI + Camera HiDPI (20/11/2026)
- Thẻ Vật liệu / Asset chuyển lên thanh đầu trang; Asset mặc định mở mục Deco; có tab Nội thất riêng. Trên màn Asset, ẩn Inspector để nhường không gian cho map, chuyển về Vật liệu để hiện lại.
- Giao diện Asset theo bản thiết kế với thẻ 2 cột, icon Settings, nền xanh đậm và điểm nhấn vàng. Giữ nguyên toàn bộ công cụ map cũ.
- Popup Asset Settings hiển thị ảnh và điểm Sort Y kéo dọc; Sort X cố định giữa sprite; dùng chung file `Asset/Sprites/asset_sort_y.json`.
- Render Camera vẫn sử dụng world coords và Canvas 2D; mọi lần zoom render trực tiếp từ PNG gốc (KHÔNG CSS scale canvas).
- Bộ lọc ảnh mặc định Smooth để tránh răng cưa đối với art vẽ tay; nút Pixel dành cho pixel-art.
- Nút HQ tại toolbar: Eco <=1x, Auto <=2x, Ultra <=3x DPR với giới hạn bộ nhớ 12 megapixel / cạnh <=8192. Lựa chọn lưu localStorage.
- Cải thiện DPR không khôi phục chi tiết không có trong sprite gốc. Muốn giữ nét tại 500% cần nguồn PNG/WebP đủ độ phân giải hoặc vector.
- Build: `python scan_assets.py && python build_standalone.py`, mở `index.html` trên localhost hoặc `standalone.html` offline.


## v27 – Ánh sáng Deco, đèn mạnh 300% và bóng đêm 50%

- House Night Light: thanh Cường độ tăng đến **300%**, hiệu ứng 3 lớp sáng (halo + hotspot + emitter). Dữ liệu `houses.json` cũ tương thích, intensity tiếp tục có giá trị 0.0–1.0; giá trị mới có thể lên đến 3.0.
- Deco: vào **Asset > Deco > ⚙ Settings > ☀ Cài đặt ánh sáng cho Deco này**. Thêm nhiều nguồn sáng tròn/chữ nhật, kéo trên ảnh, nhập X/Y, kích thước, màu, cường độ tối đa 300%, bấm **Lưu ánh sáng Deco**. Tất cả bản sao của cùng sprite dùng chung cấu hình, cả khi quay Deco.
- LocalStorage key: `tnvq_deco_lights_v27`. Bấm **Xuất deco_lights.json** và đặt file vào `Asset/Sprites/deco_lights.json` để cập nhật bản build. Sau đó chạy `python scan_assets.py` và `python build_standalone.py`.
- Lighting chỉ hoạt động khi mô phỏng có bật Ngày/Đêm và trời đủ tối; preview trong editor có chế độ xem đêm.
- **Bóng 2D:** `Pivot từ đáy` giờ gập bản chiếu silhouette ở Y tương ứng, `Dịch chân bóng` chuyển điểm chạm đất theo tỷ lệ chiều cao sprite. Áp dụng chung cho Nhà, Deco, người đi bộ, xe, cột đèn và cầu. Bóng còn **50% độ đậm thiết lập** tại ban đêm hoàn toàn, chuyển mượt theo mức ánh sáng ban ngày.
- Tương thích: `decorations.json` không đổi schema; `houses.json` vẫn giữ các trường lights cũ. `deco_lights.json` là cấu hình theo *loại asset*, không theo ô.
