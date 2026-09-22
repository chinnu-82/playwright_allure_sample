import * as fs from 'node:fs';
import * as path from 'node:path';
// allure-commandline ships Allure 2 (Java) and exposes a spawn helper.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const allureCommandline: (args: string[]) => import('node:child_process').ChildProcess = require('allure-commandline');

/**
 * Allure 2 needs Java 8+. A JAVA_HOME that points to a missing folder (or to
 * `.../bin` instead of the JDK root) makes `allure.bat` abort even when `java`
 * is on the PATH. Fix it for this process only.
 */
export function ensureJava(): void {
  const javaHome = process.env.JAVA_HOME;
  if (!javaHome) return;
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  if (fs.existsSync(path.join(javaHome, 'bin', exe))) return;

  // Common mistake: JAVA_HOME=<jdk>/bin
  const parent = path.dirname(javaHome);
  if (path.basename(javaHome).toLowerCase() === 'bin' && fs.existsSync(path.join(parent, 'bin', exe))) {
    console.warn(`⚠️  JAVA_HOME points to a "bin" folder; using ${parent} for this run.`);
    process.env.JAVA_HOME = parent;
    return;
  }
  console.warn(`⚠️  JAVA_HOME (${javaHome}) has no ${path.join('bin', exe)}; falling back to "java" on PATH for this run.`);
  delete process.env.JAVA_HOME;
}

/** Run the Allure CLI with the given arguments; resolves with the exit code. */
export function runAllure(args: string[]): Promise<number> {
  ensureJava();
  return new Promise((resolve, reject) => {
    const child = allureCommandline(args);
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

export function copyDir(from: string, to: string): number {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) count += copyDir(src, dst);
    else {
      fs.copyFileSync(src, dst);
      count++;
    }
  }
  return count;
}
