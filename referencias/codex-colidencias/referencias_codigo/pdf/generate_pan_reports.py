from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, PageBreak, Spacer, Table, TableStyle

import generate_reports as core


SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parents[2]
DEFAULT_OUTPUT_DIR = ROOT / "output" / "pdf" / "RPI_2899"

EXPECTED_RPI = 2899
EXPECTED_RPI_DATE = "2026-07-28"
EXPECTED_PAN_DEADLINE = "2027-01-24"
EXPECTED_INTERNAL_DEADLINE = "2027-01-14"
EXPECTED_TARGET_FILING = "2027-01-22"
ALLOWED_PAN_DISPATCHES = {"IPAS158", "IPAS770", "IPAS403"}


PAN_LABELS = {
    "pt-BR": {
        "title": "RELATÓRIO DE MONITORAMENTO PÓS-CONCESSÃO",
        "subtitle": "Potencial colidência - classificação Apex: risco alto",
        "risk_heading": "CLASSIFICAÇÃO APEX",
        "risk_value": "RISCO ALTO",
        "measure_heading": "MEDIDA POTENCIAL",
        "measure_value": "NULIDADE ADMINISTRATIVA",
        "pan_heading": "PRAZO PAN ESTIMADO",
        "internal_heading": "PRAZO INTERNO",
        "comparison_title": "Comparativo das marcas",
        "third_header": "Registro de terceiro",
        "source_note": "Fonte do registro de terceiro",
        "analysis_title": "ANÁLISE TÉCNICO-JURÍDICA",
        "analysis_subtitle": "Avaliação preliminar para eventual processo administrativo de nulidade",
        "conclusion_heading": "Conclusão da análise",
        "confidence": "Confiança da análise",
        "legal_heading": "Fundamento jurídico preliminar",
        "recommendation_heading": "Recomendação Apex",
        "deadlines_heading": "Cronograma estimado para decisão",
        "deadline_label": "Prazo PAN estimado",
        "internal_label": "Prazo interno para instruções",
        "filing_label": "Data-alvo de protocolo",
        "deadline_note": (
            "O prazo estimado de 180 dias recai em 24/01/2027, domingo. "
            "Por cautela, o protocolo deve ser planejado até 22/01/2027. "
            "A data inicial, a expedição do certificado, o status no e-INPI e "
            "o calendário oficial devem ser validados antes de qualquer medida."
        ),
        "notice_heading": "Nota importante",
        "notice": (
            "Este relatório foi elaborado pela Apex com base nos dados públicos "
            "disponíveis na data de sua emissão e em sua metodologia interna de "
            "monitoramento marcário. A classificação é preliminar, "
            "não representa decisão do INPI e não garante o êxito de eventual "
            "medida. A existência e o termo inicial do prazo de nulidade dependem "
            "da confirmação do certificado, do e-INPI e do evento processual. "
            "Nenhuma medida será protocolada sem instrução expressa do cliente."
        ),
        "sources": "Fontes oficiais",
        "law": "Lei nº 9.279/1996",
        "manual": "Manual de Marcas do INPI",
        "pan": "Procedimento de nulidade administrativa em marcas",
    },
    "en": {
        "title": "POST-GRANT TRADEMARK MONITORING REPORT",
        "subtitle": "Potential conflict - Apex classification: high risk",
        "risk_heading": "APEX CLASSIFICATION",
        "risk_value": "HIGH RISK",
        "measure_heading": "POTENTIAL MEASURE",
        "measure_value": "ADMINISTRATIVE INVALIDITY",
        "pan_heading": "ESTIMATED PAN DEADLINE",
        "internal_heading": "INTERNAL DEADLINE",
        "comparison_title": "Possible Trademark Infringement",
        "third_header": "Third-party registration",
        "source_note": "Source for the third-party registration",
        "analysis_title": "TECHNICAL AND LEGAL ASSESSMENT",
        "analysis_subtitle": "Preliminary assessment for possible administrative invalidity proceedings",
        "conclusion_heading": "Assessment conclusion",
        "confidence": "Assessment confidence",
        "legal_heading": "Preliminary legal basis",
        "recommendation_heading": "Apex recommendation",
        "deadlines_heading": "Estimated decision schedule",
        "deadline_label": "Estimated PAN deadline",
        "internal_label": "Internal instruction deadline",
        "filing_label": "Target filing date",
        "deadline_note": (
            "The estimated 180-day period falls on Sunday, 24 Jan 2027. "
            "As a precaution, filing should be planned by 22 Jan 2027. "
            "The initial date, certificate issuance, e-INPI status and official "
            "calendar must be validated before any measure is filed."
        ),
        "notice_heading": "Important notice",
        "notice": (
            "This report was prepared by Apex based on publicly available information "
            "as of its issue date and Apex's internal trademark monitoring methodology. "
            "The assessment is "
            "preliminary, does not represent an INPI decision and does not guarantee "
            "the outcome of any measure. The availability and starting date of the "
            "invalidity period depend on confirmation of the certificate, e-INPI "
            "record and procedural event. No measure will be filed without the "
            "client's express instructions. Official Portuguese-language records prevail."
        ),
        "sources": "Official sources",
        "law": "Brazilian Industrial Property Law No. 9,279/1996",
        "manual": "INPI Trademark Manual",
        "pan": "Administrative trademark invalidity procedure",
    },
}


