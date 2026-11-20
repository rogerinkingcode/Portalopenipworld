from __future__ import annotations

import argparse
import hashlib
import html
import io
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any, Iterable

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from PIL import Image as PILImage
from PIL import ImageChops


SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parents[2]
BRAND_ASSET_DIR = ROOT / "work" / "pdf_cliente" / "assets"
FONT_DIR = BRAND_ASSET_DIR / "fonts"
DEFAULT_OUTPUT_DIR = ROOT / "output" / "pdf" / "RPI_2899"

PAGE_W, PAGE_H = A4
MARGIN_X = 16 * mm
HEADER_H = 24 * mm
FOOTER_H = 14 * mm

BRAND_DARK = colors.HexColor("#212121")
BRAND_CYAN = colors.HexColor("#00E0F6")
BRAND_TEAL = colors.HexColor("#1A6581")
BRAND_LIGHT = colors.HexColor("#F3F6F7")
BRAND_MID = colors.HexColor("#DCE5E8")
TEXT_MUTED = colors.HexColor("#5D666A")
WHITE = colors.white

LAW_URL = "https://www.planalto.gov.br/ccivil_03/leis/l9279.htm"
MANUAL_URL = "https://manualdemarcas.inpi.gov.br/"
RPI_URL = "https://revistas.inpi.gov.br/pdf/Marcas2899.pdf"
OPPOSITION_URL = (
    "https://www.gov.br/pt-br/servicos/"
    "apresentar-oposicao-a-pedido-de-registro-de-marca"
)
PAN_URL = (
    "https://www.gov.br/inpi/pt-br/servicos/recursos-e-nulidades/"
    "procedimento_pan_marcas.pdf"
)

EXPECTED_RPI = 2899
EXPECTED_RPI_DATE = "2026-07-28"
EXPECTED_OPPOSITION_DEADLINE = "2026-09-28"
EXPECTED_INTERNAL_DEADLINE = "2026-09-18"
ALLOWED_MEASURES = {"opposition", "oposicao"}

FORBIDDEN_TEXT_MARKERS = (
    "PLACEHOLDER",
    "[CLIENT",
    "[MARCA",
    "[DATA",
    "[PREENCHER",
    "[TODO]",
    "MODELO PARA VALIDACAO",
    "MODELO PARA VALIDAÇÃO",
    "DO NOT SEND",
    "SAMPLE FOR REVIEW",
)


class CaseValidationError(ValueError):
    pass


def register_fonts() -> None:
    required = {
        "Poppins": FONT_DIR / "Poppins-Regular.ttf",
        "Poppins-Medium": FONT_DIR / "Poppins-Medium.ttf",
        "Poppins-SemiBold": FONT_DIR / "Poppins-SemiBold.ttf",
        "Poppins-Bold": FONT_DIR / "Poppins-Bold.ttf",
    }
    missing = [str(path) for path in required.values() if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing Apex font assets: " + ", ".join(missing))
    for name, path in required.items():
        if name not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont(name, str(path)))


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def linked(text: str, url: str, color: str = "#1A6581") -> str:
    return f'<link href="{esc(url)}" color="{color}">{esc(text)}</link>'


def paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def require_mapping(value: Any, path: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise CaseValidationError(f"{path} must be an object")
    return value


def require_list(value: Any, path: str) -> list[Any]:
    if not isinstance(value, list):
        raise CaseValidationError(f"{path} must be an array")
    return value


def require_text(value: Any, path: str, *, max_length: int | None = None) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CaseValidationError(f"{path} must be a non-empty string")
    clean = value.strip()
    if max_length is not None and len(clean) > max_length:
        raise CaseValidationError(
            f"{path} exceeds {max_length} characters ({len(clean)})"
        )
    return clean


def require_bool(value: Any, path: str) -> bool:
    if not isinstance(value, bool):
        raise CaseValidationError(f"{path} must be true or false")
    return value


def normalize_digits(value: Any, path: str) -> str:
    text = require_text(str(value), path)
    digits = re.sub(r"\D", "", text)
    if len(digits) < 8:
        raise CaseValidationError(f"{path} does not look like an INPI process number")
    return digits


def parse_iso_date(value: Any, path: str) -> str:
    text = require_text(value, path)
    try:
        date.fromisoformat(text)
    except ValueError as exc:
        raise CaseValidationError(f"{path} must use YYYY-MM-DD") from exc
    return text


def display_date(iso_date: str, language: str) -> str:
    parsed = date.fromisoformat(iso_date)
    if language == "pt-BR":
        return parsed.strftime("%d/%m/%Y")
    months = (
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    )
    return f"{parsed.day:02d} {months[parsed.month - 1]} {parsed.year}"


def normalize_risk(value: Any) -> str:
    text = require_text(value, "risk_level")
    folded = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return folded.lower()


def resolve_image_path(raw: Any, input_dir: Path, path: str) -> str | None:
    if raw in (None, ""):
        return None
    value = Path(require_text(raw, path))
    resolved = value if value.is_absolute() else input_dir / value
    resolved = resolved.resolve()
    if not resolved.is_file():
        raise CaseValidationError(f"{path} does not exist: {resolved}")
    if resolved.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
        raise CaseValidationError(f"{path} must be PNG or JPEG")
    return str(resolved)


def infer_language(country_code: str) -> str:
    return "pt-BR" if country_code.upper() == "BR" else "en"


def local_text(case: dict[str, Any], key: str, language: str, *, max_length: int) -> str:
    narratives = require_mapping(case.get("narrative"), "narrative")
    value = narratives.get(key)
    return require_text(value, f"narrative.{key}", max_length=max_length)


def validate_party(
    raw: Any,
    path: str,
    input_dir: Path,
    *,
    require_country: bool,
) -> dict[str, Any]:
    party = require_mapping(raw, path)
    country_code = require_text(
        party.get("country_code"), f"{path}.country_code", max_length=2
    ).upper()
    if require_country and not re.fullmatch(r"[A-Z]{2}", country_code):
        raise CaseValidationError(f"{path}.country_code must be an ISO alpha-2 code")
    presentation = require_text(
        party.get("presentation"), f"{path}.presentation", max_length=80
    )
    classes = require_list(party.get("classes"), f"{path}.classes")
    if not classes:
        raise CaseValidationError(f"{path}.classes cannot be empty")
    class_labels = [
        require_text(item, f"{path}.classes[{index}]", max_length=50)
        for index, item in enumerate(classes)
    ]
    scope = require_text(
        party.get("relevant_scope"), f"{path}.relevant_scope", max_length=850
    )
    highlights_raw = require_list(
        party.get("collision_highlights", []), f"{path}.collision_highlights"
    )
    if len(highlights_raw) > 12:
        raise CaseValidationError(
            f"{path}.collision_highlights may contain at most 12 items"
        )
    collision_highlights = [
        require_text(
            item,
            f"{path}.collision_highlights[{highlight_index}]",
            max_length=240,
        )
        for highlight_index, item in enumerate(highlights_raw)
    ]
    folded_scope = scope.casefold()
    seen_highlights: set[str] = set()
    for highlight_index, highlight in enumerate(collision_highlights):
        folded_highlight = highlight.casefold()
        if folded_highlight in seen_highlights:
            raise CaseValidationError(
                f"{path}.collision_highlights[{highlight_index}] is duplicated"
            )
        seen_highlights.add(folded_highlight)
        if folded_highlight not in folded_scope:
            raise CaseValidationError(
                f"{path}.collision_highlights[{highlight_index}] must be an exact "
                "excerpt of relevant_scope"
            )
    result = {
        "mark": require_text(party.get("mark"), f"{path}.mark", max_length=180),
        "process_number": normalize_digits(
            party.get("process_number"), f"{path}.process_number"
        ),
        "owner": require_text(party.get("owner"), f"{path}.owner", max_length=240),
        "country_code": country_code,
        "filing_date": parse_iso_date(
            party.get("filing_date"), f"{path}.filing_date"
        ),
        "priority_date": party.get("priority_date"),
        "status": require_text(party.get("status"), f"{path}.status", max_length=180),
        "presentation": presentation,
        "nature": require_text(
            party.get("nature"), f"{path}.nature", max_length=100
        ),
        "classes": class_labels,
        "relevant_scope": scope,
        "collision_highlights": collision_highlights,
        "image_path": resolve_image_path(
            party.get("image_path"), input_dir, f"{path}.image_path"
        ),
        "image_caption": party.get("image_caption"),
        "related_rights": party.get("related_rights", []),
    }
    if result["priority_date"] not in (None, ""):
        result["priority_date"] = parse_iso_date(
            result["priority_date"], f"{path}.priority_date"
        )
    else:
        result["priority_date"] = None
    if result["image_caption"] not in (None, ""):
        result["image_caption"] = require_text(
            result["image_caption"], f"{path}.image_caption", max_length=180
        )
    else:
        result["image_caption"] = None
    related_rights_raw = require_list(
        result["related_rights"], f"{path}.related_rights"
    )
    if len(related_rights_raw) > 6:
        raise CaseValidationError(f"{path}.related_rights may contain at most 6 items")
    result["related_rights"] = [
        require_text(
            item,
            f"{path}.related_rights[{right_index}]",
            max_length=280,
        )
        for right_index, item in enumerate(related_rights_raw)
    ]
    return result


def validate_case(raw: Any, input_dir: Path, index: int) -> dict[str, Any]:
    path = f"cases[{index}]"
    case = require_mapping(raw, path)
    schema_version = require_text(
        case.get("schema_version"), f"{path}.schema_version", max_length=10
    )
    if schema_version not in {"1.0", "1.1"}:
        raise CaseValidationError(
            f"{path}.schema_version must be 1.0 (legacy) or 1.1"
        )
    if normalize_risk(case.get("risk_level")) not in {"alto", "high"}:
        raise CaseValidationError(f"{path}: PDF generation is restricted to high risk")
    gates = require_mapping(case.get("generation_gate"), f"{path}.generation_gate")
    for gate in (
        "analysis_completed_by_apex",
        "event_verified",
        "deadline_confirmed",
        "blocking_flags_resolved",
    ):
        if require_bool(gates.get(gate), f"{path}.generation_gate.{gate}") is not True:
            raise CaseValidationError(f"{path}: generation gate {gate} is not satisfied")
    remaining_flags = require_list(
        gates.get("remaining_flags", []),
        f"{path}.generation_gate.remaining_flags",
    )
    if remaining_flags:
        raise CaseValidationError(f"{path}: remaining blocking flags prevent generation")

    rpi = require_mapping(case.get("rpi"), f"{path}.rpi")
    if rpi.get("number") != EXPECTED_RPI:
        raise CaseValidationError(f"{path}.rpi.number must be {EXPECTED_RPI}")
    publication_date = parse_iso_date(
        rpi.get("publication_date"), f"{path}.rpi.publication_date"
    )
    if publication_date != EXPECTED_RPI_DATE:
        raise CaseValidationError(
            f"{path}.rpi.publication_date must be {EXPECTED_RPI_DATE}"
        )
    rpi_page = rpi.get("page")
    if not isinstance(rpi_page, int) or rpi_page <= 0:
        raise CaseValidationError(f"{path}.rpi.page must be a positive integer")
    dispatch_code = require_text(
        rpi.get("dispatch_code"), f"{path}.rpi.dispatch_code", max_length=40
    )
    dispatch_name = require_text(
        rpi.get("dispatch_name"), f"{path}.rpi.dispatch_name", max_length=220
    )

    deadlines = require_mapping(case.get("deadlines"), f"{path}.deadlines")
    legal_deadline = parse_iso_date(
        deadlines.get("opposition"), f"{path}.deadlines.opposition"
    )
    internal_deadline = parse_iso_date(
        deadlines.get("internal_instruction"),
        f"{path}.deadlines.internal_instruction",
    )
    if legal_deadline != EXPECTED_OPPOSITION_DEADLINE:
        raise CaseValidationError(
            f"{path}.deadlines.opposition must be {EXPECTED_OPPOSITION_DEADLINE}"
        )
    if internal_deadline != EXPECTED_INTERNAL_DEADLINE:
        raise CaseValidationError(
            f"{path}.deadlines.internal_instruction must be "
            f"{EXPECTED_INTERNAL_DEADLINE}"
        )

    measure = require_text(case.get("measure"), f"{path}.measure", max_length=40)
    folded_measure = (
        unicodedata.normalize("NFKD", measure).encode("ascii", "ignore").decode().lower()
    )
    if folded_measure not in ALLOWED_MEASURES:
        raise CaseValidationError(
            f"{path}.measure must be opposition/oposicao for the RPI {EXPECTED_RPI} report"
        )

    client = validate_party(
        case.get("client"), f"{path}.client", input_dir, require_country=True
    )
    third_party = validate_party(
        case.get("third_party"),
        f"{path}.third_party",
        input_dir,
        require_country=True,
    )
    third_party["_rpi_page"] = rpi_page
    third_party["_dispatch_code"] = dispatch_code
    third_party["_dispatch_name"] = dispatch_name
    additional_raw = require_list(
        case.get("additional_third_parties", []),
        f"{path}.additional_third_parties",
    )
    if len(additional_raw) > 1:
        raise CaseValidationError(
            f"{path}: at most one additional third-party process is supported"
        )
    third_parties = [third_party]
    for extra_index, raw_extra in enumerate(additional_raw):
        raw_extra_map = require_mapping(
            raw_extra, f"{path}.additional_third_parties[{extra_index}]"
        )
        extra = validate_party(
            raw_extra,
            f"{path}.additional_third_parties[{extra_index}]",
            input_dir,
            require_country=True,
        )
        extra_page = raw_extra_map.get("rpi_page")
        if not isinstance(extra_page, int) or extra_page <= 0:
            raise CaseValidationError(
                f"{path}.additional_third_parties[{extra_index}].rpi_page "
                "must be a positive integer"
            )
        extra["_rpi_page"] = extra_page
        extra["_dispatch_code"] = require_text(
            raw_extra_map.get("dispatch_code", dispatch_code),
            f"{path}.additional_third_parties[{extra_index}].dispatch_code",
            max_length=40,
        )
        extra["_dispatch_name"] = require_text(
            raw_extra_map.get("dispatch_name", dispatch_name),
            f"{path}.additional_third_parties[{extra_index}].dispatch_name",
            max_length=220,
        )
        third_parties.append(extra)
    if client["process_number"] == third_party["process_number"]:
        raise CaseValidationError(f"{path}: client and third-party processes are equal")
    third_processes = [party["process_number"] for party in third_parties]
    if len(set(third_processes)) != len(third_processes):
        raise CaseValidationError(f"{path}: duplicate third-party process")
    if schema_version == "1.1":
        parties_to_check = [("client", client)] + [
            (f"third_parties[{party_index}]", party)
            for party_index, party in enumerate(third_parties)
        ]
        for party_path, party in parties_to_check:
            if not party["collision_highlights"]:
                raise CaseValidationError(
                    f"{path}.{party_path}.collision_highlights is required and "
                    "cannot be empty for schema 1.1"
                )

    expected_language = infer_language(client["country_code"])
    requested_language = case.get("language", "auto")
    if requested_language == "auto":
        language = expected_language
    else:
        language = require_text(requested_language, f"{path}.language")
        if language not in {"pt-BR", "en"}:
            raise CaseValidationError(f"{path}.language must be auto, pt-BR or en")
        if language != expected_language:
            raise CaseValidationError(
                f"{path}.language must be {expected_language} for client country "
                f"{client['country_code']}"
            )

    analysis = require_mapping(case.get("analysis"), f"{path}.analysis")
    dimensions_raw = require_list(
        analysis.get("dimensions"), f"{path}.analysis.dimensions"
    )
    if not 4 <= len(dimensions_raw) <= 7:
        raise CaseValidationError(
            f"{path}.analysis.dimensions must contain 4 to 7 dimensions"
        )
    dimensions = []
    for dim_index, raw_dimension in enumerate(dimensions_raw):
        dimension = require_mapping(
            raw_dimension, f"{path}.analysis.dimensions[{dim_index}]"
        )
        dimensions.append(
            {
                "label": require_text(
                    dimension.get("label"),
                    f"{path}.analysis.dimensions[{dim_index}].label",
                    max_length=80,
                ),
                "assessment": require_text(
                    dimension.get("assessment"),
                    f"{path}.analysis.dimensions[{dim_index}].assessment",
                    max_length=70,
                ),
                "rationale": require_text(
                    dimension.get("rationale"),
                    f"{path}.analysis.dimensions[{dim_index}].rationale",
                    max_length=420,
                ),
            }
        )

    analysis_points_raw = require_list(
        analysis.get("points"), f"{path}.analysis.points"
    )
    if not 2 <= len(analysis_points_raw) <= 4:
        raise CaseValidationError(f"{path}.analysis.points must contain 2 to 4 items")
    analysis_points = [
        require_text(
            item,
            f"{path}.analysis.points[{point_index}]",
            max_length=820,
        )
        for point_index, item in enumerate(analysis_points_raw)
    ]

    legal = require_mapping(case.get("legal"), f"{path}.legal")
    articles = require_list(legal.get("articles"), f"{path}.legal.articles")
    article_codes = {
        require_text(item, f"{path}.legal.articles[{article_index}]", max_length=30)
        .upper()
        .replace(" ", "")
        for article_index, item in enumerate(articles)
    }
    required_articles = {"124,XIX", "129", "158"}
    if not required_articles.issubset(article_codes):
        raise CaseValidationError(
            f"{path}.legal.articles must include 124, XIX; 129; and 158"
        )
    legal_notes_raw = require_list(
        legal.get("case_specific_notes", []),
        f"{path}.legal.case_specific_notes",
    )
    if len(legal_notes_raw) > 3:
        raise CaseValidationError(
            f"{path}.legal.case_specific_notes may contain at most 3 items"
        )
    legal_notes = [
        require_text(
            item,
            f"{path}.legal.case_specific_notes[{note_index}]",
            max_length=700,
        )
        for note_index, item in enumerate(legal_notes_raw)
    ]

    evidence_raw = require_list(case.get("evidence", []), f"{path}.evidence")
    if len(evidence_raw) > 8:
        raise CaseValidationError(f"{path}.evidence may contain at most 8 items")
    evidence = [
        require_text(item, f"{path}.evidence[{item_index}]", max_length=600)
        for item_index, item in enumerate(evidence_raw)
    ]
    limitations_raw = require_list(
        case.get("limitations", []), f"{path}.limitations"
    )
    if len(limitations_raw) > 6:
        raise CaseValidationError(f"{path}.limitations may contain at most 6 items")
    limitations = [
        require_text(item, f"{path}.limitations[{item_index}]", max_length=600)
        for item_index, item in enumerate(limitations_raw)
    ]

    result = {
        "schema_version": schema_version,
        "case_id": require_text(case.get("case_id"), f"{path}.case_id", max_length=120),
        "report_date": parse_iso_date(
            case.get("report_date"), f"{path}.report_date"
        ),
        "language": language,
        "risk_level": "high",
        "measure": "opposition",
        "rpi": {
            "number": EXPECTED_RPI,
            "publication_date": publication_date,
            "page": rpi_page,
            "dispatch_code": dispatch_code,
            "dispatch_name": dispatch_name,
            "official_pdf_url": RPI_URL,
        },
        "deadlines": {
            "opposition": legal_deadline,
            "internal_instruction": internal_deadline,
        },
        "client": client,
        "third_party": third_party,
        "third_parties": third_parties,
        "analysis": {
            "dimensions": dimensions,
            "points": analysis_points,
            "conclusion": require_text(
                analysis.get("conclusion"),
                f"{path}.analysis.conclusion",
                max_length=1000,
            ),
            "confidence": require_text(
                analysis.get("confidence"),
                f"{path}.analysis.confidence",
                max_length=80,
            ),
        },
        "legal": {
            "articles": sorted(article_codes),
            "case_specific_notes": legal_notes,
        },
        "evidence": evidence,
        "limitations": limitations,
        "narrative": {
            "recipient_salutation": local_text(
                case, "recipient_salutation", language, max_length=180
            ),
            "intro": local_text(case, "intro", language, max_length=1200),
            "recommendation": local_text(
                case, "recommendation", language, max_length=1100
            ),
            "action_request": local_text(
                case, "action_request", language, max_length=1000
            ),
        },
    }
    assert_no_forbidden_markers(result, f"{path}")
    return result


def assert_no_forbidden_markers(value: Any, path: str) -> None:
    serialized = json.dumps(value, ensure_ascii=False)
    upper = serialized.upper()
    for marker in FORBIDDEN_TEXT_MARKERS:
        if marker.upper() in upper:
            raise CaseValidationError(f"{path}: forbidden marker found: {marker}")
    if "None" in serialized:
        raise CaseValidationError(f"{path}: unresolved None text found")


def load_cases(input_path: Path) -> list[dict[str, Any]]:
    try:
        payload = json.loads(input_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise CaseValidationError(f"Invalid JSON: {exc}") from exc
    raw_cases = payload.get("cases") if isinstance(payload, dict) else payload
    cases = require_list(raw_cases, "cases")
    if not cases:
        raise CaseValidationError("cases cannot be empty")
    validated = [
        validate_case(raw_case, input_path.parent.resolve(), index)
        for index, raw_case in enumerate(cases)
    ]
    third_processes = [
        party["process_number"]
        for case in validated
        for party in case["third_parties"]
    ]
    if len(set(third_processes)) != len(third_processes):
        raise CaseValidationError(
            "Each third-party process must appear once: one PDF per conflicting process"
        )
    return validated


def make_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=styles["Title"],
            fontName="Poppins-SemiBold",
            fontSize=16.8,
            leading=20,
            textColor=BRAND_DARK,
            alignment=TA_LEFT,
            spaceAfter=2.4 * mm,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=styles["Normal"],
            fontName="Poppins-Medium",
            fontSize=8.5,
            leading=11,
            textColor=BRAND_TEAL,
            spaceAfter=3.5 * mm,
        ),
        "recipient": ParagraphStyle(
            "recipient",
            parent=styles["Normal"],
            fontName="Poppins-SemiBold",
            fontSize=9,
            leading=12,
            textColor=BRAND_DARK,
            spaceAfter=2 * mm,
        ),
        "body": ParagraphStyle(
            "body",
            parent=styles["BodyText"],
            fontName="Poppins",
            fontSize=8.3,
            leading=11.8,
            textColor=BRAND_DARK,
            alignment=TA_LEFT,
            spaceAfter=2.4 * mm,
        ),
        "body_small": ParagraphStyle(
            "body_small",
            parent=styles["BodyText"],
            fontName="Poppins",
            fontSize=7.15,
            leading=10,
            textColor=BRAND_DARK,
            alignment=TA_LEFT,
        ),
        "scope_highlight": ParagraphStyle(
            "scope_highlight",
            parent=styles["BodyText"],
            fontName="Poppins",
            fontSize=7.15,
            leading=10,
            textColor=BRAND_DARK,
            alignment=TA_LEFT,
            backColor=colors.HexColor("#EAF8FB"),
            borderColor=BRAND_CYAN,
            borderWidth=0.55,
            borderPadding=4.5,
            spaceBefore=1.8 * mm,
        ),
        "scope_content": ParagraphStyle(
            "scope_content",
            parent=styles["BodyText"],
            fontName="Poppins",
            fontSize=7.15,
            leading=10,
            textColor=BRAND_DARK,
            alignment=TA_LEFT,
        ),
        "fine": ParagraphStyle(
            "fine",
            parent=styles["BodyText"],
            fontName="Poppins",
            fontSize=6.35,
            leading=8.6,
            textColor=TEXT_MUTED,
            alignment=TA_LEFT,
        ),
        "section": ParagraphStyle(
            "section",
            parent=styles["Heading2"],
            fontName="Poppins-SemiBold",
            fontSize=11.2,
            leading=14,
            textColor=BRAND_DARK,
            spaceBefore=0.6 * mm,
            spaceAfter=1.5 * mm,
        ),
        "table_header": ParagraphStyle(
            "table_header",
            parent=styles["Normal"],
            fontName="Poppins-SemiBold",
            fontSize=8.4,
            leading=10.3,
            textColor=WHITE,
            alignment=TA_CENTER,
        ),
        "mark_name": ParagraphStyle(
            "mark_name",
            parent=styles["Normal"],
            fontName="Poppins-SemiBold",
            fontSize=12.5,
            leading=15.5,
            textColor=BRAND_DARK,
            alignment=TA_CENTER,
        ),
        "mark_caption": ParagraphStyle(
            "mark_caption",
            parent=styles["Normal"],
            fontName="Poppins",
            fontSize=6.2,
            leading=7.8,
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
        ),
        "field": ParagraphStyle(
            "field",
            parent=styles["Normal"],
            fontName="Poppins",
            fontSize=7.05,
            leading=9.5,
            textColor=BRAND_DARK,
            alignment=TA_LEFT,
            spaceAfter=1.05 * mm,
        ),
        "box_value": ParagraphStyle(
            "box_value",
            parent=styles["Normal"],
            fontName="Poppins-SemiBold",
            fontSize=8.65,
            leading=10.8,
            textColor=WHITE,
            alignment=TA_CENTER,
        ),
        "box_label": ParagraphStyle(
            "box_label",
            parent=styles["Normal"],
            fontName="Poppins",
            fontSize=5.95,
            leading=7.3,
            textColor=colors.HexColor("#BFD0D5"),
            alignment=TA_CENTER,
        ),
        "dimension": ParagraphStyle(
            "dimension",
            parent=styles["Normal"],
            fontName="Poppins-SemiBold",
            fontSize=6.9,
            leading=9.2,
            textColor=BRAND_DARK,
        ),
        "dimension_text": ParagraphStyle(
            "dimension_text",
            parent=styles["Normal"],
            fontName="Poppins",
            fontSize=6.7,
            leading=9.1,
            textColor=BRAND_DARK,
        ),
        "box_heading": ParagraphStyle(
            "box_heading",
            parent=styles["Normal"],
            fontName="Poppins-SemiBold",
            fontSize=8.9,
            leading=10.8,
            textColor=BRAND_DARK,
            spaceAfter=1.6 * mm,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=styles["BodyText"],
            fontName="Poppins",
            fontSize=7.1,
            leading=10,
            leftIndent=3.5 * mm,
            firstLineIndent=-2.5 * mm,
            textColor=BRAND_DARK,
            bulletIndent=0,
            spaceAfter=1.3 * mm,
        ),
    }


