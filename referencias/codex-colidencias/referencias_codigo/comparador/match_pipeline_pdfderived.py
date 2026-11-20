from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import statistics
import unicodedata
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


PIPELINE_VERSION = "1.2.0"

# Publicações que abrem ou reabrem prazo de oposição na seção de Marcas.
# IPAS009: pedido nacional; IPAS756: designação de Madri;
# IPAS421/IPAS757: republicações nacional/Madri.
OPPOSITION_DISPATCH_FAMILIES = {"I009", "I421", "I756", "I757"}

# These words are ignored only for token blocking/similarity. The complete
# normalized mark remains available and is also scored.
MARK_WEAK_TOKENS = {
    "A",
    "ACADEMY",
    "ACADEMIA",
    "AGRO",
    "AGUA",
    "AS",
    "ARQUITETURA",
    "ASSESSORIA",
    "AUTOMOTIVA",
    "BEAUTY",
    "BR",
    "BRASIL",
    "BRAZIL",
    "CIA",
    "CLINIC",
    "CLINICA",
    "CLUBE",
    "CO",
    "COM",
    "COMPANHIA",
    "COMPANY",
    "COMERCIO",
    "CONFEITARIA",
    "CONSTRUCOES",
    "CONSTRUTORA",
    "CONSULTORIA",
    "CONTABILIDADE",
    "CONTABIL",
    "DA",
    "DAS",
    "DE",
    "DO",
    "DOS",
    "DECOR",
    "DIGITAL",
    "E",
    "EM",
    "EMPREENDIMENTOS",
    "ENERGIA",
    "ENERGY",
    "ENGENHARIA",
    "EMBALAGENS",
    "ESCOLA",
    "FRIGORIFICO",
    "FUTEBOL",
    "GROUP",
    "GRUPO",
    "INC",
    "INSTITUTO",
    "INTERIORES",
    "IMOVEIS",
    "IMOBILIARIA",
    "INDUSTRIA",
    "LLC",
    "LLP",
    "LTDA",
    "MARCA",
    "MARCAS",
    "MEDICAL",
    "MEDICINA",
    "ME",
    "MINERAL",
    "NUTRICAO",
    "O",
    "OF",
    "OS",
    "PARA",
    "PADARIA",
    "PAPELARIA",
    "PARTS",
    "PATENTES",
    "RESTAURANTE",
    "SA",
    "SEGURADORA",
    "SERVICOS",
    "SAUDE",
    "SOCIAL",
    "SOLAR",
    "SOLUCOES",
    "TECNOLOGIA",
    "TECHNOLOGIES",
    "THE",
    "VIAGEM",
    "VIAGENS",
    "SHOES",
}

SPEC_STOPWORDS = {
    "A",
    "AS",
    "AO",
    "AOS",
    "COM",
    "COMO",
    "DA",
    "DAS",
    "DE",
    "DO",
    "DOS",
    "E",
    "EM",
    "ENTRE",
    "ESPECIALMENTE",
    "EXCETO",
    "INCLUINDO",
    "NA",
    "NAS",
    "NO",
    "NOS",
    "O",
    "OS",
    "OU",
    "PARA",
    "POR",
    "PRODUTO",
    "PRODUTOS",
    "RELACIONADO",
    "RELACIONADOS",
    "SERVICO",
    "SERVICOS",
    "SOBRE",
    "USO",
    "AND",
    "FOR",
    "INCLUDING",
    "OF",
    "OR",
    "PRODUCT",
    "PRODUCTS",
    "RELATED",
    "SERVICE",
    "SERVICES",
    "THE",
    "TO",
    "USE",
    "WITH",
}

# Heuristic, non-legal cross-class relationships. Same-class comparison is
# handled separately. Textual specification affinity can independently raise
# a pair even when the class pair is absent here.
CLASS_AFFINITY = {
    ("03", "05"): (65, "cosméticos/preparações farmacêuticas"),
    ("03", "21"): (50, "cosméticos/utensílios de higiene"),
    ("03", "35"): (40, "produto/comércio"),
    ("03", "44"): (60, "cosméticos/cuidados de saúde e beleza"),
    ("05", "10"): (75, "farmacêuticos/aparelhos médicos"),
    ("05", "35"): (40, "produto/comércio"),
    ("05", "44"): (82, "farmacêuticos/serviços de saúde"),
    ("09", "35"): (40, "produto/comércio"),
    ("09", "38"): (70, "software e equipamentos/telecomunicações"),
    ("09", "41"): (55, "software e conteúdo/educação"),
    ("09", "42"): (88, "software/tecnologia e SaaS"),
    ("10", "44"): (82, "aparelhos médicos/serviços de saúde"),
    ("14", "35"): (40, "produto/comércio"),
    ("16", "35"): (40, "produto/comércio"),
    ("16", "41"): (72, "impressos/publicação e educação"),
    ("18", "25"): (58, "acessórios/vestuário"),
    ("18", "35"): (40, "produto/comércio"),
    ("25", "35"): (42, "vestuário/comércio"),
    ("29", "30"): (78, "alimentos"),
    ("29", "31"): (62, "alimentos/agropecuários"),
    ("29", "32"): (62, "alimentos/bebidas"),
    ("29", "35"): (40, "produto/comércio"),
    ("29", "43"): (78, "alimentos/restauração"),
    ("30", "31"): (58, "alimentos/agropecuários"),
    ("30", "32"): (68, "alimentos/bebidas"),
    ("30", "35"): (40, "produto/comércio"),
    ("30", "43"): (80, "alimentos/restauração"),
    ("31", "35"): (40, "produto/comércio"),
    ("31", "43"): (64, "agropecuários/restauração"),
    ("32", "33"): (58, "bebidas"),
    ("32", "35"): (40, "produto/comércio"),
    ("32", "43"): (72, "bebidas/restauração"),
    ("33", "35"): (40, "produto/comércio"),
    ("33", "43"): (72, "bebidas/restauração"),
    ("35", "36"): (48, "negócios/serviços financeiros"),
    ("35", "39"): (45, "negócios/logística"),
    ("35", "41"): (45, "negócios/educação e eventos"),
    ("35", "42"): (48, "negócios/tecnologia"),
    ("36", "45"): (55, "financeiro/jurídico"),
    ("37", "40"): (58, "instalação e reparo/tratamento de materiais"),
    ("38", "42"): (72, "telecomunicações/tecnologia"),
    ("39", "43"): (55, "viagens/hospedagem e restauração"),
    ("41", "42"): (58, "educação e conteúdo/tecnologia"),
    ("42", "45"): (60, "tecnologia/jurídico e segurança"),
}

WEIGHTS = {
    "nominative": 0.55,
    "phonetic": 0.20,
    "class": 0.10,
    "specification": 0.15,
}

THRESHOLDS = {
    "name_direct": 75.0,
    "name_with_phonetic": 66.0,
    "phonetic_support": 75.0,
    "short_mark": 90.0,
    "priority_p0_combined": 88.0,
    "priority_p1_combined": 80.0,
    "priority_p2_combined": 70.0,
}

MAX_TOKEN_DF = 2500
MAX_PHONETIC_DF = 2500
MAX_GRAM_DF = 5000
MAX_GRAM_CANDIDATES_PER_BASE = 2500
MAX_BLOCKED_CANDIDATES_PER_BASE = 6000

PUNCTUATED_LETTER_SEQUENCE_RE = re.compile(
    r"(?<![A-Z0-9])(?:[A-Z]\s*[.\-_/·•]\s*){2,}"
    r"[A-Z](?:\s*[.\-_/·•])?(?![A-Z0-9])"
)
SPACED_LETTER_SEQUENCE_RE = re.compile(
    r"(?<![A-Z0-9])(?:[A-Z]\s+){3,}[A-Z](?![A-Z0-9])"
)


