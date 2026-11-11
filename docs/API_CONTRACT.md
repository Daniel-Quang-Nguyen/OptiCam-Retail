# Backend API reference

Base URL local: `http://localhost:8000`. OpenAPI/Swagger UI: `/docs`.
Pydantic request models are implemented in `backend/main.py`; optimizer logic is in
`backend/greedy_optimizer.py`. All dimensions/distances are meters and angles are degrees.
Coordinates use the top-left origin, with +X right and +Y down; pan 0° points along +X.

## Status and integration

The React UI calls `POST /api/v1/optimize` through Vite's `/api` proxy. If the request times
out after 1.5 s or fails, the UI runs its client-side Greedy optimizer. Layout Save/Load,
BOM JSON/CSV/XLSX, and backend bundle Import/Export routes are implemented but are not
connected to buttons in the current UI. The UI's own layout and bundle JSON actions run
locally in the browser.

## Shared layout schema

```json
{
  "version": "1.0",
  "name": "Cửa hàng",
  "widthM": 10,
  "heightM": 6,
  "gridM": 0.5,
  "targetHeight": 1.6,
  "obstacles": [
    { "id": "shelf-1", "type": "shelf", "x": 3, "y": 2, "w": 2, "h": 0.6, "elev": 1.8, "angle": 0, "riskCategory": "standard", "riskWmax": 3, "riskR0": 1, "riskR": 2 }
  ],
  "riskStrokes": [{ "x": 4.25, "y": 2.75, "radius": 0.25, "weight": 4.5 }],
  "cameras": [
    { "id": "CAM-01", "x": 0, "y": 3, "pan": 0, "fov": 85, "res": 2560, "range": 10, "height": 2.4 }
  ]
}
```

`widthM` and `heightM` must be 3–40 m; `gridM` 0.1–2 m; a layout is limited to 12,000
cells by the dimension-based validation. Obstacles support `shelf`, `pos`, or `entrance`;
`w` and `h` must be positive. Extra layout/obstacle properties are accepted. Camera values
are generic dictionaries, so camera-level constraints are not validated by Pydantic.
`targetHeight` is the person point used by coverage calculations in meters: face `1.6`,
chest `1.2`, or waist `0.9`; omitted values default to face height.
Obstacle risk profiles accept `riskWmax` (1–5), `riskR0` (meters), and `riskR` (meters,
greater than `riskR0`). Shelves additionally accept `riskCategory` in `high`, `standard`,
`bulky`, or `custom`, with default Wmax values 4.5, 3, 1.8, and 3. Editing Wmax directly marks
the shelf profile as custom. These category weights are configurable starting assumptions,
not empirical crime probabilities. Default POS/entrance profile is `(5, 1, 2.5)` and the
standard shelf profile is `(3, 1, 2)`. The UI computes a continuous risk matrix at grid-cell centers using the maximum
weight from all obstacles, then applies manual strokes in order so the latest matching stroke
wins. Each stroke stores metric `x`, `y`, `radius`, and `weight`; the legacy per-cell `risk`
map remains accepted for older layouts.

The frontend import normalizer additionally accepts legacy aliases:
`width|widthM`, `height|heightM`, `grid_size|gridM`; obstacle `w|width`, `h|height`,
`elev|elevation`, `label|name`; camera `pan|pan_angle|angle`. These are frontend compatibility
rules, not a promise that every API request alias is normalized.

## `GET /api/v1/health`

Returns `{"status":"ok"}` when the API process is responsive.

## `POST /api/v1/optimize`

Optimizes camera locations from the supplied layout and matrices. The frontend creates
the matrices using `buildZones()`; blocked cells are excluded from coverage calculations.

```json
{
  "cameraBudgetK": 3,
  "cameraProfiles": [
    { "fov": 85, "res": 2560, "range": 10, "height": 2.4, "model": "OptiCam IP 4MP" },
    { "fov": 85, "res": 2560, "range": 10, "height": 2.4, "model": "OptiCam IP 4MP" }
  ],
  "layout": {
    "version": "1.0", "name": "Demo", "widthM": 10, "heightM": 6, "gridM": 0.5,
    "obstacles": [],
    "risk": {},
    "riskStrokes": [],
    "cameras": []
  },
  "grid": { "rows": 12, "cols": 20, "cellSizeM": 0.5 },
  "riskMatrix": [[1, 2.75, 4.5]],
  "blockedMatrix": [[0, 0, 0]]
}
```

