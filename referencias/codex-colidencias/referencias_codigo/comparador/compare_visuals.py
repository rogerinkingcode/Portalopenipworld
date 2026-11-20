import csv
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "work" / "rpi2899" / "visual_triage"
BASE_JSON = ROOT / "BASE_MESTRA" / "Base_Processual_Apex_Normalizada.json"

GENERIC_CFE = {"27.5.1", "26.13.25"}
CFE_RE = re.compile(r"\d+(?:\.\d+){1,2}")

# Conservative market-affinity clusters used only as a blocking mechanism.
AFFINITY_GROUPS = [
    {"03", "05", "10", "44"},
    {"09", "38", "41", "42"},
    {"16", "35", "41"},
    {"18", "25", "35"},
    {"29", "30", "31", "32", "33", "35", "43"},
    {"35", "36", "42"},
    {"37", "40", "42"},
    {"12", "37", "39"},
    {"01", "02", "03", "04", "05", "17", "19"},
    {"06", "07", "08", "09", "11", "12", "20", "21"},
    {"14", "18", "25", "26"},
    {"35", "39", "43"},
]


def parse_classes(value) -> set[str]:
    if isinstance(value, list):
        items = value
    else:
        items = re.findall(r"\d{1,2}", value or "")
    return {str(int(item)).zfill(2) for item in items if str(item).strip()}


def parse_cfe(value: str | None) -> set[str]:
    return set(CFE_RE.findall(value or ""))


def informative_cfe(code: str) -> bool:
    # Colour-only Vienna codes and the two most recurrent catch-all codes cannot
    # justify retention by themselves.
    return code not in GENERIC_CFE and not code.startswith("29.1.")


def classes_affine(left: set[str], right: set[str]) -> tuple[bool, str]:
    if left & right:
        return True, "same_class"
    for group in AFFINITY_GROUPS:
        if left & group and right & group:
            return True, "affinity_cluster"
    return False, "none"