def validate_gate(raw: Any, path: str) -> None:
    gate = core.require_mapping(raw, path)
    for key in (
        "analysis_completed_by_apex",
        "event_verified",
        "deadline_confirmed",
        "blocking_flags_resolved",
    ):
        if core.require_bool(gate.get(key), f"{path}.{key}") is not True:
            raise core.CaseValidationError(f"{path}.{key} is not satisfied")
    flags = core.require_list(gate.get("remaining_flags", []), f"{path}.remaining_flags")
    if flags:
        raise core.CaseValidationError(f"{path}: blocking flags remain")


def validate_analysis(raw: Any, path: str) -> dict[str, Any]:
    analysis = core.require_mapping(raw, path)
    dimensions_raw = core.require_list(analysis.get("dimensions"), f"{path}.dimensions")
    if not 4 <= len(dimensions_raw) <= 7:
        raise core.CaseValidationError(f"{path}.dimensions must contain 4 to 7 items")
    dimensions = []
    for index, raw_item in enumerate(dimensions_raw):
        item = core.require_mapping(raw_item, f"{path}.dimensions[{index}]")
        dimensions.append(
            {
                "label": core.require_text(
                    item.get("label"), f"{path}.dimensions[{index}].label", max_length=80
                ),
                "assessment": core.require_text(
                    item.get("assessment"),
                    f"{path}.dimensions[{index}].assessment",
                    max_length=70,
                ),
                "rationale": core.require_text(
                    item.get("rationale"),
                    f"{path}.dimensions[{index}].rationale",
                    max_length=420,
                ),
            }
        )
    points_raw = core.require_list(analysis.get("points"), f"{path}.points")
    if not 2 <= len(points_raw) <= 4:
        raise core.CaseValidationError(f"{path}.points must contain 2 to 4 items")
    return {
        "dimensions": dimensions,
        "points": [
            core.require_text(item, f"{path}.points[{index}]", max_length=820)
            for index, item in enumerate(points_raw)
        ],
        "conclusion": core.require_text(
            analysis.get("conclusion"), f"{path}.conclusion", max_length=1000
        ),
        "confidence": core.require_text(
            analysis.get("confidence"), f"{path}.confidence", max_length=80
        ),
    }


