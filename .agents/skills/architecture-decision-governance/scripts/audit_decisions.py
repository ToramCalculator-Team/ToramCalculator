#!/usr/bin/env python3
"""Read-only structural audit for a Markdown ADR repository."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


FILE_PATTERN = re.compile(r"^(?P<number>\d{4})-(?P<slug>[a-z0-9][a-z0-9-]*)\.md$")
STATUS_PATTERN = re.compile(
    r"^(?:Proposed|Accepted|Rejected|Deprecated|Withdrawn|Superseded by \d{4})$"
)
TITLE_PATTERN = re.compile(r"^#\s+(?:(?P<number>\d{4})\s+-\s+)?(?P<title>.+?)\s*$", re.MULTILINE)
METADATA_PATTERN = re.compile(r"^-\s+\*\*(?P<key>[^*]+)\*\*:\s*(?P<value>.*?)\s*$", re.MULTILINE)
INDEX_PATTERN = re.compile(
    r"^\|\s*\[(?P<number>\d{4})\]\([^)]*\)\s*\|(?P<rest>.*)$", re.MULTILINE
)
ADR_REFERENCE_PATTERN = re.compile(r"(?<!\d)(\d{4})(?!\d)")
RELATION_PART_PATTERN = re.compile(
    r"^(?:Supersedes|Superseded by|Depends on|Refines|Conflicts with|Related to) "
    r"\d{4}(?:\s*[、,，]\s*\d{4})*$"
)
RELATION_SPLIT_PATTERN = re.compile(r"[;；]")


@dataclass(frozen=True)
class DecisionRecord:
    number: str
    path: str
    title: str | None
    status: str | None
    date: str | None
    relations: str | None


@dataclass(frozen=True)
class Finding:
    severity: str
    code: str
    path: str
    message: str


def find_decisions_dir(repo_root: Path, explicit: Path | None) -> Path:
    if explicit is not None:
        path = explicit if explicit.is_absolute() else repo_root / explicit
        return path.resolve()

    candidates = (repo_root / "docs" / "decisions", repo_root / "docs" / "adr")
    for candidate in candidates:
        if candidate.is_dir():
            return candidate.resolve()
    raise ValueError("No docs/decisions or docs/adr directory found")


def parse_metadata(content: str) -> dict[str, str]:
    return {
        match.group("key").strip(): match.group("value").strip()
        for match in METADATA_PATTERN.finditer(content)
    }


def parse_record(path: Path, decisions_dir: Path) -> tuple[DecisionRecord | None, list[Finding]]:
    findings: list[Finding] = []
    match = FILE_PATTERN.match(path.name)
    relative = str(path.relative_to(decisions_dir))
    if match is None:
        if path.name != "README.md":
            findings.append(
                Finding("warning", "filename", relative, "File does not follow NNNN-kebab-case.md")
            )
        return None, findings

    number = match.group("number")
    if number == "0000":
        return None, findings

    content = path.read_text(encoding="utf-8")
    title_match = TITLE_PATTERN.search(content)
    metadata = parse_metadata(content)
    status = metadata.get("状态") or metadata.get("Status")
    date = metadata.get("日期") or metadata.get("Date")
    relations = metadata.get("相关 ADR") or metadata.get("Related ADRs")

    title_number = title_match.group("number") if title_match else None
    title = title_match.group("title").strip() if title_match else None
    if title is None:
        findings.append(Finding("error", "missing-title", relative, "Missing level-one title"))
    elif title_number is not None and title_number != number:
        findings.append(
            Finding(
                "error",
                "title-number",
                relative,
                f"Title number {title_number} does not match filename number {number}",
            )
        )

    if status is None:
        findings.append(Finding("error", "missing-status", relative, "Missing status metadata"))
    elif STATUS_PATTERN.fullmatch(status) is None:
        findings.append(
            Finding("error", "invalid-status", relative, f"Unsupported status value: {status}")
        )

    if date is None:
        findings.append(Finding("warning", "missing-date", relative, "Missing date metadata"))

    if relations:
        for part in RELATION_SPLIT_PATTERN.split(relations):
            normalized = part.strip()
            if normalized and RELATION_PART_PATTERN.fullmatch(normalized) is None:
                findings.append(
                    Finding(
                        "error",
                        "untyped-relation",
                        relative,
                        f"Relation must use a supported typed prefix: {normalized}",
                    )
                )

    headings = set(re.findall(r"^##\s+(.+?)\s*$", content, re.MULTILINE))
    if not ({"背景", "决策问题", "Context"} & headings):
        findings.append(
            Finding("warning", "missing-context", relative, "Missing context or decision-question section")
        )
    if status != "Withdrawn" and not ({"候选方案", "考虑的方案", "Considered Options"} & headings):
        findings.append(
            Finding("warning", "missing-options", relative, "Missing considered-options section")
        )
    if not ({"决议", "决策", "Decision"} & headings):
        findings.append(Finding("error", "missing-decision", relative, "Missing decision section"))
    if not ({"代价", "后果", "Consequences"} & headings):
        findings.append(Finding("warning", "missing-consequences", relative, "Missing consequences section"))

    return (
        DecisionRecord(number, relative, title, status, date, relations),
        findings,
    )


def parse_index(readme: Path) -> dict[str, str]:
    if not readme.is_file():
        return {}
    content = readme.read_text(encoding="utf-8")
    entries: dict[str, str] = {}
    for match in INDEX_PATTERN.finditer(content):
        cells = [cell.strip() for cell in match.group("rest").split("|")]
        status = cells[1] if len(cells) >= 2 else ""
        entries[match.group("number")] = status
    return entries


def audit(repo_root: Path, decisions_dir: Path) -> tuple[list[DecisionRecord], list[Finding]]:
    records: list[DecisionRecord] = []
    findings: list[Finding] = []
    seen_numbers: dict[str, str] = {}

    for path in sorted(decisions_dir.glob("*.md")):
        record, path_findings = parse_record(path, decisions_dir)
        findings.extend(path_findings)
        if record is None:
            continue
        if record.number in seen_numbers:
            findings.append(
                Finding(
                    "error",
                    "duplicate-number",
                    record.path,
                    f"Decision number also used by {seen_numbers[record.number]}",
                )
            )
        else:
            seen_numbers[record.number] = record.path
        records.append(record)

    numbers = {record.number for record in records}
    for record in records:
        if record.relations:
            for reference in ADR_REFERENCE_PATTERN.findall(record.relations):
                if reference not in numbers:
                    findings.append(
                        Finding(
                            "error",
                            "missing-relation-target",
                            record.path,
                            f"Related ADR {reference} does not exist",
                        )
                    )
        if record.status and record.status.startswith("Superseded by "):
            target = record.status.removeprefix("Superseded by ")
            if target not in numbers:
                findings.append(
                    Finding(
                        "error",
                        "missing-superseding-target",
                        record.path,
                        f"Superseding ADR {target} does not exist",
                    )
                )

    readme = decisions_dir / "README.md"
    index = parse_index(readme)
    if not readme.is_file():
        findings.append(Finding("error", "missing-index", str(readme), "Missing README index"))
    else:
        for record in records:
            indexed_status = index.get(record.number)
            if indexed_status is None:
                findings.append(
                    Finding("error", "missing-index-entry", record.path, "Decision is absent from README index")
                )
            elif record.status and indexed_status != record.status:
                findings.append(
                    Finding(
                        "error",
                        "index-status",
                        record.path,
                        f"README status '{indexed_status}' differs from file status '{record.status}'",
                    )
                )
        for number in sorted(set(index) - numbers):
            findings.append(
                Finding(
                    "error",
                    "orphan-index-entry",
                    str(readme.relative_to(repo_root)),
                    f"README references missing ADR {number}",
                )
            )

    return records, findings


def render_text(decisions_dir: Path, records: list[DecisionRecord], findings: list[Finding]) -> str:
    errors = sum(finding.severity == "error" for finding in findings)
    warnings = sum(finding.severity == "warning" for finding in findings)
    lines = [
        f"ADR directory: {decisions_dir}",
        f"Records: {len(records)}; errors: {errors}; warnings: {warnings}",
    ]
    for finding in findings:
        lines.append(
            f"{finding.severity.upper()} [{finding.code}] {finding.path}: {finding.message}"
        )
    if not findings:
        lines.append("No structural findings.")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo_root", nargs="?", default=".")
    parser.add_argument("--decisions-dir", type=Path)
    parser.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    try:
        decisions_dir = find_decisions_dir(repo_root, args.decisions_dir)
        records, findings = audit(repo_root, decisions_dir)
    except (OSError, UnicodeError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2

    if args.format == "json":
        print(
            json.dumps(
                {
                    "decisions_dir": str(decisions_dir),
                    "records": [asdict(record) for record in records],
                    "findings": [asdict(finding) for finding in findings],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        print(render_text(decisions_dir, records, findings))

    return 1 if any(finding.severity == "error" for finding in findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