The matrix snippets above are illustrative only; actual matrix dimensions must be exactly
`rows × cols`. `cameraBudgetK` is 1–20. `cellSizeM` must match `layout.gridM`, and grid
dimensions must equal `round(heightM / cellSizeM)` rows and `round(widthM / cellSizeM)`
columns. Risk values are continuous numbers in `[1, 5]`; blocked values are 0 or 1. The grid may contain at most
12,000 cells. Candidate evaluations are capped at 1,000,000; the optimizer coarsens wall
anchor spacing when required.

`cameraProfiles` is optional and ordered by optimized camera number. Each profile's FOV,
horizontal resolution, range, height, and model are applied to its corresponding optimized
camera. Missing profiles use `FOV=85°`, `res=2560` horizontal pixels, `height=2.4 m`, and
`range=10 m`. The frontend sends profiles for the selected camera budget, using the existing
cameras' settings in order; cameras without an existing profile use those defaults.
Anchors are on room walls, at `max(gridM, 0.5 m)` spacing initially, with pan angles in
15° increments. Greedy maximizes weighted DORI gain and stops at 95% of unblocked
cells reaching Detection (25 PPM), no positive-gain candidate, or the budget. This is not
the same candidate set or stopping rule as the client optimizer; exact formulas are in
[FORMULAS.md](FORMULAS.md).

Response shape:
```json
{
  "cameras": [
    { "id": "CAM-01", "x": 0, "y": 3, "pan": 45, "fov": 85, "res": 2560, "range": 10, "height": 2.4 }
  ],
  "metrics": {
    "weighted_coverage_pct": 70.0,
    "area_coverage_pct": 80.0,
    "target_coverage_reached": false,
    "target_coverage_pct": 95.0,
    "cameras_used": 1,
    "runtime_ms": 120.0,
    "anchor_step_m": 0.5
  }
}
```

Metrics are example values, not a fixed result. `area_coverage_pct` is the percentage of
unblocked cells at ≥25 PPM. `weighted_coverage_pct` is the achieved weighted DORI score as a
percentage of the maximum possible score. `target_coverage_reached` indicates whether the
95% area target was met.

## `POST /api/v1/layouts/save`

Body: a shared layout JSON. Query parameter `filename` defaults to `layout_v1.json`.
Returns `{"status":"success","saved_file":"..."}`. Files are stored in
`backend/storage/layouts/` by default; set `OPTICAM_DATA_DIR` to use another directory.
The filename is restricted to ASCII letters, numbers, `.`, `_`, and `-` (up to 100 basename
characters), with `.json` appended when absent.

## `GET /api/v1/layouts/load?filename=layout_v1.json`

Returns the validated layout JSON. Returns 404 if the file is absent and 422 if stored
contents cannot be parsed as a valid layout.

## `POST /api/v1/bom/export?format=json`

Body: a shared layout; BOM rows are generated from its `cameras` array. `format` supports
`json` (default), `csv`, or `xlsx`. JSON returns `rows`, `totalCameras`, `totalCableM`,
`totalCostVnd`, and `poePorts`. CSV/XLSX are attachment downloads. Cable length and fixed
cost assumptions are described in [FORMULAS.md](FORMULAS.md).

## `POST /api/v1/project/export?download_file=false`

Body:
```json
{ "layout": { "...": "shared layout schema" }, "score": {} }
```

Returns a JSON bundle with `format: "opticam-bundle"`, version, export timestamp, layout,
score, calculated BOM, and heatmap. Set `download_file=true` to receive
`opticam_bundle.json` as a download. This backend-generated bundle includes a heatmap;
the browser's local bundle format may not.

## `POST /api/v1/project/import`

Multipart form upload with field `file`, a `.json` bundle whose top-level `format` is
`opticam-bundle` and whose `layout` matches the shared layout schema. Maximum upload is
5 MiB. Returns `status`, a message, and the validated `project_bundle`; the endpoint does
not persist it or update the browser UI by itself.

## Errors and local development

- `400`: invalid filename or uploaded file extension.
- `413`: project bundle exceeds 5 MiB.
- `404`: requested saved layout does not exist.
- `422`: invalid request/schema, matrix dimensions/values, malformed bundle, or invalid saved layout.
- CORS allows the local frontend origins on ports 3000 and 5173. Vite serves on port 3000
  and proxies `/api` to `http://localhost:8000`.

Run backend tests with `python -m pytest .\backend\tests -q` from the project root.