def validate_case(raw: Any, input_dir: Path, index: int) -> dict[str, Any]:
    path = f"cases[{index}]"
    case = core.require_mapping(raw, path)
    schema_version = core.require_text(
        case.get("schema_version"), f"{path}.schema_version", max_length=10
    )
    if schema_version not in {"1.0", "1.1"}:
        raise core.CaseValidationError(
            f"{path}.schema_version must be 1.0 (legacy) or 1.1"
        )
    if core.normalize_risk(case.get("risk_level")) not in {"alto", "high"}:
        raise core.CaseValidationError(f"{path}: PAN PDF is restricted to high risk")
    validate_gate(case.get("generation_gate"), f"{path}.generation_gate")

    rpi = core.require_mapping(case.get("rpi"), f"{path}.rpi")
    if rpi.get("number") != EXPECTED_RPI:
        raise core.CaseValidationError(f"{path}.rpi.number must be {EXPECTED_RPI}")
    publication_date = core.parse_iso_date(
        rpi.get("publication_date"), f"{path}.rpi.publication_date"
    )
    if publication_date != EXPECTED_RPI_DATE:
        raise core.CaseValidationError(
            f"{path}.rpi.publication_date must be {EXPECTED_RPI_DATE}"
        )
    page = rpi.get("page")
    if not isinstance(page, int) or page <= 0:
        raise core.CaseValidationError(f"{path}.rpi.page must be positive")
    dispatch_code = core.require_text(
        rpi.get("dispatch_code"), f"{path}.rpi.dispatch_code", max_length=40
    )
    if dispatch_code not in ALLOWED_PAN_DISPATCHES:
        raise core.CaseValidationError(f"{path}: unsupported PAN dispatch {dispatch_code}")
    dispatch_name = core.require_text(
        rpi.get("dispatch_name"), f"{path}.rpi.dispatch_name", max_length=220
    )

    deadlines = core.require_mapping(case.get("deadlines"), f"{path}.deadlines")
    pan_deadline = core.parse_iso_date(
        deadlines.get("pan_estimated"), f"{path}.deadlines.pan_estimated"
    )
    internal = core.parse_iso_date(
        deadlines.get("internal_instruction"),
        f"{path}.deadlines.internal_instruction",
    )
    target = core.parse_iso_date(
        deadlines.get("target_filing"), f"{path}.deadlines.target_filing"
    )
    if (
        pan_deadline != EXPECTED_PAN_DEADLINE
        or internal != EXPECTED_INTERNAL_DEADLINE
        or target != EXPECTED_TARGET_FILING
    ):
        raise core.CaseValidationError(
            f"{path}: PAN dates do not match the RPI {EXPECTED_RPI} policy"
        )

    client = core.validate_party(
        case.get("client"), f"{path}.client", input_dir, require_country=True
    )
    primary = core.validate_party(
        case.get("third_party"), f"{path}.third_party", input_dir, require_country=True
    )
    primary["_rpi_page"] = page
    primary["_dispatch_code"] = dispatch_code
    primary["_dispatch_name"] = dispatch_name
    third_parties = [primary]
    additional_raw = core.require_list(
        case.get("additional_third_parties", []), f"{path}.additional_third_parties"
    )
    if len(additional_raw) > 1:
        raise core.CaseValidationError(f"{path}: at most one consolidated process")
    for extra_index, raw_extra in enumerate(additional_raw):
        raw_map = core.require_mapping(
            raw_extra, f"{path}.additional_third_parties[{extra_index}]"
        )
        extra = core.validate_party(
            raw_extra,
            f"{path}.additional_third_parties[{extra_index}]",
            input_dir,
            require_country=True,
        )
        extra_page = raw_map.get("rpi_page")
        if not isinstance(extra_page, int) or extra_page <= 0:
            raise core.CaseValidationError(
                f"{path}.additional_third_parties[{extra_index}].rpi_page must be positive"
            )
        extra["_rpi_page"] = extra_page
        extra["_dispatch_code"] = core.require_text(
            raw_map.get("dispatch_code"), f"{path}.additional_third_parties[{extra_index}].dispatch_code"
        )
        extra["_dispatch_name"] = core.require_text(
            raw_map.get("dispatch_name"), f"{path}.additional_third_parties[{extra_index}].dispatch_name"
        )
        third_parties.append(extra)
    processes = [party["process_number"] for party in third_parties]
    if len(set(processes)) != len(processes):
        raise core.CaseValidationError(f"{path}: duplicate third-party process")
    if schema_version == "1.1":
        parties_to_check = [("client", client)] + [
            (f"third_parties[{party_index}]", party)
            for party_index, party in enumerate(third_parties)
        ]
        for party_path, party in parties_to_check:
            if not party["collision_highlights"]:
                raise core.CaseValidationError(
                    f"{path}.{party_path}.collision_highlights is required and "
                    "cannot be empty for schema 1.1"
                )

    language = core.infer_language(client["country_code"])
    requested = case.get("language", "auto")
    if requested != "auto" and requested != language:
        raise core.CaseValidationError(
            f"{path}.language must be {language} for {client['country_code']}"
        )

    articles = {
        core.require_text(item, f"{path}.legal.articles").upper().replace(" ", "")
        for item in core.require_list(
            core.require_mapping(case.get("legal"), f"{path}.legal").get("articles"),
            f"{path}.legal.articles",
        )
    }
    if not {"124,XIX", "165", "168", "169"}.issubset(articles):
        raise core.CaseValidationError(
            f"{path}.legal.articles must include 124, XIX; 165; 168; and 169"
        )
    legal_raw = core.require_mapping(case.get("legal"), f"{path}.legal")
    notes = [
        core.require_text(item, f"{path}.legal.case_specific_notes[{note_index}]", max_length=700)
        for note_index, item in enumerate(
            core.require_list(
                legal_raw.get("case_specific_notes", []),
                f"{path}.legal.case_specific_notes",
            )
        )
    ]
    narrative = core.require_mapping(case.get("narrative"), f"{path}.narrative")
    result = {
        "schema_version": schema_version,
        "case_id": core.require_text(case.get("case_id"), f"{path}.case_id"),
        "output_filename": case.get("output_filename"),
        "report_date": core.parse_iso_date(case.get("report_date"), f"{path}.report_date"),
        "risk_level": "high",
        "language": language,
        "measure": "pan",
        "rpi": {
            "number": EXPECTED_RPI,
            "publication_date": publication_date,
            "page": page,
            "dispatch_code": dispatch_code,
            "dispatch_name": dispatch_name,
        },
        "deadlines": {
            "pan_estimated": pan_deadline,
            "internal_instruction": internal,
            "target_filing": target,
        },
        "client": client,
        "third_party": primary,
        "third_parties": third_parties,
        "analysis": validate_analysis(case.get("analysis"), f"{path}.analysis"),
        "legal": {"articles": sorted(articles), "case_specific_notes": notes},
        "narrative": {
            "recipient_salutation": core.require_text(
                narrative.get("recipient_salutation"),
                f"{path}.narrative.recipient_salutation",
                max_length=180,
            ),
            "intro": core.require_text(
                narrative.get("intro"), f"{path}.narrative.intro", max_length=1200
            ),
            "recommendation": core.require_text(
                narrative.get("recommendation"),
                f"{path}.narrative.recommendation",
                max_length=1100,
            ),
            "action_request": core.require_text(
                narrative.get("action_request"),
                f"{path}.narrative.action_request",
                max_length=1000,
            ),
        },
    }
    core.assert_no_forbidden_markers(result, path)
    if result["output_filename"] not in (None, ""):
        result["output_filename"] = core.require_text(
            result["output_filename"], f"{path}.output_filename", max_length=220
        )
        if not re.fullmatch(r"[A-Za-z0-9_.-]+\.pdf", result["output_filename"]):
            raise core.CaseValidationError(
                f"{path}.output_filename must be a safe PDF filename"
            )
    else:
        result["output_filename"] = None
    return result


