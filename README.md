# OptiCam-Retail

Ứng dụng web hỗ trợ dựng mặt bằng cửa hàng, đặt camera và đánh giá vùng quan sát theo
độ phân giải ảnh (PPM/DORI). Dự án gồm frontend React/Konva, backend FastAPI và bộ
thí nghiệm tái lập cho thuật toán bố trí camera.

## Bắt đầu nhanh

Yêu cầu: Node.js 22.12+ (Vite 8), npm và Python 3.10+.

Mở hai terminal PowerShell tại thư mục `opticam_tong_hop` (thư mục chứa `backend`,
`frontend` và `data_samples`).

**Terminal 1 — backend**
```powershell
Set-Location .\backend
python -m pip install -r requirements-dev.txt
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend**
```powershell
Set-Location .\frontend
npm.cmd ci --legacy-peer-deps
npm.cmd run dev
```

`--legacy-peer-deps` cần thiết với bộ phiên bản hiện tại: Vite 8 và `@vitejs/plugin-react`
4 khai báo peer dependency chưa khớp, dù build và test đã chạy thành công.

Mở giao diện tại <http://localhost:3000>. Tài liệu API tương tác ở
<http://localhost:8000/docs>; kiểm tra backend tại <http://localhost:8000/api/v1/health>.
Hướng dẫn thao tác đầy đủ: [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Kiểm thử

Chạy từ thư mục gốc:
```powershell
Set-Location .\frontend
npm.cmd test
npm.cmd run build
Set-Location ..
python -m pytest .\backend\tests -q
```

Chạy bộ thí nghiệm tái lập:
```powershell
Set-Location .\frontend
npm.cmd run experiments
```

## Tài liệu

- [Hướng dẫn người dùng](docs/USER_GUIDE.md) — công cụ trên Canvas, chỉnh camera, xuất dữ liệu.
- [Kiến trúc dự án](docs/ARCHITECTURE.md) — cấu trúc file và luồng frontend/backend.
- [Mô hình và công thức](docs/FORMULAS.md) — PPM, DORI, vùng rủi ro, mục tiêu Greedy và BOM.
- [Hợp đồng API](docs/API_CONTRACT.md) — endpoint, schema, giới hạn và trạng thái tích hợp.
- [Nghiên cứu và kết quả](docs/RESEARCH.md) — thiết kế thí nghiệm, số liệu và giới hạn nghiên cứu.

## Cấu trúc cấp cao

```text
backend/       FastAPI, optimizer, API tests, cấu hình dependencies
data_samples/  Ba layout JSON mẫu (nguồn dữ liệu mẫu duy nhất)
docs/          Tài liệu người dùng, kiến trúc, công thức, API, nghiên cứu
frontend/      React/Konva, thuật toán client, unit tests, experiments
legacy_pygame/ Prototype Pygame cũ, chỉ để tham khảo
results/       CSV và báo cáo do experiments sinh ra
scripts/       Công cụ tạo lại layout mẫu
```

## Trạng thái và giới hạn

- Frontend có Canvas tương tác, heatmap DORI/rủi ro, Greedy cục bộ, hiệu chỉnh camera,
  BOM CSV và import/export bundle JSON.
- Backend có Greedy API, lưu/nạp layout, xuất BOM JSON/CSV/XLSX và project bundle.
  Các endpoint lưu/nạp và xuất báo cáo backend hiện chưa có nút gọi trực tiếp trên UI.
- Mô hình PPM/DORI là xấp xỉ 2D; chưa tính méo ống kính, tilt, ánh sáng, người/vật cản động.
- Kết quả nghiên cứu và các giả định định lượng được ghi trong [docs/RESEARCH.md](docs/RESEARCH.md);
  không xem tỷ lệ phủ mô phỏng là bảo đảm nhận diện thực tế.