def canonical(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.upper().replace("&", " E ")
    return " ".join(re.sub(r"[^A-Z0-9]+", " ", text).split())


def canonical_mark(value: object) -> str:
    """Normalize a mark while preserving punctuated letter sequences as words."""
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.upper()

    def join_letters(match: re.Match[str]) -> str:
        return re.sub(r"[^A-Z0-9]", "", match.group(0))

    text = PUNCTUATED_LETTER_SEQUENCE_RE.sub(join_letters, text)
    text = SPACED_LETTER_SEQUENCE_RE.sub(join_letters, text)
    text = text.replace("&", " E ")
    return " ".join(re.sub(r"[^A-Z0-9]+", " ", text).split())


def compact(value: object) -> str:
    return canonical_mark(value).replace(" ", "")


def name_tokens(value: object) -> tuple[str, ...]:
    return tuple(canonical_mark(value).split())


def distinctive_tokens(value: object) -> tuple[str, ...]:
    tokens = [
        token
        for token in name_tokens(value)
        if token not in MARK_WEAK_TOKENS and (len(token) >= 2 or token.isdigit())
    ]
    return tuple(tokens or name_tokens(value))


def char_grams(value: str) -> frozenset[str]:
    if not value:
        return frozenset()
    n = 2 if len(value) <= 5 else 3
    padded = f"^{value}$"
    return frozenset(padded[index : index + n] for index in range(len(padded) - n + 1))


def phonetic_token(value: str) -> str:
    text = canonical(value).replace(" ", "")
    if not text:
        return ""
    replacements = (
        ("SCH", "X"),
        ("SH", "X"),
        ("CH", "X"),
        ("PH", "F"),
        ("TH", "T"),
        ("LH", "L"),
        ("NH", "N"),
        ("RR", "R"),
        ("SS", "S"),
        ("QU", "K"),
        ("CK", "K"),
    )
    for source, target in replacements:
        text = text.replace(source, target)
    text = re.sub(r"C(?=[EIY])", "S", text)
    text = re.sub(r"G(?=[EIY])", "J", text)
    text = text.translate(str.maketrans({"Q": "K", "Y": "I", "W": "V", "Z": "S"}))
    text = text.replace("H", "")
    if not text:
        return ""
    first = text[0]
    groups = {
        **dict.fromkeys("BPFV", "1"),
        **dict.fromkeys("CKGQ", "2"),
        **dict.fromkeys("DT", "3"),
        "L": "4",
        **dict.fromkeys("MN", "5"),
        "R": "6",
        **dict.fromkeys("SJXZ", "7"),
    }
    encoded = [groups.get(char, "") for char in text[1:]]
    deduped: list[str] = []
    for code in encoded:
        if code and (not deduped or deduped[-1] != code):
            deduped.append(code)
    return (first + "".join(deduped))[:8]


def phonetic_tokens(value: object) -> tuple[str, ...]:
    return tuple(filter(None, (phonetic_token(token) for token in distinctive_tokens(value))))


def sequence_ratio(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    return 100.0 * SequenceMatcher(None, left, right, autojunk=False).ratio()


def dice(left: frozenset[str], right: frozenset[str]) -> float:
    if not left or not right:
        return 0.0
    return 200.0 * len(left & right) / (len(left) + len(right))


def token_set_ratio(left: tuple[str, ...], right: tuple[str, ...]) -> float:
    set_left, set_right = set(left), set(right)
    if not set_left or not set_right:
        return 0.0
    intersection = sorted(set_left & set_right)
    left_only = sorted(set_left - set_right)
    right_only = sorted(set_right - set_left)
    common = " ".join(intersection)
    joined_left = " ".join(intersection + left_only)
    joined_right = " ".join(intersection + right_only)
    scores = [sequence_ratio(joined_left, joined_right)]
    if common:
        scores.extend(
            [sequence_ratio(common, joined_left), sequence_ratio(common, joined_right)]
        )
    return max(scores)


def name_features(value: object) -> dict:
    normalized = canonical_mark(value)
    compacted = normalized.replace(" ", "")
    tokens = name_tokens(normalized)
    informative = tuple(
        token
        for token in tokens
        if token not in MARK_WEAK_TOKENS and (len(token) >= 2 or token.isdigit())
    )
    distinct = informative or tokens
    distinctive_compact = "".join(distinct)
    phonetics = tuple(filter(None, (phonetic_token(token) for token in distinct)))
    return {
        "normalized": normalized,
        "compact": compacted,
        "tokens": tokens,
        "distinctive_tokens": distinct,
        "distinctive_compact": distinctive_compact,
        "weak_tokens_removed": bool(informative and len(informative) < len(tokens)),
        "phonetic_tokens": phonetics,
        "phonetic_joined": " ".join(phonetics),
        "grams": char_grams(compacted),
        "distinctive_grams": char_grams(distinctive_compact),
    }


def score_names(left: dict, right: dict) -> dict:
    seq = sequence_ratio(left["compact"], right["compact"])
    token_sort = sequence_ratio(
        "".join(sorted(left["distinctive_tokens"])),
        "".join(sorted(right["distinctive_tokens"])),
    )
    token_set = token_set_ratio(left["distinctive_tokens"], right["distinctive_tokens"])
    gram_dice = dice(left["grams"], right["grams"])
    distinctive_seq = sequence_ratio(
        left["distinctive_compact"], right["distinctive_compact"]
    )
    distinctive_gram_dice = dice(
        left["distinctive_grams"], right["distinctive_grams"]
    )
    phonetic_seq = sequence_ratio(left["phonetic_joined"], right["phonetic_joined"])
    phonetic_set = token_set_ratio(left["phonetic_tokens"], right["phonetic_tokens"])

    left_set, right_set = set(left["distinctive_tokens"]), set(right["distinctive_tokens"])
    exact_tokens = sorted(
        left_set & right_set, key=lambda token: (-len(token), token)
    )
    weak_context = left["weak_tokens_removed"] or right["weak_tokens_removed"]
    containment_values = (
        (left["distinctive_compact"], right["distinctive_compact"])
        if weak_context
        else (left["compact"], right["compact"])
    )
    shorter, longer = sorted(containment_values, key=lambda item: (len(item), item))
    substring = bool(shorter and len(shorter) >= 4 and shorter in longer)
    exact_compact = bool(left["compact"] and left["compact"] == right["compact"])

    full_composite = (
        0.42 * seq + 0.18 * token_sort + 0.22 * token_set + 0.18 * gram_dice
    )
    if weak_context:
        distinctive_composite = 0.65 * distinctive_seq + 0.35 * distinctive_gram_dice
        composite = 0.45 * full_composite + 0.55 * distinctive_composite
        token_bridge = (
            0.55 * token_set + 0.25 * distinctive_seq + 0.20 * seq
        )
    else:
        composite = full_composite
        token_bridge = 0.70 * token_set + 0.30 * seq
    containment_floor = 0.0
    if substring:
        containment_floor = min(96.0, 84.0 + 12.0 * len(shorter) / len(longer))
    if exact_tokens and len(exact_tokens[0]) >= 5:
        token_floor = min(
            94.0,
            76.0
            + 18.0
            * len(exact_tokens[0])
            / max(len(left["compact"]), len(right["compact"]), 1),
        )
    else:
        token_floor = 0.0
    nominative = max(
        100.0 if exact_compact else 0.0,
        composite,
        token_bridge,
        containment_floor,
        token_floor,
    )
    phonetic = max(phonetic_seq, 0.70 * phonetic_set + 0.30 * phonetic_seq)
    return {
        "nominative": round(min(100.0, nominative), 2),
        "phonetic": round(min(100.0, phonetic), 2),
        "sequence": round(seq, 2),
        "token_sort": round(token_sort, 2),
        "token_set": round(token_set, 2),
        "gram_dice": round(gram_dice, 2),
        "distinctive_sequence": round(distinctive_seq, 2),
        "distinctive_gram_dice": round(distinctive_gram_dice, 2),
        "exact_compact": exact_compact,
        "substring": substring,
        "exact_tokens": exact_tokens,
    }


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def descendants(element: ET.Element, wanted: str) -> Iterable[ET.Element]:
    for node in element.iter():
        if local_name(node.tag) == wanted:
            yield node


def first_descendant(element: ET.Element | None, wanted: str) -> ET.Element | None:
    if element is None:
        return None
    return next(descendants(element, wanted), None)


def text_of(element: ET.Element | None) -> str | None:
    if element is None:
        return None
    text = " ".join("".join(element.itertext()).split())
    return text or None


def normalize_class(value: object) -> str | None:
    candidates = re.findall(r"\d{1,2}", str(value or ""))
    for candidate in reversed(candidates):
        number = int(candidate)
        if 1 <= number <= 45:
            return f"{number:02d}"
    return None


def dispatch_family(value: object) -> str:
    code = canonical(value).replace(" ", "")
    if code.startswith("IPAS"):
        return "I" + code[4:]
    return code


def read_legacy_candidates(path: Path | None) -> list[dict]:
    if path is None:
        return []
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def parse_rpi_process(element: ET.Element) -> dict:
    mark = first_descendant(element, "marca")
    mark_name = text_of(first_descendant(mark, "nome"))
    nice_class_nodes = [
        node
        for node in descendants(element, "classe-nice")
        if canonical(text_of(first_descendant(node, "status"))) != "EXCLUIDA"
    ]
    classes = sorted(
        {
            code
            for node in nice_class_nodes
            if (code := normalize_class(node.attrib.get("codigo")))
        }
    )
    national_classes = sorted(
        {
            code
            for node in descendants(element, "classe-nacional")
            if (code := normalize_class(node.attrib.get("codigo")))
        }
    )
    specifications = [
        text
        for tag in ("especificacao", "traducao-especificacao")
        for class_node in nice_class_nodes
        for node in descendants(class_node, tag)
        if (text := text_of(node))
    ]
    dispatches = [
        {
            "codigo": node.attrib.get("codigo"),
            "nome": node.attrib.get("nome") or node.attrib.get("descricao"),
            "texto_complementar": text_of(first_descendant(node, "texto-complementar")),
        }
        for node in descendants(element, "despacho")
    ]
    titulars = [
        {
            "nome": node.attrib.get("nome-razao-social") or node.attrib.get("nome"),
            "pais": node.attrib.get("pais"),
            "uf": node.attrib.get("uf"),
        }
        for node in descendants(element, "titular")
    ]
    cfe = sorted(
        {
            node.attrib.get("codigo")
            for node in descendants(element, "classe-vienna")
            if node.attrib.get("codigo")
        }
    )
    record = {
        "processo": element.attrib.get("numero"),
        "data_deposito": element.attrib.get("data-deposito"),
        "data_concessao": element.attrib.get("data-concessao"),
        "data_vigencia": element.attrib.get("data-vigencia"),
        "marca": mark_name,
        "traducao_marca": text_of(first_descendant(mark, "traducao")),
        "apresentacao": mark.attrib.get("apresentacao") if mark is not None else None,
        "natureza": mark.attrib.get("natureza") if mark is not None else None,
        "classes_nice": classes,
        "classes_nacionais": national_classes,
        "especificacao": " || ".join(specifications) if specifications else None,
        "despachos": dispatches,
        "titulares": titulars,
        "cfe": cfe,
        "apostila": text_of(first_descendant(element, "apostila")),
        "procurador": text_of(first_descendant(element, "procurador")),
    }
    return record


def read_rpi(zip_path: Path) -> tuple[dict, list[dict]]:
    records: list[dict] = []
    metadata: dict[str, str | None] = {"numero": None, "data": None, "xml_entry": None}
    with zipfile.ZipFile(zip_path) as archive:
        bad_entry = archive.testzip()
        if bad_entry:
            raise ValueError(f"CRC inválido no ZIP: {bad_entry}")
        xml_entries = [name for name in archive.namelist() if name.lower().endswith(".xml")]
        if len(xml_entries) != 1:
            raise ValueError(f"Esperado exatamente 1 XML no ZIP; encontrados {xml_entries}")
        metadata["xml_entry"] = xml_entries[0]
        with archive.open(xml_entries[0]) as stream:
            for event, element in ET.iterparse(stream, events=("start", "end")):
                tag = local_name(element.tag)
                if event == "start" and tag == "revista" and metadata["numero"] is None:
                    metadata["numero"] = element.attrib.get("numero")
                    metadata["data"] = element.attrib.get("data")
                if event == "end" and tag == "processo":
                    records.append(parse_rpi_process(element))
                    element.clear()
    return metadata, records


def spec_tokenize(value: object) -> frozenset[str]:
    tokens: set[str] = set()
    for token in canonical(value).split():
        if token in SPEC_STOPWORDS or token.isdigit() or len(token) < 3:
            continue
        if len(token) > 5 and token.endswith("S"):
            token = token[:-1]
        tokens.add(token)
    return frozenset(tokens)


def build_idf(documents: Iterable[frozenset[str]]) -> tuple[dict[str, float], int]:
    document_frequency: Counter[str] = Counter()
    total = 0
    for document in documents:
        total += 1
        document_frequency.update(document)
    return {
        token: math.log((1 + total) / (1 + frequency)) + 1.0
        for token, frequency in document_frequency.items()
    }, total


def spec_norm(tokens: frozenset[str], idf: dict[str, float]) -> float:
    return math.sqrt(sum(idf.get(token, 1.0) ** 2 for token in tokens))


def score_specifications(
    left: frozenset[str],
    right: frozenset[str],
    idf: dict[str, float],
    left_norm: float,
    right_norm: float,
) -> tuple[float | None, list[str], dict]:
    if not left or not right:
        return None, [], {"cosine": None, "containment": None}
    common = left & right
    if not common:
        return 0.0, [], {"cosine": 0.0, "containment": 0.0}
    dot = sum(idf.get(token, 1.0) ** 2 for token in common)
    cosine = dot / max(left_norm * right_norm, 1e-9)
    common_weight = sum(idf.get(token, 1.0) for token in common)
    left_weight = sum(idf.get(token, 1.0) for token in left)
    right_weight = sum(idf.get(token, 1.0) for token in right)
    containment = common_weight / max(min(left_weight, right_weight), 1e-9)
    score = 100.0 * (0.45 * cosine + 0.55 * containment)
    terms = sorted(common, key=lambda token: (-idf.get(token, 1.0), token))[:12]
    return (
        round(min(100.0, score), 2),
        terms,
        {"cosine": round(100.0 * cosine, 2), "containment": round(100.0 * containment, 2)},
    )


def class_score(base: dict, rpi: dict) -> tuple[float | None, str, list[str]]:
    system = base.get("classification", {}).get("system")
    base_classes = {
        normalize_class(value)
        for value in base.get("classification", {}).get("classes", [])
    } - {None}
    rpi_classes = set(rpi.get("classes_nice", []))
    if system != "NCL":
        return None, "classe-base não comparável como NCL vigente", []
    if not base_classes or not rpi_classes:
        return None, "classe ausente em um dos lados", []
    common = sorted(base_classes & rpi_classes)
    if common:
        return 100.0, f"mesma classe NCL: {', '.join(common)}", common
    best_score = 0.0
    best_label = "classes distintas sem relação tabelada"
    best_pair: list[str] = []
    for left in base_classes:
        for right in rpi_classes:
            key = tuple(sorted((left, right)))
            if key in CLASS_AFFINITY:
                score, label = CLASS_AFFINITY[key]
                if score > best_score:
                    best_score = float(score)
                    best_label = f"afinidade heurística {left}/{right}: {label}"
                    best_pair = [left, right]
    return best_score, best_label, best_pair


def party_key(value: object) -> str:
    ignored = {
        "BR",
        "CIA",
        "CO",
        "COMPANHIA",
        "COMPANY",
        "EIRELI",
        "INC",
        "LLC",
        "LLP",
        "LTDA",
        "ME",
        "SA",
    }
    return " ".join(token for token in canonical(value).split() if token not in ignored)


def same_owner(base: dict, rpi: dict) -> tuple[bool, float]:
    left = party_key(base.get("parties", {}).get("titularRaw"))
    right = party_key((rpi.get("titulares") or [{}])[0].get("nome"))
    if not left or not right:
        return False, 0.0
    ratio = sequence_ratio(left.replace(" ", ""), right.replace(" ", ""))
    # Exclusão conservadora: sem igualdade exata do titular normalizado,
    # a proximidade textual não basta para tratar terceiros como mesmo titular.
    return left == right, round(ratio, 2)


def base_cfe(record: dict) -> set[str]:
    return set(re.findall(r"\d+\.\d+\.\d+", str(record.get("mark", {}).get("cfeRaw") or "")))


def prepare_base(record: dict) -> dict:
    mark = record.get("mark", {})
    spec = record.get("specification", {})
    prepared = {
        **record,
        "_name": name_features(mark.get("raw") or mark.get("normalized")),
        "_spec_tokens": spec_tokenize(spec.get("searchNormalized") or spec.get("raw")),
        "_cfe": base_cfe(record),
    }
    return prepared


def prepare_rpi(record: dict) -> dict:
    return {
        **record,
        "_name": name_features(record.get("marca")),
        "_spec_tokens": spec_tokenize(record.get("especificacao")),
    }


def add_index(index: dict, key: object, value: int) -> None:
    if key:
        index[key].append(value)


def build_indexes(rpi_records: list[dict]) -> tuple[dict, dict]:
    token_df = Counter()
    phonetic_df = Counter()
    gram_df = Counter()
    for record in rpi_records:
        features = record["_name"]
        token_df.update(set(features["distinctive_tokens"]))
        phonetic_df.update(set(features["phonetic_tokens"]))
        gram_df.update(features["grams"])

    indexes = {
        "exact": defaultdict(list),
        "token": defaultdict(list),
        "phonetic": defaultdict(list),
        "prefix": defaultdict(list),
        "gram": defaultdict(list),
        "short": defaultdict(list),
    }
    for index, record in enumerate(rpi_records):
        features = record["_name"]
        add_index(indexes["exact"], features["compact"], index)
        for token in set(features["distinctive_tokens"]):
            if token_df[token] <= MAX_TOKEN_DF:
                add_index(indexes["token"], token, index)
            if len(token) >= 4:
                add_index(indexes["prefix"], token[:4], index)
        for key in set(features["phonetic_tokens"]):
            if phonetic_df[key] <= MAX_PHONETIC_DF:
                add_index(indexes["phonetic"], key, index)
        if len(features["compact"]) >= 4:
            add_index(indexes["prefix"], features["compact"][:4], index)
        for gram in features["grams"]:
            if gram_df[gram] <= MAX_GRAM_DF:
                add_index(indexes["gram"], gram, index)
        if features["compact"]:
            add_index(
                indexes["short"],
                (features["compact"][0], len(features["compact"])),
                index,
            )
    stats = {
        "rpi_token_df": token_df,
        "rpi_phonetic_df": phonetic_df,
        "rpi_gram_df": gram_df,
    }
    return indexes, stats


def blocked_candidates(base: dict, indexes: dict) -> tuple[dict[int, set[str]], bool]:
    features = base["_name"]
    candidates: dict[int, set[str]] = defaultdict(set)

    for index in indexes["exact"].get(features["compact"], []):
        candidates[index].add("EXACT_COMPACT")
    for token in set(features["distinctive_tokens"]):
        for index in indexes["token"].get(token, []):
            candidates[index].add(f"TOKEN:{token}")
        if len(token) >= 4:
            for index in indexes["prefix"].get(token[:4], []):
                candidates[index].add(f"PREFIX:{token[:4]}")
    for key in set(features["phonetic_tokens"]):
        for index in indexes["phonetic"].get(key, []):
            candidates[index].add(f"PHONETIC:{key}")
    if len(features["compact"]) >= 4:
        for index in indexes["prefix"].get(features["compact"][:4], []):
            candidates[index].add(f"PREFIX_COMPACT:{features['compact'][:4]}")

    gram_hits: Counter[int] = Counter()
    for gram in features["grams"]:
        gram_hits.update(indexes["gram"].get(gram, []))
    minimum_hits = 1 if len(features["grams"]) <= 2 else 2
    for index, hits in gram_hits.most_common(MAX_GRAM_CANDIDATES_PER_BASE):
        if hits >= minimum_hits:
            candidates[index].add(f"NGRAM_HITS:{hits}")

    if 0 < len(features["compact"]) <= 4:
        for length in range(max(1, len(features["compact"]) - 1), len(features["compact"]) + 2):
            for index in indexes["short"].get((features["compact"][0], length), []):
                candidates[index].add("SHORT_LENGTH_BUCKET")

    capped = False
    if len(candidates) > MAX_BLOCKED_CANDIDATES_PER_BASE:
        capped = True
        scored = sorted(
            candidates.items(),
            key=lambda item: (
                -int("EXACT_COMPACT" in item[1]),
                -sum(reason.startswith("TOKEN:") for reason in item[1]),
                -sum(reason.startswith("PHONETIC:") for reason in item[1]),
                -max(
                    [
                        int(reason.split(":")[1])
                        for reason in item[1]
                        if reason.startswith("NGRAM_HITS:")
                    ]
                    or [0]
                ),
                item[0],
            ),
        )[:MAX_BLOCKED_CANDIDATES_PER_BASE]
        candidates = defaultdict(set, scored)
    return dict(candidates), capped


def keep_name_candidate(base: dict, scores: dict, token_df: Counter) -> tuple[bool, str]:
    minimum_length = min(len(base["_name"]["compact"]), 20)
    if scores["exact_compact"]:
        return True, "nome compacto idêntico"
    if minimum_length <= 3:
        return (
            scores["nominative"] >= THRESHOLDS["short_mark"]
            and scores["phonetic"] >= 85.0,
            "regra restritiva para marca curta",
        )
    if scores["nominative"] >= THRESHOLDS["name_direct"]:
        return True, "similaridade nominativa direta"
    if (
        scores["nominative"] >= THRESHOLDS["name_with_phonetic"]
        and scores["phonetic"] >= THRESHOLDS["phonetic_support"]
    ):
        return True, "similaridade nominativa apoiada por fonética"
    distinctive_exact = [
        token
        for token in scores["exact_tokens"]
        if len(token) >= 5 and token_df.get(token, MAX_TOKEN_DF + 1) <= 250
    ]
    if distinctive_exact and scores["nominative"] >= 60.0:
        return True, f"token distintivo raro idêntico: {distinctive_exact[0]}"
    return False, "abaixo do limiar de prefiltragem"


def priority_for(
    combined: float,
    nominative: float,
    phonetic: float,
    affinity: float,
    exact_compact: bool,
) -> str:
    if (
        combined >= THRESHOLDS["priority_p0_combined"]
        or (exact_compact and affinity >= 60.0)
        or (nominative >= 97.0 and phonetic >= 95.0 and affinity >= 40.0)
    ):
        return "P0"
    if (
        combined >= THRESHOLDS["priority_p1_combined"]
        or (nominative >= 92.0 and phonetic >= 88.0)
    ):
        return "P1"
    if (
        combined >= THRESHOLDS["priority_p2_combined"]
        or nominative >= 84.0
        or (nominative >= 72.0 and affinity >= 45.0)
    ):
        return "P2"
    return "P3"


def safe_float(value: float | None) -> float:
    return float(value) if value is not None else 0.0


def pair_record(
    base: dict,
    rpi: dict,
    name_scores: dict,
    block_reasons: set[str],
    spec_idf: dict[str, float],
    screening_reason: str,
    legacy_rows: list[dict] | None = None,
) -> dict:
    class_value, class_reason, class_pair = class_score(base, rpi)
    spec_value, common_terms, spec_components = score_specifications(
        base["_spec_tokens"],
        rpi["_spec_tokens"],
        spec_idf,
        base["_spec_norm"],
        rpi["_spec_norm"],
    )
    affinity = max(safe_float(class_value), safe_float(spec_value))
    combined = round(
        WEIGHTS["nominative"] * name_scores["nominative"]
        + WEIGHTS["phonetic"] * name_scores["phonetic"]
        + WEIGHTS["class"] * safe_float(class_value)
        + WEIGHTS["specification"] * safe_float(spec_value),
        2,
    )
    same_titular, titular_score = same_owner(base, rpi)
    cfe_common = sorted(base["_cfe"] & set(rpi.get("cfe", [])))
    flags: list[str] = []
    base_classes = base.get("classification", {}).get("classes", [])
    rpi_classes = rpi.get("classes_nice", [])
    if base.get("classification", {}).get("system") != "NCL":
        flags.append("BASE_CLASSIFICACAO_NAO_NCL")
    elif not set(base_classes) & set(rpi_classes):
        if affinity >= 25.0:
            flags.append("CLASSES_DISTINTAS_COM_AFINIDADE")
        else:
            flags.append("CLASSES_DISTINTAS_SEM_AFINIDADE_CONFIRMADA")
    if spec_value is None:
        flags.append("ESPECIFICACAO_AUSENTE_EM_UM_LADO")
    if min(len(base["_name"]["compact"]), len(rpi["_name"]["compact"])) <= 3:
        flags.append("MARCA_CURTA_ALTA_AMBIGUIDADE")
    if base.get("mark", {}).get("presentation") in {"Mista", "Figurativa"}:
        flags.append("COMPARACAO_VISUAL_BASE_PENDENTE")
    if rpi.get("apresentacao") in {"Mista", "Figurativa", "Tridimensional", "Marca de posição"}:
        flags.append("COMPARACAO_VISUAL_RPI_PENDENTE")
    if same_titular:
        flags.append("POSSIVEL_MESMO_TITULAR")
    if cfe_common:
        flags.append("CFE_EXATO_EM_COMUM")
    if base.get("warnings"):
        flags.append("BASE_COM_PENDENCIAS_CADASTRAIS")
    if legacy_rows:
        flags.append("PRESENTE_NO_LEGACY")

    priority = priority_for(
        combined,
        name_scores["nominative"],
        name_scores["phonetic"],
        affinity,
        name_scores["exact_compact"],
    )
    dispatch_codes = [
        dispatch.get("codigo") for dispatch in rpi.get("despachos", []) if dispatch.get("codigo")
    ]
    dispatch_names = [
        dispatch.get("nome") for dispatch in rpi.get("despachos", []) if dispatch.get("nome")
    ]
    explanations = [
        (
            f"Nome {name_scores['nominative']:.2f}: sequência "
            f"{name_scores['sequence']:.2f}, conjunto de tokens "
            f"{name_scores['token_set']:.2f}, n-gramas {name_scores['gram_dice']:.2f}."
        ),
        (
            f"Fonética {name_scores['phonetic']:.2f}; regra de retenção: "
            f"{screening_reason}."
        ),
        f"Classes {safe_float(class_value):.2f}: {class_reason}.",
    ]
    if spec_value is None:
        explanations.append("Especificações: comparação indisponível por ausência de texto.")
    else:
        explanations.append(
            f"Especificações {spec_value:.2f}: termos comuns mais informativos "
            f"{', '.join(common_terms) if common_terms else 'nenhum'}."
        )
    return {
        "rank": None,
        "priority": priority,
        "combined_score": combined,
        "scores": {
            "nominative": name_scores["nominative"],
            "phonetic": name_scores["phonetic"],
            "class": class_value,
            "specification": spec_value,
            "affinity_max": round(affinity, 2),
            "name_components": {
                key: value
                for key, value in name_scores.items()
                if key
                in {
                    "sequence",
                    "token_sort",
                    "token_set",
                    "gram_dice",
                    "distinctive_sequence",
                    "distinctive_gram_dice",
                    "exact_compact",
                    "substring",
                    "exact_tokens",
                }
            },
            "specification_components": spec_components,
            "titular_similarity": titular_score,
        },
        "base": {
            "excel_row": base.get("source", {}).get("excelRow"),
            "processo": base.get("process", {}).get("normalized"),
            "processo_tipo": base.get("process", {}).get("kind"),
            "marca": base.get("mark", {}).get("raw"),
            "marca_normalizada": base["_name"]["normalized"],
            "familia": base.get("mark", {}).get("autoFamilyId"),
            "apresentacao": base.get("mark", {}).get("presentation"),
            "natureza": base.get("mark", {}).get("nature"),
            "classes": base_classes,
            "sistema_classe": base.get("classification", {}).get("system"),
            "especificacao": base.get("specification", {}).get("raw"),
            "titular": base.get("parties", {}).get("titularRaw"),
            "status_monitoramento": base.get("legalStatus", {}).get("monitoringStatus"),
            "warnings": base.get("warnings", []),
            "ativo_visual": base.get("visualAsset", {}).get("relativePath")
            if base.get("visualAsset")
            else None,
            "cfe": sorted(base["_cfe"]),
        },
        "rpi": {
            "processo": rpi.get("processo"),
            "marca": rpi.get("marca"),
            "marca_normalizada": rpi["_name"]["normalized"],
            "apresentacao": rpi.get("apresentacao"),
            "natureza": rpi.get("natureza"),
            "classes": rpi_classes,
            "classes_nacionais": rpi.get("classes_nacionais"),
            "especificacao": rpi.get("especificacao"),
            "titulares": rpi.get("titulares"),
            "data_deposito": rpi.get("data_deposito"),
            "data_concessao": rpi.get("data_concessao"),
            "data_vigencia": rpi.get("data_vigencia"),
            "despachos_codigos": dispatch_codes,
            "despachos_nomes": dispatch_names,
            "cfe": rpi.get("cfe"),
        },
        "evidence": {
            "blocking_reasons": sorted(block_reasons),
            "screening_rule": screening_reason,
            "exact_name_tokens": name_scores["exact_tokens"],
            "class_reason": class_reason,
            "class_pair": class_pair,
            "common_spec_terms": common_terms,
            "common_cfe": cfe_common,
            "mechanical_explanations": explanations,
        },
        "review_flags": sorted(set(flags)),
        "legacy": {
            "present": bool(legacy_rows),
            "rows": [
                {
                    "id": row.get("ID do Registro"),
                    "tipo_colidencia": row.get("Tipo de Colidência"),
                    "radical": row.get("Radical Colidido"),
                    "nivel": row.get("Nível"),
                    "selecionado": row.get("Selecionado"),
                    "comentarios": row.get("Comentários"),
                    "despacho": row.get("Despacho da RPI"),
                }
                for row in (legacy_rows or [])
            ],
        },
    }


def quantiles(values: list[float]) -> dict:
    if not values:
        return {}
    ordered = sorted(values)
    def percentile(p: float) -> float:
        index = (len(ordered) - 1) * p
        low, high = math.floor(index), math.ceil(index)
        if low == high:
            return ordered[low]
        return ordered[low] * (high - index) + ordered[high] * (index - low)
    return {
        "min": round(ordered[0], 2),
        "p25": round(percentile(0.25), 2),
        "median": round(statistics.median(ordered), 2),
        "p75": round(percentile(0.75), 2),
        "p90": round(percentile(0.90), 2),
        "p95": round(percentile(0.95), 2),
        "max": round(ordered[-1], 2),
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def write_jsonl(path: Path, rows: Iterable[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")


CSV_FIELDS = [
    "rank",
    "priority",
    "combined_score",
    "nominative_score",
    "phonetic_score",
    "class_score",
    "specification_score",
    "base_excel_row",
    "base_processo",
    "base_marca",
    "base_familia",
    "base_apresentacao",
    "base_classes",
    "base_titular",
    "rpi_processo",
    "rpi_marca",
    "rpi_apresentacao",
    "rpi_classes",
    "rpi_titular",
    "rpi_despachos",
    "class_reason",
    "common_spec_terms",
    "blocking_reasons",
    "review_flags",
]


def flatten_csv(row: dict) -> dict:
    return {
        "rank": row["rank"],
        "priority": row["priority"],
        "combined_score": row["combined_score"],
        "nominative_score": row["scores"]["nominative"],
        "phonetic_score": row["scores"]["phonetic"],
        "class_score": row["scores"]["class"],
        "specification_score": row["scores"]["specification"],
        "base_excel_row": row["base"]["excel_row"],
        "base_processo": row["base"]["processo"],
        "base_marca": row["base"]["marca"],
        "base_familia": row["base"]["familia"],
        "base_apresentacao": row["base"]["apresentacao"],
        "base_classes": "|".join(row["base"]["classes"] or []),
        "base_titular": row["base"]["titular"],
        "rpi_processo": row["rpi"]["processo"],
        "rpi_marca": row["rpi"]["marca"],
        "rpi_apresentacao": row["rpi"]["apresentacao"],
        "rpi_classes": "|".join(row["rpi"]["classes"] or []),
        "rpi_titular": "|".join(
            titular.get("nome") or "" for titular in row["rpi"]["titulares"] or []
        ),
        "rpi_despachos": "|".join(row["rpi"]["despachos_codigos"]),
        "class_reason": row["evidence"]["class_reason"],
        "common_spec_terms": "|".join(row["evidence"]["common_spec_terms"]),
        "blocking_reasons": "|".join(row["evidence"]["blocking_reasons"]),
        "review_flags": "|".join(row["review_flags"]),
    }


def write_csv(path: Path, rows: Iterable[dict], fields: list[str] = CSV_FIELDS) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(flatten_csv(row) if "scores" in row else row)


def grouped_families(candidates: list[dict]) -> list[dict]:
    grouped: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for candidate in candidates:
        family = candidate["base"]["familia"] or f"ROW-{candidate['base']['excel_row']}"
        grouped[(family, candidate["rpi"]["processo"])].append(candidate)
    rows = []
    for (family, rpi_process), items in grouped.items():
        best = min(items, key=lambda item: item["rank"])
        rows.append(
            {
                "family_rank": None,
                "priority": best["priority"],
                "best_pair_rank": best["rank"],
                "combined_score": best["combined_score"],
                "nominative_score": best["scores"]["nominative"],
                "phonetic_score": best["scores"]["phonetic"],
                "class_score": best["scores"]["class"],
                "specification_score": best["scores"]["specification"],
                "base_family": family,
                "base_processes": sorted({item["base"]["processo"] for item in items}),
                "base_marks": sorted({item["base"]["marca"] for item in items if item["base"]["marca"]}),
                "base_classes": sorted(
                    {
                        class_code
                        for item in items
                        for class_code in item["base"]["classes"] or []
                    }
                ),
                "rpi_processo": rpi_process,
                "rpi_marca": best["rpi"]["marca"],
                "rpi_classes": best["rpi"]["classes"],
                "pair_count": len(items),
                "review_flags": sorted(
                    {flag for item in items for flag in item["review_flags"]}
                ),
            }
        )
    rows.sort(
        key=lambda row: (
            -row["combined_score"],
            row["base_family"],
            row["rpi_processo"] or "",
        )
    )
    for rank, row in enumerate(rows, 1):
        row["family_rank"] = rank
    return rows


def write_family_csv(path: Path, rows: list[dict]) -> None:
    fields = [
        "family_rank",
        "priority",
        "best_pair_rank",
        "combined_score",
        "nominative_score",
        "phonetic_score",
        "class_score",
        "specification_score",
        "base_family",
        "base_processes",
        "base_marks",
        "base_classes",
        "rpi_processo",
        "rpi_marca",
        "rpi_classes",
        "pair_count",
        "review_flags",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            flattened = dict(row)
            for key in (
                "base_processes",
                "base_marks",
                "base_classes",
                "rpi_classes",
                "review_flags",
            ):
                flattened[key] = "|".join(str(value) for value in flattened[key])
            writer.writerow(flattened)


def markdown_top(candidates: list[dict], summary: dict, limit: int = 100) -> str:
    rpi_number = summary["inputs"]["rpi_zip"]["metadata"].get("numero") or "N/D"
    lines = [
        f"# RPI {rpi_number} × carteira Apex — prefiltragem mecânica",
        "",
        (
            f"Foram retidos **{summary['matching']['candidate_pairs']} pares** "
            f"e **{summary['matching']['candidate_families']} agrupamentos por família**. "
            "Esta é uma fila de triagem, não uma conclusão jurídica."
        ),
        "",
        "| Rank | Pri. | Score | Base | RPI | Nome | Fon. | Classe | Espec. | Flags |",
        "|---:|:---:|---:|---|---|---:|---:|---:|---:|---|",
    ]
    for row in candidates[:limit]:
        base_label = f"{row['base']['processo']} — {row['base']['marca']}"
        rpi_label = f"{row['rpi']['processo']} — {row['rpi']['marca']}"
        flags = ", ".join(row["review_flags"][:3])
        lines.append(
            "| {rank} | {priority} | {combined:.2f} | {base} | {rpi} | "
            "{name:.2f} | {phon:.2f} | {class_score} | {spec_score} | {flags} |".format(
                rank=row["rank"],
                priority=row["priority"],
                combined=row["combined_score"],
                base=str(base_label).replace("|", "/"),
                rpi=str(rpi_label).replace("|", "/"),
                name=row["scores"]["nominative"],
                phon=row["scores"]["phonetic"],
                class_score=(
                    f"{row['scores']['class']:.2f}"
                    if row["scores"]["class"] is not None
                    else "N/D"
                ),
                spec_score=(
                    f"{row['scores']['specification']:.2f}"
                    if row["scores"]["specification"] is not None
                    else "N/D"
                ),
                flags=flags.replace("|", "/"),
            )
        )
    lines.extend(
        [
            "",
            "Critérios, limitações e definições completas constam em `README.md` e `summary.json`.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prefiltragem auditável da RPI de Marcas contra a carteira Apex."
    )
    parser.add_argument("--base", type=Path, required=True)
    parser.add_argument("--rpi-zip", type=Path, required=True)
    parser.add_argument("--legacy-candidates", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument(
        "--dispatch-families",
        default=",".join(sorted(OPPOSITION_DISPATCH_FAMILIES)),
        help=(
            "Famílias de despacho separadas por vírgula, por exemplo "
            "I009,I421,I756,I757 ou I158,I770."
        ),
    )
    args = parser.parse_args()
    selected_dispatch_families = {
        dispatch_family(value)
        for value in args.dispatch_families.split(",")
        if str(value).strip()
    }
    if not selected_dispatch_families:
        raise ValueError("Informe ao menos uma família de despacho.")

    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    started_at = datetime.now(timezone.utc)

    with args.base.open(encoding="utf-8") as stream:
        base_document = json.load(stream)
    rpi_metadata, raw_rpi_records = read_rpi(args.rpi_zip)
    legacy_rows_all = read_legacy_candidates(args.legacy_candidates)
    legacy_rows_i009 = [
        row
        for row in legacy_rows_all
        if dispatch_family(row.get("Despacho da RPI")) == "I009"
    ]
    legacy_pair_index: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in legacy_rows_i009:
        legacy_pair_index[
            (
                str(row.get("Processo Cadastrado") or "").strip(),
                str(row.get("Processo da RPI") or "").strip(),
            )
        ].append(row)
    legacy_rpi_by_base: dict[str, set[str]] = defaultdict(set)
    for base_process, rpi_process in legacy_pair_index:
        legacy_rpi_by_base[base_process].add(rpi_process)

    base_all = base_document["records"]
    base_screenable_raw = [
        record
        for record in base_all
        if record.get("legalStatus", {}).get("includedInWeeklyScreening", True)
        and record.get("mark", {}).get("presentation") != "Figurativa"
        and canonical(record.get("mark", {}).get("normalized") or record.get("mark", {}).get("raw"))
    ]
    base_visual_only = [
        record
        for record in base_all
        if record.get("mark", {}).get("presentation") == "Figurativa"
        or not canonical(record.get("mark", {}).get("normalized") or record.get("mark", {}).get("raw"))
    ]
    known_base_processes = {
        record.get("process", {}).get("normalized")
        for record in base_all
        if record.get("process", {}).get("kind") == "INPI_OFICIAL"
    }
    rpi_opposition_raw = [
        record
        for record in raw_rpi_records
        if any(
            dispatch_family(dispatch.get("codigo")) in selected_dispatch_families
            for dispatch in record.get("despachos", [])
        )
    ]
    rpi_portfolio_publications = [
        record
        for record in rpi_opposition_raw
        if record.get("processo") in known_base_processes
    ]
    rpi_third_party_raw = [
        record
        for record in rpi_opposition_raw
        if record.get("processo") not in known_base_processes
    ]
    rpi_screenable_raw = [
        record for record in rpi_third_party_raw if canonical(record.get("marca"))
    ]
    rpi_visual_only = [
        record
        for record in rpi_third_party_raw
        if record.get("apresentacao") == "Figurativa" or not canonical(record.get("marca"))
    ]

    base_records = [prepare_base(record) for record in base_screenable_raw]
    rpi_records = [prepare_rpi(record) for record in rpi_screenable_raw]

    spec_idf, spec_document_count = build_idf(
        [record["_spec_tokens"] for record in base_records + rpi_records]
    )
    for record in base_records + rpi_records:
        record["_spec_norm"] = spec_norm(record["_spec_tokens"], spec_idf)

    indexes, index_stats = build_indexes(rpi_records)
    base_all_by_process = {
        str(record.get("process", {}).get("normalized") or ""): record
        for record in base_all
        if record.get("process", {}).get("normalized")
    }
    base_screenable_by_process = {
        str(record.get("process", {}).get("normalized") or ""): record
        for record in base_records
        if record.get("process", {}).get("normalized")
    }
    rpi_opposition_by_process = {
        str(record.get("processo") or ""): record for record in rpi_opposition_raw
    }
    rpi_screenable_by_process = {
        str(record.get("processo") or ""): (index, record)
        for index, record in enumerate(rpi_records)
    }
    legacy_coverage: dict[tuple[str, str], dict] = {}
    for pair_key, rows in legacy_pair_index.items():
        base_process, rpi_process = pair_key
        status = "PENDING"
        if base_process not in base_all_by_process:
            status = "BASE_NOT_IN_MASTER"
        elif base_process not in base_screenable_by_process:
            status = "BASE_NOT_NAME_SCREENABLE"
        elif rpi_process not in rpi_opposition_by_process:
            status = "RPI_NOT_OPPOSITION_ELIGIBLE_XML"
        elif rpi_process in known_base_processes:
            status = "RPI_PROCESS_IN_PORTFOLIO"
        elif rpi_process not in rpi_screenable_by_process:
            status = "RPI_NOT_NAME_SCREENABLE"
        legacy_coverage[pair_key] = {
            "base_processo": base_process,
            "base_marca_legacy": rows[0].get("Marca do Processo Cadastrado"),
            "rpi_processo": rpi_process,
            "rpi_marca_legacy": rows[0].get("Marca do Processo da RPI"),
            "legacy_rows": len(rows),
            "legacy_ids": "|".join(
                str(row.get("ID do Registro") or "") for row in rows
            ),
            "legacy_niveis": "|".join(
                sorted({str(row.get("Nível") or "") for row in rows})
            ),
            "legacy_radicais": "|".join(
                sorted({str(row.get("Radical Colidido") or "") for row in rows})
            ),
            "status": status,
            "candidate_rank": None,
            "combined_score": None,
            "nominative_score": None,
            "phonetic_score": None,
            "class_score": None,
            "specification_score": None,
            "screening_rule": None,
        }

    candidates: list[dict] = []
    same_owner_separated: list[dict] = []
    blocking_caps: list[dict] = []
    evaluated_pairs = 0
    below_threshold = 0
    bases_with_any_kept: set[int] = set()

    for base in base_records:
        blocked, capped = blocked_candidates(base, indexes)
        base_process = str(base.get("process", {}).get("normalized") or "")
        for legacy_rpi_process in legacy_rpi_by_base.get(base_process, set()):
            rpi_entry = rpi_screenable_by_process.get(legacy_rpi_process)
            if rpi_entry:
                blocked.setdefault(rpi_entry[0], set()).add("LEGACY_BENCHMARK")
        if capped:
            blocking_caps.append(
                {
                    "excel_row": base.get("source", {}).get("excelRow"),
                    "processo": base.get("process", {}).get("normalized"),
                    "marca": base.get("mark", {}).get("raw"),
                    "cap": MAX_BLOCKED_CANDIDATES_PER_BASE,
                }
            )
        for rpi_index, reasons in blocked.items():
            evaluated_pairs += 1
            rpi = rpi_records[rpi_index]
            name_scores = score_names(base["_name"], rpi["_name"])
            keep, screening_reason = keep_name_candidate(
                base, name_scores, index_stats["rpi_token_df"]
            )
            pair_key = (
                str(base.get("process", {}).get("normalized") or ""),
                str(rpi.get("processo") or ""),
            )
            legacy_rows = legacy_pair_index.get(pair_key, [])
            if not keep:
                below_threshold += 1
                if legacy_rows:
                    coverage_pair = pair_record(
                        base,
                        rpi,
                        name_scores,
                        reasons,
                        spec_idf,
                        screening_reason,
                        legacy_rows,
                    )
                    coverage = legacy_coverage[pair_key]
                    coverage.update(
                        {
                            "status": "EVALUATED_BELOW_THRESHOLD",
                            "combined_score": coverage_pair["combined_score"],
                            "nominative_score": coverage_pair["scores"]["nominative"],
                            "phonetic_score": coverage_pair["scores"]["phonetic"],
                            "class_score": coverage_pair["scores"]["class"],
                            "specification_score": coverage_pair["scores"][
                                "specification"
                            ],
                            "screening_rule": screening_reason,
                        }
                    )
                continue
            pair = pair_record(
                base,
                rpi,
                name_scores,
                reasons,
                spec_idf,
                screening_reason,
                legacy_rows,
            )
            if pair["scores"]["titular_similarity"] >= 92.0:
                pair["review_flags"] = sorted(
                    set(
                        pair["review_flags"]
                        + ["MESMO_TITULAR_ALTA_CONFIANCA_SEPARADO"]
                    )
                )
                same_owner_separated.append(pair)
                if legacy_rows:
                    coverage = legacy_coverage[pair_key]
                    coverage.update(
                        {
                            "status": "SAME_OWNER_HIGH_CONFIDENCE_SEPARATED",
                            "combined_score": pair["combined_score"],
                            "nominative_score": pair["scores"]["nominative"],
                            "phonetic_score": pair["scores"]["phonetic"],
                            "class_score": pair["scores"]["class"],
                            "specification_score": pair["scores"]["specification"],
                            "screening_rule": screening_reason,
                        }
                    )
                continue
            candidates.append(pair)
            bases_with_any_kept.add(base.get("source", {}).get("excelRow"))
            if legacy_rows:
                coverage = legacy_coverage[pair_key]
                coverage.update(
                    {
                        "status": "RECOVERED_MECHANICAL",
                        "combined_score": pair["combined_score"],
                        "nominative_score": pair["scores"]["nominative"],
                        "phonetic_score": pair["scores"]["phonetic"],
                        "class_score": pair["scores"]["class"],
                        "specification_score": pair["scores"]["specification"],
                        "screening_rule": screening_reason,
                    }
                )

    candidates.sort(
        key=lambda row: (
            -row["combined_score"],
            -row["scores"]["nominative"],
            -row["scores"]["phonetic"],
            row["base"]["excel_row"] or 0,
            row["rpi"]["processo"] or "",
        )
    )
    for rank, candidate in enumerate(candidates, 1):
        candidate["rank"] = rank
        pair_key = (
            str(candidate["base"]["processo"] or ""),
            str(candidate["rpi"]["processo"] or ""),
        )
        if pair_key in legacy_coverage:
            legacy_coverage[pair_key]["candidate_rank"] = rank

    family_rows = grouped_families(candidates)
    top_by_base: set[int] = set()
    for candidate in candidates:
        row = candidate["base"]["excel_row"]
        if row not in top_by_base:
            candidate["review_flags"] = sorted(
                set(candidate["review_flags"] + ["MELHOR_CANDIDATO_DESTA_LINHA_BASE"])
            )
            top_by_base.add(row)
    human_review = [
        candidate
        for candidate in candidates
        if candidate["priority"] in {"P0", "P1", "P2"}
        or "MELHOR_CANDIDATO_DESTA_LINHA_BASE" in candidate["review_flags"]
        or (
            "CLASSES_DISTINTAS_COM_AFINIDADE" in candidate["review_flags"]
            and candidate["scores"]["nominative"] >= 70.0
        )
    ]

    dispatch_counts = Counter(
        dispatch.get("codigo") or "SEM_CODIGO"
        for record in raw_rpi_records
        for dispatch in record.get("despachos", [])
    )
    priority_counts = Counter(candidate["priority"] for candidate in candidates)
    flag_counts = Counter(flag for candidate in candidates for flag in candidate["review_flags"])
    candidate_counts_by_base = Counter(
        candidate["base"]["excel_row"] for candidate in candidates
    )
    summary = {
        "pipeline": {
            "version": PIPELINE_VERSION,
            "started_at_utc": started_at.isoformat(),
            "completed_at_utc": datetime.now(timezone.utc).isoformat(),
            "weights": WEIGHTS,
            "thresholds": THRESHOLDS,
            "blocking_limits": {
                "max_token_df": MAX_TOKEN_DF,
                "max_phonetic_df": MAX_PHONETIC_DF,
                "max_gram_df": MAX_GRAM_DF,
                "max_gram_candidates_per_base": MAX_GRAM_CANDIDATES_PER_BASE,
                "max_blocked_candidates_per_base": MAX_BLOCKED_CANDIDATES_PER_BASE,
            },
            "class_affinity_pairs": len(CLASS_AFFINITY),
            "specification_idf_documents": spec_document_count,
        },
        "inputs": {
            "base": {
                "path": str(args.base.resolve()),
                "sha256": sha256(args.base),
                "metadata": base_document.get("metadata"),
            },
            "rpi_zip": {
                "path": str(args.rpi_zip.resolve()),
                "sha256": sha256(args.rpi_zip),
                "metadata": rpi_metadata,
            },
            "legacy_candidates": {
                "path": str(args.legacy_candidates.resolve())
                if args.legacy_candidates
                else None,
                "sha256": sha256(args.legacy_candidates)
                if args.legacy_candidates
                else None,
                "rows_total": len(legacy_rows_all),
                "rows_i009": len(legacy_rows_i009),
                "unique_pairs_i009": len(legacy_pair_index),
                "role": "benchmark independente; não altera os scores",
            },
        },
        "base": {
            "records_total": len(base_all),
            "records_name_screenable": len(base_records),
            "records_visual_or_nameless": len(base_visual_only),
            "records_with_candidate": len(bases_with_any_kept),
        },
        "rpi": {
            "processes_total": len(raw_rpi_records),
            "selected_dispatch_families": sorted(selected_dispatch_families),
            "processes_selected": len(rpi_opposition_raw),
            "portfolio_process_publications_separated": len(
                rpi_portfolio_publications
            ),
            "third_party_selected_processes": len(rpi_third_party_raw),
            "third_party_selected_with_name": len(rpi_records),
            "selected_visual_or_nameless_records": len(rpi_visual_only),
            "unique_named_processes_in_candidates": len(
                {candidate["rpi"]["processo"] for candidate in candidates}
            ),
            "dispatch_code_counts": dict(dispatch_counts.most_common()),
        },
        "matching": {
            "theoretical_cartesian_pairs": len(base_records) * len(rpi_records),
            "blocked_pairs_evaluated": evaluated_pairs,
            "blocked_pairs_below_name_threshold": below_threshold,
            "blocking_cap_events": len(blocking_caps),
            "candidate_pairs": len(candidates),
            "candidate_families": len(family_rows),
            "human_review_pairs": len(human_review),
            "same_owner_high_confidence_pairs_separated": len(
                same_owner_separated
            ),
            "legacy_benchmark": {
                "status_counts": dict(
                    Counter(
                        row["status"] for row in legacy_coverage.values()
                    ).most_common()
                ),
                "recovered_pairs": sum(
                    row["status"] == "RECOVERED_MECHANICAL"
                    for row in legacy_coverage.values()
                ),
                "eligible_evaluated_pairs": sum(
                    row["status"]
                    in {"RECOVERED_MECHANICAL", "EVALUATED_BELOW_THRESHOLD"}
                    for row in legacy_coverage.values()
                ),
            },
            "priority_counts": dict(sorted(priority_counts.items())),
            "review_flag_counts": dict(flag_counts.most_common()),
            "combined_score_distribution": quantiles(
                [candidate["combined_score"] for candidate in candidates]
            ),
            "nominative_score_distribution": quantiles(
                [candidate["scores"]["nominative"] for candidate in candidates]
            ),
            "candidates_per_base_distribution": quantiles(
                [float(value) for value in candidate_counts_by_base.values()]
            ),
        },
        "validation": {
            "rpi_issue_matches_xml_entry": (
                rpi_metadata.get("xml_entry")
                == f"RM{rpi_metadata.get('numero')}.xml"
            ),
            "candidate_ranks_contiguous": all(
                candidate["rank"] == index
                for index, candidate in enumerate(candidates, 1)
            ),
            "no_same_process_in_candidates": all(
                candidate["base"]["processo"] != candidate["rpi"]["processo"]
                for candidate in candidates
            ),
            "no_known_portfolio_process_as_rpi_third_party": all(
                candidate["rpi"]["processo"] not in known_base_processes
                for candidate in candidates
            ),
            "no_high_confidence_same_owner_in_candidates": all(
                candidate["scores"]["titular_similarity"] < 92.0
                for candidate in candidates
            ),
            "all_scores_in_range": all(
                0.0 <= candidate["combined_score"] <= 100.0
                and 0.0 <= candidate["scores"]["nominative"] <= 100.0
                and 0.0 <= candidate["scores"]["phonetic"] <= 100.0
                for candidate in candidates
            ),
        },
        "blocking_cap_details": blocking_caps,
    }

    candidates_jsonl = output_dir / "candidates_ranked.jsonl"
    candidates_csv = output_dir / "candidates_ranked.csv"
    review_csv = output_dir / "human_review.csv"
    families_csv = output_dir / "candidate_families.csv"
    portfolio_csv = output_dir / "portfolio_process_publications.csv"
    same_owner_csv = output_dir / "same_owner_high_confidence_separated.csv"
    visual_base_csv = output_dir / "visual_only_base.csv"
    visual_rpi_csv = output_dir / "visual_or_nameless_rpi.csv"
    legacy_coverage_csv = output_dir / "legacy_i009_coverage.csv"
    legacy_not_recovered_csv = output_dir / "legacy_i009_not_recovered.csv"
    summary_path = output_dir / "summary.json"
    top_path = output_dir / "top_100.md"

    write_jsonl(candidates_jsonl, candidates)
    write_csv(candidates_csv, candidates)
    write_csv(review_csv, human_review)
    write_family_csv(families_csv, family_rows)
    with portfolio_csv.open("w", encoding="utf-8-sig", newline="") as stream:
        fields = [
            "processo",
            "marca",
            "apresentacao",
            "classes",
            "titulares",
            "despachos",
            "reason",
        ]
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for record in rpi_portfolio_publications:
            writer.writerow(
                {
                    "processo": record.get("processo"),
                    "marca": record.get("marca"),
                    "apresentacao": record.get("apresentacao"),
                    "classes": "|".join(record.get("classes_nice", [])),
                    "titulares": "|".join(
                        titular.get("nome") or ""
                        for titular in record.get("titulares", [])
                    ),
                    "despachos": "|".join(
                        dispatch.get("codigo") or ""
                        for dispatch in record.get("despachos", [])
                    ),
                    "reason": "processo já existente na carteira Apex",
                }
            )
    write_csv(same_owner_csv, same_owner_separated)
    with visual_base_csv.open("w", encoding="utf-8-sig", newline="") as stream:
        fields = ["excel_row", "processo", "marca", "apresentacao", "classes", "visual_asset"]
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for record in base_visual_only:
            writer.writerow(
                {
                    "excel_row": record.get("source", {}).get("excelRow"),
                    "processo": record.get("process", {}).get("normalized"),
                    "marca": record.get("mark", {}).get("raw"),
                    "apresentacao": record.get("mark", {}).get("presentation"),
                    "classes": "|".join(record.get("classification", {}).get("classes", [])),
                    "visual_asset": record.get("visualAsset", {}).get("relativePath")
                    if record.get("visualAsset")
                    else None,
                }
            )
    with visual_rpi_csv.open("w", encoding="utf-8-sig", newline="") as stream:
        fields = [
            "processo",
            "marca",
            "apresentacao",
            "classes",
            "cfe",
            "despachos",
        ]
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for record in rpi_visual_only:
            writer.writerow(
                {
                    "processo": record.get("processo"),
                    "marca": record.get("marca"),
                    "apresentacao": record.get("apresentacao"),
                    "classes": "|".join(record.get("classes_nice", [])),
                    "cfe": "|".join(record.get("cfe", [])),
                    "despachos": "|".join(
                        dispatch.get("codigo") or ""
                        for dispatch in record.get("despachos", [])
                    ),
                }
            )
    legacy_coverage_rows = sorted(
        legacy_coverage.values(),
        key=lambda row: (
            row["status"],
            row["base_processo"],
            row["rpi_processo"],
        ),
    )
    legacy_fields = [
        "base_processo",
        "base_marca_legacy",
        "rpi_processo",
        "rpi_marca_legacy",
        "legacy_rows",
        "legacy_ids",
        "legacy_niveis",
        "legacy_radicais",
        "status",
        "candidate_rank",
        "combined_score",
        "nominative_score",
        "phonetic_score",
        "class_score",
        "specification_score",
        "screening_rule",
    ]
    with legacy_coverage_csv.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=legacy_fields)
        writer.writeheader()
        writer.writerows(legacy_coverage_rows)
    with legacy_not_recovered_csv.open(
        "w", encoding="utf-8-sig", newline=""
    ) as stream:
        writer = csv.DictWriter(stream, fieldnames=legacy_fields)
        writer.writeheader()
        writer.writerows(
            row
            for row in legacy_coverage_rows
            if row["status"] != "RECOVERED_MECHANICAL"
        )
    write_json(summary_path, summary)
    top_path.write_text(markdown_top(candidates, summary), encoding="utf-8")

    output_files = [
        candidates_jsonl,
        candidates_csv,
        review_csv,
        families_csv,
        portfolio_csv,
        same_owner_csv,
        visual_base_csv,
        visual_rpi_csv,
        legacy_coverage_csv,
        legacy_not_recovered_csv,
        summary_path,
        top_path,
    ]
    support_files = [
        Path(__file__).resolve(),
        output_dir / "README.md",
    ]
    manifest = {
        "pipeline_version": PIPELINE_VERSION,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "files": [
            {
                "name": path.name,
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
            for path in output_files + support_files
            if path.exists()
        ],
    }
    write_json(output_dir / "manifest.json", manifest)
    print(
        json.dumps(
            {
                "rpi": rpi_metadata,
                "base_screenable": len(base_records),
                "rpi_named": len(rpi_records),
                "legacy_i009_pairs": len(legacy_pair_index),
                "evaluated_pairs": evaluated_pairs,
                "candidate_pairs": len(candidates),
                "candidate_families": len(family_rows),
                "human_review": len(human_review),
                "portfolio_publications_separated": len(
                    rpi_portfolio_publications
                ),
                "same_owner_separated": len(same_owner_separated),
                "blocking_caps": len(blocking_caps),
                "output_dir": str(output_dir),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