def load_cases(input_path: Path) -> list[dict[str, Any]]:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    raw_cases = payload.get("cases") if isinstance(payload, dict) else payload
    cases = core.require_list(raw_cases, "cases")
    validated = [
        validate_case(raw, input_path.parent.resolve(), index)
        for index, raw in enumerate(cases)
    ]
    processes = [
        party["process_number"] for case in validated for party in case["third_parties"]
    ]
    if len(set(processes)) != len(processes):
        raise core.CaseValidationError("Each PAN process may appear in one group only")
    return validated


def labels_for(language: str) -> dict[str, str]:
    labels = dict(core.LABELS[language])
    labels.update(PAN_LABELS[language])
    return labels


def summary_table(
    case: dict[str, Any], styles: dict[str, Any], labels: dict[str, str]
) -> Table:
    language = case["language"]
    items = [
        (labels["risk_heading"], labels["risk_value"]),
        (labels["measure_heading"], labels["measure_value"]),
        (
            labels["pan_heading"],
            core.display_date(case["deadlines"]["pan_estimated"], language),
        ),
        (
            labels["internal_heading"],
            core.display_date(case["deadlines"]["internal_instruction"], language),
        ),
    ]
    cells = []
    for heading, value in items:
        cells.append(
            [
                core.paragraph(core.esc(heading), styles["box_label"]),
                Spacer(1, 0.6 * mm),
                core.paragraph(core.esc(value), styles["box_value"]),
            ]
        )
    width = (core.PAGE_W - 2 * core.MARGIN_X) / 4
    table = Table([cells], colWidths=[width] * 4)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), core.BRAND_DARK),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LINEAFTER", (0, 0), (2, 0), 0.55, colors.HexColor("#4B5559")),
            ]
        )
    )
    return table