class SectionRule(Flowable):
    def __init__(self, width: float, height: float = 2.4):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        self.canv.setFillColor(BRAND_CYAN)
        self.canv.roundRect(0, 0, self.width, self.height, 1.2, fill=1, stroke=0)


class ClientReportDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, document_code: str, language: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=MARGIN_X,
            rightMargin=MARGIN_X,
            topMargin=HEADER_H + 7 * mm,
            bottomMargin=FOOTER_H + 7 * mm,
            title=document_code,
            author=(
                "Apex Intellectual Property"
                if language == "en"
                else "Apex Marcas e Patentes"
            ),
            subject=(
                "Trademark monitoring report"
                if language == "en"
                else "Relatório de monitoramento marcário"
            ),
        )
        self.document_code = document_code
        self.language = language
        frame = Frame(
            MARGIN_X,
            FOOTER_H + 5 * mm,
            PAGE_W - 2 * MARGIN_X,
            PAGE_H - HEADER_H - FOOTER_H - 12 * mm,
            id="body",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        self.addPageTemplates(
            [
                PageTemplate(
                    id="client-report",
                    frames=[frame],
                    onPage=self._draw_header,
                    onPageEnd=self._draw_footer,
                )
            ]
        )

    def _draw_header(self, canvas, _doc) -> None:
        logo_path = BRAND_ASSET_DIR / (
            "apex_intellectual_property.png"
            if self.language == "en"
            else "apex_marcas_patentes.jpg"
        )
        if not logo_path.exists():
            raise FileNotFoundError(f"Missing Apex logo: {logo_path}")
        canvas.saveState()
        canvas.drawImage(
            str(logo_path),
            MARGIN_X,
            PAGE_H - 20 * mm,
            width=47 * mm,
            height=14.5 * mm,
            preserveAspectRatio=True,
            anchor="sw",
        )
        canvas.setFont("Poppins-Medium", 6.6)
        canvas.setFillColor(TEXT_MUTED)
        canvas.drawRightString(
            PAGE_W - MARGIN_X,
            PAGE_H - 13.4 * mm,
            self.document_code,
        )
        canvas.setFillColor(BRAND_CYAN)
        canvas.rect(
            MARGIN_X,
            PAGE_H - 23.2 * mm,
            PAGE_W - 2 * MARGIN_X,
            1.5,
            fill=1,
            stroke=0,
        )
        canvas.restoreState()

    def _draw_footer(self, canvas, doc) -> None:
        canvas.saveState()
        canvas.setStrokeColor(BRAND_MID)
        canvas.setLineWidth(0.6)
        canvas.line(MARGIN_X, 13 * mm, PAGE_W - MARGIN_X, 13 * mm)
        canvas.setFont("Poppins", 6.2)
        canvas.setFillColor(TEXT_MUTED)
        confidential = (
            "Confidential document" if self.language == "en" else "Documento confidencial"
        )
        page_label = "Page" if self.language == "en" else "Página"
        canvas.drawString(MARGIN_X, 8.5 * mm, confidential)
        canvas.drawCentredString(
            PAGE_W / 2, 8.5 * mm, "www.apexip.com  |  info@apexip.com"
        )
        canvas.drawRightString(
            PAGE_W - MARGIN_X, 8.5 * mm, f"{page_label} {doc.page}"
        )
        canvas.restoreState()


LABELS = {
    "pt-BR": {
        "title": "RELATÓRIO DE MONITORAMENTO MARCÁRIO",
        "subtitle": "Potencial colidência - classificação Apex: risco alto",
        "risk_heading": "CLASSIFICAÇÃO APEX",
        "risk_value": "RISCO ALTO",
        "measure_heading": "MEDIDA POTENCIAL",
        "measure_value": "OPOSIÇÃO",
        "legal_deadline_heading": "PRAZO DE OPOSIÇÃO",
        "internal_deadline_heading": "PRAZO INTERNO",
        "comparison_title": "Comparativo das marcas",
        "client_header": "Marca monitorada do cliente",
        "third_header": "Pedido de terceiro",
        "process": "Processo",
        "mark": "Marca",
        "owner": "Titular",
        "filing": "Data de depósito",
        "priority": "Prioridade",
        "status": "Situação",
        "presentation": "Apresentação",
        "nature": "Natureza",
        "classes": "Classe(s)",
        "scope": "Produtos e serviços relevantes",
        "scope_highlight": "Especificações colidentes em destaque",
        "related_rights": "Direitos relacionados da família",
        "no_priority": "Não informada",
        "mixed_caption": "Imagem constante da base ou da publicação oficial",
        "word_caption": "Marca sem imagem disponível - representação nominativa",
        "source_note": "Fonte do pedido de terceiro",
        "rpi_name": "RPI 2899, de 28/07/2026",
        "page": "página",
        "analysis_title": "ANÁLISE TÉCNICO-JURÍDICA",
        "analysis_subtitle": "Risco de confusão, associação ou aproveitamento indevido",
        "dimension": "DIMENSÃO",
        "assessment": "AVALIAÇÃO",
        "rationale": "FUNDAMENTO PRINCIPAL",
        "conclusion_heading": "Conclusão da análise",
        "confidence": "Confiança da análise",
        "legal_heading": "Fundamento jurídico preliminar",
        "recommendation_heading": "Recomendação Apex",
        "deadlines_heading": "Prazos para decisão",
        "legal_deadline_label": "Prazo de oposição",
        "internal_deadline_label": "Prazo interno para instruções",
        "deadline_note": (
            "O período legal de 60 dias recai em 26/09/2026, sábado. A data "
            "operacional indicada é 28/09/2026 e deverá ser confirmada no "
            "sistema e no calendário oficial do INPI antes do protocolo."
        ),
        "notice_heading": "Nota importante",
        "notice": (
            "Este relatório foi elaborado pela Apex com base nos dados públicos "
            "disponíveis na data de sua emissão e em sua metodologia interna de "
            "monitoramento marcário. A classificação é preliminar, não representa "
            "decisão do INPI e não garante o êxito de eventual medida. Antes de "
            "qualquer protocolo, dados processuais, prazo, estratégia e documentos "
            "deverão ser confirmados nas fontes oficiais. Nenhuma medida será "
            "protocolada sem instrução expressa do cliente."
        ),
        "sources": "Fontes oficiais",
        "law": "Lei nº 9.279/1996",
        "manual": "Manual de Marcas do INPI",
        "opposition": "Serviço oficial de oposição",
        "evidence_title": "EVIDÊNCIAS E LIMITAÇÕES",
        "evidence_subtitle": "Elementos considerados na classificação",
        "evidence_heading": "Evidências registradas",
        "limitations_heading": "Limitações e ressalvas",
        "no_limitations": "Não foram registradas limitações materiais pendentes.",
    },
    "en": {
        "title": "TRADEMARK MONITORING REPORT",
        "subtitle": "Potential conflict - Apex classification: high risk",
        "risk_heading": "APEX CLASSIFICATION",
        "risk_value": "HIGH RISK",
        "measure_heading": "POTENTIAL MEASURE",
        "measure_value": "OPPOSITION",
        "legal_deadline_heading": "OPPOSITION DEADLINE",
        "internal_deadline_heading": "INTERNAL DEADLINE",
        "comparison_title": "Possible Trademark Infringement",
        "client_header": "Client's monitored trademark",
        "third_header": "Third-party application",
        "process": "Application/registration",
        "mark": "Trademark",
        "owner": "Owner/applicant",
        "filing": "Filing date",
        "priority": "Priority",
        "status": "Status",
        "presentation": "Presentation",
        "nature": "Nature",
        "classes": "Class(es)",
        "scope": "Relevant goods and services",
        "scope_highlight": "Conflicting goods and services highlighted",
        "related_rights": "Related family rights",
        "no_priority": "Not informed",
        "mixed_caption": "Image from the Apex database or official publication",
        "word_caption": "No image available - word representation",
        "source_note": "Source for the third-party application",
        "rpi_name": "Brazilian IP Gazette No. 2899, dated 28 Jul 2026",
        "page": "page",
        "analysis_title": "TECHNICAL AND LEGAL ASSESSMENT",
        "analysis_subtitle": "Likelihood of confusion, association or unfair advantage",
        "dimension": "DIMENSION",
        "assessment": "ASSESSMENT",
        "rationale": "MAIN RATIONALE",
        "conclusion_heading": "Assessment conclusion",
        "confidence": "Assessment confidence",
        "legal_heading": "Preliminary legal basis",
        "recommendation_heading": "Apex recommendation",
        "deadlines_heading": "Decision deadlines",
        "legal_deadline_label": "Opposition deadline",
        "internal_deadline_label": "Internal instruction deadline",
        "deadline_note": (
            "The statutory 60-day period falls on Saturday, 26 Sep 2026. The "
            "operational date indicated is 28 Sep 2026 and must be confirmed "
            "against the INPI system and official calendar before filing."
        ),
        "notice_heading": "Important notice",
        "notice": (
            "This report was prepared by Apex based on publicly available information "
            "as of its issue date and Apex's internal trademark monitoring methodology. "
            "The assessment is preliminary, does not "
            "represent an INPI decision and does not guarantee the outcome of any "
            "measure. Before any filing, procedural data, deadlines, strategy and "
            "supporting documents must be confirmed against official sources. No "
            "measure will be filed without the client's express instructions. "
            "Official Portuguese-language records prevail."
        ),
        "sources": "Official sources",
        "law": "Brazilian Industrial Property Law No. 9,279/1996",
        "manual": "INPI Trademark Manual",
        "opposition": "Official opposition service",
        "evidence_title": "EVIDENCE AND LIMITATIONS",
        "evidence_subtitle": "Elements considered in the classification",
        "evidence_heading": "Recorded evidence",
        "limitations_heading": "Limitations and qualifications",
        "no_limitations": "No material unresolved limitation was recorded.",
    },
}


def image_flow(path: str, width: float, height: float) -> Image:
    with PILImage.open(path) as source:
        rgba = source.convert("RGBA")
        white_rgba = PILImage.new("RGBA", rgba.size, (255, 255, 255, 255))
        flattened = PILImage.alpha_composite(white_rgba, rgba).convert("RGB")
        white_rgb = PILImage.new("RGB", flattened.size, "white")
        difference = ImageChops.difference(flattened, white_rgb).convert("L")
        visible = difference.point(lambda value: 255 if value > 12 else 0)
        bounds = visible.getbbox()
        if bounds:
            left, top, right, bottom = bounds
            padding = max(2, min(flattened.size) // 60)
            bounds = (
                max(0, left - padding),
                max(0, top - padding),
                min(flattened.width, right + padding),
                min(flattened.height, bottom + padding),
            )
            flattened = flattened.crop(bounds)
        buffer = io.BytesIO()
        flattened.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)
    image = Image(buffer)
    image._source_buffer = buffer
    image._restrictSize(width, height)
    return image


def mark_visual(
    party: dict[str, Any], styles: dict[str, ParagraphStyle], labels: dict[str, str]
) -> list[Flowable]:
    caption = party["image_caption"] or (
        labels["mixed_caption"] if party["image_path"] else labels["word_caption"]
    )
    if party["image_path"]:
        return [
            Spacer(1, 0.8 * mm),
            image_flow(party["image_path"], 51 * mm, 26 * mm),
            Spacer(1, 1.1 * mm),
            paragraph(esc(caption), styles["mark_caption"]),
        ]
    return [
        Spacer(1, 4.2 * mm),
        paragraph(esc(party["mark"]), styles["mark_name"]),
        Spacer(1, 2.8 * mm),
        paragraph(esc(caption), styles["mark_caption"]),
    ]


def field_line(label: str, value: str, style: ParagraphStyle) -> Paragraph:
    return paragraph(f"<b>{esc(label)}:</b> {esc(value)}", style)


def highlighted_scope_markup(
    party: dict[str, Any], labels: dict[str, str]
) -> str:
    scope = party["relevant_scope"]
    highlights = party["collision_highlights"]
    if not highlights:
        emphasized_scope = (
            f'<font color="#1A6581"><b>{esc(scope)}</b></font>'
        )
    else:
        pattern = re.compile(
            "|".join(
                re.escape(item)
                for item in sorted(highlights, key=len, reverse=True)
            ),
            flags=re.IGNORECASE,
        )
        parts: list[str] = []
        cursor = 0
        for match in pattern.finditer(scope):
            parts.append(esc(scope[cursor : match.start()]))
            parts.append(
                '<font color="#1A6581"><b>'
                + esc(match.group(0))
                + "</b></font>"
            )
            cursor = match.end()
        parts.append(esc(scope[cursor:]))
        emphasized_scope = "".join(parts)
    return (
        f'<font color="#1A6581"><b>{esc(labels["scope_highlight"])}</b></font>'
        f"<br/><b>{esc(labels['scope'])}:</b><br/>{emphasized_scope}"
    )


def comparison_cell(
    party: dict[str, Any],
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    language: str,
) -> list[Flowable]:
    fields = [
        (labels["mark"], party["mark"]),
        (labels["process"], party["process_number"]),
        (labels["owner"], party["owner"]),
        (labels["filing"], display_date(party["filing_date"], language)),
        (
            labels["priority"],
            display_date(party["priority_date"], language)
            if party["priority_date"]
            else labels["no_priority"],
        ),
        (labels["status"], party["status"]),
        (labels["presentation"], party["presentation"]),
        (labels["nature"], party["nature"]),
        (labels["classes"], ", ".join(party["classes"])),
    ]
    flows: list[Flowable] = []
    flows.extend(mark_visual(party, styles, labels))
    flows.append(Spacer(1, 2.4 * mm))
    for label, value in fields:
        flows.append(field_line(label, value, styles["field"]))
    if party["related_rights"]:
        flows.append(
            paragraph(
                f"<b>{esc(labels['related_rights'])}:</b><br/>"
                + "<br/>".join(esc(item) for item in party["related_rights"]),
                styles["field"],
            )
        )
    flows.append(
        paragraph(
            highlighted_scope_markup(party, labels),
            styles["scope_highlight"],
        )
    )
    return flows


def comparison_visual_panel(
    party: dict[str, Any],
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    panel_width: float,
) -> Table:
    caption = party["image_caption"] or (
        labels["mixed_caption"] if party["image_path"] else labels["word_caption"]
    )
    if party["image_path"]:
        content: list[Flowable] = [
            image_flow(party["image_path"], 47 * mm, 14 * mm),
            Spacer(1, 1.6 * mm),
            paragraph(esc(caption), styles["mark_caption"]),
        ]
    else:
        content = [
            paragraph(esc(party["mark"]), styles["mark_name"]),
            Spacer(1, 1.6 * mm),
            paragraph(esc(caption), styles["mark_caption"]),
        ]
    panel = Table(
        [[content]],
        colWidths=[panel_width],
        rowHeights=[27 * mm],
    )
    panel.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return panel


def comparison_details_cell(
    party: dict[str, Any],
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    language: str,
) -> list[Flowable]:
    fields = [
        (labels["mark"], party["mark"]),
        (labels["process"], party["process_number"]),
        (labels["owner"], party["owner"]),
        (labels["filing"], display_date(party["filing_date"], language)),
        (
            labels["priority"],
            display_date(party["priority_date"], language)
            if party["priority_date"]
            else labels["no_priority"],
        ),
        (labels["status"], party["status"]),
        (labels["presentation"], party["presentation"]),
        (labels["nature"], party["nature"]),
        (labels["classes"], ", ".join(party["classes"])),
    ]
    flows = [
        field_line(label, value, styles["field"])
        for label, value in fields
    ]
    if party["related_rights"]:
        flows.append(
            paragraph(
                f"<b>{esc(labels['related_rights'])}:</b><br/>"
                + "<br/>".join(esc(item) for item in party["related_rights"]),
                styles["field"],
            )
        )
    return flows


def comparison_scope_cell(
    party: dict[str, Any],
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
) -> Paragraph:
    return paragraph(
        highlighted_scope_markup(party, labels),
        styles["scope_content"],
    )


def compact_comparison_cell(
    party: dict[str, Any],
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    language: str,
) -> list[Flowable]:
    fields = [
        (labels["mark"], party["mark"]),
        (labels["process"], party["process_number"]),
        (labels["owner"], party["owner"]),
        (labels["filing"], display_date(party["filing_date"], language)),
        (labels["status"], party["status"]),
        (labels["classes"], ", ".join(party["classes"])),
    ]
    flows: list[Flowable] = []
    caption = party["image_caption"] or (
        labels["mixed_caption"] if party["image_path"] else labels["word_caption"]
    )
    if party["image_path"]:
        flows.extend(
            [
                image_flow(party["image_path"], 42 * mm, 19 * mm),
                Spacer(1, 0.8 * mm),
                paragraph(esc(caption), styles["mark_caption"]),
            ]
        )
    else:
        flows.extend(
            [
                Spacer(1, 3 * mm),
                paragraph(esc(party["mark"]), styles["mark_name"]),
                Spacer(1, 1.8 * mm),
                paragraph(esc(caption), styles["mark_caption"]),
            ]
        )
    flows.append(Spacer(1, 1.6 * mm))
    for label, value in fields:
        flows.append(field_line(label, value, styles["field"]))
    if party["related_rights"]:
        flows.append(
            paragraph(
                f"<b>{esc(labels['related_rights'])}:</b><br/>"
                + "<br/>".join(esc(item) for item in party["related_rights"]),
                styles["field"],
            )
        )
    flows.append(
        paragraph(
            highlighted_scope_markup(party, labels),
            styles["scope_highlight"],
        )
    )
    return flows


def consolidated_comparison_table(
    case: dict[str, Any],
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
) -> Table:
    thirds = case["third_parties"]
    width = (PAGE_W - 2 * MARGIN_X) / 3
    headers = [
        labels["client_header"],
        f"{labels['third_header']} - {thirds[0]['process_number']}",
        f"{labels['third_header']} - {thirds[1]['process_number']}",
    ]
    rows = [
        [paragraph(esc(item), styles["table_header"]) for item in headers],
        [
            compact_comparison_cell(
                case["client"], styles, labels, case["language"]
            ),
            compact_comparison_cell(thirds[0], styles, labels, case["language"]),
            compact_comparison_cell(thirds[1], styles, labels, case["language"]),
        ],
    ]
    table = Table(rows, colWidths=[width] * 3, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_TEAL),
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_MID),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BRAND_MID),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                ("ALIGN", (0, 1), (-1, 1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 1), (-1, 1), 6),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 7),
                ("BACKGROUND", (0, 1), (-1, 1), WHITE),
            ]
        )
    )
    return table


