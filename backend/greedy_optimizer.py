"""Greedy camera placement with field-of-view and obstacle line-of-sight checks."""

from __future__ import annotations

import math
from typing import Any, Sequence

FACE_HEIGHT_M = 1.6
DORI_FACTORS = ((250, 1.0), (125, 0.75), (62, 0.4), (25, 0.2), (0, 0.0))

GridPoint = tuple[float, float, float]
RISK_DEFAULTS = {
    "pos": (5.0, 1.0, 2.5),
    "entrance": (5.0, 1.0, 2.5),
    "shelf": (3.0, 1.0, 2.0),
}


def risk_weight_at(distance: float, wmax: float, r0: float, radius: float) -> float:
    if radius <= r0 or distance <= r0:
        return wmax
    if distance >= radius:
        return 1.0
    t = (distance - r0) / (radius - r0)
    return 1.0 + (wmax - 1.0) * (1.0 - t)


def dori_factor(ppm: float) -> float:
    for threshold, factor in DORI_FACTORS:
        if ppm >= threshold:
            return factor
    return 0.0


def _value(obstacle: Any, key: str, default: Any = None) -> Any:
    if isinstance(obstacle, dict):
        return obstacle.get(key, default)
    if hasattr(obstacle, key):
        return getattr(obstacle, key)
    if hasattr(obstacle, "dict"):
        return obstacle.dict().get(key, default)
    return default


def _obstacle_rect(obstacle: Any) -> tuple[float, float, float, float, float] | None:
    if _value(obstacle, "start_x") is not None:
        x1 = float(_value(obstacle, "start_x"))
        y1 = float(_value(obstacle, "start_y"))
        x2 = float(_value(obstacle, "end_x"))
        y2 = float(_value(obstacle, "end_y"))
        return (min(x1, x2), min(y1, y2), abs(x2 - x1), abs(y2 - y1), 0.0)
    x, y = _value(obstacle, "x"), _value(obstacle, "y")
    width = _value(obstacle, "w", _value(obstacle, "width"))
    height = _value(obstacle, "h", _value(obstacle, "length"))
    if None in (x, y, width, height):
        return None
    return float(x), float(y), float(width), float(height), float(_value(obstacle, "angle", 0))


def segment_hits_obstacle(
    start: tuple[float, float],
    end: tuple[float, float],
    obstacle: Any,
    camera_height: float = 2.4,
    target_height: float = FACE_HEIGHT_M,
) -> bool:
    """Return whether the 3D sightline crosses the obstacle's occupied volume."""
    obstacle_type = _value(obstacle, "type", "shelf")
    elevation = float(_value(obstacle, "elev", _value(obstacle, "height", 1.8)))
    if obstacle_type == "entrance" or elevation <= 0:
        return False
    rect = _obstacle_rect(obstacle)
    if rect is None:
        return False
    x, y, width, height, angle_deg = rect
    cx, cy = x + width / 2, y + height / 2
    angle = math.radians(-angle_deg)
    cos_a, sin_a = math.cos(angle), math.sin(angle)

    def local(point: tuple[float, float]) -> tuple[float, float]:
        dx, dy = point[0] - cx, point[1] - cy
        return dx * cos_a - dy * sin_a, dx * sin_a + dy * cos_a

    x0, y0 = local(start)
    x1, y1 = local(end)
    dx, dy = x1 - x0, y1 - y0
    t_min, t_max = 0.0, 1.0
    for origin, delta, half_size in ((x0, dx, width / 2), (y0, dy, height / 2)):
        if abs(delta) < 1e-12:
            if origin < -half_size or origin > half_size:
                return False
            continue
        near = (-half_size - origin) / delta
        far = (half_size - origin) / delta
        t_min = max(t_min, min(near, far))
        t_max = min(t_max, max(near, far))
        if t_min > t_max:
            return False
    if t_max < t_min:
        return False
    heights = (
        camera_height + (target_height - camera_height) * t_min,
        camera_height + (target_height - camera_height) * t_max,
    )
    return min(heights) <= elevation + 1e-9


def _point_inside_obstacle(point: tuple[float, float], obstacle: Any) -> bool:
    if _value(obstacle, "type", "shelf") == "entrance":
        return False
    rect = _obstacle_rect(obstacle)
    if rect is None:
        return False
    x, y, width, height, angle_deg = rect
    cx, cy = x + width / 2, y + height / 2
    angle = math.radians(-angle_deg)
    dx, dy = point[0] - cx, point[1] - cy
    local_x = dx * math.cos(angle) - dy * math.sin(angle)
    local_y = dx * math.sin(angle) + dy * math.cos(angle)
    return abs(local_x) <= width / 2 and abs(local_y) <= height / 2


