# THẤT NGHIỆP VỀ QUÊ – WORLD MAP BUILDER v12

## Mở tool

- **standalone.html**: mở ngay bằng Chrome/Edge, không cần web server; các ảnh đã được nhúng trong file.
- **index.html**: phiên bản source dùng folder `Asset/Sprites` và `asset_manifest.js`. Có thể mở trực tiếp bằng Chrome/Edge hoặc chạy bằng local server.
- **asset_manifest.json / asset_manifest.js**: danh mục asset được quét từ folder thật.

## Source Asset/Sprites

```text
Asset/Sprites/
├─ Vehicles/                         # không chia theo level
│  ├─ Bikes/
│  │  ├─ bike_1/
│  │  │  ├─ bike_1_top.png
│  │  │  ├─ bike_1_right.png          # mặc định đi phải; lật ảnh để đi trái
│  │  │  └─ bike_1_down.png
│  │  ├─ bike_2/ ...
│  │  └─ bike_10/ ...
│  └─ Cars/                           # xe từ 4 bánh, chưa có sprite
├─ Deco/
│  ├─ Level_1/
│  ├─ Level_2/
│  ├─ Level_3/
│  ├─ Level_4/TrafficLights/          # 3 màu đèn gốc đã cung cấp
│  └─ Level_5/
├─ Roads/
│  ├─ Level_1/
│  ├─ Level_2/
│  ├─ Level_3/
│  ├─ Level_4/                      # 300.png → 312.png
│  └─ Level_5/
└─ Constructions/
   ├─ Level_1/ ...
   ├─ Level_2/ ...
   ├─ Level_3/ ...
   ├─ Level_4/ ...
   └─ Level_5/ ...
```

### Quy tắc bắt buộc với Bikes

`Vehicles/Bikes/bike_N/` phải có **đúng 3 PNG**:

- `bike_N_top.png`: xe chạy lên
- `bike_N_right.png`: xe chạy phải (chạy trái bằng flip X)
- `bike_N_down.png`: xe chạy xuống

Thiếu frame, thừa file, hoặc tên thư mục sai mẫu: xe bị đánh dấu không hợp lệ và không đưa vào mô phỏng.

### Làm mới danh sách khi thêm asset

Từ folder chứa `index.html`:

```shell
python scan_assets.py
python build_standalone.py
```

- `scan_assets.py` đọc **tất cả folder con** và cập nhật hai file manifest.
- `build_standalone.py` tái tạo bản `standalone.html` đã nhúng các ảnh mới.
- Trong UI, tab **Asset** → **Quét thư mục Sprites** có thể chọn folder từ File Explorer để preview ngay trong phiên mở; thay đổi này không thể tự ghi ngược vào file trên ổ đĩa vì trình duyệt giới hạn quyền truy cập. Muốn sử dụng lâu dài, chạy hai lệnh trên.

### Cấp độ đường

Các mã sprite dùng quy ước `xab`, trong đó `x = level-1`; ví dụ Level 4 dùng `300.png ... 312.png`. Khi có PNG mới ở Level khác, chạy scan sẽ đưa chúng vào bảng vật liệu tương ứng.

### Tick trong bảng Asset

- Một thẻ đại diện cho mỗi folder Bike hợp lệ.
- Thumbnail đổi lần lượt Top → Right → Down sau mỗi 0,8 giây.
- Tick/bỏ tick một mẫu làm cho mẫu đó được phép/bị cấm sinh trong mô phỏng.
- **Chọn tất cả** và **Bỏ chọn tất cả** hoạt động ngay. JSON map lưu `simulation.enabledBikes` để mở lại đúng lựa chọn.
- Cars, Deco và Công trình hiện có cấu trúc folder và danh sách asset; **chưa có gameplay mô phỏng ô tô hoặc công cụ đặt đồ trang trí lên bản đồ**. Không tự tạo asset giả.
