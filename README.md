# v15 – HOUSE NIGHT LIGHTS + WORLD-ANCHORED SUN

- House Editor includes **Interior Rect** and **Ánh sáng đêm** tabs.
- Add unlimited independent **circular** or **rectangular** local lights per house model; set color, brightness max (0–100%), position, width/height/radius; drag in preview; dark-mode preview.
- Light definitions are stored in `houses.json` under each house record's `lights` array. All instances of the same House reuse the config. Night glows render after ambient darkening in simulation; fade in/out with time of day.
- Sun position is now anchored in world coordinates (`sunWorldX`,`sunWorldY` inside simulation shadowSettings), so panning the map no longer makes the sun handle follow the camera. Drag sun or use arrows to reposition; the sun may leave the visible viewport as the map pans.
- Keeps v14 building system, lane simulation, weather, cast shadows, random house models, terrain `map.json` only.

## Launch
Open `standalone.html` offline, or use `index.html` with its accompanying assets; run `python scan_assets.py && python build_standalone.py` after changing sprites.

# Thất Nghiệp Về Quê • World Map Builder v14

## Chạy

- **Mở trực tiếp** `standalone.html` trong Chrome/Edge: toàn bộ PNG đã nhúng vào HTML, không cần server.
- **Làm việc với folder source**: chạy `python scan_assets.py && python build_standalone.py`, sau đó mở `standalone.html`. Nếu chạy trực tiếp `index.html` với quyền tải asset bình thường, file `asset_manifest.js` phải nằm cùng cấp.
- Toàn bộ hình mới nằm tại `Asset/Sprites/Constructions/Level_4/{Houses,Interiors,ClosedDoors}`, và `Asset/Sprites/Roads/Level_4/313.png` là **đất xây dựng**, đổi tên từ **image 78.png** của ZIP gốc.

## Đặt nhà và thiết lập mask

1. Tab **Vật liệu → Vỉa hè** có ba loại: thường (0), đất xây dựng (1), hành chính (2). Bảng mã tile Level4 vẫn dùng `305` cho nền vỉa hè; số 313 và 314 trên palette chỉ là **công cụ vẽ subtype**. Khi lưu map, code của cả ba là `305` và trạng thái lưu bằng số `landType`.
2. Dùng **ô đất xây dựng** để tô lên map, có thể kéo chuột hoặc Shift+kéo. Click vào ô đất xây dựng để mở **Thiết lập công trình**. Chọn Level, House, ngành và Door, xem trước mở/đóng rồi bấm Xây.
3. Nếu muốn căn nội thất vào từng mẫu House, bấm **Chỉnh Interior Rect từng House** ở panel phải hoặc bấm nút từ panel xây dựng. Kéo 4 nút xanh hoặc kéo giữa Rect, có thể nhập chính xác tọa độ X, Y, W, H (local pixel từ góc trên-trái PNG gốc); sau đó Lưu.
4. Nhà đã xây là một object nằm **ngoài bản đồ tile**. Khi xây, tile nền chuyển sang vỉa hè thường `landType=0`. Gỡ nhà khôi phục đất xây dựng `landType=1`.
5. Khi mô phỏng: **07:00 ≤ giờ < 20:00** cho thấy Interior; các thời điểm khác Door được phủ lên Interior. Khi không mô phỏng, luôn hiển thị Interior để dễ chỉnh sửa. Bóng lấy **silhouette ghép House + Interior** để vùng cửa không bị hở; không đổ hai lớp bóng chồng nhau. Canvas sắp xếp các vật thể theo chân Y như các object khác.
6. Settings: chiều rộng House theo % tile (mặc định `110%` = `132px`); chiều cao theo tỷ lệ gốc. House được căn **tâm ngang ô đất**: mở rộng đều qua hai mép; chân sprite được nâng lên `30px` so với đáy tile. Cả hai cho phép chỉnh trong Inspector.

## JSON TÁCH BIỆT

- `map.json`: `tiles[]` chứa `x,y,code,rotation`; **chỉ ô vỉa hè** cần thêm số `landType` (0=thường,1=xây dựng,2=hành chính). Vẫn giữ `simulation` (đèn, xe, thời tiết) vì đã thuộc Map Builder cũ; không ghi object nhà vào `map.json`.
- `houses.json`: `houses` có `rect.{x,y,width,height}` trong **tọa độ pixel local của House PNG**, cùng `imageWidth,imageHeight,calibrated`. Sáu Rect đầu là **vị trí gợi ý**; người thiết kế phải chỉnh tay rồi export.
- `buildings.json`: `buildings[]` có `x,y,houseId,level,industry,doorId`, cộng settings toàn cục cho House. Hai tập dữ liệu phải **export/import riêng** để không ghi công trình vào map tiles. Nạp `map.json` trước, sau đó `buildings.json`, cuối cùng tùy chọn `houses.json`. Khi import buildings, nền vỉa hè ở ô có nhà tự chuyển về subtype 0.

Mục tiêu sản xuất: giữ code map/ngành độc lập, không gộp vào một JSON khó bảo trì. Các ngành ngoài `04_01..04_06` hoặc level khác **chưa có Interior**, panel sẽ báo thiếu asset và không cho dựng để tránh ghép nhầm.

## Source code

- `index.html`: World Map Builder nâng cấp qua v13/v14, dùng `construction_extension.js` cho hệ thống công trình.
- `construction_extension.js`: panel công trình, editor mask, render nhiều lớp, thời gian đóng/mở, lưu/tải JSON riêng.
- `scan_assets.py`: quét lại registry assets từ folder và nạp `houses.json`.
- `build_standalone.py`: nhúng manifest + sprite và mã construction vào `standalone.html` để chạy offline.


## v14 - House center, shadow composite, random House

- Chiều ngang House mở rộng đối xứng từ **tâm tile xây dựng**, `left=(tileX+0.5)*120-width/2` (thay vì lấy mép trái). Chiều cao giữ đúng tỷ lệ PNG.
- Bóng House sử dụng **alpha gộp House + Interior đã clip theo `interiorRect`**. Canvas silhouette được cache theo House, Level, Ngành và Rect; không cộng bóng hai lần.
- Panel công trình có nút **Random mẫu House** theo Level. Tùy chọn **Tự random khi xây mới** không thay đổi nhà hiện có; công tắc được lưu cùng `buildings.json`.
- Bảng Inspector có nút **Random lại mẫu nhà trên toàn map** (xác nhận trước khi thực hiện), chỉ đổi House ID trong cùng Level và giữ tọa độ, Interior, Door, Level.
- `map.json` chỉ ghi loại đất 0/1/2; `houses.json` và `buildings.json` xuất độc lập.
- Source dùng localStorage key v13 để bảo toàn dữ liệu map/house đã chỉnh trong trình duyệt.
