# OptiCam-Retail: 2D Interactive Floorplan Canvas & Camera Placement Simulator

> **Phân hệ phụ trách:** Thiết kế Giao diện vẽ, Quản lý Mặt bằng & Tương tác Không gian Canvas 2D (Thành viên 3).  
> **Đề tài:** OptiCam-Retail – Hệ thống Tối ưu hóa Bố trí Camera Giám sát cho Cửa hàng Tiện lợi dựa trên Chuẩn Quang học DORI và Trọng số Rủi ro.  
> **Đơn vị thực hiện:** Nhóm Ngũ Vị Hương – Khoa Công nghệ Thông tin, Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM (FIT@HCMUS).  
> **Giảng viên hướng dẫn:** TS. Bùi Duy Đăng.

---

## 1. Giới thiệu tổng quan

Trong cấu trúc đề tài **OptiCam-Retail**, phân hệ Canvas 2D đóng vai trò là giao diện trung tâm điều phối không gian tương tác (Interactive Visual Engine):
- **Không gian hình học thực tế:** Mô phỏng mặt bằng cửa hàng tiện lợi chuẩn (diện tích $50 - 80\,\text{m}^2$) trên hệ tọa độ mét thực tế quy đổi trực quan sang Pixel ($1\text{m} = 68 - 70\text{ px}$).
- **Tương tác cấu kiện linh hoạt:** Cho phép kéo thả (Drag & Drop), xoay $360^\circ$ mọi đối tượng kiến trúc tĩnh (Tường bao, Kệ hàng Gondola cao $1.8\text{m}$, Quầy thu ngân POS, Cửa ra vào).
- **Phân tầng an ninh bán lẻ:** Tự động sinh và cập nhật Ma trận Trọng số Rủi ro 3 Tầng (Semantic Risk Overlay: Đỏ $W=5.0$, Vàng $W=3.0$, Xanh $W=1.0$) theo thời gian thực.
- **Hạ tầng điểm neo:** Quản lý 64 điểm neo ứng viên trên tường bao (Candidate Wall Anchors) với bước nhảy chuẩn $0.5\text{m}$.
- **Tối ưu hóa tự động (One-Click Auto-Optimize):** Nhận diện cấu hình mặt bằng và tự động bố trí 3 camera tối ưu vào các vị trí trọng yếu, hiển thị bảng Live Scorecard so sánh trực tiếp với phương án 4 camera góc tường truyền thống.
- **An toàn hình học & Nghiệm thu:** Tích hợp kiểm tra va chạm (SAT Collision Detection), chuyển đổi 3 layout thực tế, hiển thị Bảng kê dự toán vật tư (BOM Modal) và xuất dữ liệu JSON/PNG.

---

## 2. Cấu trúc thư mục dự án

```text
opticam-canvas/
├── Source.py                    # Chương trình Canvas chính (Pygame Engine 60 FPS)
├── layout.json                  # Cấu hình mặt bằng chuẩn ban đầu (10m x 6m)
├── opticam_layout_export.json   # Dữ liệu xuất cấu hình hoàn chỉnh sau tối ưu (Phím E)
├── opticam_canvas.png           # Ảnh chụp sơ đồ thiết kế độ nét cao (Phím S)
└── README.md                    # Tài liệu hướng dẫn sử dụng và đặc tả kỹ thuật
```

---

## 3. Yêu cầu hệ thống & Hướng dẫn khởi chạy

### Yêu cầu môi trường
- Hệ điều hành: Windows 10/11, macOS hoặc Linux.
- Phiên bản: Python 3.9 trở lên.
- Thư viện đồ họa: Pygame ($\ge 2.6.0$).

### Lệnh cài đặt & Chạy ứng dụng
Mở Terminal hoặc PowerShell tại thư mục chứa file dự án:
```powershell
# 1. Cài đặt thư viện đồ họa
py -m pip install pygame

# 2. Khởi chạy ứng dụng Canvas
py Source.py
```

---

## 4. Hệ thống phím tắt & Bảng điều khiển Canvas

| Phím / Thao tác | Mô tả chức năng |
| :--- | :--- |
| **Chuột trái (Click & Drag)** | Chọn và kéo thả di chuyển vị trí Kệ hàng, Quầy POS, Cửa ra vào. |
| **Lăn bánh xe chuột (Scroll)** | Xoay góc vật thể đang chọn hoặc xoay hướng camera theo nấc $15^\circ$ ($0^\circ - 360^\circ$). |
| **Phím `R`** | Xoay thực thể đang chọn thêm $15^\circ$ ngược chiều kim đồng hồ. |
| **Click vào Điểm neo tường** | Dời camera đang chọn nhảy ngay đến tọa độ điểm neo đó trên tường. |
| **Phím `O` (Optimize)** | **Kích hoạt Auto-Optimize:** Tự động tính toán và cắm 3 camera vào vị trí tối ưu. |
| **Phím `B` / `ESC`** | Bật / Đóng cửa sổ **Bảng dự toán vật tư & lắp đặt (BOM Modal)**. |
| **Phím `S` (Screenshot)** | Chụp và lưu ảnh sơ đồ Canvas hiện tại thành file `opticam_canvas.png`. |
| **Phím `E` (Export)** | Đóng gói toàn bộ tọa độ, góc xoay và camera ra file `opticam_layout_export.json`. |
| **Phím `1`, `2`, `3`** | Chuyển đổi qua lại giữa 3 mặt bằng: Chuẩn $60\,\text{m}^2$, Circle K $75\,\text{m}^2$, MiniStop $50\,\text{m}^2$. |
| **Phím `G`** | Bật / Tắt hiển thị Lưới tọa độ ô vuông ($0.5\text{m} \times 0.5\text{m}$). |
| **Phím `M`** | Bật / Tắt Lớp phủ Ma trận rủi ro 3 Tầng (Risk Matrix Overlay). |
| **Phím `A`** | Bật / Tắt hiển thị 64 Điểm neo ứng viên trên vách tường (Wall Anchors). |
| **Phím `C`** | Cắm thêm 1 camera thủ công vào điểm neo còn trống (Tối đa 4 camera). |
| **Phím `Delete` / `Backspace`** | Xóa camera đang được chọn (Luôn giữ lại tối thiểu 1 camera). |

