import csv
import json
import re
import subprocess
import sys
from collections import defaultdict
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageFilter
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "work" / "rpi2899" / "visual_triage"
PDF = ROOT / "work" / "rpi2899" / "source" / "Marcas2899.pdf"
PDFTOPPM = (
    Path.home()
    / ".cache"
    / "codex-runtimes"
    / "codex-primary-runtime"
    / "dependencies"
    / "native"
    / "poppler"
    / "Library"
    / "bin"
    / "pdftoppm.exe"
)
DPI = 130
PROCESS_RE = re.compile(r"^\s*(\d{9})\s*$")


def read_map() -> list[dict]:
    with (OUT / "process_page_map.csv").open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def render_page(page_number: int) -> tuple[int, str | None]:
    pages_dir = OUT / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    target = pages_dir / f"page_{page_number}.png"
    if target.exists() and target.stat().st_size > 10_000:
        return page_number, None
    prefix = pages_dir / f"page_{page_number}"
    cmd = [
        str(PDFTOPPM),
        "-f",
        str(page_number),
        "-l",
        str(page_number),
        "-r",
        str(DPI),
        "-png",
        "-singlefile",
        str(PDF),
        str(prefix),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode:
        return page_number, result.stderr.strip() or f"returncode={result.returncode}"
    return page_number, None


def collect_process_positions(page) -> dict[str, float]:
    positions: dict[str, list[float]] = defaultdict(list)
    height = float(page.mediabox.height)

    def visitor(text, cm, tm, font_dict, font_size):
        match = PROCESS_RE.match(text or "")
        if match:
            # PDF text coordinates are bottom-up; rendered image coordinates are top-down.
            positions[match.group(1)].append(height - float(tm[5]))

    page.extract_text(visitor_text=visitor)
    return {process: min(values) for process, values in positions.items()}


def trim_content(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    background = Image.new("RGB", rgb.size, "white")
    diff = ImageChops.difference(rgb, background).convert("L")
    mask = diff.point(lambda px: 255 if px > 12 else 0)
    # Remove isolated compression dust without eroding line art.
    mask = mask.filter(ImageFilter.MedianFilter(3))
    bbox = mask.getbbox()
    if bbox is None:
        return rgb
    left, top, right, bottom = bbox
    pad = 5
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(rgb.width, right + pad)
    bottom = min(rgb.height, bottom + pad)
    return rgb.crop((left, top, right, bottom))


def isolate_artwork(record_crop: Image.Image, analysis_start_px: int = 20) -> Image.Image:
    """Select the dominant non-text component in the official right artwork column."""
    rgb = record_crop.convert("RGB")
    arr = np.asarray(rgb, dtype=np.int16)
    mask_arr = (255 - arr.min(axis=2)) > 12
    mask_arr[:, :analysis_start_px] = False
    # Horizontal record rules are not artwork.
    dense_rows = mask_arr.sum(axis=1) > int(mask_arr.shape[1] * 0.72)
    mask_arr[dense_rows, :] = False
    mask = Image.fromarray((mask_arr * 255).astype("uint8"), "L")
    dilated = mask.filter(ImageFilter.MaxFilter(7))
    binary = np.asarray(dilated) > 0
    height, width = binary.shape
    visited = np.zeros_like(binary, dtype=bool)
    components = []
    for y in range(height):
        for x in range(width):
            if not binary[y, x] or visited[y, x]:
                continue
            queue = deque([(y, x)])
            visited[y, x] = True
            min_x = max_x = x
            min_y = max_y = y
            while queue:
                cy, cx = queue.popleft()
                min_x, max_x = min(min_x, cx), max(max_x, cx)
                min_y, max_y = min(min_y, cy), max(max_y, cy)
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if (
                        0 <= ny < height
                        and 0 <= nx < width
                        and binary[ny, nx]
                        and not visited[ny, nx]
                    ):
                        visited[ny, nx] = True
                        queue.append((ny, nx))
            box_w = max_x - min_x + 1
            box_h = max_y - min_y + 1
            if box_w < 8 or box_h < 5:
                continue
            original_ink = int(mask_arr[min_y : max_y + 1, min_x : max_x + 1].sum())
            if original_ink < 18:
                continue
            # Text fragments are usually shallow. Artwork gets a height and area bonus.
            score = original_ink * (box_w * box_h) ** 0.5 * min(1.0, box_h / 24)
            components.append((score, min_x, min_y, max_x + 1, max_y + 1))
    if not components:
        return trim_content(rgb)
    _, left, top, right, bottom = max(components)
    pad_x, pad_y = 24, 10
    left = max(0, left - pad_x)
    right = min(width, right + pad_x)
    top = max(0, top - pad_y)
    bottom = min(height, bottom + pad_y)
    return trim_content(rgb.crop((left, top, right, bottom)))


def main() -> None:
    rows = read_map()
    by_page: dict[int, list[dict]] = defaultdict(list)
    for row in rows:
        for page in row["pages"].split("|"):
            if page:
                by_page[int(page)].append(row)
    unique_pages = sorted(by_page)

    render_errors = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(render_page, page): page for page in unique_pages}
        done = 0
        for future in as_completed(futures):
            page, error = future.result()
            done += 1
            if error:
                render_errors.append({"page": page, "error": error})
            if done % 50 == 0:
                print(f"rendered {done}/{len(unique_pages)} pages", flush=True)

    reader = PdfReader(str(PDF))
    marks_dir = OUT / "marks"
    marks_dir.mkdir(parents=True, exist_ok=True)
    extracted = []
    failures = []
    for index, page_number in enumerate(unique_pages, 1):
        target_rows = by_page[page_number]
        page = reader.pages[page_number - 1]
        page_width = float(page.mediabox.width)
        page_height = float(page.mediabox.height)
        positions = collect_process_positions(page)
        ordered_y = sorted(set(positions.values()))
        rendered_path = OUT / "pages" / f"page_{page_number}.png"
        if not rendered_path.exists():
            for row in target_rows:
                failures.append(
                    {
                        "processo": row["processo"],
                        "universe": row["universe"],
                        "page": page_number,
                        "reason": "page_render_missing",
                    }
                )
            continue
        rendered = Image.open(rendered_path).convert("RGB")
        sx = rendered.width / page_width
        sy = rendered.height / page_height
        for row in target_rows:
            process = row["processo"]
            if process not in positions:
                failures.append(
                    {
                        "processo": process,
                        "universe": row["universe"],
                        "page": page_number,
                        "reason": "process_text_coordinate_missing",
                    }
                )
                continue
            top_pt = positions[process]
            next_values = [value for value in ordered_y if value > top_pt + 1]
            bottom_pt = next_values[0] if next_values else page_height - 28
            # INPI RPI mark artwork consistently occupies the right-most column.
            # Keep a narrow band to avoid specifications while retaining the full artwork.
            left_pt = 420
            right_pt = min(548, page_width - 22)
            top_pt_crop = max(0, top_pt + 4)
            bottom_pt_crop = min(page_height, bottom_pt - 4)
            crop_box = (
                int(round(left_pt * sx)),
                int(round(top_pt_crop * sy)),
                int(round(right_pt * sx)),
                int(round(bottom_pt_crop * sy)),
            )
            raw_crop = rendered.crop(crop_box)
            mark = isolate_artwork(raw_crop, analysis_start_px=max(18, int(round(18 * sx))))
            target = marks_dir / f"{row['universe']}_{process}_p{page_number}.png"
            mark.save(target, optimize=True)
            extracted.append(
                {
                    **row,
                    "page": page_number,
                    "page_width_pt": round(page_width, 2),
                    "page_height_pt": round(page_height, 2),
                    "process_y_top_pt": round(top_pt, 2),
                    "record_bottom_pt": round(bottom_pt, 2),
                    "crop_box_rendered_px": "|".join(map(str, crop_box)),
                    "render_size_px": f"{rendered.width}x{rendered.height}",
                    "mark_size_px": f"{mark.width}x{mark.height}",
                    "mark_path": str(target.relative_to(ROOT)).replace("\\", "/"),
                }
            )
        if index % 50 == 0:
            print(f"coordinates/crops {index}/{len(unique_pages)} pages", flush=True)

    fields = list(extracted[0].keys()) if extracted else []
    if extracted:
        with (OUT / "extracted_marks.csv").open(
            "w", encoding="utf-8-sig", newline=""
        ) as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(extracted)
    with (OUT / "extraction_audit.json").open("w", encoding="utf-8") as handle:
        json.dump(
            {
                "input_rows": len(rows),
                "unique_pages": len(unique_pages),
                "render_errors": render_errors,
                "extracted": len(extracted),
                "failures": failures,
                "dpi": DPI,
                "crop_method": "pypdf process text coordinate + fixed official right artwork column",
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )
    print(
        json.dumps(
            {
                "input_rows": len(rows),
                "unique_pages": len(unique_pages),
                "render_errors": len(render_errors),
                "extracted": len(extracted),
                "failures": len(failures),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"fatal: {exc}", file=sys.stderr)
        raise