def summary_table(
    case: dict[str, Any], styles: dict[str, ParagraphStyle], labels: dict[str, str]
) -> Table:
    language = case["language"]
    items = [
        (labels["risk_heading"], labels["risk_value"]),
        (labels["measure_heading"], labels["measure_value"]),
        (
            labels["legal_deadline_heading"],
            display_date(case["deadlines"]["opposition"], language),
        ),
        (
            labels["internal_deadline_heading"],
            display_date(case["deadlines"]["internal_instruction"], language),
        ),
    ]
    cells = []
    for heading, value in items:
        cells.append(
            [
                paragraph(esc(heading), styles["box_label"]),
                Spacer(1, 0.6 * mm),
                paragraph(esc(value), styles["box_value"]),
            ]
        )
    width = (PAGE_W - 2 * MARGIN_X) / 4
    table = Table([cells], colWidths=[width] * 4)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BRAND_DARK),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                (
                    "LINEAFTER",
                    (0, 0),
                    (2, 0),
                    0.55,
                    colors.HexColor("#4B5559"),
                ),
            ]
        )
    )
    return table


def comparison_table(
    case: dict[str, Any],
    styles: dict[str, ParagraphStyle],
    labels: dict[str, str],
    third_party: dict[str, Any],
) -> Table:
    width = (PAGE_W - 2 * MARGIN_X) / 2
    inner_width = width - 16
    rows = [
        [
            paragraph(esc(labels["client_header"]), styles["table_header"]),
            paragraph(esc(labels["third_header"]), styles["table_header"]),
        ],
        [
            comparison_visual_panel(
                case["client"], styles, labels, inner_width
            ),
            comparison_visual_panel(
                third_party, styles, labels, inner_width
            ),
        ],
        [
            comparison_details_cell(
                case["client"], styles, labels, case["language"]
            ),
            comparison_details_cell(
                third_party, styles, labels, case["language"]
            ),
        ],
        [
            comparison_scope_cell(
                case["client"], styles, labels
            ),
            comparison_scope_cell(
                third_party, styles, labels
            ),
        ],
    ]
    table = Table(rows, colWidths=[width, width], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_TEAL),
                ("BOX", (0, 0), (-1, -1), 0.8, BRAND_MID),
                ("INNERGRID", (0, 0), (-1, 2), 0.5, BRAND_MID),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                ("ALIGN", (0, 1), (-1, 1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 7),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
                ("TOPPADDING", (0, 1), (-1, 1), 2),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 2),
                ("TOPPADDING", (0, 2), (-1, 2), 5),
                ("BOTTOMPADDING", (0, 2), (-1, 2), 4),
                ("TOPPADDING", (0, 3), (-1, 3), 6),
                ("BOTTOMPADDING", (0, 3), (-1, 3), 6),
                ("BACKGROUND", (0, 1), (-1, 2), WHITE),
                ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#EAF8FB")),
                ("BOX", (0, 3), (-1, 3), 0.65, BRAND_CYAN),
                ("INNERGRID", (0, 3), (-1, 3), 0.65, BRAND_CYAN),
            ]
        )
    )
    return table


