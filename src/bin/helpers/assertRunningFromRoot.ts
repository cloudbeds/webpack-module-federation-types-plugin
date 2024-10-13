import fs from 'node:fs';

export function assertRunningFromRoot(): void {
  if (!fs.readdirSync('./').includes('node_modules')) {
    console.error('ERROR: Script must be run from the root directory of the project');
    process.exit(1);
  }
}
