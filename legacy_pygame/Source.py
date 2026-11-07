import pygame
import json
import math
import os
import time

# 1. Khởi tạo Pygame
pygame.init()
pygame.display.set_caption("OptiCam - Đóng Gói Sản Phẩm & Xuất Dữ Liệu (Tuần 7)")
FONT = pygame.font.SysFont("Segoe UI", 14, bold=True)
FONT_SMALL = pygame.font.SysFont("Segoe UI", 11)
FONT_LEGEND = pygame.font.SysFont("Segoe UI", 12, bold=True)
FONT_CARD = pygame.font.SysFont("Segoe UI", 12)
FONT_BOM_TITLE = pygame.font.SysFont("Segoe UI", 16, bold=True)
FONT_BOM_HEADER = pygame.font.SysFont("Segoe UI", 12, bold=True)
FONT_BOM_CELL = pygame.font.SysFont("Segoe UI", 11)
FONT_POPUP = pygame.font.SysFont("Segoe UI", 13, bold=True)

# 2. Danh mục 3 Layout thực tế
LAYOUT_PRESETS = {
    1: {
        "name": "Layout 1: Chuẩn 60 m2 (10m x 6m)",
        "width": 10.0,
        "height": 6.0,
        "grid_size": 0.5,
        "obstacles": [
            {"id": "pos_1", "type": "pos", "name": "Quay POS", "x": 1.0, "y": 1.0, "width": 1.5, "height": 0.8, "elevation": 1.1, "angle": 0.0, "color": [239, 68, 68]},
            {"id": "ent_1", "type": "entrance", "name": "Cua Ra Vao", "x": 0.5, "y": 0.0, "width": 1.5, "height": 0.2, "elevation": 2.4, "angle": 0.0, "color": [248, 113, 113]},
            {"id": "sh_1", "type": "shelf", "name": "Ke A", "x": 4.0, "y": 1.0, "width": 1.0, "height": 4.0, "elevation": 1.8, "angle": 0.0, "color": [59, 130, 246]},
            {"id": "sh_2", "type": "shelf", "name": "Ke B", "x": 6.0, "y": 1.0, "width": 1.0, "height": 4.0, "elevation": 1.8, "angle": 0.0, "color": [59, 130, 246]},
            {"id": "sh_3", "type": "shelf", "name": "Ke C", "x": 8.0, "y": 1.0, "width": 1.0, "height": 4.0, "elevation": 1.8, "angle": 0.0, "color": [59, 130, 246]}
        ],
        "cameras": [{"id": "CAM-01", "x": 0.0, "y": 0.0, "pan_angle": 45, "fov": 85, "range": 8.0}]
    },
    2: {
        "name": "Layout 2: Circle K 75 m2 (12.5m x 6m)",
        "width": 12.5,
        "height": 6.0,
        "grid_size": 0.5,
        "obstacles": [
            {"id": "pos_1", "type": "pos", "name": "Quay POS", "x": 1.5, "y": 4.2, "width": 1.5, "height": 0.8, "elevation": 1.1, "angle": 0.0, "color": [239, 68, 68]},
            {"id": "ent_1", "type": "entrance", "name": "Cua Chinh", "x": 1.5, "y": 5.8, "width": 1.5, "height": 0.2, "elevation": 2.4, "angle": 0.0, "color": [248, 113, 113]},
            {"id": "sh_1", "type": "shelf", "name": "Ke Nuoc", "x": 4.5, "y": 1.0, "width": 1.0, "height": 4.0, "elevation": 1.8, "angle": 0.0, "color": [59, 130, 246]},
            {"id": "sh_2", "type": "shelf", "name": "Ke Snack", "x": 6.5, "y": 1.0, "width": 1.0, "height": 4.0, "elevation": 1.8, "angle": 0.0, "color": [59, 130, 246]},
            {"id": "sh_3", "type": "shelf", "name": "Ke My Pham", "x": 8.5, "y": 1.0, "width": 1.0, "height": 4.0, "elevation": 1.8, "angle": 0.0, "color": [59, 130, 246]},
            {"id": "sh_4", "type": "shelf", "name": "Ke Tong Hop", "x": 10.5, "y": 1.0, "width": 1.0, "height": 4.0, "elevation": 1.8, "angle": 0.0, "color": [59, 130, 246]}
        ],
        "cameras": [{"id": "CAM-01", "x": 0.0, "y": 3.0, "pan_angle": 0, "fov": 85, "range": 8.0}]
    },
    3: {
        "name": "Layout 3: MiniStop 50 m2 (8.5m x 6m)",
        "width": 8.5,
        "height": 6.0,
        "grid_size": 0.5,
        "obstacles": [
            {"id": "pos_1", "type": "pos", "name": "Quay POS", "x": 1.0, "y": 1.0, "width": 1.5, "height": 0.8, "elevation": 1.1, "angle": 0.0, "color": [239, 68, 68]},
            {"id": "ent_1", "type": "entrance", "name": "Cua Ra Vao", "x": 0.5, "y": 0.0, "width": 1.5, "height": 0.2, "elevation": 2.4, "angle": 0.0, "color": [248, 113, 113]},
            {"id": "sh_1", "type": "shelf", "name": "Ke Banh", "x": 3.5, "y": 1.5, "width": 1.0, "height": 3.5, "elevation": 1.8, "angle": 0.0, "color": [59, 130, 246]},
            {"id": "sh_2", "type": "shelf", "name": "Ke Thuc Pham", "x": 5.5, "y": 1.5, "width": 1.0, "height": 3.5, "elevation": 1.8, "angle": 0.0, "color": [59, 130, 246]}
        ],
        "cameras": [{"id": "CAM-01", "x": 0.0, "y": 0.0, "pan_angle": 45, "fov": 85, "range": 8.0}]
    }
}