def dimension_table(
    case: dict[str, Any], styles: dict[str, ParagraphStyle], labels: dict[str, str]
) -> Table:
    rows: list[list[Flowable]] = [
        [
            paragraph(esc(labels["dimension"]), styles["table_header"]),
            paragraph(esc(labels["assessment"]), styles["table_header"]),
            paragraph(esc(labels["rationale"]), styles["table_header"]),
        ]
    ]
    for item in case["analysis"]["dimensions"]:
        rows.append(
            [
                paragraph(esc(item["label"]), styles["dimension"]),
                paragraph(f"<b>{esc(item['assessment'])}</b>", styles["dimension_text"]),
                paragraph(esc(item["rationale"]), styles["dimension_text"]),
            ]
        )
    table = Table(
        rows,
        colWidths=[34 * mm, 33 * mm, PAGE_W - 2 * MARGIN_X - 67 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_TEAL),
                ("BOX", (0, 0), (-1, -1), 0.7, BRAND_MID),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, BRAND_MID),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, BRAND_LIGHT]),
            ]
        )
    )
    return table


def content_box(
    heading: str,
    paragraphs: Iterable[str],
    styles: dict[str, ParagraphStyle],
    *,
    background=BRAND_LIGHT,
    border=BRAND_TEAL,
) -> Table:
    flows: list[Flowable] = [paragraph(esc(heading), styles["box_heading"])]
    for text in paragraphs:
        flows.append(paragraph(text, styles["body_small"]))
        flows.append(Spacer(1, 1.1 * mm))
    table = Table([[flows]], colWidths=[PAGE_W - 2 * MARGIN_X])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.8, border),
                ("LINEBEFORE", (0, 0), (0, -1), 3.2, BRAND_CYAN),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def legal_paragraphs(language: str, case_notes: list[str]) -> list[str]:
    if language == "pt-BR":
        base = [
            (
                "O <b>art. 124, XIX, da Lei nº 9.279/1996</b> impede o registro "
                "de reprodução ou imitação de marca alheia registrada para produto "
                "ou serviço idêntico, semelhante ou afim, quando houver "
                "suscetibilidade de confusão ou associação."
            ),
            (
                "O <b>art. 129</b> assegura ao titular da marca validamente "
                "registrada a propriedade e o uso exclusivo em todo o território "
                "nacional, sem prejuízo das particularidades da anterioridade e "
                "do status de cada processo."
            ),
            (
                "O <b>art. 158</b> prevê a apresentação de oposição no prazo de "
                "60 dias contado da publicação. O cotejo considera o conjunto dos "
                "sinais, os elementos dominantes e a afinidade mercadológica, em "
                "linha com o Manual de Marcas do INPI."
            ),
        ]
    else:
        base = [
            (
                "<b>Article 124, XIX of Brazilian Industrial Property Law "
                "No. 9,279/1996</b> bars the registration of a reproduction or "
                "imitation of an earlier registered trademark for identical, "
                "similar or related goods or services where confusion or "
                "association may arise."
            ),
            (
                "<b>Article 129</b> grants the owner of a validly registered "
                "trademark ownership and exclusive use throughout Brazil, subject "
                "to the particular priority and procedural status of each case."
            ),
            (
                "<b>Article 158</b> provides a 60-day period for filing an "
                "opposition following publication. The comparison considers the "
                "signs as a whole, their dominant elements and commercial affinity, "
                "consistently with the INPI Trademark Manual."
            ),
        ]
    base.extend(esc(note) for note in case_notes)
    return base


