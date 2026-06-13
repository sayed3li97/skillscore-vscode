// SPDX-License-Identifier: Apache-2.0

export interface SkillFinding {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number | null;
  fixHint: string;
  sourceGuide: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  awarded: number;
  max: number;
}

export interface SkillResult {
  name: string;
  path: string;
  score: number;
  grade: string;
  penalty: number;
  categories: SkillCategory[];
  findings: SkillFinding[];
}

export interface SkillscoreOutput {
  tool: { name: string; version: string };
  target: string;
  skills: SkillResult[];
  summary: {
    skillCount: number;
    averageScore: number | null;
    minScore: number | null;
  };
}