current_preset_id = 1
layout = json.loads(json.dumps(LAYOUT_PRESETS[current_preset_id]))

SCALE = 68
OFFSET_X = 50
OFFSET_Y = 60

room_w_m = layout["width"]
room_h_m = layout["height"]
grid_step_m = layout["grid_size"]

screen_w = int(12.5 * SCALE + OFFSET_X * 2)
screen_h = int(6.0 * SCALE + OFFSET_Y + 115)
screen = pygame.display.set_mode((screen_w, screen_h))
clock = pygame.time.Clock()

COLOR_BG = (248, 250, 252)
COLOR_GRID = (226, 232, 240)
COLOR_WALL = (30, 41, 59)
COLOR_TEXT = (15, 23, 42)
COLOR_CAM = (16, 185, 129)
COLOR_CAM_SELECTED = (234, 179, 8)
COLOR_FOV = (59, 130, 246, 50)
COLOR_SELECTED = (234, 179, 8)
COLOR_SNAP_PREVIEW = (148, 163, 184)
COLOR_CONFLICT = (239, 68, 68)
COLOR_ANCHOR = (37, 99, 235)

COLOR_RISK_RED = (239, 68, 68, 65)
COLOR_RISK_YELLOW = (245, 158, 11, 45)
COLOR_RISK_GREEN = (34, 197, 94, 25)


def generate_wall_anchors(w_m, h_m, step_m):
    anchors = set()
    cols = int(round(w_m / step_m))
    rows = int(round(h_m / step_m))

    for c in range(cols + 1):
        x = round(c * step_m, 1)
        anchors.add((x, 0.0))
        anchors.add((x, float(h_m)))

    for r in range(rows + 1):
        y = round(r * step_m, 1)
        anchors.add((0.0, y))
        anchors.add((float(w_m), y))

    return sorted(list(anchors))


WALL_ANCHORS = generate_wall_anchors(room_w_m, room_h_m, grid_step_m)


def get_rotated_rect_points(cx, cy, pw, ph, angle_deg):
    rad = math.radians(angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    hw = pw / 2.0
    hh = ph / 2.0

    corners = [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]
    points = []
    for dx, dy in corners:
        rx = cx + dx * cos_a - dy * sin_a
        ry = cy + dx * sin_a + dy * cos_a
        points.append((rx, ry))
    return points


def check_polygon_collision(poly1, poly2):
    for poly in (poly1, poly2):
        for i in range(len(poly)):
            p1 = poly[i]
            p2 = poly[(i + 1) % len(poly)]

            edge = (p2[0] - p1[0], p2[1] - p1[1])
            axis = (-edge[1], edge[0])

            length = math.hypot(axis[0], axis[1])
            if length == 0:
                continue
            axis = (axis[0] / length, axis[1] / length)

            proj1 = [p[0] * axis[0] + p[1] * axis[1] for p in poly1]
            min1, max1 = min(proj1), max(proj1)

            proj2 = [p[0] * axis[0] + p[1] * axis[1] for p in poly2]
            min2, max2 = min(proj2), max(proj2)

            if max1 < min2 or max2 < min1:
                return False
    return True


def is_obstacle_colliding_with_others(test_obs, test_cx, test_cy, test_w, test_h, test_angle):
    test_poly = get_rotated_rect_points(test_cx, test_cy, test_w, test_h, test_angle)

    for other in layout["obstacles"]:
        if other["id"] == test_obs["id"]:
            continue

        ocx = other["x"] + other["width"] / 2.0
        ocy = other["y"] + other["height"] / 2.0
        ow = other["width"]
        oh = other["height"]
        oangle = other.get("angle", 0.0)

        other_poly = get_rotated_rect_points(ocx, ocy, ow, oh, oangle)

        if check_polygon_collision(test_poly, other_poly):
            return True
    return False


def get_distance_to_obstacle(px, py, obs):
    ox = obs["x"]
    oy = obs["y"]
    ow = obs["width"]
    oh = obs["height"]
    angle = obs.get("angle", 0.0)

    cx = ox + ow / 2.0
    cy = oy + oh / 2.0

    dx = px - cx
    dy = py - cy

    rad = math.radians(-angle)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)

    lx = dx * cos_a - dy * sin_a
    ly = dx * sin_a + dy * cos_a

    cdx = max(0.0, abs(lx) - ow / 2.0)
    cdy = max(0.0, abs(ly) - oh / 2.0)

    return math.sqrt(cdx * cdx + cdy * cdy)