def source_links(language: str) -> str:
    labels = LABELS[language]
    return (
        f"<b>{esc(labels['sources'])}:</b> "
        + linked(labels["law"], LAW_URL)
        + " | "
        + linked(labels["manual"], MANUAL_URL)
        + " | "
        + linked(labels["opposition"], OPPOSITION_URL)
    )


def build_story(
    case: dict[str, Any], styles: dict[str, ParagraphStyle]
) -> list[Flowable]:
    labels = LABELS[case["language"]]
    usable_width = PAGE_W - 2 * MARGIN_X
    story: list[Flowable] = []

    story.append(paragraph(labels["title"], styles["title"]))
    story.append(paragraph(labels["subtitle"], styles["subtitle"]))
    story.append(SectionRule(usable_width))
    story.append(Spacer(1, 3.5 * mm))
    story.append(
        paragraph(esc(case["narrative"]["recipient_salutation"]), styles["recipient"])
    )
    story.append(paragraph(case["narrative"]["intro"], styles["body"]))
    story.append(Spacer(1, 1.1 * mm))
    story.append(summary_table(case, styles, labels))
    story.append(Spacer(1, 4.2 * mm))
    story.append(paragraph(labels["comparison_title"], styles["section"]))
    story.append(SectionRule(31 * mm, 2))
    story.append(Spacer(1, 2.2 * mm))
    primary_third = case["third_parties"][0]
    if len(case["third_parties"]) == 2:
        story.append(consolidated_comparison_table(case, styles, labels))
    else:
        story.append(comparison_table(case, styles, labels, primary_third))
    story.append(Spacer(1, 2 * mm))
    source_note = (
        f"<b>{esc(labels['source_note'])}:</b> {esc(labels['rpi_name'])}, "
        f"{esc(labels['page'])} {primary_third['_rpi_page']}, "
        f"{esc(primary_third['_dispatch_code'])} - "
        f"{esc(primary_third['_dispatch_name'])}. "
        + linked(
            "Consultar publicação oficial"
            if case["language"] == "pt-BR"
            else "Open official publication",
            RPI_URL,
        )
        + "."
    )
    story.append(paragraph(source_note, styles["fine"]))

    if len(case["third_parties"]) == 2:
        additional = case["third_parties"][1]
        additional_source_note = (
            f" {esc(labels['page']).capitalize()} "
            f"{additional['_rpi_page']}, {esc(additional['_dispatch_code'])} - "
            f"{esc(additional['_dispatch_name'])}."
        )
        story.append(paragraph(additional_source_note, styles["fine"]))

    story.append(PageBreak())

    story.append(paragraph(labels["analysis_title"], styles["title"]))
    story.append(paragraph(labels["analysis_subtitle"], styles["subtitle"]))
    story.append(SectionRule(usable_width))
    story.append(Spacer(1, 3.5 * mm))
    story.append(dimension_table(case, styles, labels))
    story.append(Spacer(1, 3.3 * mm))
    for point in case["analysis"]["points"]:
        story.append(paragraph(point, styles["body"]))
    conclusion = (
        f"<b>{esc(labels['conclusion_heading'])}:</b> "
        f"{case['analysis']['conclusion']}<br/>"
        f"<b>{esc(labels['confidence'])}:</b> "
        f"{esc(case['analysis']['confidence'])}."
    )
    story.append(
        KeepTogether(
            [
                Spacer(1, 0.8 * mm),
                content_box(
                    labels["conclusion_heading"],
                    [conclusion],
                    styles,
                    background=BRAND_LIGHT,
                    border=BRAND_TEAL,
                ),
            ]
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        content_box(
            labels["legal_heading"],
            legal_paragraphs(
                case["language"], case["legal"]["case_specific_notes"]
            ),
            styles,
            background=WHITE,
            border=BRAND_MID,
        )
    )
    story.append(Spacer(1, 3 * mm))
    recommendation_paragraphs = [
        case["narrative"]["recommendation"],
        case["narrative"]["action_request"],
    ]
    story.append(
        content_box(
            labels["recommendation_heading"],
            recommendation_paragraphs,
            styles,
            background=BRAND_LIGHT,
            border=BRAND_TEAL,
        )
    )
    story.append(Spacer(1, 3 * mm))
    deadlines_text = (
        f"<b>{esc(labels['legal_deadline_label'])}: "
        f"{esc(display_date(case['deadlines']['opposition'], case['language']))}.</b><br/>"
        f"<b>{esc(labels['internal_deadline_label'])}: "
        f"{esc(display_date(case['deadlines']['internal_instruction'], case['language']))}.</b><br/>"
        f"{esc(labels['deadline_note'])}"
    )
    story.append(
        content_box(
            labels["deadlines_heading"],
            [deadlines_text],
            styles,
            background=WHITE,
            border=BRAND_MID,
        )
    )
    story.append(Spacer(1, 3 * mm))
    story.append(
        paragraph(f"<b>{esc(labels['notice_heading'])}</b>", styles["fine"])
    )
    story.append(paragraph(esc(labels["notice"]), styles["fine"]))
    story.append(Spacer(1, 1.7 * mm))
    story.append(paragraph(source_links(case["language"]), styles["fine"]))

    if case["evidence"] or case["limitations"]:
        story.append(PageBreak())
        story.append(paragraph(labels["evidence_title"], styles["title"]))
        story.append(paragraph(labels["evidence_subtitle"], styles["subtitle"]))
        story.append(SectionRule(usable_width))
        story.append(Spacer(1, 4 * mm))
        if case["evidence"]:
            story.append(paragraph(labels["evidence_heading"], styles["section"]))
            for item in case["evidence"]:
                story.append(
                    paragraph(f"• {esc(item)}", styles["bullet"])
                )
            story.append(Spacer(1, 3 * mm))
        story.append(paragraph(labels["limitations_heading"], styles["section"]))
        if case["limitations"]:
            for item in case["limitations"]:
                story.append(
                    paragraph(f"• {esc(item)}", styles["bullet"])
                )
        else:
            story.append(paragraph(esc(labels["no_limitations"]), styles["body"]))
        story.append(Spacer(1, 4 * mm))
        story.append(
            content_box(
                labels["deadlines_heading"],
                [deadlines_text],
                styles,
                background=BRAND_LIGHT,
                border=BRAND_TEAL,
            )
        )
        story.append(Spacer(1, 3 * mm))
        story.append(paragraph(source_links(case["language"]), styles["fine"]))
    return story


def safe_filename_component(value: str, max_length: int = 42) -> str:
    folded = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", folded).strip("_")
    return (cleaned or "MARCA")[:max_length]


def document_code(case: dict[str, Any]) -> str:
    language_code = "PT" if case["language"] == "pt-BR" else "EN"
    third_processes = "-".join(
        party["process_number"] for party in case["third_parties"]
    )
    return (
        f"APEX-RPI{EXPECTED_RPI}-{case['client']['process_number']}-"
        f"{third_processes}-{language_code}"
    )


def output_filename(case: dict[str, Any]) -> str:
    language_code = "PT" if case["language"] == "pt-BR" else "EN"
    client_mark = safe_filename_component(case["client"]["mark"])
    third_mark = safe_filename_component(case["third_parties"][0]["mark"])
    third_processes = "_".join(
        party["process_number"] for party in case["third_parties"]
    )
    if len(case["third_parties"]) > 1:
        third_mark += "_CONSOLIDADO"
    return (
        f"Apex_RPI_{EXPECTED_RPI}_Risco_Alto_{client_mark}_"
        f"{case['client']['process_number']}_x_{third_mark}_"
        f"{third_processes}_{language_code}.pdf"
    )


def ensure_output_scope(output_dir: Path) -> Path:
    resolved = output_dir.resolve()
    allowed = DEFAULT_OUTPUT_DIR.resolve()
    if resolved != allowed and allowed not in resolved.parents:
        raise CaseValidationError(
            f"Output must stay under {allowed}; received {resolved}"
        )
    return resolved


def build_report(case: dict[str, Any], output_path: Path) -> None:
    styles = make_styles()
    document = ClientReportDocTemplate(
        str(output_path),
        document_code(case),
        case["language"],
    )
    document.build(build_story(case, styles))


def validate_pdf(output_path: Path, case: dict[str, Any]) -> dict[str, Any]:
    reader = PdfReader(str(output_path))
    page_count = len(reader.pages)
    if page_count not in {2, 3}:
        raise RuntimeError(
            f"{output_path.name}: expected 2 or 3 pages, got {page_count}"
        )
    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    normalized_text = re.sub(r"\s+", " ", text)
    expected = (
        case["client"]["owner"],
        case["client"]["mark"],
        case["client"]["process_number"],
        display_date(EXPECTED_OPPOSITION_DEADLINE, case["language"]),
        display_date(EXPECTED_INTERNAL_DEADLINE, case["language"]),
    )
    for term in expected:
        if re.sub(r"\s+", " ", term) not in normalized_text:
            raise RuntimeError(f"{output_path.name}: missing expected text {term!r}")
    for party in case["third_parties"]:
        for term in (party["mark"], party["process_number"]):
            if re.sub(r"\s+", " ", term) not in normalized_text:
                raise RuntimeError(
                    f"{output_path.name}: missing expected third-party text {term!r}"
                )
    upper = text.upper()
    for marker in FORBIDDEN_TEXT_MARKERS:
        if marker.upper() in upper:
            raise RuntimeError(
                f"{output_path.name}: unresolved or forbidden marker {marker!r}"
            )
    if "\ufffd" in text:
        raise RuntimeError(f"{output_path.name}: replacement character detected")
    metadata = reader.metadata or {}
    expected_author = (
        "Apex Intellectual Property"
        if case["language"] == "en"
        else "Apex Marcas e Patentes"
    )
    if expected_author not in str(metadata.get("/Author", "")):
        raise RuntimeError(f"{output_path.name}: missing Apex author metadata")
    digest = hashlib.sha256(output_path.read_bytes()).hexdigest().upper()
    return {
        "file": str(output_path),
        "pages": page_count,
        "sha256": digest,
        "third_party_processes": [
            party["process_number"] for party in case["third_parties"]
        ],
        "client_process": case["client"]["process_number"],
        "language": case["language"],
    }


def write_manifest(results: list[dict[str, Any]], output_dir: Path) -> Path:
    manifest_path = output_dir / f"manifest_RPI_{EXPECTED_RPI}.json"
    payload = {
        "rpi": EXPECTED_RPI,
        "publication_date": EXPECTED_RPI_DATE,
        "generated_files": results,
    }
    manifest_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest_path


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=f"Generate Apex high-risk client PDFs for RPI {EXPECTED_RPI}."
    )
    parser.add_argument("--input", required=True, type=Path, help="Cases JSON file.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory, restricted to {DEFAULT_OUTPUT_DIR}.",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate input without creating any PDF.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Allow replacement of an existing PDF with the same stable filename.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    input_path = args.input.resolve()
    if not input_path.is_file():
        print(f"ERROR: input file does not exist: {input_path}", file=sys.stderr)
        return 2
    try:
        register_fonts()
        cases = load_cases(input_path)
        if args.validate_only:
            print(
                json.dumps(
                    {
                        "status": "valid",
                        "cases": len(cases),
                        "third_party_processes": [
                            party["process_number"]
                            for case in cases
                            for party in case["third_parties"]
                        ],
                        "pdfs_created": 0,
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0

        output_dir = ensure_output_scope(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        results: list[dict[str, Any]] = []
        for case in cases:
            output_path = output_dir / output_filename(case)
            if output_path.exists() and not args.overwrite:
                raise FileExistsError(
                    f"{output_path} already exists; use --overwrite to replace it"
                )
            build_report(case, output_path)
            results.append(validate_pdf(output_path, case))
        manifest = write_manifest(results, output_dir)
        print(
            json.dumps(
                {
                    "status": "generated",
                    "pdfs": results,
                    "manifest": str(manifest),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    except (CaseValidationError, FileNotFoundError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
