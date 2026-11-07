# Kiến trúc và cấu trúc dự án

## Cây thư mục

```text
opticam/
├── backend/
│   ├── main.py                 # FastAPI, schema request/response, API routes
│   ├── greedy_optimizer.py     # Greedy backend, PPM/FOV/line-of-sight
│   ├── requirements.txt        # Runtime dependencies
│   ├── requirements-dev.txt    # Test dependencies
│   └── tests/test_api.py       # API và optimizer tests
├── data_samples/               # Ba layout mẫu, dùng chung
├── docs/                       # User guide, architecture, formula, API, research
├── frontend/
│   ├── experiments/run.ts       # E1/E2/E3 thực nghiệm tái lập
│   ├── src/
│   │   ├── App.tsx              # Trạng thái ứng dụng và hành động UI
│   │   ├── components/          # Inspector, Scorecard, BOM, Canvas nodes/layers
│   │   ├── core/                # Hình học, optics, optimizer, IO, BOM, API adapter
│   │   ├── data/presets.ts      # Đọc preset JSON từ ../data_samples
│   │   └── types.ts             # Kiểu Layout, Camera, Obstacle, Cell, Score
│   ├── package.json
│   └── vite.config.ts           # Dev server :3000, proxy /api → :8000
├── legacy_pygame/               # Prototype cũ chỉ để tham khảo
├── results/                     # Kết quả CSV/Markdown của experiments
├── scripts/gen_samples.py       # Sinh lại JSON mẫu từ preset Pygame
└── README.md
```

`frontend/node_modules`, `frontend/dist`, Python virtualenv và cache test là file phát sinh;
được bỏ qua bởi `.gitignore`, không phải source để chỉnh tay.

## Trách nhiệm các module

### Frontend

- `App.tsx`: giữ layout đang mở, selection, công cụ, camera, lớp phủ và điều phối hành động.
- `components/canvas/`: ghép các Konva layer; render lưới/ảnh nền, heatmap, vật cản,
  camera/FOV, đo khoảng cách và tooltip PPM.
- `core/geometry.ts`: góc, snap, phép chiếu hình chữ nhật, SAT, kiểm tra tia và điểm neo.
- `core/optics.ts`: phân vùng rủi ro, tính PPM/DORI, scorecard.
- `core/optimizer.ts`: Greedy client, baseline 4 góc và vét cạn dùng trong thí nghiệm.
- `core/api.ts`: chuyển layout/ma trận thành payload, gửi `POST /api/v1/optimize`,
  chuẩn hóa response; timeout/lỗi sẽ fallback sang optimizer client.
- `core/io.ts`: chuẩn hóa layout cũ/mới, tải file, export/parse bundle JSON.
- `core/bom.ts`: BOM client và CSV.
- `core/editor.ts`: thêm/xóa/resize vật cản và resize phòng.

### Backend

- `main.py`: FastAPI app, validation Pydantic, route, lưu file, xuất BOM/bundle.
- `greedy_optimizer.py`: lưới ô, kiểm tra FOV/PPM và tia nhìn qua vật cản, chọn camera tham lam.
- `tests/test_api.py`: kiểm tra response API, ma trận, optimizer, BOM và bundle.
- `storage/layouts/`: mặc định lưu layout qua API; thư mục được tạo khi có request Save.

## Luồng dữ liệu chính

```text
JSON mẫu ──> presets.ts ──> App/Layout ──> buildZones ──> evaluate ──> Canvas/Scorecard
                                  │
                                  ├── Auto-Optimize ──> toApiPayload ──> FastAPI Greedy
                                  │                           └── timeout/lỗi ──> Greedy client
                                  ├── Export JSON/PNG ──> tải về trên trình duyệt
                                  └── BOM ──> buildBom ──> bảng / CSV trên trình duyệt
```

Backend cũng cung cấp Save/Load, BOM JSON/CSV/XLSX và project bundle endpoints. Những route
này chưa được gọi từ các nút UI; xem [API_CONTRACT.md](API_CONTRACT.md) để biết request.

## Thành phần phụ thuộc và chạy

- Frontend: React, TypeScript, react-konva/Konva, Vite, Vitest.
- Backend: FastAPI, Pydantic v1, Uvicorn, openpyxl, python-multipart.
- Vite chạy ở cổng 3000 và proxy `/api` sang `http://localhost:8000`.
- Lệnh chạy, build, test: [README.md](../README.md).

