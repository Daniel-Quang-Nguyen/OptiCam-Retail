# Hướng dẫn sử dụng

## Mở ứng dụng

Khởi động backend và frontend theo hướng dẫn tại [README.md](../README.md), sau đó mở
<http://localhost:3000>. Nếu backend chưa chạy, Auto-Optimize tự chuyển sang Greedy
trên trình duyệt.

## Khu vực giao diện

- **Canvas:** mặt bằng theo mét, lưới, vật cản, camera, vùng FOV và heatmap.
- **Thanh công cụ:** chọn lớp phủ, cọ rủi ro, bật lưới/điểm neo, thêm vật thể, đo và benchmark.
- **Inspector:** chỉnh tường bao, tỷ lệ ảnh nền và thông số của vật thể/camera đang chọn.
- **Live Scorecard:** so sánh 4 camera thủ công, phương án hiện tại và Greedy không trọng số.
- **BOM:** bảng thiết bị/cáp ước tính; có thể tải CSV.

## Các thao tác chính

1. Chọn một trong ba layout mẫu ở đầu trang hoặc import layout JSON.
2. Thêm kệ, POS, cửa hoặc camera bằng các nút trên toolbar.
   Chọn **Người đánh giá**, rồi bấm vào mặt bằng để đặt hình người; chọn/kéo hình người để
   mở thông tin và xem DORI/PPM tại mặt, ngực, bụng và chân. Dùng `Delete` để xóa người.
3. Kéo camera trên tường để đổi vị trí; kéo tay cầm màu cam để đổi hướng theo nấc 15°.
   Chọn camera rồi chỉnh chất lượng, model, pan, FOV, tầm xa và chiều cao trong Inspector.
   Ô số cho phép xóa giá trị cũ để nhập lại; nhấn `Enter` để áp dụng, `Esc` hoặc rời ô để
   hủy nội dung đang nhập.
4. Chọn vật cản để đổi tên/kích thước/chiều cao; xoay bằng nút xoay hoặc phím `R`.
   Cửa được khóa vào cạnh tường; vật cản không được chồng lấn.
5. Chọn **Heatmap DORI**, **Ma trận rủi ro W**, hoặc **Tắt** để đổi lớp phủ.
   Chọn cọ `W = 5`, `W = 3`, `W = 1`, rồi kéo trên sơ đồ để ghi đè trọng số. Nét cọ được
   lưu theo vị trí/bán kính thực nên giữ nguyên khi đổi kích thước lưới. Heatmap rủi ro dùng
   chuyển sắc liên tục xanh → lục lam → vàng → cam → đỏ; khi phóng đủ lớn, mỗi ô hiện giá trị
   W thực tế để phân biệt rõ các trọng số thập phân.
6. Chọn **Auto-Optimize (3 Cameras)** hoặc **Tối ưu theo số cam hiện có** để nhận vị trí đề
   xuất. Nút **Tìm số cam tối thiểu (Đỏ 95% · Vàng 80%)** lần lượt đánh giá các tiền tố của
   phương án Greedy, dừng ở số camera ít nhất đạt cả hai KPI. Cấu hình FOV, độ phân giải,
   tầm xa, chiều cao và model được giữ theo thứ tự camera đã nhập; vị trí và hướng được tối ưu
   lại. Nếu không đạt KPI với số camera hiện có, ứng dụng giữ toàn bộ phương án tốt nhất và
   thông báo tỷ lệ thực tế trên Scorecard/toast.
7. Chọn **Bảng BOM**, **Export JSON**, **Import JSON**, hoặc **PNG** để xem/tải kết quả.

### Thông số camera

- **Chất lượng ảnh:** preset 2 MP (1920 px ngang), 4 MP (2560 px ngang), 8 MP
  (3840 px ngang), hoặc độ phân giải ngang tùy chỉnh. PPM dùng trực tiếp số pixel ngang.
