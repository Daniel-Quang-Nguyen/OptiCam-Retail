# Kết quả thực nghiệm (sinh tự động bởi `npm run experiments`)

## E1 — 3 layout mẫu

| Layout | K | Phương pháp | Vùng Đỏ % | Hành lang % | Tổng điểm | Đạt KPI | Greedy/Optimum |
|---|---|---|---|---|---|---|---|
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 2 | Manual 4 góc (4 cam) | 100 | 73.2 | 452 | ✘ |  |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 2 | Greedy không trọng số | 66.7 | 66.1 | 398.8 | ✘ |  |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 2 | Weighted Greedy | 100 | 66.1 | 411.8 | ✘ |  |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 2 | Weighted Greedy (tập thu gọn) | 87.9 | 60.7 | 359 | ✘ | 100.0% |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 2 | Vét cạn (tập thu gọn) | 87.9 | 60.7 | 359 | ✘ |  |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 2 | Vét cạn (tập đầy đủ 0.5 m / 15°) | 100 | 66.1 | 411.8 | ✘ |  |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 3 | Manual 4 góc (4 cam) | 100 | 73.2 | 452 | ✘ |  |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 3 | Greedy không trọng số | 66.7 | 87.5 | 477.8 | ✘ |  |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 3 | Weighted Greedy | 100 | 87.5 | 490.8 | ✔ |  |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 3 | Weighted Greedy (tập thu gọn) | 90.9 | 70.5 | 421.8 | ✘ | 100.0% |
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 3 | Vét cạn (tập thu gọn) | 90.9 | 70.5 | 421.8 | ✘ |  |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 2 | Manual 4 góc (4 cam) | 100 | 63.9 | 493.5 | ✘ |  |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 2 | Greedy không trọng số | 100 | 54.2 | 433 | ✘ |  |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 2 | Weighted Greedy | 97.1 | 61.1 | 435.5 | ✘ |  |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 2 | Weighted Greedy (tập thu gọn) | 100 | 56.3 | 411.3 | ✘ | 100.0% |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 2 | Vét cạn (tập thu gọn) | 100 | 56.3 | 411.3 | ✘ |  |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 2 | Vét cạn (tập đầy đủ 0.5 m / 15°) | 97.1 | 61.1 | 435.5 | ✘ |  |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 3 | Manual 4 góc (4 cam) | 100 | 63.9 | 493.5 | ✘ |  |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 3 | Greedy không trọng số | 100 | 76.4 | 535.8 | ✘ |  |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 3 | Weighted Greedy | 97.1 | 77.1 | 518 | ✘ |  |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 3 | Weighted Greedy (tập thu gọn) | 100 | 72.2 | 480.3 | ✘ | 100.0% |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 3 | Vét cạn (tập thu gọn) | 100 | 72.2 | 480.3 | ✘ |  |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 2 | Manual 4 góc (4 cam) | 100 | 84.3 | 408.3 | ✔ |  |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 2 | Greedy không trọng số | 100 | 82.9 | 394.3 | ✔ |  |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 2 | Weighted Greedy | 100 | 82.9 | 394.3 | ✔ |  |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 2 | Weighted Greedy (tập thu gọn) | 87.9 | 81.4 | 357.8 | ✘ | 99.3% |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 2 | Vét cạn (tập thu gọn) | 63.6 | 80 | 360.3 | ✘ |  |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 2 | Vét cạn (tập đầy đủ 0.5 m / 15°) | 100 | 82.9 | 394.3 | ✔ |  |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 3 | Manual 4 góc (4 cam) | 100 | 84.3 | 408.3 | ✔ |  |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 3 | Greedy không trọng số | 100 | 100 | 437.8 | ✔ |  |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 3 | Weighted Greedy | 100 | 100 | 437.8 | ✔ |  |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 3 | Weighted Greedy (tập thu gọn) | 97 | 100 | 418.3 | ✔ | 100.0% |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 3 | Vét cạn (tập thu gọn) | 97 | 100 | 418.3 | ✔ |  |

## E2 — 30 layout ngẫu nhiên (seed 2026…2055, 50–80 m², K = 3 camera cho Greedy/Vét cạn, Manual = 4 camera)

| Chỉ số | Giá trị |
|---|---|
| Tỉ lệ Greedy / Optimum (tập thu gọn) | 97.2% ± 2.0 (min 93.1%, CI95 bootstrap [96.5, 97.9]) |
| Tổng điểm: Weighted − Unweighted Greedy | 4.8 (CI95 [0.4, 9.1]); thắng 19, hoà 7, thua 4 |
| Tổng điểm: Weighted Greedy (3 cam) − Manual (4 cam) | -6.9 (CI95 [-11.5, -2.5]) |
| Vùng Đỏ trung bình (Manual / Unweighted / Weighted) | 96.0 / 76.9 / 93.6 % |
| Hành lang trung bình (Manual / Unweighted / Weighted) | 95.8 / 98.5 / 98.6 % |
| Số layout đạt KPI (Đỏ ≥ 95% & Vàng ≥ 80%): Manual / Unweighted / Weighted / Optimum | 23 / 13 / 20 / 15 trên 30 |
| Thời gian Greedy (tập đầy đủ) trung bình / lớn nhất | 46.9 / 97.0 ms |

## E3 — Lợi ích cận biên theo số camera (Weighted Greedy)

| Layout | k=1 | k=2 | k=3 | k=4 | k=5 |
|---|---|---|---|---|---|
| Layout 1: Chuẩn 60 m2 (10m x 6m) | 290.8 (+290.8) | 411.8 (+121.0) | 490.8 (+79.0) | 537.3 (+46.5) | 542 (+4.7) |
| Layout 2: Circle K 75 m2 (12.5m x 6m) | 303.3 (+303.3) | 435.5 (+132.2) | 518 (+82.5) | 582.5 (+64.5) | 633 (+50.5) |
| Layout 3: MiniStop 50 m2 (8.5m x 6m) | 281.8 (+281.8) | 394.3 (+112.5) | 437.8 (+43.5) | 442 (+4.2) | 442 (+0.0) |