def legal_paragraphs(language: str, notes: list[str]) -> list[str]:
    if language == "pt-BR":
        base = [
            (
                "O <b>art. 124, XIX, da Lei nº 9.279/1996</b> impede o registro "
                "de reprodução ou imitação de marca alheia registrada para produto "
                "ou serviço idêntico, semelhante ou afim, quando houver risco de "
                "confusão ou associação."
            ),
            (
                "O <b>art. 165</b> estabelece a nulidade do registro concedido em "
                "desacordo com a LPI, e o <b>art. 168</b> prevê a declaração "
                "administrativa de nulidade quando o registro tiver sido concedido "
                "com infringência da lei."
            ),
            (
                "Nos termos do <b>art. 169</b>, o processo administrativo de "
                "nulidade pode ser instaurado de ofício ou mediante requerimento de "
                "pessoa com legítimo interesse no prazo de 180 dias contado da "
                "expedição do certificado de registro."
            ),
        ]
    else:
        base = [
            (
                "<b>Article 124, XIX of Brazilian Industrial Property Law "
                "No. 9,279/1996</b> bars registration of a reproduction or "
                "imitation of an earlier registered trademark for identical, "
                "similar or related goods or services where confusion or "
                "association may arise."
            ),
            (
                "<b>Article 165</b> provides that a registration granted contrary "
                "to the Law is invalid, while <b>Article 168</b> provides for an "
                "administrative declaration of invalidity where the registration "
                "was granted in breach of the Law."
            ),
            (
                "Under <b>Article 169</b>, administrative invalidity proceedings "
                "may be instituted ex officio or upon a request by a person with "
                "legitimate interest within 180 days from issuance of the "
                "registration certificate."
            ),
        ]
    base.extend(core.esc(note) for note in notes)
    return base


def source_links(language: str) -> str:
    labels = PAN_LABELS[language]
    return (
        f"<b>{core.esc(labels['sources'])}:</b> "
        + core.linked(labels["law"], core.LAW_URL)
        + " | "
        + core.linked(labels["manual"], core.MANUAL_URL)
        + " | "
        + core.linked(labels["pan"], core.PAN_URL)
    )


