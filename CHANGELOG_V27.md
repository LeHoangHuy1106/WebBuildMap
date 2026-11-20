# CHANGELOG v27

1. House lights: tăng giới hạn intensity từ 1.0 lên 3.0 (100% → 300%), thay glow mờ đơn tầng bằng 3 lớp ánh sáng.
2. Deco lights: editor tương tác theo asset, hỗ trợ circle/rect và kéo thả tâm/bán kính/kích thước; lưu/export/import `deco_lights.json`.
3. Dynamic Deco light rotation cùng rotation/scale/position của object.
4. Bóng 2D: sửa projector chung dùng cả pivot và inset (trước đó bỏ qua hai thông số này với House/Deco/Traffic Light/Pedestrian/Bridge).
5. Bóng đêm: opacity = configAlpha × (0.5 + 0.5 × daylightFactor); đêm hoàn toàn = 50%; ban ngày = 100%.
6. Đổi chú thích trên panel mô phỏng cho rõ.
7. Thêm Deco light pipeline vào scanner và standalone builder.

## Kiểm tra
- JS syntax check, Python compile, asset scan, standalone HTML build.
- Chromium: mở Asset Settings, mở Deco Light editor, thêm 2 đèn, chỉnh intensity 250%, save. Không có page errors.
- Browser math: 12:00 alpha=0.34; 22:00 alpha=0.17. Pivot/inset thay đổi transform thực tế.