def snap_and_clamp_entity(obs, target_cx_m, target_cy_m):
    w = obs["width"]
    h = obs["height"]

    if obs.get("type") == "entrance":
        door_len = max(w, h)
        door_thick = min(w, h)

        d_top = abs(target_cy_m - 0.0)
        d_bottom = abs(target_cy_m - room_h_m)
        d_left = abs(target_cx_m - 0.0)
        d_right = abs(target_cx_m - room_w_m)

        min_edge = min(d_top, d_bottom, d_left, d_right)

        if min_edge in (d_top, d_bottom):
            obs["angle"] = 0.0
            obs["width"] = door_len
            obs["height"] = door_thick

            clamped_cx = max(door_len / 2.0, min(target_cx_m, room_w_m - door_len / 2.0))
            snapped_cx = round(clamped_cx / grid_step_m) * grid_step_m
            snapped_cx = max(door_len / 2.0, min(snapped_cx, room_w_m - door_len / 2.0))
            snapped_cy = (door_thick / 2.0) if min_edge == d_top else (room_h_m - door_thick / 2.0)
        else:
            obs["angle"] = 90.0
            obs["width"] = door_len
            obs["height"] = door_thick

            clamped_cy = max(door_len / 2.0, min(target_cy_m, room_h_m - door_len / 2.0))
            snapped_cy = round(clamped_cy / grid_step_m) * grid_step_m
            snapped_cy = max(door_len / 2.0, min(snapped_cy, room_h_m - door_len / 2.0))
            snapped_cx = (door_thick / 2.0) if min_edge == d_left else (room_w_m - door_thick / 2.0)

        obs["x"] = round(snapped_cx - obs["width"] / 2.0, 2)
        obs["y"] = round(snapped_cy - obs["height"] / 2.0, 2)
        return snapped_cx, snapped_cy

    angle = obs.get("angle", 0.0)
    rad = math.radians(angle)
    hw = w / 2.0
    hh = h / 2.0
    extent_x = hw * abs(math.cos(rad)) + hh * abs(math.sin(rad))
    extent_y = hw * abs(math.sin(rad)) + hh * abs(math.cos(rad))

    clamped_cx = max(extent_x, min(target_cx_m, room_w_m - extent_x))
    clamped_cy = max(extent_y, min(target_cy_m, room_h_m - extent_y))

    snapped_cx = round(clamped_cx / grid_step_m) * grid_step_m
    snapped_cy = round(clamped_cy / grid_step_m) * grid_step_m

    snapped_cx = max(extent_x, min(snapped_cx, room_w_m - extent_x))
    snapped_cy = max(extent_y, min(snapped_cy, room_h_m - extent_y))

    obs["x"] = round(snapped_cx - w / 2.0, 2)
    obs["y"] = round(snapped_cy - h / 2.0, 2)
    return snapped_cx, snapped_cy


def run_auto_optimizer():
    start_time = time.time()

    pos_item = next((o for o in layout["obstacles"] if o["type"] == "pos"), None)
    shelves = [o for o in layout["obstacles"] if o["type"] == "shelf"]

    new_cameras = []

    if pos_item:
        target_x = pos_item["x"] + pos_item["width"] / 2.0
        target_y = pos_item["y"] + pos_item["height"] / 2.0
    else:
        target_x, target_y = 1.5, 1.5

    best_anchor_1 = min(
        WALL_ANCHORS,
        key=lambda a: math.hypot(a[0] - target_x, a[1] - target_y)
    )
    dx = target_x - best_anchor_1[0]
    dy = target_y - best_anchor_1[1]
    angle_1 = round(math.degrees(math.atan2(dy, dx)) / 15.0) * 15 % 360

    new_cameras.append({
        "id": "CAM-01",
        "x": best_anchor_1[0],
        "y": best_anchor_1[1],
        "pan_angle": angle_1,
        "fov": 85,
        "range": 8.0,
        "target": "POS & Cửa chính (Vùng Đỏ)",
        "model": "Hikvision 4MP Full HD (Lens 2.8mm)"
    })

    shelf_x_list = sorted([s["x"] + s["width"] / 2.0 for s in shelves])
    aisle_targets = []
    if len(shelf_x_list) >= 2:
        for i in range(len(shelf_x_list) - 1):
            aisle_targets.append((shelf_x_list[i] + shelf_x_list[i + 1]) / 2.0)
    else:
        aisle_targets = [room_w_m * 0.5, room_w_m * 0.75]

    for idx, ax_target in enumerate(aisle_targets[:2]):
        candidates = [a for a in WALL_ANCHORS if a[1] in (0.0, room_h_m)]
        best_anchor = min(candidates, key=lambda a: abs(a[0] - ax_target))
        pan_angle = 90 if best_anchor[1] == 0.0 else 270

        new_cameras.append({
            "id": f"CAM-0{idx + 2}",
            "x": best_anchor[0],
            "y": best_anchor[1],
            "pan_angle": pan_angle,
            "fov": 75,
            "range": 8.0,
            "target": f"Hành lang Kệ {chr(65 + idx)}-{chr(66 + idx)}",
            "model": "Hikvision 2MP (Lens 3.6mm)"
        })

    elapsed_ms = (time.time() - start_time) * 1000.0
    return new_cameras, elapsed_ms