- **Góc xoay / pan:** hướng trục quang học trên mặt bằng; 0° hướng +X, tăng theo chiều kim đồng hồ.
- **Góc quay / FOV:** độ rộng góc nhìn, đơn vị độ.
- **Tầm xa:** giới hạn khoảng cách sàn còn được tính trong mô hình.
- **Chiều cao:** cao độ camera so với sàn; dùng để tính khoảng cách đến mặt phẳng mặt người.
- **Điểm đánh giá trên người:** chọn mặt, ngực hoặc thắt lưng trong Inspector để tính heatmap
  và tối ưu camera. Cửa sổ của hình người luôn hiển thị riêng DORI theo bốn vùng cơ thể.
- **Vùng trọng yếu:** mỗi POS/cửa mặc định có `(Wmax=5, r0=1 m, R=2.5 m)`; mỗi kệ có
  `(Wmax=3, r0=1 m, R=2 m)`. Chọn vật thể để chỉnh ba giá trị này trong Inspector. W giữ ở
  Wmax tới r0 rồi giảm tuyến tính về 1 tại R; nếu nhiều vùng chồng nhau, lấy W lớn nhất.
  Màu chỉ gom để hiển thị (Đỏ `W≥4`, Vàng `2≤W<4`, Xanh `W<2`), còn Greedy dùng W số thực.
  Cọ thủ công vẫn dùng mức 5/3/1 và ghi đè lên vùng tự động; nét vẽ sau cùng được ưu tiên.
  Có thể chỉnh kích thước ô trong Inspector; nên chọn `gridM ≤ (R-r0)/3` để lấy mẫu vùng
  chuyển tiếp đủ mịn (ví dụ vùng kệ mặc định khuyến nghị lưới không quá khoảng 0,33 m).
  Với kệ, chọn nhóm hàng **CRAVED cao** (Wmax 4.5), **thông thường** (3.0) hoặc
  **cồng kềnh** (1.8); có thể chọn **Tùy chỉnh** hoặc sửa Wmax trực tiếp. Đây là trọng số
  khởi tạo để ưu tiên bố trí, không phải xác suất/mức trộm cắp đã hiệu chuẩn. CRAVED giúp
  phân nhóm theo thuộc tính sản phẩm; dữ liệu tổn thất và kiểm kê tại cửa hàng mới nên được
  dùng để tinh chỉnh các giá trị.

### Ảnh nền và tỷ lệ

Nạp ảnh mặt bằng, chọn công cụ **Đo (m)** và kéo một đoạn có chiều dài thực đã biết.
Nhập chiều dài thực để hiệu chuẩn bề ngang ảnh. Điều khiển `px / m` chỉnh tỷ lệ hiển thị
của sơ đồ, không làm thay đổi kích thước phòng tính bằng mét.

### Phím tắt

| Phím | Tác vụ |
|---|---|
| `O` | Auto-Optimize |
| `B` | Mở/đóng BOM |
| `G` | Bật/tắt lưới |
| `A` | Bật/tắt điểm neo |
| `C` | Thêm camera |
| `R` | Xoay đối tượng đang chọn 15° |
| `Delete` / `Backspace` | Xóa đối tượng đang chọn |
| `1` / `2` / `3` | Chọn layout mẫu |
| Cuộn chuột | Xoay đối tượng đang chọn 15° |

## Lưu ý về dữ liệu

- Import/Export JSON trên UI xử lý layout/bundle trong trình duyệt; dữ liệu không tự gửi
  lên backend để lưu.
- API backend Save/Load, BOM CSV/XLSX và project import/export được mô tả tại
  [API_CONTRACT.md](API_CONTRACT.md), hiện cần gọi qua Swagger UI hoặc HTTP client.
- BOM là ước tính theo giả định tuyến cáp Manhattan; cần khảo sát công trình trước khi đặt mua.
- FOV vẽ trên Canvas được giới hạn bán kính hiển thị 6 m để dễ quan sát; phép tính sử dụng
  tầm xa camera đã cấu hình.
