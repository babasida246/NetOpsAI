const { spawn } = require('child_process');

const proc = spawn('npx', ['--yes', 'sv', 'migrate', 'svelte-5'], {
  cwd: process.cwd(),
  env: { ...process.env, FORCE_COLOR: '1' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let sentContinue = false;
let sentFolders = false;
let sentDoMigration = false;

const handle = (data) => {
  const text = data.toString();
  process.stdout.write(text);
  buffer += text;

  if (!sentContinue && buffer.includes('Continue?')) {
    proc.stdin.write('y\n');
    sentContinue = true;
  }

  if (sentContinue && !sentFolders && buffer.includes('Which folders should be migrated?')) {
    proc.stdin.write('\n');
    sentFolders = true;
  }

  if (!sentDoMigration && buffer.includes('Do you want to use the migration tool')) {
    proc.stdin.write('\n');
    sentDoMigration = true;
  }
};

proc.stdout.on('data', handle);
proc.stderr.on('data', handle);

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});
