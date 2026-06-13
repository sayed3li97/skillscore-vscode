// SPDX-License-Identifier: Apache-2.0

import { spawn } from 'child_process';
import * as path from 'path';
import type { SkillResult, SkillscoreOutput } from './types';

export interface RunOptions {
  target?: string;
}

/**
 * Invokes the skillscore CLI against a single manifest path and returns
 * the parsed result for that skill. Rejects if the binary exits with code 2
 * (usage error) or produces non-JSON output.
 */
export function runSkillscore(
  cliPath: string,
  manifestPath: string,
  opts: RunOptions = {},
): Promise<SkillResult> {
  return new Promise((resolve, reject) => {
    const args = [
      path.dirname(manifestPath),
      '--format', 'json',
    ];
    if (opts.target) {
      args.push('--target', opts.target);
    }

    const proc = spawn(cliPath, args, { env: process.env });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('error', (err) => {
      reject(new Error(
        `Could not launch skillscore at "${cliPath}": ${err.message}. ` +
        'Install with: dart pub global activate skillscore',
      ));
    });

    proc.on('close', (code) => {
      // Exit code 1 = below --min-score threshold; still valid JSON output.
      // Exit code 2 = usage error (bad path / unreadable file).
      if (code === 2) {
        reject(new Error(`skillscore usage error:\n${stderr.trim()}`));
        return;
      }
      try {
        const output: SkillscoreOutput = JSON.parse(stdout);
        const skill = output.skills[0];
        if (!skill) {
          reject(new Error('skillscore returned no skills for this path.'));
          return;
        }
        resolve(skill);
      } catch {
        reject(new Error(`Failed to parse skillscore output:\n${stdout}`));
      }
    });
  });
}
