// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import * as fs from 'fs';
import { workspace } from 'vscode';
import type { ExtensionContext } from 'vscode';

const BUNDLED_BINARY_DIR = 'bin';

function platformKey(): string {
  const p = process.platform; // 'darwin' | 'linux' | 'win32'
  const a = process.arch;     // 'x64' | 'arm64'
  return `${p}-${a}`;
}

function exeName(): string {
  return process.platform === 'win32' ? 'skillscore.exe' : 'skillscore';
}

/** Returns the path to the skillscore binary, or undefined if not found. */
export function getSkillscorePath(context: ExtensionContext): string | undefined {
  // 1. User-configured path wins.
  const configured: string | undefined = workspace
    .getConfiguration('skillscore')
    .get('executablePath');
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  // 2. Bundled platform binary.
  const bundled = context.asAbsolutePath(
    path.join(BUNDLED_BINARY_DIR, platformKey(), exeName()),
  );
  if (fs.existsSync(bundled)) {
    return bundled;
  }

  // 3. Dart pub-cache global bin (common when dart/flutter is installed).
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
  const pubCacheBin = path.join(home, '.pub-cache', 'bin', exeName());
  if (fs.existsSync(pubCacheBin)) {
    return pubCacheBin;
  }

  // 4. System PATH — let the OS resolve it.
  return exeName().replace('.exe', '');
}