def _distance_to_obstacle(point: tuple[float, float], obstacle: Any) -> float:
    rect = _obstacle_rect(obstacle)
    if rect is None:
        return math.inf
    x, y, width, height, angle_deg = rect
    cx, cy = x + width / 2, y + height / 2
    angle = math.radians(-angle_deg)
    dx, dy = point[0] - cx, point[1] - cy
    local_x = dx * math.cos(angle) - dy * math.sin(angle)
    local_y = dx * math.sin(angle) + dy * math.cos(angle)
    return math.hypot(max(0.0, abs(local_x) - width / 2), max(0.0, abs(local_y) - height / 2))


def obstacle_risk_weight(point: tuple[float, float], obstacles: Sequence[Any]) -> float:
    weight = 1.0
    for obstacle in obstacles:
        obstacle_type = _value(obstacle, "type", "shelf")
        defaults = RISK_DEFAULTS.get(obstacle_type)
        if defaults is None:
            continue
        wmax, r0, radius = defaults
        wmax = float(_value(obstacle, "riskWmax", wmax))
        r0 = float(_value(obstacle, "riskR0", r0))
        radius = float(_value(obstacle, "riskR", radius))
        weight = max(weight, risk_weight_at(_distance_to_obstacle(point, obstacle), wmax, r0, radius))
    return weight


def camera_ppm(
    camera: dict[str, Any],
    point: tuple[float, float],
    obstacles: Sequence[Any],
    target_height: float = FACE_HEIGHT_M,
) -> float:
    dx, dy = point[0] - camera["x"], point[1] - camera["y"]
    distance = math.hypot(dx, dy)
    if distance < 0.2 or distance > camera["range"]:
        return 0.0
    angle = math.degrees(math.atan2(dy, dx)) % 360
    angle_diff = abs((angle - camera["pan"] + 180) % 360 - 180)
    if angle_diff > camera["fov"] / 2:
        return 0.0
    origin = (camera["x"], camera["y"])
    if any(segment_hits_obstacle(origin, point, obstacle, camera["height"], target_height) for obstacle in obstacles):
        return 0.0
    slant_distance = math.hypot(distance, abs(camera["height"] - target_height))
    return camera["res"] / (2 * slant_distance * math.tan(math.radians(camera["fov"] / 2)))