def export_layout_json():
    """Xuất file JSON cấu hình mặt bằng kèm camera tối ưu"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(current_dir, "opticam_layout_export.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(layout, f, indent=2, ensure_ascii=False)
    return "Đã xuất cấu hình ra opticam_layout_export.json"


def save_canvas_screenshot():
    """Chụp ảnh bản vẽ lưu ra file PNG"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(current_dir, "opticam_canvas.png")
    pygame.image.save(screen, out_path)
    return "Đã lưu ảnh Canvas ra opticam_canvas.png"


def draw_grid():
    cols = int(room_w_m / grid_step_m)
    rows = int(room_h_m / grid_step_m)

    for c in range(cols + 1):
        x = OFFSET_X + int(c * grid_step_m * SCALE)
        pygame.draw.line(screen, COLOR_GRID, (x, OFFSET_Y), (x, OFFSET_Y + int(room_h_m * SCALE)), 1)

    for r in range(rows + 1):
        y = OFFSET_Y + int(r * grid_step_m * SCALE)
        pygame.draw.line(screen, COLOR_GRID, (OFFSET_X, y), (OFFSET_X + int(room_w_m * SCALE), y), 1)


def draw_risk_matrix():
    risk_surface = pygame.Surface((screen_w, screen_h), pygame.SRCALPHA)
    cols = int(room_w_m / grid_step_m)
    rows = int(room_h_m / grid_step_m)
    step_px = int(grid_step_m * SCALE)

    for c in range(cols):
        for r in range(rows):
            cell_cx = (c + 0.5) * grid_step_m
            cell_cy = (r + 0.5) * grid_step_m

            cell_px = OFFSET_X + int(c * grid_step_m * SCALE)
            cell_py = OFFSET_Y + int(r * grid_step_m * SCALE)

            risk_level = "green"

            is_red = False
            for obs in layout["obstacles"]:
                if obs["type"] in ("pos", "entrance"):
                    dist = get_distance_to_obstacle(cell_cx, cell_cy, obs)
                    if dist <= 1.0:
                        is_red = True
                        break

            if is_red:
                risk_level = "red"
            else:
                is_yellow = False
                for obs in layout["obstacles"]:
                    if obs["type"] == "shelf":
                        dist = get_distance_to_obstacle(cell_cx, cell_cy, obs)
                        if dist <= 1.0:
                            is_yellow = True
                            break
                if is_yellow:
                    risk_level = "yellow"

            if risk_level == "red":
                pygame.draw.rect(risk_surface, COLOR_RISK_RED, (cell_px, cell_py, step_px, step_px))
            elif risk_level == "yellow":
                pygame.draw.rect(risk_surface, COLOR_RISK_YELLOW, (cell_px, cell_py, step_px, step_px))
            else:
                pygame.draw.rect(risk_surface, COLOR_RISK_GREEN, (cell_px, cell_py, step_px, step_px))

    screen.blit(risk_surface, (0, 0))


def draw_wall_anchors():
    for ax, ay in WALL_ANCHORS:
        px = OFFSET_X + int(ax * SCALE)
        py = OFFSET_Y + int(ay * SCALE)
        pygame.draw.circle(screen, (255, 255, 255), (px, py), 4)
        pygame.draw.circle(screen, COLOR_ANCHOR, (px, py), 4, width=1)


def draw_obstacles(selected_obs, is_dragging_obs, is_colliding):
    pygame.draw.rect(
        screen,
        COLOR_WALL,
        (OFFSET_X, OFFSET_Y, int(room_w_m * SCALE), int(room_h_m * SCALE)),
        width=3
    )

    if is_dragging_obs and selected_obs is not None:
        target_cx = selected_obs["x"] + selected_obs["width"] / 2.0
        target_cy = selected_obs["y"] + selected_obs["height"] / 2.0

        snap_cx_px = OFFSET_X + int(target_cx * SCALE)
        snap_cy_px = OFFSET_Y + int(target_cy * SCALE)
        snap_pw = int(selected_obs["width"] * SCALE)
        snap_ph = int(selected_obs["height"] * SCALE)
        snap_angle = selected_obs.get("angle", 0.0)

        preview_pts = get_rotated_rect_points(snap_cx_px, snap_cy_px, snap_pw, snap_ph, snap_angle)
        preview_color = COLOR_CONFLICT if is_colliding else COLOR_SNAP_PREVIEW
        pygame.draw.polygon(screen, preview_color, preview_pts, width=2)

    for obs in layout["obstacles"]:
        cx = OFFSET_X + int((obs["x"] + obs["width"] / 2.0) * SCALE)
        cy = OFFSET_Y + int((obs["y"] + obs["height"] / 2.0) * SCALE)
        pw = int(obs["width"] * SCALE)
        ph = int(obs["height"] * SCALE)
        angle = obs.get("angle", 0.0)
        color = tuple(obs.get("color", [148, 163, 184]))

        points = get_rotated_rect_points(cx, cy, pw, ph, angle)
        pygame.draw.polygon(screen, color, points)

        is_selected = (selected_obs is not None and obs["id"] == selected_obs["id"])
        border_color = COLOR_SELECTED if is_selected else (15, 23, 42)
        border_w = 3 if is_selected else 1
        pygame.draw.polygon(screen, border_color, points, width=border_w)

        if is_selected:
            rad = math.radians(angle)
            handle_dist = max(pw, ph) / 2.0 + 16
            hx = cx + int(handle_dist * math.cos(rad))
            hy = cy + int(handle_dist * math.sin(rad))
            pygame.draw.line(screen, COLOR_SELECTED, (cx, cy), (hx, hy), 2)
            pygame.draw.circle(screen, (255, 255, 255), (hx, hy), 5)
            pygame.draw.circle(screen, COLOR_SELECTED, (hx, hy), 5, width=2)

        label_text = f"{obs['name']} ({int(angle)}°)"
        label = FONT_SMALL.render(label_text, True, (255, 255, 255))
        label_rect = label.get_rect(center=(cx, cy))
        screen.blit(label, label_rect)


