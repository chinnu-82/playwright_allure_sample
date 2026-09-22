import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

/**
 * Run a Node CLI (resolved from node_modules) without a shell, so arguments such
 * as `--grep "@smoke|@showcase"` are passed verbatim on every OS.
 */
export function runNodeCli(moduleId: string, args: string[], env: NodeJS.ProcessEnv = process.env): SpawnSyncReturns<Buffer> {
  return spawnSync(process.execPath, [require.resolve(moduleId), ...args], { stdio: 'inherit', env });
}

export const playwright = (args: string[], env?: NodeJS.ProcessEnv) => runNodeCli('@playwright/test/cli', args, env);
export const tsx = (args: string[], env?: NodeJS.ProcessEnv) => runNodeCli('tsx/cli', args, env);
