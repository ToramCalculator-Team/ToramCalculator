#!/usr/bin/env python3
"""Tests for the read-only ADR structural auditor."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from audit_decisions import audit


VALID_ADR = """# 0001 - Use one decision source

- **Status**: Accepted
- **Date**: 2026-07-13

## Context

The project needs one authoritative decision source.

## Considered Options

Use one source or duplicate the decision.

## Decision

Use one source.

## Consequences

Consumers must link to the source.
"""


def write_index(path: Path, status: str) -> None:
    path.write_text(
        "# Decisions\n\n"
        "| ADR | Title | Status | Date |\n"
        "|---|---|---|---|\n"
        f"| [0001](./0001-use-one-source.md) | Use one source | {status} | 2026-07-13 |\n",
        encoding="utf-8",
    )


class AuditDecisionsTest(unittest.TestCase):
    def make_repository(self) -> tuple[tempfile.TemporaryDirectory[str], Path, Path]:
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name)
        decisions = root / "docs" / "decisions"
        decisions.mkdir(parents=True)
        return temporary, root, decisions

    def test_accepts_structurally_valid_repository(self) -> None:
        temporary, root, decisions = self.make_repository()
        self.addCleanup(temporary.cleanup)
        (decisions / "0001-use-one-source.md").write_text(VALID_ADR, encoding="utf-8")
        write_index(decisions / "README.md", "Accepted")

        records, findings = audit(root, decisions)

        self.assertEqual([record.number for record in records], ["0001"])
        self.assertEqual(findings, [])

    def test_reports_invalid_status_relation_and_index(self) -> None:
        temporary, root, decisions = self.make_repository()
        self.addCleanup(temporary.cleanup)
        invalid = VALID_ADR.replace(
            "- **Status**: Accepted",
            "- **Status**: In progress\n- **Related ADRs**: Depends on 0002",
        )
        (decisions / "0001-use-one-source.md").write_text(invalid, encoding="utf-8")
        write_index(decisions / "README.md", "Accepted")

        _, findings = audit(root, decisions)
        codes = {finding.code for finding in findings}

        self.assertIn("invalid-status", codes)
        self.assertIn("missing-relation-target", codes)
        self.assertIn("index-status", codes)

    def test_withdrawn_misclassification_does_not_require_options(self) -> None:
        temporary, root, decisions = self.make_repository()
        self.addCleanup(temporary.cleanup)
        withdrawn = VALID_ADR.replace("- **Status**: Accepted", "- **Status**: Withdrawn").replace(
            "## Considered Options\n\nUse one source or duplicate the decision.\n\n",
            "",
        )
        (decisions / "0001-use-one-source.md").write_text(withdrawn, encoding="utf-8")
        write_index(decisions / "README.md", "Withdrawn")

        _, findings = audit(root, decisions)

        self.assertNotIn("missing-options", {finding.code for finding in findings})

    def test_reports_untyped_relation(self) -> None:
        temporary, root, decisions = self.make_repository()
        self.addCleanup(temporary.cleanup)
        invalid = VALID_ADR.replace(
            "- **Date**: 2026-07-13",
            "- **Date**: 2026-07-13\n- **Related ADRs**: 0002",
        )
        (decisions / "0001-use-one-source.md").write_text(invalid, encoding="utf-8")
        write_index(decisions / "README.md", "Accepted")

        _, findings = audit(root, decisions)

        self.assertIn("untyped-relation", {finding.code for finding in findings})


if __name__ == "__main__":
    unittest.main()
