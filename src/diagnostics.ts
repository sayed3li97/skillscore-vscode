// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode';
import type { SkillFinding, SkillResult } from './types';

const SOURCE = 'skillscore';

function toVscodeSeverity(s: SkillFinding['severity']): vscode.DiagnosticSeverity {
  switch (s) {
    case 'error':   return vscode.DiagnosticSeverity.Error;
    case 'warning': return vscode.DiagnosticSeverity.Warning;
    default:        return vscode.DiagnosticSeverity.Information;
  }
}

function findingToDiagnostic(
  finding: SkillFinding,
  doc: vscode.TextDocument,
): vscode.Diagnostic {
  // Use the reported line (1-based) or fall back to line 1.
  const lineIndex = Math.max(0, (finding.line ?? 1) - 1);
  const line = doc.lineAt(Math.min(lineIndex, doc.lineCount - 1));
  const range = new vscode.Range(
    line.range.start,
    line.range.end,
  );

  const diag = new vscode.Diagnostic(
    range,
    `${finding.message}  Fix: ${finding.fixHint}`,
    toVscodeSeverity(finding.severity),
  );
  diag.source = SOURCE;
  diag.code = {
    value: finding.ruleId,
    target: vscode.Uri.parse(
      `https://github.com/sayed3li97/skillscore#the-full-rubric`,
    ),
  };
  return diag;
}

export function applyDiagnostics(
  collection: vscode.DiagnosticCollection,
  uri: vscode.Uri,
  result: SkillResult,
  doc: vscode.TextDocument,
): void {
  const diagnostics = result.findings.map((f) => findingToDiagnostic(f, doc));
  collection.set(uri, diagnostics);
}

export function clearDiagnostics(
  collection: vscode.DiagnosticCollection,
  uri: vscode.Uri,
): void {
  collection.delete(uri);
}