def build_story(case: dict[str, Any], styles: dict[str, Any]) -> list[Any]:
    labels = labels_for(case["language"])
    pan_labels = PAN_LABELS[case["language"]]
    usable_width = core.PAGE_W - 2 * core.MARGIN_X
    story: list[Any] = [
        core.paragraph(pan_labels["title"], styles["title"]),
        core.paragraph(pan_labels["subtitle"], styles["subtitle"]),
        core.SectionRule(usable_width),
        Spacer(1, 3.5 * mm),
        core.paragraph(
            core.esc(case["narrative"]["recipient_salutation"]), styles["recipient"]
        ),
        core.paragraph(case["narrative"]["intro"], styles["body"]),
        Spacer(1, 1.1 * mm),
        summary_table(case, styles, pan_labels),
        Spacer(1, 4.2 * mm),
        core.paragraph(pan_labels["comparison_title"], styles["section"]),
        core.SectionRule(31 * mm, 2),
        Spacer(1, 2.2 * mm),
    ]
    if len(case["third_parties"]) == 2:
        story.append(core.consolidated_comparison_table(case, styles, labels))
    else:
        story.append(
            core.comparison_table(
                case, styles, labels, case["third_parties"][0]
            )
        )
    story.append(Spacer(1, 2 * mm))
    source_parts = []
    for party in case["third_parties"]:
        source_parts.append(
            f"{core.esc(labels['page'])} {party['_rpi_page']}, "
            f"{core.esc(party['_dispatch_code'])} - "
            f"{core.esc(party['_dispatch_name'])}"
        )
    source_note = (
        f"<b>{core.esc(labels['source_note'])}:</b> "
        f"{core.esc(labels['rpi_name'])}, "
        + "; ".join(source_parts)
        + ". "
        + core.linked(
            "Consultar publicação oficial"
            if case["language"] == "pt-BR"
            else "Open official publication",
            core.RPI_URL,
        )
        + "."
    )
    story.extend([core.paragraph(source_note, styles["fine"]), PageBreak()])

    story.extend(
        [
            core.paragraph(pan_labels["analysis_title"], styles["title"]),
            core.paragraph(pan_labels["analysis_subtitle"], styles["subtitle"]),
            core.SectionRule(usable_width),
            Spacer(1, 3.5 * mm),
            core.dimension_table(case, styles, labels),
            Spacer(1, 3.3 * mm),
        ]
    )
    for point in case["analysis"]["points"]:
        story.append(core.paragraph(point, styles["body"]))
    conclusion = (
        f"{case['analysis']['conclusion']}<br/>"
        f"<b>{core.esc(pan_labels['confidence'])}:</b> "
        f"{core.esc(case['analysis']['confidence'])}."
    )
    story.extend(
        [
            core.content_box(
                pan_labels["conclusion_heading"],
                [conclusion],
                styles,
                background=core.BRAND_LIGHT,
                border=core.BRAND_TEAL,
            ),
            Spacer(1, 3 * mm),
            core.content_box(
                pan_labels["legal_heading"],
                legal_paragraphs(
                    case["language"], case["legal"]["case_specific_notes"]
                ),
                styles,
                background=core.WHITE,
                border=core.BRAND_MID,
            ),
            Spacer(1, 3 * mm),
            core.content_box(
                pan_labels["recommendation_heading"],
                [
                    case["narrative"]["recommendation"],
                    case["narrative"]["action_request"],
                ],
                styles,
                background=core.BRAND_LIGHT,
                border=core.BRAND_TEAL,
            ),
        ]
    )
    schedule_text = (
        f"<b>{core.esc(pan_labels['deadline_label'])}: "
        f"{core.esc(core.display_date(case['deadlines']['pan_estimated'], case['language']))}.</b><br/>"
        f"<b>{core.esc(pan_labels['internal_label'])}: "
        f"{core.esc(core.display_date(case['deadlines']['internal_instruction'], case['language']))}.</b><br/>"
        f"<b>{core.esc(pan_labels['filing_label'])}: "
        f"{core.esc(core.display_date(case['deadlines']['target_filing'], case['language']))}.</b><br/>"
        f"{core.esc(pan_labels['deadline_note'])}"
    )
    legal_page = [
        Spacer(1, 3 * mm),
        core.content_box(
            pan_labels["deadlines_heading"],
            [schedule_text],
            styles,
            background=core.WHITE,
            border=core.BRAND_MID,
        ),
        Spacer(1, 3 * mm),
        core.paragraph(
            f"<b>{core.esc(pan_labels['notice_heading'])}</b>", styles["fine"]
        ),
        core.paragraph(core.esc(pan_labels["notice"]), styles["fine"]),
        Spacer(1, 1.7 * mm),
        core.paragraph(source_links(case["language"]), styles["fine"]),
    ]
    story.append(KeepTogether(legal_page))
    return story


