# Mô hình và công thức

Tài liệu này mô tả đúng các phép tính đang dùng trong frontend (`frontend/src/core/optics.ts`)
và backend (`backend/greedy_optimizer.py`). Đây là mô hình phẳng để hỗ trợ bố trí sơ bộ,
không phải chứng nhận hiệu năng camera thực.

## 1. Lưới, tọa độ và vùng rủi ro

- Tọa độ mặt bằng tính bằng mét; gốc `(0, 0)` ở góc trên-trái, `x` tăng sang phải, `y`
  tăng xuống dưới.
- Với kích thước ô `g = gridM`, số cột `C = round(widthM / g)`, số hàng
  `R = round(heightM / g)`. Tâm ô `(r, c)`:

  ```text
  x_c = (c + 0.5) g
  y_r = (r + 0.5) g
  ```

- Khoảng cách từ tâm ô đến vật cản chữ nhật (kể cả hình chữ nhật xoay) được tính trong
  hệ tọa độ local của hình chữ nhật. Ô nằm trong kệ/POS là ô đặc và không được tính là
  sàn; cửa không tạo ô đặc.
- Mặc định `W = 5` nếu ô cách POS/cửa không quá `RED_BUFFER = 1.0 m`; nếu không, `W = 3`
  khi cách kệ không quá `YELLOW_BUFFER = 1.0 m`; còn lại `W = 1`. Thứ tự này ưu tiên vùng đỏ.
  Cọ rủi ro ghi đè W theo từng ô.

## 2. Góc pan và FOV

Góc hướng từ camera tới ô:

```text
θ = atan2(y_cell - y_cam, x_cell - x_cam) × 180 / π
Δθ = min(|θ - pan| mod 360, 360 - (|θ - pan| mod 360))
```

Ô nằm trong vùng nhìn ngang khi `Δθ ≤ FOV / 2`, cách camera không vượt `range`, và
`distance ≥ 0.2 m`. Pan được snap theo nấc 15° trong thao tác kéo tay cầm; `FOV` là góc mở
toàn phần, không phải góc lệch mỗi bên.

## 3. PPM

Với camera có độ phân giải ngang `Res`, góc mở ngang `FOV`, khoảng cách nằm ngang `d`, độ
cao camera `H_cam` và điểm đánh giá đã chọn `Z_target` (mặt 1.6 m, ngực 1.2 m hoặc thắt
lưng 0.9 m):

```text
d       = √((x_cell - x_cam)² + (y_cell - y_cam)²)
Δz      = |H_cam - Z_target|
r       = √(d² + Δz²)
PPM     = Res / (2 r tan(FOV / 2))
```

`FOV` được đổi sang radian khi đưa vào `tan`. PPM bằng 0 nếu ô ngoài tầm, ngoài góc nhìn, gần hơn 0.2 m, hoặc tia nhìn cắt thể tích vật
cản. Tia nhìn nội suy độ cao từ camera đến điểm đánh giá; kệ/POS chắn khi đường tia đi qua
độ cao không lớn hơn `elev`. Cửa không chắn tia. Vì vậy thay đổi chiều cao camera hoặc điểm
đánh giá có thể làm đổi vùng khuất.

Ví dụ xấp xỉ tại điểm mặt: `Res = 2560`, `FOV = 85°`, camera cao `2.4 m`, ô cách camera
ngang `5 m`: `r = √(5² + 0.8²) ≈ 5.06 m`, do đó
`PPM ≈ 2560 / (2 × 5.06 × tan(42.5°)) ≈ 296`.

## 4. Phân lớp DORI và điểm

PPM được ánh xạ thành một mức:

| PPM | Mức | Hệ số `F` |
|---:|---|---:|
| `≥ 250` | Identification | 1.00 |
| `125–<250` | Recognition | 0.75 |
| `62–<125` | Observation | 0.40 |
| `25–<62` | Detection | 0.20 |
| `< 25` | Blind | 0.00 |

Khi có nhiều camera, ô dùng PPM tốt nhất:

```text
PPM_cell = max(PPM_cam(cell))
DORI_cell = DORI(PPM_cell)
```

Điểm có trọng số trên lưới frontend:

```text
Score = Σ_cell W_cell × F(DORI_cell)
```

Scorecard hiển thị thêm KPI:

```text
Red %    = 100 × số ô W=5 có PPM≥250 / tổng số ô W=5
Yellow % = 100 × số ô W=3 có PPM≥125 / tổng số ô W=3
```

Nếu một vùng không có ô nào, phần trăm vùng đó được xem là 100% trong scorecard.

## 5. Greedy

Ứng viên backend được đặt dọc tường, bước neo bắt đầu bằng `max(gridM, 0.5 m)`; mỗi neo
có các góc pan `0°, 15°, ..., 345°`. Cấu hình camera mặc định của optimizer backend là
`FOV=85°`, `Res=2560`, `height=2.4 m`, `range=10 m`.

Ở mỗi lượt, với mỗi camera ứng viên `c`, tính phần điểm tăng:

```text
Gain(c) = Σ_cell W_cell × max(0, F(PPM_c) - F(PPM_best_so_far))
```

Chọn ứng viên có Gain lớn nhất, cập nhật PPM tốt nhất trên từng ô rồi lặp. Backend dừng
khi ít nhất 95% ô sàn trống đạt `PPM ≥ 25`, hết camera có Gain dương, hoặc đã dùng hết
`cameraBudgetK`. Không đạt mục tiêu thì response vẫn trả phương án tốt nhất tìm được cùng
`target_coverage_reached = false`.

Để giới hạn công việc, backend giới hạn kích thước lưới 12.000 ô và tối đa khoảng
1.000.000 phép đánh giá ô ứng viên; khi cần, bước neo được tăng theo hệ số 2. Greedy client
có cùng mục tiêu DORI có trọng số, nhưng dùng tập neo/góc và quy tắc phá hòa riêng. Vì vậy
kết quả backend và client fallback có thể khác vị trí camera.

Greedy là heuristic; ngưỡng 95% là tỷ lệ ô đạt mức Detection, không phải bảo đảm 95% vùng
đỏ đạt Identification hoặc 95% toàn mặt bằng được nhận diện.

## 6. BOM — chiều dài cáp ước tính

NVR được giả định đặt tại tâm POS; nếu không có POS, dùng `(0, 0)`. Với camera `i` tại
`(x_i, y_i)`, NVR tại `(x_N, y_N)`, chiều cao camera `H_i`:

```text
Cable_i = ceil(1.1 × (|x_i - x_N| + |y_i - y_N| + H_i + 3 m))
Cable_total = Σ_i Cable_i
Cost_total = N_camera × 1.250.000 VNĐ + 1.500.000 VNĐ (hạ tầng, nếu có camera)
```

Đây là ước lượng Manhattan cộng 3 m dư/thả cáp và 10% hao hụt; không theo tuyến ống/cáp
thực tế. Đơn giá được khai báo cố định trong mã, không phải báo giá nhà cung cấp.
