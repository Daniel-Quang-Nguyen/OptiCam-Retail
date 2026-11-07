# OptiCam-Retail — Tài liệu nghiên cứu (NCKH)

> Nhóm Ngũ Vị Hương · FIT@HCMUS · GVHD: TS. Bùi Duy Đăng.
> Mọi con số trong tài liệu này được sinh bởi `npm run experiments` (thư mục `results/`), không ghi tay. Đây là kết quả của mô hình/optimizer chạy trên frontend, không phải benchmark API backend. Mô tả công thức hiện tại xem [FORMULAS.md](FORMULAS.md); hướng dẫn chạy ứng dụng xem [README.md](../README.md).

## 1. Câu hỏi nghiên cứu & giả thuyết
**Bài toán.** Với mặt bằng cửa hàng tiện lợi 50–80 m² và ngân sách K camera, chọn (điểm neo tường, góc pan) để tối đa hoá điểm an ninh có trọng số rủi ro, trong đó "nhìn rõ" được đo bằng PPM theo DORI (IEC 62676-4).

| | Giả thuyết | Kiểm chứng |
|---|---|---|
| H1 | Weighted Greedy đạt ≥ 90% nghiệm tối ưu (vét cạn) | E1, E2 |
| H2 | Gán trọng số rủi ro cải thiện độ phủ vùng trọng yếu so với Greedy không trọng số | E2 |
| H3 | 3 camera tự động đạt KPI (Đỏ ≥ 95%, Vàng ≥ 80%) ngang hoặc tốt hơn 4 camera đặt thủ công 4 góc | E1, E2 |
| H4 | Thời gian giải + vẽ < 2 s trên trình duyệt | E1, E2 (đo lõi), đo UI khi demo |

## 2. Mô hình
- **Lưới** 0.5 m × 0.5 m. Ô là *sàn trống* nếu tâm ô không nằm trong kệ/POS (ô đặc bị loại khỏi thống kê).
- **Trọng số (Rule-based Semantic Mapping):** W = 5 nếu cách POS/cửa ≤ `RED_BUFFER` (1.0 m); W = 3 nếu cách kệ ≤ `YELLOW_BUFFER` (1.0 m); còn lại W = 1. Cọ tô tay ghi đè.
- **PPM:** `PPM = Res_H / (2·r·tan(FOV/2))`, r = khoảng cách 3D từ camera đến điểm đánh giá (mặc định ngang mặt 1.6 m; có thể chọn ngực 1.2 m hoặc thắt lưng 0.9 m). Đường ngắm nội suy độ cao giữa camera và mục tiêu; kệ/POS chắn khi tia cắt thể tích vật cản. Tham số mặc định range 10 m và các chi tiết hình học được trình bày trong [FORMULAS.md](FORMULAS.md).
- **Điểm DORI:** F = 1 / 0.75 / 0.4 / 0.2 / 0 cho Identification / Recognition / Observation / Detection / Mù.
- **Mục tiêu:** `Score(S) = Σ_ô W · F(max_{c∈S} PPM_c(ô))`. Đây là hàm *facility-location* ⇒ đơn điệu và dưới mô-đun ⇒ Greedy ≥ (1 − 1/e) ≈ 63.2% nghiệm tối ưu (Nemhauser–Wolsey–Fisher, 1978). Có unit test kiểm tra tính đơn điệu và cận này.
- **KPI nghiệm thu** (không nằm trong hàm mục tiêu): Vùng Đỏ ≥ 95% ô đạt ≥ 250 PPM; Vùng Vàng ≥ 80% ô đạt ≥ 125 PPM.

## 3. Thiết kế thực nghiệm (`frontend/experiments/run.ts`)
- **Phương pháp so sánh:** Manual 4 góc (4 cam) · Greedy không trọng số · Weighted Greedy · Vét cạn.
- **Vét cạn** chính xác cho K ≤ 3 trên tập ứng viên *thu gọn* (neo 1.0 m, góc 30°). Greedy cũng được chạy trên cùng tập đó để tỉ lệ Greedy/Optimum công bằng; K = 2 còn có vét cạn trên tập đầy đủ (neo 0.5 m, góc 15°).
- **E1** 3 layout mẫu, K = 2, 3. **E2** 30 layout ngẫu nhiên (seed 2026–2055, 50–80 m², 2–4 kệ, POS, cửa), K = 3, bootstrap 2000 lần cho CI95. **E3** đường cong lợi ích cận biên K = 1…5.
- **Tái lập:** `cd frontend && npm i && npm run experiments` (seed cố định; thời gian ≈ 1–2 phút).