def document_code(case: dict[str, Any]) -> str:
    language = "PT" if case["language"] == "pt-BR" else "EN"
    thirds = "-".join(party["process_number"] for party in case["third_parties"])
    return (
        f"APEX-PAN-RPI{EXPECTED_RPI}-{case['client']['process_number']}-"
        f"{thirds}-{language}"
    )


def output_filename(case: dict[str, Any]) -> str:
    if case.get("output_filename"):
        return case["output_filename"]
    language = "PT" if case["language"] == "pt-BR" else "EN"
    client = core.safe_filename_component(case["client"]["mark"])
    third = core.safe_filename_component(case["third_parties"][0]["mark"])
    processes = "_".join(party["process_number"] for party in case["third_parties"])
    if len(case["third_parties"]) > 1:
        third += "_CONSOLIDADO"
    return (
        f"Apex_RPI_{EXPECTED_RPI}_Risco_Alto_PAN_{client}_"
        f"{case['client']['process_number']}"
        f"_x_{third}_{processes}_{language}.pdf"
    )


def validate_pdf(path: Path, case: dict[str, Any]) -> dict[str, Any]:
    reader = PdfReader(str(path))
    page_count = len(reader.pages)
    if page_count not in {2, 3}:
        raise RuntimeError(f"{path.name}: expected 2 or 3 pages, got {page_count}")
    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    normalized = re.sub(r"\s+", " ", text)
    expected = [
        case["client"]["mark"],
        case["client"]["process_number"],
        core.display_date(EXPECTED_PAN_DEADLINE, case["language"]),
        core.display_date(EXPECTED_INTERNAL_DEADLINE, case["language"]),
        core.display_date(EXPECTED_TARGET_FILING, case["language"]),
    ]
    for party in case["third_parties"]:
        expected.extend([party["mark"], party["process_number"]])
    for term in expected:
        if re.sub(r"\s+", " ", term) not in normalized:
            raise RuntimeError(f"{path.name}: missing expected text {term!r}")
    upper = text.upper()
    for forbidden in ("ARTICLE 158", "ART. 158", "ARTIGO 158", "OPPOSITION", "OPOSIÇÃO"):
        if forbidden in upper:
            raise RuntimeError(f"{path.name}: forbidden opposition wording {forbidden!r}")
    for required in ("124", "165", "168", "169"):
        if required not in text:
            raise RuntimeError(f"{path.name}: missing LPI article {required}")
    if "\ufffd" in text:
        raise RuntimeError(f"{path.name}: replacement character detected")
    return {
        "file": str(path),
        "pages": page_count,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest().upper(),
        "third_party_processes": [
            party["process_number"] for party in case["third_parties"]
        ],
        "client_process": case["client"]["process_number"],
        "language": case["language"],
        "measure": "PAN",
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=f"Generate Apex PAN PDFs for RPI {EXPECTED_RPI}."
    )
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        core.register_fonts()
        cases = load_cases(args.input.resolve())
        if args.validate_only:
            print(json.dumps({"status": "valid", "cases": len(cases)}, indent=2))
            return 0
        DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        results = []
        for case in cases:
            path = DEFAULT_OUTPUT_DIR / output_filename(case)
            if path.exists() and not args.overwrite:
                raise FileExistsError(f"{path} exists; use --overwrite")
            doc = core.ClientReportDocTemplate(
                str(path), document_code(case), case["language"]
            )
            doc.build(build_story(case, core.make_styles()))
            results.append(validate_pdf(path, case))
        manifest = DEFAULT_OUTPUT_DIR / f"manifest_PAN_RPI_{EXPECTED_RPI}.json"
        manifest.write_text(
            json.dumps(
                {
                    "rpi": EXPECTED_RPI,
                    "publication_date": EXPECTED_RPI_DATE,
                    "generated_files": results,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(
            json.dumps(
                {"status": "generated", "pdfs": results, "manifest": str(manifest)},
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    except (core.CaseValidationError, FileNotFoundError, RuntimeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
