// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode';
import type { SkillCategory, SkillFinding, SkillResult } from './types';

type Item = ScoreHeaderItem | CategoryItem | FindingItem;

// ── Tree items ────────────────────────────────────────────────────────────────

class ScoreHeaderItem extends vscode.TreeItem {
  constructor(result: SkillResult) {
    super(
      `${result.name}  ${result.score}/100  ${result.grade}`,
      vscode.TreeItemCollapsibleState.Expanded,
    );
    this.description = result.path;
    this.iconPath = gradeIcon(result.grade);
    this.tooltip = `Score: ${result.score}/100  Grade: ${result.grade}`;
    this.contextValue = 'scoreHeader';
  }
}

class CategoryItem extends vscode.TreeItem {
  constructor(cat: SkillCategory) {
    super(cat.name, vscode.TreeItemCollapsibleState.None);
    const bar = progressBar(cat.awarded, cat.max);
    this.description = cat.max > 0
      ? `${cat.awarded}/${cat.max}  ${bar}`
      : cat.awarded < 0 ? `${cat.awarded}  penalty` : 'no penalty';
    this.iconPath = new vscode.ThemeIcon(
      cat.max > 0 && cat.awarded === cat.max ? 'pass' : 'warning',
    );
    this.contextValue = 'category';
  }
}

class FindingItem extends vscode.TreeItem {
  readonly finding: SkillFinding;

  constructor(f: SkillFinding, manifestUri: vscode.Uri) {
    super(f.message, vscode.TreeItemCollapsibleState.None);
    this.finding = f;
    this.description = f.ruleId;
    this.tooltip = new vscode.MarkdownString(
      `**${f.ruleId}** (${f.sourceGuide})\n\n${f.message}\n\n_Fix: ${f.fixHint}_`,
    );
    this.iconPath = new vscode.ThemeIcon(
      f.severity === 'error' ? 'error' : f.severity === 'warning' ? 'warning' : 'info',
    );
    this.command = {
      command: 'skillscore.goToFinding',
      title: 'Go to finding',
      arguments: [manifestUri, f.line],
    };
    this.contextValue = 'finding';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gradeIcon(grade: string): vscode.ThemeIcon {
  switch (grade) {
    case 'A': return new vscode.ThemeIcon('verified-filled');
    case 'B': return new vscode.ThemeIcon('pass');
    case 'C': return new vscode.ThemeIcon('warning');
    case 'D': return new vscode.ThemeIcon('error');
    default:  return new vscode.ThemeIcon('circle-slash');
  }
}

function progressBar(awarded: number, max: number): string {
  if (max <= 0) { return ''; }
  const ratio = Math.max(0, Math.min(awarded / max, 1));
  const filled = Math.round(ratio * 8);
  return '█'.repeat(filled) + '░'.repeat(8 - filled);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export class ScoreTreeProvider implements vscode.TreeDataProvider<Item> {
  private readonly _onDidChangeTreeData =
    new vscode.EventEmitter<Item | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private result: SkillResult | undefined;
  private manifestUri: vscode.Uri | undefined;

  refresh(result: SkillResult, uri: vscode.Uri): void {
    this.result  = result;
    this.manifestUri = uri;
    this._onDidChangeTreeData.fire(undefined);
  }

  clear(): void {
    this.result = undefined;
    this.manifestUri = undefined;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: Item): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Item): Item[] {
    if (!this.result) { return []; }

    if (!element) {
      return [new ScoreHeaderItem(this.result)];
    }

    if (element instanceof ScoreHeaderItem) {
      const categoryItems = this.result.categories.map((c) => new CategoryItem(c));
      const findingItems = this.result.findings.map(
        (f) => new FindingItem(f, this.manifestUri!),
      );
      return [...categoryItems, ...findingItems];
    }

    return [];
  }
}