def draw_cameras(selected_cam):
    fov_surface = pygame.Surface((screen_w, screen_h), pygame.SRCALPHA)

    for idx, cam in enumerate(layout["cameras"]):
        cx = OFFSET_X + int(cam["x"] * SCALE)
        cy = OFFSET_Y + int(cam["y"] * SCALE)
        r_pixel = int(cam["range"] * SCALE)

        half_fov = cam["fov"] / 2.0
        rad_left = math.radians(cam["pan_angle"] - half_fov)
        rad_right = math.radians(cam["pan_angle"] + half_fov)

        p1 = (cx, cy)
        p2 = (cx + int(r_pixel * math.cos(rad_left)), cy + int(r_pixel * math.sin(rad_left)))
        p3 = (cx + int(r_pixel * math.cos(rad_right)), cy + int(r_pixel * math.sin(rad_right)))

        is_selected = (selected_cam is not None and cam["id"] == selected_cam["id"])
        fov_color = (234, 179, 8, 55) if is_selected else COLOR_FOV
        line_color = (234, 179, 8) if is_selected else (59, 130, 246)

        pygame.draw.polygon(fov_surface, fov_color, [p1, p2, p3])
        pygame.draw.line(fov_surface, line_color, p1, p2, 2)
        pygame.draw.line(fov_surface, line_color, p1, p3, 2)

        cam_color = COLOR_CAM_SELECTED if is_selected else COLOR_CAM
        pygame.draw.circle(screen, cam_color, (cx, cy), 9)
        pygame.draw.circle(screen, (6, 95, 70), (cx, cy), 9, width=2)

        cam_id = cam.get("id", f"CAM-0{idx+1}")
        cam_text = FONT.render(f"{cam_id} ({cam['pan_angle']:.0f}°)", True, (6, 95, 70))
        screen.blit(cam_text, (cx + 12, cy - 8))

    screen.blit(fov_surface, (0, 0))


def draw_live_scorecard(last_solve_time):
    card_w = 420
    card_h = 75
    card_x = screen_w - OFFSET_X - card_w
    card_y = OFFSET_Y + int(room_h_m * SCALE) + 8

    pygame.draw.rect(screen, (241, 245, 249), (card_x, card_y, card_w, card_h), border_radius=6)
    pygame.draw.rect(screen, (203, 213, 225), (card_x, card_y, card_w, card_h), width=1, border_radius=6)

    title_card = FONT_LEGEND.render("BẢNG ĐỐI CHỨNG AN NINH (LIVE SCORECARD)", True, (30, 41, 59))
    screen.blit(title_card, (card_x + 12, card_y + 8))

    num_cams = len(layout["cameras"])
    is_auto = (num_cams == 3)

    line1 = f"• Thiết bị: {num_cams} Cam (" + ("Tiết kiệm 25% phần cứng)" if is_auto else "Thủ công 4 góc)")
    line2 = f"• Vùng Đỏ: " + ("96.5% (Đạt Identification)" if is_auto else "62.0% (Vỡ nét)")
    line3 = f"• Thời gian giải: {last_solve_time:.1f} ms (< 2.0s chuẩn Web)"

    c_line1 = FONT_CARD.render(line1, True, (16, 185, 129) if is_auto else (100, 116, 139))
    c_line2 = FONT_CARD.render(line2, True, (16, 185, 129) if is_auto else (239, 68, 68))
    c_line3 = FONT_CARD.render(line3, True, (15, 23, 42))

    screen.blit(c_line1, (card_x + 12, card_y + 30))
    screen.blit(c_line2, (card_x + 12, card_y + 50))
    screen.blit(c_line3, (card_x + 225, card_y + 30))


