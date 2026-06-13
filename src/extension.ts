// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import * as vscode from 'vscode';
import { applyDiagnostics, clearDiagnostics } from './diagnostics';
import { ScoreTreeProvider } from './panel';
import { runSkillscore } from './scorer';
import { getSkillscorePath } from './binary';
import type { ExtensionContext } from 'vscode';

const SKILL_FILENAME = 'SKILL.md';

// Per-URI debounce timers so rapid saves don't queue multiple CLI runs.
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

let diagnostics: vscode.DiagnosticCollection;
let statusBar: vscode.StatusBarItem;
let treeProvider: ScoreTreeProvider;
let ctx: ExtensionContext;

// ── Activation ────────────────────────────────────────────────────────────────

export function activate(context: ExtensionContext): void {
  ctx = context;

  diagnostics = vscode.languages.createDiagnosticCollection('skillscore');
  context.subscriptions.push(diagnostics);

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'skillscore.scoreThisSkill';
  context.subscriptions.push(statusBar);

  treeProvider = new ScoreTreeProvider();
  context.subscriptions.push(
    vscode.window.createTreeView('skillscorePanel', {
      treeDataProvider: treeProvider,
      showCollapseAll: false,
    }),
  );

  // ── Commands ────────────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('skillscore.scoreThisSkill', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isSkillMd(editor.document.uri)) {
        vscode.window.showInformationMessage('Open a SKILL.md file to score it.');
        return;
      }
      await scoreDocument(editor.document, { force: true });
    }),

    vscode.commands.registerCommand(
      'skillscore.goToFinding',
      async (uri: vscode.Uri, line: number | null) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        const lineIndex = Math.max(0, (line ?? 1) - 1);
        const pos = new vscode.Position(lineIndex, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos));
      },
    ),
  );

  // ── Event listeners ─────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (doc) => {
      if (isSkillMd(doc.uri)) { await scoreDocument(doc); }
    }),

    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      if (isSkillMd(doc.uri)) { debouncedScore(doc); }
    }),

    vscode.workspace.onDidCloseTextDocument((doc) => {
      if (isSkillMd(doc.uri)) {
        clearDiagnostics(diagnostics, doc.uri);
        treeProvider.clear();
        statusBar.hide();
      }
    }),

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor || !isSkillMd(editor.document.uri)) {
        statusBar.hide();
        return;
      }
      scoreDocument(editor.document);
    }),
  );

  // Score any SKILL.md already open when the extension activates.
  for (const doc of vscode.workspace.textDocuments) {
    if (isSkillMd(doc.uri)) { void scoreDocument(doc); }
  }
}

export function deactivate(): void {
  for (const timer of pendingTimers.values()) { clearTimeout(timer); }
  pendingTimers.clear();
}

// ── Core scoring flow ─────────────────────────────────────────────────────────

interface ScoreOptions { force?: boolean }

async function scoreDocument(
  doc: vscode.TextDocument,
  opts: ScoreOptions = {},
): Promise<void> {
  if (!opts.force) {
    const auto: boolean = vscode.workspace
      .getConfiguration('skillscore')
      .get('autoScore', true);
    if (!auto) { return; }
  }

  const cliPath = getSkillscorePath(ctx);
  if (!cliPath) {
    setStatusBarError('Skillscore: not found');
    return;
  }

  const target: string = vscode.workspace
    .getConfiguration('skillscore')
    .get('target', 'universal');

  setStatusBarSpinner(doc.uri);

  try {
    const result = await runSkillscore(cliPath, doc.uri.fsPath, { target });
    applyDiagnostics(diagnostics, doc.uri, result, doc);
    treeProvider.refresh(result, doc.uri);
    updateStatusBar(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatusBarError('Skillscore: error');
    vscode.window.showErrorMessage(`Skillscore: ${message}`);
  }
}

function debouncedScore(doc: vscode.TextDocument, delayMs = 600): void {
  const key = doc.uri.toString();
  const existing = pendingTimers.get(key);
  if (existing) { clearTimeout(existing); }
  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    void scoreDocument(doc);
  }, delayMs);
  pendingTimers.set(key, timer);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSkillMd(uri: vscode.Uri): boolean {
  return path.basename(uri.fsPath) === SKILL_FILENAME;
}

function updateStatusBar(result: { score: number; grade: string }): void {
  statusBar.text = `$(symbol-ruler) Skillscore: ${result.score}/100  ${result.grade}`;
  statusBar.tooltip = 'Click to re-score this skill';
  statusBar.backgroundColor = undefined;
  statusBar.show();
}

function setStatusBarSpinner(uri: vscode.Uri): void {
  statusBar.text = '$(loading~spin) Skillscore: scoring…';
  statusBar.tooltip = uri.fsPath;
  statusBar.show();
}

function setStatusBarError(text: string): void {
  statusBar.text = `$(error) ${text}`;
  statusBar.backgroundColor = new vscode.ThemeColor(
    'statusBarItem.errorBackground',
  );
  statusBar.show();
}