def foreground_trim(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    # Use a white-background distance mask. Official artwork and the base assets
    # are overwhelmingly white-backed; dark or coloured backgrounds remain foreground.
    arr = np.asarray(rgb, dtype=np.int16)
    distance = 255 - arr.min(axis=2)
    ys, xs = np.where(distance > 10)
    if len(xs) == 0:
        return rgb
    left, right = max(0, xs.min() - 3), min(rgb.width, xs.max() + 4)
    top, bottom = max(0, ys.min() - 3), min(rgb.height, ys.max() + 4)
    return rgb.crop((left, top, right, bottom))


def normalize_square(image: Image.Image, size: int = 128) -> Image.Image:
    image = foreground_trim(image)
    image.thumbnail((size - 12, size - 12), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (size, size), "white")
    x = (size - image.width) // 2
    y = (size - image.height) // 2
    canvas.paste(image, (x, y))
    return canvas


def dhash(image: Image.Image) -> int:
    gray = ImageOps.grayscale(normalize_square(image)).resize(
        (9, 8), Image.Resampling.LANCZOS
    )
    pixels = np.asarray(gray, dtype=np.int16)
    bits = pixels[:, 1:] > pixels[:, :-1]
    value = 0
    for bit in bits.flatten():
        value = (value << 1) | int(bit)
    return value


def phash(image: Image.Image) -> int:
    gray = ImageOps.grayscale(normalize_square(image)).resize(
        (32, 32), Image.Resampling.LANCZOS
    )
    pixels = np.asarray(gray, dtype=np.float64)
    n = 32
    k = np.arange(n)
    matrix = np.cos((np.pi / n) * (k[:, None] + 0.5) * k[None, :]).T
    matrix[0, :] *= 1 / math.sqrt(2)
    matrix *= math.sqrt(2 / n)
    transformed = matrix @ pixels @ matrix.T
    low = transformed[:8, :8]
    median = np.median(low[1:, :])
    bits = low > median
    value = 0
    for bit in bits.flatten():
        value = (value << 1) | int(bit)
    return value


def hamming(left: int, right: int) -> int:
    return (left ^ right).bit_count()


def digest_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_base() -> list[dict]:
    records = json.loads(BASE_JSON.read_text(encoding="utf-8"))["records"]
    by_asset: dict[str, dict] = {}
    for record in records:
        asset = record.get("visualAsset")
        if not asset:
            continue
        relative = asset["relativePath"].replace("/", "\\")
        path = ROOT / "BASE_MESTRA" / relative
        if not path.exists():
            continue
        item = by_asset.setdefault(
            str(path),
            {
                "path": path,
                "asset_file": path.name,
                "processes": set(),
                "marks": set(),
                "classes": set(),
                "cfes": set(),
                "holders": set(),
            },
        )
        item["processes"].add(record["process"]["normalized"])
        if record["mark"].get("raw"):
            item["marks"].add(record["mark"]["raw"])
        item["classes"].update(parse_classes(record["classification"].get("classes")))
        item["cfes"].update(parse_cfe(record["mark"].get("cfeRaw")))
        if record["parties"].get("titularRaw"):
            item["holders"].add(record["parties"]["titularRaw"])

    output = []
    for item in by_asset.values():
        image = Image.open(item["path"]).convert("RGB")
        item["dhash"] = dhash(image)
        item["phash"] = phash(image)
        item["sha256"] = digest_file(item["path"])
        output.append(item)
    return output


def load_targets() -> list[dict]:
    with (OUT / "extracted_marks.csv").open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    for row in rows:
        path = ROOT / row["mark_path"]
        image = Image.open(path).convert("RGB")
        row["path"] = path
        row["classes_set"] = parse_classes(row["classes"])
        row["cfes_set"] = parse_cfe(row["cfe"])
        row["dhash"] = dhash(image)
        row["phash"] = phash(image)
        row["sha256"] = digest_file(path)
    return rows


def serialize_set(values) -> str:
    return "|".join(sorted(values))


def main() -> None:
    base = load_base()
    targets = load_targets()
    cfe_frequency = Counter(cfe for item in base for cfe in item["cfes"])
    pairs = []
    target_summaries = []
    for index, target in enumerate(targets, 1):
        ranked = []
        for item in base:
            affine, affinity_reason = classes_affine(target["classes_set"], item["classes"])
            if not affine:
                continue
            common_cfe = target["cfes_set"] & item["cfes"]
            informative = {c for c in common_cfe if informative_cfe(c)}
            rare = {c for c in informative if cfe_frequency[c] <= 15}
            dd = hamming(target["dhash"], item["dhash"])
            pd = hamming(target["phash"], item["phash"])
            visual_distance = min(dd, pd)
            retained_reason = None
            if dd <= 5 and pd <= 10:
                retained_reason = "near_duplicate_hash"
            elif dd <= 10 and pd <= 15:
                retained_reason = "strong_visual_hash"
            elif informative and dd + pd <= 45 and max(dd, pd) <= 27:
                retained_reason = "cfe_supported_visual"
            elif rare and dd + pd <= 48 and max(dd, pd) <= 26:
                retained_reason = "rare_cfe_shortlist"
            ranked.append(
                {
                    "target": target,
                    "base": item,
                    "affinity_reason": affinity_reason,
                    "common_cfe": common_cfe,
                    "informative_cfe": informative,
                    "rare_cfe": rare,
                    "dhash_distance": dd,
                    "phash_distance": pd,
                    "visual_distance": visual_distance,
                    "retained_reason": retained_reason,
                }
            )

        # Retain explicit threshold hits. CFE rarity may add only the two closest
        # pairs, preventing common figurative codes from flooding manual review.
        retained = [pair for pair in ranked if pair["retained_reason"]]
        # Hashes can diverge when the same line-art is republished with different
        # stroke weight, colour or surrounding margin. Force the two best pairs
        # carrying an ultra-rare informative CFE (<=2 Apex assets) into visual review.
        forced_rare = [
            pair
            for pair in ranked
            if any(cfe_frequency[c] <= 2 for c in pair["rare_cfe"])
        ]
        forced_rare.sort(
            key=lambda pair: (
                0 if pair["affinity_reason"] == "same_class" else 1,
                -(len(pair["common_cfe"])),
                pair["visual_distance"],
                pair["dhash_distance"] + pair["phash_distance"],
            )
        )
        existing_assets = {str(pair["base"]["path"]) for pair in retained}
        for pair in forced_rare[:2]:
            if str(pair["base"]["path"]) in existing_assets:
                continue
            pair["retained_reason"] = "rare_cfe_forced_review"
            retained.append(pair)
            existing_assets.add(str(pair["base"]["path"]))
        retained.sort(
            key=lambda pair: (
                0 if pair["retained_reason"] == "near_duplicate_hash" else 1,
                pair["visual_distance"],
                pair["dhash_distance"] + pair["phash_distance"],
            )
        )
        retained = retained[:6]
        for rank, pair in enumerate(retained, 1):
            base_item = pair["base"]
            pairs.append(
                {
                    "pair_id": f"{target['universe']}-{target['processo']}-{rank:02d}",
                    "universe": target["universe"],
                    "target_process": target["processo"],
                    "target_page": target["page"],
                    "target_classes": serialize_set(target["classes_set"]),
                    "target_cfe": serialize_set(target["cfes_set"]),
                    "target_mark_path": str(target["path"].relative_to(ROOT)).replace("\\", "/"),
                    "base_processes": serialize_set(base_item["processes"]),
                    "base_marks": serialize_set(base_item["marks"]),
                    "base_holders": serialize_set(base_item["holders"]),
                    "base_classes": serialize_set(base_item["classes"]),
                    "base_cfe": serialize_set(base_item["cfes"]),
                    "base_asset_path": str(base_item["path"].relative_to(ROOT)).replace("\\", "/"),
                    "class_block": pair["affinity_reason"],
                    "common_cfe": serialize_set(pair["common_cfe"]),
                    "informative_cfe": serialize_set(pair["informative_cfe"]),
                    "rare_cfe": serialize_set(pair["rare_cfe"]),
                    "dhash_distance": pair["dhash_distance"],
                    "phash_distance": pair["phash_distance"],
                    "retained_reason": pair["retained_reason"],
                    "manual_decision": "",
                    "manual_justification": "",
                }
            )
        target_summaries.append(
            {
                "universe": target["universe"],
                "processo": target["processo"],
                "page": target["page"],
                "classes": serialize_set(target["classes_set"]),
                "cfe": serialize_set(target["cfes_set"]),
                "affine_base_assets_compared": len(ranked),
                "retained_candidates": len(retained),
                "preliminary_status": (
                    "manual_visual_review_required" if retained else "no_candidate_retained"
                ),
                "mark_path": str(target["path"].relative_to(ROOT)).replace("\\", "/"),
            }
        )
        if index % 50 == 0:
            print(f"compared {index}/{len(targets)} target signals", flush=True)

    pair_fields = list(pairs[0]) if pairs else []
    if pairs:
        with (OUT / "candidate_pairs.csv").open(
            "w", encoding="utf-8-sig", newline=""
        ) as handle:
            writer = csv.DictWriter(handle, fieldnames=pair_fields)
            writer.writeheader()
            writer.writerows(pairs)
    with (OUT / "target_screening.csv").open(
        "w", encoding="utf-8-sig", newline=""
    ) as handle:
        writer = csv.DictWriter(handle, fieldnames=list(target_summaries[0]))
        writer.writeheader()
        writer.writerows(target_summaries)

    audit = {
        "target_signals": len(targets),
        "base_assets_unique": len(base),
        "pairwise_hashes_possible": len(targets) * len(base),
        "class_or_affinity_block_pairs_compared": sum(
            int(row["affine_base_assets_compared"]) for row in target_summaries
        ),
        "targets_with_candidates": sum(
            int(row["retained_candidates"]) > 0 for row in target_summaries
        ),
        "retained_pairs": len(pairs),
        "generic_cfe_not_sufficient_alone": sorted(GENERIC_CFE)
        + ["29.1.* (colour-only codes)"],
        "method": {
            "hashes": ["normalized dHash64", "normalized pHash64 (DCT)"],
            "blocking": "same/affine class plus CFE-informed visual thresholds",
            "manual_review": "required for every retained pair",
        },
    }
    (OUT / "comparison_audit.json").write_text(
        json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
