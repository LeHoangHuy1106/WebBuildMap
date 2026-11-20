# Đề xuất tối ưu asset hình ảnh: Thất Nghiệp Về Quê

## 1. Số liệu thực tế của nguồn v23 (kiểm tra 20/11/2026)

Những số liệu này tính trên các PNG được cung cấp, không tính asset chưa có.

| Nhóm | Số PNG | Dung lượng PNG trên đĩa | RGBA thô ước tính |
|---|---:|---:|---:|
| Constructions | 17 | 2.01 MiB | 4.07 MiB |
| Deco | 4 | 0.07 MiB | 0.22 MiB |
| Pedestrians | 12 | 1.06 MiB | 3.30 MiB |
| Roads | 14 | 1.06 MiB | 3.19 MiB |
| Vehicles | 30 | 1.57 MiB | 3.00 MiB |
| **Tổng** | **77** | **5.76 MiB** | **13.78 MiB** |

- `standalone.html` nhúng ảnh Base64 nên nặng khoảng **10,67 MiB**; source ZIP cũng chứa ảnh gốc và HTML nhúng ảnh nên bị trùng dữ liệu. Đây là định dạng **preview offline**, không phải cách đóng gói nên dùng cho bản game thương mại.
- `zoomTo()` hiện cho phép zoom **0,25× đến 5×**, `dpr` lên đến **2**. Số pixel đầu ra xấp xỉ: `kích thước hiển thị ở zoom 1 × zoom × DPR`.
- Tile road đa phần `240×240 px` nhưng world tile `120×120`: vừa 2× ở DPR1, hoặc zoom 1 ở DPR2. Ở zoom 5 và DPR2 tile sẽ cần 1.200×1.200 điểm ảnh nếu thật sự muốn khớp 1:1.
- `Trees/tree_01.png` chỉ **95×95 px**, mặc định đặt rộng **84 world px**. Tại zoom 2, DPR2, ảnh bị kéo lên khoảng 336px ngang, tức nguồn ít hơn khoảng 3,5 lần.
- Frame người đi bộ **208×347 px** nhưng người hiển thị khoảng **54 world px chiều cao** mặc định: đây chưa phải điểm nghẽn ưu tiên.

## 2. Hướng giải quyết đề xuất

**A. Tách asset nguồn và asset chạy game.** Giữ PNG gốc chất lượng cao ở thư mục source để chỉnh sửa. Export file runtime ở định dạng phù hợp (WebP cho web canvas; texture nén GPU theo nền tảng khi đóng game native). Không dùng các file ảnh độ phân giải cao nguyên bản trên mọi nền tảng.

**B. 2–3 mức chất lượng (LOD) cho nhóm quan trọng, thay theo zoom.** `base` dành cho toàn cảnh; `detail` dành cho zoom gần; `high` chỉ cho các asset trọng điểm như nhà chính và cây lớn. Tránh nhân nhiều biến thể cho tất cả sprite. Hỗ trợ chuyển độ phân giải khi zoom chạm ngưỡng thay vì phóng căng một ảnh nhỏ.

**C. Chuẩn hóa kích cỡ theo world-space.** Nên định nghĩa `worldWidth/worldHeight` trước khi xuất asset; dùng công thức `targetPixels ≈ worldSize × maxZoomThựcTế × DPRThiếtKế`. Ví dụ Deco cây rộng 84 world px, zoom gameplay mục tiêu 2× trên DPR2 thì nguồn hợp lý cỡ 336px ngang. Nếu editor cần zoom 5×, chỉ dùng high-res cho một số vật thể quan trọng, hoặc chấp nhận mềm ở mức zoom kiểm tra cực đại.

**D. Tối ưu đúng nhóm ảnh.** Tile lặp (roads/rivers/sidewalks): ảnh không được hở seam, thường cần nền gốc 2× hoặc 3×, xuất atlas nhóm. Deco/nhà có alpha: kiểm tra WebP lossless hoặc WebP lossy chất lượng cao có alpha, so sánh viền; không mặc định đổi tất cả bằng một mức quality. Nhân vật 12-frame: pack frame vào atlas, loại khoảng trống trong suốt và giữ nhất quán pivot.

**E. Nạp theo khu vực và loại asset.** Quản lý tải/làm rỗng cache theo vùng map/Level/sự kiện thay vì preload toàn bộ world. Dùng một texture cho nhiều instance cùng sprite; chỉ giữ atlas cần thiết trong bộ nhớ. Không nhầm dung lượng WebP trên đĩa với dung lượng texture RGBA khi giải mã trên GPU.

**F. Không đưa Base64 HTML vào bản game.** `index.html` + assets riêng hoặc các gói sprite có cache/CDN sẽ giúp không lặp Base64 trong manifest, có thể cache file không thay đổi khi cập nhật game. `standalone.html` chỉ dùng kiểm tra/offline.

## 3. Quy trình đề nghị

1. Khóa thông số **world size** và phạm vi zoom **gameplay**, tách zoom editor ra khỏi yêu cầu asset sản xuất. Ví dụ gameplay zoom 0.5–2.5×, editor có thể zoom 5× chỉ để kiểm tra.
2. Chọn 10–20 asset đại diện: đường, nhà, cây, người; xuất thử bản PNG hiện có, WebP lossless, WebP quality 88–92, và phiên bản detail 2× nếu cần.
3. So sánh trong game tại zoom 1×, 2×, 3× ở màn DPR1/DPR2; duyệt chất lượng đường viền, text/line art, màu và seam.
4. Ghi **pixel dimensions, world dimensions, format, bytes, alpha, detail tier** vào metadata build; xác định budget download và GPU memory theo thiết bị mục tiêu.
5. Mới sau đó viết pipeline export tự động, tải theo vùng và atlas. Không phóng mọi hình lên 4K; cách đó vừa nặng vừa không sinh ra chi tiết mới.

## 4. Phạm vi bản mã mới

Phiên bản hiện tại **chưa tự động nén hoặc thay định dạng 77 ảnh** nhằm giữ nguyên art gốc, kích thước prefab và luật hiện có. Phần được triển khai là **sort point dùng chung theo asset**.