## 4. Kết quả (trích `results/summary.md`)
**H1 — chấp nhận.** Trên cùng tập ứng viên, Greedy/Optimum = 97.2% ± 2.0 (min 93.1%, CI95 [96.5, 97.9]) trên 30 layout; ở 3 layout mẫu đạt 99.3–100%. Vượt xa cận lý thuyết 63.2%.

**H2 — chấp nhận có điều kiện.** Weighted hơn Unweighted +4.8 điểm (CI95 [0.4, 9.1]; thắng 19, hoà 7, thua 4). Vùng Đỏ trung bình 93.6% so với 76.9%. Tuy nhiên effect size nhỏ về tổng điểm; lợi ích rõ nhất ở Vùng Đỏ.

**H3 — chưa được ủng hộ.** Weighted Greedy 3 cam kém Manual 4 cam −6.9 điểm (CI95 [−11.5, −2.5]) và đạt KPI 20/30 layout so với 23/30. Hành lang trung bình 98.6% so với 95.8% (tốt hơn), nhưng Vùng Đỏ 93.6% so với 96.0% (kém hơn, dưới KPI 95%). Layout 1 (3 cam) đạt KPI; Layout 2 (Circle K) không đạt (hành lang 77.1%). ⇒ Phát biểu "3 cam tốt hơn 4 cam thủ công" **không nên đưa vào báo cáo**; phát biểu có cơ sở là "3 cam đạt KPI ở 20/30 layout (67%), tiết kiệm 25% thiết bị, so với 77% của 4 cam thủ công".

**Quan sát bổ sung.** (i) Mục tiêu cộng điểm một phần cho Recognition (0.75) nên Greedy có thể đánh đổi Vùng Đỏ lấy diện tích rộng ⇒ KPI không được tối ưu trực tiếp (nghiệm vét cạn của *mục tiêu* chỉ đạt KPI ở 15/30 layout). (ii) Manual 4 góc đạt Vùng Đỏ 100% ở cả 3 layout mẫu vì POS/cửa nằm gần góc; số liệu "~60% / ~50%" trong tài liệu đề xuất ban đầu **không tái lập được** trong mô hình này. (iii) Lợi ích cận biên giảm rõ: Layout 3 bão hoà sau camera thứ 3 (+4.2 → +0.0); Layout 1–2 vẫn tăng ở camera 4.

**H4 — chấp nhận cho lõi tính toán.** Greedy tập đầy đủ trung bình 46.9 ms (max 97 ms) trên Node; vét cạn K = 3 mất 1.6–3.7 s (đủ để chạy offline). Thời gian vẽ Heatmap và 60 FPS phải đo trên trình duyệt bằng đồng hồ FPS / Performance tab trong bản demo.

## 5. Mối đe doạ tính hợp lệ (Threats to validity)
1. **Mô hình 2D**: bỏ qua trần, chiều cao vật thể trên kệ, người di chuyển (vật cản động đã loại khỏi scope).
2. **PPM ngang theo FOV danh nghĩa**: chưa mô hình méo ống kính, góc nghiêng (tilt), chất lượng ánh sáng; DORI là ngưỡng quy ước, không phải bảo đảm nhận diện.
3. **Trọng số 5/3/1 và vùng đệm 1.0 m là giả định thiết kế**, chưa được hiệu chuẩn bằng dữ liệu thất thoát thật; cần phân tích độ nhạy (đề xuất: đổi W ∈ {4,2,1}, {8,3,1}; buffer 0.8–1.5 m).
4. **Layout ngẫu nhiên** do nhóm tự sinh, không phải cửa hàng thật; layout mẫu chỉ có 3.
5. **Hệ số DORI F** (0.75/0.4/0.2) là lựa chọn của nhóm — ảnh hưởng thứ hạng nghiệm.
6. **Vét cạn trên tập thu gọn** là tối ưu *trong tập đó*, không phải tối ưu toàn cục liên tục.
7. **Trích dẫn:** danh sách tài liệu tham khảo trong bản đề xuất (một số mang năm 2026) **cần được nhóm tự kiểm tra lại** từng nguồn (tác giả, năm, nội dung) trước khi đưa vào báo cáo; tài liệu này không dựa vào chúng để tạo số liệu.

## 6. Hướng cải thiện đề xuất
- Ràng buộc KPI trong Greedy (ưu tiên từ điển: phủ Đỏ trước, rồi Vàng) và so với bản hiện tại.
- Phân tích độ nhạy W, buffer, F; thêm 2MP / 8MP, FOV 60°–110°.
- Hiệu chuẩn W bằng khảo sát/chuyên gia (ví dụ AHP) thay vì chọn tay.
- Kiểm chứng PPM trên camera thật hoặc phần mềm hãng (IP Video System Design Tool) cho 1–2 điểm đo.