class OptiCamGreedy:
    """Select wall-mounted camera candidates by weighted DORI gain."""

    def __init__(
        self,
        room_width: float,
        room_length: float,
        obstacles_data: Sequence[Any],
        target_height: float = FACE_HEIGHT_M,
        risk_strokes: Sequence[Any] = (),
        legacy_risk: dict[str, float] | None = None,
    ):
        self.room_width = room_width
        self.room_length = room_length
        self.obstacles = list(obstacles_data)
        self.target_height = target_height
        self.risk_strokes = list(risk_strokes)
        self.legacy_risk = legacy_risk or {}

    def generate_grid(
        self,
        cell_size: float = 0.5,
        risk_matrix: Sequence[Sequence[int]] | None = None,
        blocked_matrix: Sequence[Sequence[int]] | None = None,
    ) -> list[GridPoint]:
        rows = round(self.room_length / cell_size)
        cols = round(self.room_width / cell_size)
        points: list[GridPoint] = []
        for row in range(rows):
            for col in range(cols):
                x, y = (col + 0.5) * cell_size, (row + 0.5) * cell_size
                if blocked_matrix is not None and blocked_matrix[row][col]:
                    continue
                if blocked_matrix is None and any(
                    _point_inside_obstacle((x, y), obstacle) for obstacle in self.obstacles
                ):
                    continue
                weight = risk_matrix[row][col] if risk_matrix is not None else obstacle_risk_weight((x, y), self.obstacles)
                if risk_matrix is None:
                    weight = float(self.legacy_risk.get(f"{row}_{col}", weight))
                    for stroke in self.risk_strokes:
                        sx, sy = float(_value(stroke, "x", 0)), float(_value(stroke, "y", 0))
                        radius = float(_value(stroke, "radius", 0))
                        if math.hypot(x - sx, y - sy) <= radius:
                            weight = float(_value(stroke, "weight", weight))
                points.append((x, y, weight))
        return points

    def get_covered_points(
        self,
        cam_x: float,
        cam_y: float,
        radius: float,
        grid_points: Sequence[GridPoint],
        pan_angle_deg: float = 180,
        fov_deg: float = 360,
        resolution: float = 2560,
        camera_height: float = 2.4,
    ) -> set[int]:
        """Return grid indices meeting the minimum DORI detection threshold."""
        camera = {
            "x": cam_x,
            "y": cam_y,
            "pan": pan_angle_deg,
            "fov": fov_deg,
            "res": resolution,
            "range": radius,
            "height": camera_height,
        }
        covered = set()
        for index, (x, y, _) in enumerate(grid_points):
            point = (x, y)
            if fov_deg >= 360:
                distance = math.hypot(x - cam_x, y - cam_y)
                visible = distance <= radius and not any(
                    segment_hits_obstacle((cam_x, cam_y), point, obstacle, camera_height, self.target_height)
                    for obstacle in self.obstacles
                )
            else:
                visible = camera_ppm(camera, point, self.obstacles, self.target_height) >= 25
            if visible:
                covered.add(index)
        return covered

    def run_greedy(
        self,
        camera_candidates: Sequence[dict[str, Any]],
        grid_points: Sequence[GridPoint],
        camera_budget: int,
        target_coverage: float = 0.95,
        camera_candidate_groups: Sequence[Sequence[dict[str, Any]]] | None = None,
    ) -> tuple[list[dict[str, Any]], dict[str, float | bool]]:
        total_points = len(grid_points)
        if not total_points or not camera_candidates or camera_budget <= 0:
            total_weight = sum(weight for _, _, weight in grid_points)
            return [], {
                "area_coverage_pct": 100.0 if not total_points else 0.0,
                "target_coverage_reached": not total_points,
                "weighted_coverage_pct": 100.0 if not total_weight else 0.0,
            }

        candidate_groups = camera_candidate_groups or [camera_candidates]
        candidate_scores: list[list[tuple[dict[str, Any], list[float], list[float]]]] = []
        scored_groups: dict[int, list[tuple[dict[str, Any], list[float], list[float]]]] = {}
        for group in candidate_groups:
            group_id = id(group)
            if group_id not in scored_groups:
                group_scores: list[tuple[dict[str, Any], list[float], list[float]]] = []
                for camera in group:
                    ppm_values = [
                        camera_ppm(camera, (x, y), self.obstacles, self.target_height)
                        for x, y, _ in grid_points
                    ]
                    scores = [
                        dori_factor(ppm) * weight
                        for ppm, (_, _, weight) in zip(ppm_values, grid_points)
                    ]
                    if any(ppm_values):
                        group_scores.append((camera, scores, ppm_values))
                scored_groups[group_id] = group_scores
            group_scores = scored_groups[group_id]
            candidate_scores.append(group_scores)

        current_scores = [0.0] * total_points
        current_ppm = [0.0] * total_points
        selected: list[dict[str, Any]] = []
        covered_count = 0
        while len(selected) < camera_budget:
            best_index, best_gain, best_ppm_gain = -1, -1.0, -1.0
            current_candidates = candidate_scores[min(len(selected), len(candidate_scores) - 1)]
            for index, (_, scores, ppm_values) in enumerate(current_candidates):
                gain = sum(max(0.0, score - current) for score, current in zip(scores, current_scores))
                ppm_gain = sum(
                    max(0.0, min(ppm, 250) - min(current, 250))
                    for ppm, current in zip(ppm_values, current_ppm)
                )
                if gain > best_gain or (gain == best_gain and ppm_gain > best_ppm_gain):
                    best_index, best_gain, best_ppm_gain = index, gain, ppm_gain
            if best_index < 0:
                break

            camera, scores, ppm_values = current_candidates.pop(best_index)
            selected.append(camera)
            current_scores = [max(old, new) for old, new in zip(current_scores, scores)]
            current_ppm = [max(old, new) for old, new in zip(current_ppm, ppm_values)]
            covered_count = sum(score > 0 for score in current_scores)

        area_coverage = covered_count / total_points * 100
        total_weight = sum(weight for _, _, weight in grid_points)
        weighted_coverage = sum(current_scores)
        return selected, {
            "area_coverage_pct": round(area_coverage, 1),
            "target_coverage_reached": area_coverage / 100 >= target_coverage,
            "weighted_coverage_pct": round(weighted_coverage / total_weight * 100, 1) if total_weight else 100.0,
        }