---

## 5. Đặc tả các giải thuật & Tính năng cốt lõi

### 5.1. Hệ tọa độ thực tế & Bắt dính lưới (Snap-to-Grid)
- Tỉ lệ ánh xạ không gian: $1\text{ mét} = 68 - 70\text{ pixels}$.
- Tọa độ mọi cấu kiện được lưu trữ dưới đơn vị mét thực tế. Khi người dùng nhả chuột sau khi kéo, hàm `snap_and_clamp_entity()` tự động làm tròn về bội số gần nhất của $0.5\text{m}$ ($x_{\text{snap}} = \text{round}(x / 0.5) \times 0.5$), ngăn ngừa hiện tượng sai số tọa độ khi giao tiếp với thuật toán tối ưu tổ hợp.

### 5.2. Thuật toán khóa Cửa ra vào mép tường bao (Boundary Door Locking)
- Cửa ra vào trong cửa hàng tiện lợi luôn phải nằm tại ranh giới tiếp giáp không gian bên ngoài. Thuật toán tự động tính khoảng cách từ tâm kéo đến 4 bức tường:
  - Nếu áp sát tường **Trái** hoặc **Phải**: Cửa tự động xoay dọc ($90^\circ$), mép ngoài áp sát vách phòng và cho phép trượt tự do dọc vách tường.
  - Nếu áp sát tường **Trên** hoặc **Dưới**: Cửa tự động xoay ngang ($0^\circ$), mép ngoài áp sát vách trên/dưới.
  - Triệt tiêu hoàn toàn lỗi cửa bị đâm xuyên hoặc thò ra ngoài phòng.

### 5.3. Phát hiện va chạm hình học (Separating Axis Theorem - SAT)
- Sử dụng Định lý trục phân tách (SAT) để kiểm tra giao thoa giữa các đa giác xoay tự do $360^\circ$:
  - Chiếu tọa độ các đỉnh của hai vật thể lên các véc-tơ pháp tuyến của từng cạnh.
  - Nếu tồn tại bất kỳ trục nào có khoảng cách giữa hai đoạn chiếu, hai vật thể không giao nhau.
  - Khi phát hiện va chạm lấn chiếm vị trí, khung bóng mờ đổi sang màu **Đỏ Cảnh Báo** và hệ thống kích hoạt cơ chế **Auto-revert** (bật ngược vật thể về vị trí hợp lệ cũ khi buông chuột).

### 5.4. Ma trận Rủi ro 3 Tầng theo Ngữ nghĩa (Semantic Risk Overlay)
- Phân chia mặt bằng thành các ô vuông rời rạc $0.5\text{m} \times 0.5\text{m}$, tự động gán trọng số an ninh dựa trên vật thể:
  - **Vùng Đỏ ($W = 5.0$ - Trọng yếu):** Bán kính vùng đệm $1.0\text{m}$ quanh Quầy POS và Cửa chính (Yêu cầu nhận diện chi tiết khuôn mặt và mệnh giá tiền: Identification $\ge 250\text{ PPM}$).
  - **Vùng Vàng ($W = 3.0$ - Rủi ro cao):** Hành lang và vùng đệm $1.0\text{m}$ quanh các dãy kệ hàng cao $1.8\text{m}$ (Yêu cầu nhận diện hành vi lấy hàng: Recognition $\ge 125\text{ PPM}$).
  - **Vùng Xanh ($W = 1.0$ - Lưu thông chung):** Toàn bộ diện tích sàn trống còn lại (Yêu cầu quan sát tổng quan: Observation $\ge 62\text{ PPM}$).

### 5.5. Bảng kê dự toán thi công (Bill of Materials - BOM) & Live Scorecard
- Bảng Scorecard hiển thị tức thì: Thời gian giải ($< 2\text{ms}$), Số lượng camera tiết kiệm ($25\%$), Tỷ lệ bao phủ Vùng Đỏ ($96.5\%$).
- Hộp thoại BOM (Phím `B`) chuẩn hóa thông số thi công: Mã hiệu camera, Tọa độ mét $(X, Y)$, Chiều cao lắp đặt tiêu chuẩn ($H = 2.4\text{m}$), Góc xoay (Pan angle), Model khuyến nghị và Tổng dự toán ngân sách phần cứng.