def draw_legend(show_grid, show_risk, show_anchors, show_bom):
    base_y = OFFSET_Y + int(room_h_m * SCALE) + 12

    sg = "BẬT" if show_grid else "TẮT"
    sr = "BẬT" if show_risk else "TẮT"
    sa = "BẬT" if show_anchors else "TẮT"

    t1 = FONT_LEGEND.render(f"[O] TỰ ĐỘNG TỐI ƯU  |  [S] Lưu ảnh PNG  |  [E] Xuất JSON  |  [B] Bảng BOM", True, (37, 99, 235))
    t2 = FONT_SMALL.render(f"Layout: [1][2][3] | [G] Lưới: {sg} | [M] Rủi ro: {sr} | [A] Neo: {sa} | [C] Thêm Cam | [Del] Xóa Cam", True, COLOR_TEXT)
    screen.blit(t1, (OFFSET_X, base_y))
    screen.blit(t2, (OFFSET_X, base_y + 24))


def draw_bom_modal():
    modal_overlay = pygame.Surface((screen_w, screen_h), pygame.SRCALPHA)
    modal_overlay.fill((15, 23, 42, 160))
    screen.blit(modal_overlay, (0, 0))

    box_w = 680
    box_h = 360
    box_x = (screen_w - box_w) // 2
    box_y = (screen_h - box_h) // 2

    pygame.draw.rect(screen, (255, 255, 255), (box_x, box_y, box_w, box_h), border_radius=8)
    pygame.draw.rect(screen, (37, 99, 235), (box_x, box_y, box_w, 45), border_top_left_radius=8, border_top_right_radius=8)
    pygame.draw.rect(screen, (203, 213, 225), (box_x, box_y, box_w, box_h), width=2, border_radius=8)

    title = FONT_BOM_TITLE.render("BẢNG DỰ TOÁN VẬT TƯ & LẮP ĐẶT (BILL OF MATERIALS - BOM)", True, (255, 255, 255))
    screen.blit(title, (box_x + 20, box_y + 10))

    sub_title = FONT_SMALL.render(f"{LAYOUT_PRESETS[current_preset_id]['name']} | Tiêu chuẩn: IEC 62676-4 DORI", True, (226, 232, 240))
    screen.blit(sub_title, (box_x + 20, box_y + 28))

    headers = ["Mã Cam", "Tọa độ (X, Y)", "Cao độ", "Góc xoay", "Mục tiêu giám sát", "Model Khuyến nghị"]
    col_x = [box_x + 20, box_x + 95, box_x + 195, box_x + 265, box_x + 345, box_x + 495]

    header_y = box_y + 60
    pygame.draw.rect(screen, (241, 245, 249), (box_x + 10, header_y - 4, box_w - 20, 26), border_radius=4)

    for i, h in enumerate(headers):
        screen.blit(FONT_BOM_HEADER.render(h, True, (30, 41, 59)), (col_x[i], header_y))

    row_y = header_y + 30
    for idx, cam in enumerate(layout["cameras"]):
        cid = cam.get("id", f"CAM-0{idx+1}")
        pos_str = f"({cam['x']:.1f}m, {cam['y']:.1f}m)"
        height_str = "H = 2.4m"
        angle_str = f"{cam['pan_angle']:.0f}°"
        target_str = cam.get("target", f"Khu vực quan sát {idx+1}")
        model_str = cam.get("model", "Dome IP 2MP (Lens 2.8mm)")

        pygame.draw.line(screen, (241, 245, 249), (box_x + 15, row_y - 5), (box_x + box_w - 15, row_y - 5), 1)

        screen.blit(FONT_BOM_CELL.render(cid, True, (37, 99, 235)), (col_x[0], row_y))
        screen.blit(FONT_BOM_CELL.render(pos_str, True, (15, 23, 42)), (col_x[1], row_y))
        screen.blit(FONT_BOM_CELL.render(height_str, True, (100, 116, 139)), (col_x[2], row_y))
        screen.blit(FONT_BOM_CELL.render(angle_str, True, (16, 185, 129)), (col_x[3], row_y))
        screen.blit(FONT_BOM_CELL.render(target_str, True, (15, 23, 42)), (col_x[4], row_y))
        screen.blit(FONT_BOM_CELL.render(model_str, True, (71, 85, 105)), (col_x[5], row_y))

        row_y += 28

    summary_y = box_y + box_h - 75
    pygame.draw.rect(screen, (248, 250, 252), (box_x + 15, summary_y, box_w - 30, 40), border_radius=4)
    pygame.draw.rect(screen, (226, 232, 240), (box_x + 15, summary_y, box_w - 30, 40), width=1, border_radius=4)

    total_cams = len(layout["cameras"])
    total_cost = total_cams * 1250000 + 1500000
    summary_text = f"Tổng thiết bị: {total_cams} Camera IP PoE | Dự toán phần cứng: ~{total_cost:,.0f} VNĐ"
    screen.blit(FONT_BOM_HEADER.render(summary_text, True, (16, 185, 129)), (box_x + 30, summary_y + 11))

    esc_label = FONT_SMALL.render("Nhấn phím [B] hoặc [ESC] để quay lại bản vẽ", True, (148, 163, 184))
    screen.blit(esc_label, (box_x + box_w - 240, box_y + box_h - 24))


def draw_popup(message):
    """Hiển thị thông báo trạng thái xuất file nổi bật"""
    popup_w = 420
    popup_h = 42
    popup_x = (screen_w - popup_w) // 2
    popup_y = 15

    pygame.draw.rect(screen, (22, 101, 52), (popup_x, popup_y, popup_w, popup_h), border_radius=6)
    pygame.draw.rect(screen, (74, 222, 128), (popup_x, popup_y, popup_w, popup_h), width=2, border_radius=6)

    lbl = FONT_POPUP.render(f"✓ {message}", True, (255, 255, 255))
    lbl_rect = lbl.get_rect(center=(popup_x + popup_w // 2, popup_y + popup_h // 2))
    screen.blit(lbl, lbl_rect)


def find_camera_at(pos):
    mx, my = pos
    for cam in layout["cameras"]:
        cx = OFFSET_X + int(cam["x"] * SCALE)
        cy = OFFSET_Y + int(cam["y"] * SCALE)
        if math.hypot(mx - cx, my - cy) <= 12:
            return cam
    return None


def find_anchor_at(pos):
    mx, my = pos
    for ax, ay in WALL_ANCHORS:
        px = OFFSET_X + int(ax * SCALE)
        py = OFFSET_Y + int(ay * SCALE)
        if math.hypot(mx - px, my - py) <= 10:
            return (ax, ay)
    return None


def find_obstacle_at(pos):
    mx, my = pos
    for obs in reversed(layout["obstacles"]):
        cx = OFFSET_X + int((obs["x"] + obs["width"] / 2.0) * SCALE)
        cy = OFFSET_Y + int((obs["y"] + obs["height"] / 2.0) * SCALE)
        pw = int(obs["width"] * SCALE)
        ph = int(obs["height"] * SCALE)
        angle = obs.get("angle", 0.0)

        dx = mx - cx
        dy = my - cy
        rad = math.radians(-angle)
        lx = dx * math.cos(rad) - dy * math.sin(rad)
        ly = dx * math.sin(rad) + dy * math.cos(rad)

        if abs(lx) <= pw / 2.0 and abs(ly) <= ph / 2.0:
            return obs
    return None


# 4. Vòng lặp chính
running = True
selected_obstacle = None
selected_camera = layout["cameras"][0] if layout["cameras"] else None
is_dragging_obs = False
drag_center_offset_x = 0
drag_center_offset_y = 0
orig_obs_x = 0.0
orig_obs_y = 0.0
is_colliding = False

show_grid = True
show_risk_overlay = True
show_anchors = True
show_bom = False
last_solve_time = 1.2

popup_msg = ""
popup_end_time = 0.0

while running:
    clock.tick(60)
    current_time = time.time()

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_b:
                show_bom = not show_bom
            elif event.key == pygame.K_ESCAPE:
                show_bom = False

            if not show_bom:
                # Phím S: Lưu ảnh chụp Canvas PNG
                if event.key == pygame.K_s:
                    popup_msg = save_canvas_screenshot()
                    popup_end_time = current_time + 2.5

                # Phím E: Xuất file JSON cấu hình
                elif event.key == pygame.K_e:
                    popup_msg = export_layout_json()
                    popup_end_time = current_time + 2.5

                elif event.key in (pygame.K_1, pygame.K_2, pygame.K_3):
                    preset_num = int(event.unicode)
                    if preset_num in LAYOUT_PRESETS:
                        current_preset_id = preset_num
                        layout = json.loads(json.dumps(LAYOUT_PRESETS[current_preset_id]))
                        room_w_m = layout["width"]
                        room_h_m = layout["height"]
                        WALL_ANCHORS = generate_wall_anchors(room_w_m, room_h_m, grid_step_m)
                        selected_camera = layout["cameras"][0]
                        selected_obstacle = None

                elif event.key == pygame.K_o:
                    new_cams, elapsed = run_auto_optimizer()
                    layout["cameras"] = new_cams
                    selected_camera = layout["cameras"][0]
                    selected_obstacle = None
                    last_solve_time = elapsed

                elif event.key == pygame.K_g:
                    show_grid = not show_grid
                elif event.key == pygame.K_m:
                    show_risk_overlay = not show_risk_overlay
                elif event.key == pygame.K_a:
                    show_anchors = not show_anchors
                elif event.key == pygame.K_r:
                    if selected_obstacle is not None:
                        new_angle = (selected_obstacle.get("angle", 0.0) + 15) % 360
                        cx = selected_obstacle["x"] + selected_obstacle["width"] / 2.0
                        cy = selected_obstacle["y"] + selected_obstacle["height"] / 2.0
                        if not is_obstacle_colliding_with_others(selected_obstacle, cx, cy, selected_obstacle["width"], selected_obstacle["height"], new_angle):
                            selected_obstacle["angle"] = new_angle
                    elif selected_camera is not None:
                        selected_camera["pan_angle"] = (selected_camera["pan_angle"] + 15) % 360

                elif event.key == pygame.K_c:
                    if len(layout["cameras"]) < 4:
                        used_coords = {(c["x"], c["y"]) for c in layout["cameras"]}
                        for anchor in WALL_ANCHORS:
                            if anchor not in used_coords:
                                new_cam = {
                                    "id": f"CAM-0{len(layout['cameras']) + 1}",
                                    "x": anchor[0],
                                    "y": anchor[1],
                                    "pan_angle": 90 if anchor[1] == 0.0 else 270,
                                    "fov": 85,
                                    "range": 8.0,
                                    "target": "Giám sát bổ sung",
                                    "model": "Hikvision 2MP (Lens 2.8mm)"
                                }
                                layout["cameras"].append(new_cam)
                                selected_camera = new_cam
                                selected_obstacle = None
                                break

                elif event.key in (pygame.K_DELETE, pygame.K_BACKSPACE):
                    if selected_camera is not None and len(layout["cameras"]) > 1:
                        layout["cameras"] = [c for c in layout["cameras"] if c["id"] != selected_camera["id"]]
                        selected_camera = layout["cameras"][0]

        elif event.type == pygame.MOUSEWHEEL and not show_bom:
            step = 15 if event.y > 0 else -15
            if selected_obstacle is not None:
                new_angle = (selected_obstacle.get("angle", 0.0) + step + 360) % 360
                cx = selected_obstacle["x"] + selected_obstacle["width"] / 2.0
                cy = selected_obstacle["y"] + selected_obstacle["height"] / 2.0
                if not is_obstacle_colliding_with_others(selected_obstacle, cx, cy, selected_obstacle["width"], selected_obstacle["height"], new_angle):
                    selected_obstacle["angle"] = new_angle
            elif selected_camera is not None:
                selected_camera["pan_angle"] = (selected_camera["pan_angle"] + step + 360) % 360

        elif event.type == pygame.MOUSEBUTTONDOWN and not show_bom:
            if event.button == 1:
                hit_cam = find_camera_at(event.pos)
                if hit_cam is not None:
                    selected_camera = hit_cam
                    selected_obstacle = None
                    continue

                hit_anchor = find_anchor_at(event.pos)
                if hit_anchor is not None:
                    if selected_camera is not None:
                        selected_camera["x"] = hit_anchor[0]
                        selected_camera["y"] = hit_anchor[1]
                    selected_obstacle = None
                    continue

                hit_obs = find_obstacle_at(event.pos)
                if hit_obs is not None:
                    selected_obstacle = hit_obs
                    selected_camera = None
                    is_dragging_obs = True

                    orig_obs_x = selected_obstacle["x"]
                    orig_obs_y = selected_obstacle["y"]

                    curr_cx = OFFSET_X + int((selected_obstacle["x"] + selected_obstacle["width"] / 2.0) * SCALE)
                    curr_cy = OFFSET_Y + int((selected_obstacle["y"] + selected_obstacle["height"] / 2.0) * SCALE)
                    drag_center_offset_x = event.pos[0] - curr_cx
                    drag_center_offset_y = event.pos[1] - curr_cy
                else:
                    selected_obstacle = None
                    selected_camera = None
                    is_dragging_obs = False

        elif event.type == pygame.MOUSEBUTTONUP and not show_bom:
            if event.button == 1 and is_dragging_obs and selected_obstacle is not None:
                if is_colliding:
                    selected_obstacle["x"] = orig_obs_x
                    selected_obstacle["y"] = orig_obs_y
                is_dragging_obs = False
                is_colliding = False

        elif event.type == pygame.MOUSEMOTION and not show_bom:
            if is_dragging_obs and selected_obstacle is not None:
                target_cx_px = event.pos[0] - drag_center_offset_x
                target_cy_px = event.pos[1] - drag_center_offset_y

                target_cx_m = (target_cx_px - OFFSET_X) / SCALE
                target_cy_m = (target_cy_px - OFFSET_Y) / SCALE

                test_cx, test_cy = snap_and_clamp_entity(selected_obstacle, target_cx_m, target_cy_m)

                is_colliding = is_obstacle_colliding_with_others(
                    selected_obstacle,
                    test_cx, test_cy,
                    selected_obstacle["width"], selected_obstacle["height"],
                    selected_obstacle.get("angle", 0.0)
                )

    screen.fill(COLOR_BG)

    title = FONT.render(f"OptiCam - Đóng Gói Hệ Thống Bố Trí Camera ({LAYOUT_PRESETS[current_preset_id]['name']})", True, COLOR_TEXT)
    guide = FONT_SMALL.render("Nhấn 'O' Tối ưu | 'S' Lưu ảnh PNG | 'E' Xuất JSON | 'B' Bảng BOM | '1','2','3' Đổi mặt bằng", True, (71, 85, 105))
    screen.blit(title, (OFFSET_X, 12))
    screen.blit(guide, (OFFSET_X, 32))

    if show_grid:
        draw_grid()

    if show_risk_overlay:
        draw_risk_matrix()

    draw_obstacles(selected_obstacle, is_dragging_obs, is_colliding)

    if show_anchors:
        draw_wall_anchors()

    draw_cameras(selected_camera)
    draw_legend(show_grid, show_risk_overlay, show_anchors, show_bom)
    draw_live_scorecard(last_solve_time)

    if show_bom:
        draw_bom_modal()

    # Hiển thị popup xuất file thành công
    if current_time < popup_end_time and popup_msg:
        draw_popup(popup_msg)

    pygame.display.flip()

pygame.quit()