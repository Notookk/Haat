import { spawn, execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Clean lingering ports before starting
function killPorts(ports = [3000, 4000, 5000, 5001, 6000, 7000, 7100, 8000, 8080, 5173, 5174]) {
  const isWin = process.platform === 'win32';
  const killedPids = new Set();

  for (const port of ports) {
    try {
      if (isWin) {
        const output = execSync('netstat -ano -p tcp', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
        const lines = output.split('\n');
        const portRegex = new RegExp(`:${port}\\s+.*LISTENING`);
        for (const line of lines) {
          if (portRegex.test(line)) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && !killedPids.has(pid)) {
              killedPids.add(pid);
              try {
                execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
              } catch {
                // ignore
              }
            }
          }
        }
      } else {
        const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (pids) {
          for (const pid of pids.split('\n')) {
            if (pid && !killedPids.has(pid)) {
              killedPids.add(pid);
              try {
                execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
              } catch {
                // ignore
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

// Read .env configuration
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  const config = {
    BUYER_PORT: 3000,
    BUYER_BACKEND_PORT: 4000,
    SELLER_PORT: 7000,
    SELLER_BACKEND_PORT: 7100,
    ADMIN_PORT: 5000,
    ADMIN_BACKEND_PORT: 6000,
    WS_PORT: 8000,
  };

  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, v] = trimmed.split('=');
        if (k && v && config[k.trim()] !== undefined) {
          const num = parseInt(v.trim(), 10);
          if (num) config[k.trim()] = num;
        }
      }
    } catch {
      // ignore
    }
  }

  return config;
}

const envConfig = loadEnv();
const targetMode = process.argv[2] || 'all';

// Step 1: Kill all relevant ports before starting
killPorts();

// Step 2: Show banner with Buyer, Seller and Admin links in the same terminal
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const blue = '\x1b[34m';
const yellow = '\x1b[33m';
const magenta = '\x1b[35m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

console.log('');
console.log(`${cyan}========================================================================${reset}`);
console.log(`${bold}  HAAT Marketplace — Three-Application Local Development Environment${reset}`);
console.log(`${cyan}========================================================================${reset}`);
if (targetMode === 'all' || targetMode === 'buyer') {
  console.log(`  ${green}${bold}> Buyer Frontend:${reset}      http://localhost:${envConfig.BUYER_PORT}`);
  console.log(`  ${green}> Buyer Backend API:${reset}   http://localhost:${envConfig.BUYER_BACKEND_PORT}/api/v1`);
}
if (targetMode === 'all') {
  console.log(`  ----------------------------------------------------------------------`);
}
if (targetMode === 'all' || targetMode === 'seller') {
  console.log(`  ${blue}${bold}> Seller Frontend:${reset}     http://localhost:${envConfig.SELLER_PORT}`);
  console.log(
    `  ${blue}> Seller Backend API:${reset}  http://localhost:${envConfig.SELLER_BACKEND_PORT}/api/v1/seller`,
  );
}
if (targetMode === 'all') {
  console.log(`  ----------------------------------------------------------------------`);
}
if (targetMode === 'all' || targetMode === 'admin') {
  console.log(`  ${yellow}${bold}> Admin Frontend:${reset}      http://localhost:${envConfig.ADMIN_PORT}`);
  console.log(
    `  ${yellow}> Admin Backend API:${reset}   http://localhost:${envConfig.ADMIN_BACKEND_PORT}/api/v1/admin`,
  );
}
console.log(`  ----------------------------------------------------------------------`);
console.log(`  ${magenta}> WebSocket Gateway:${reset}   ws://localhost:${envConfig.WS_PORT}`);
console.log(`${cyan}========================================================================${reset}`);
console.log('');

// Step 3: Spawn target applications
const services = [];
const useNodemon = process.argv.includes('--nodemon');

if (targetMode === 'all' || targetMode === 'buyer') {
  services.push(
    { name: 'buyer-web', color: '\x1b[32m', filter: '@haat/buyer-frontend', script: 'dev' },
    {
      name: 'buyer-api',
      color: '\x1b[34m',
      filter: '@haat/buyer-backend',
      script: useNodemon ? 'dev:nodemon' : 'dev',
    },
  );
}

if (targetMode === 'all' || targetMode === 'seller') {
  services.push(
    { name: 'seller-web', color: '\x1b[36m', filter: '@haat/seller-frontend', script: 'dev' },
    {
      name: 'seller-api',
      color: '\x1b[34m',
      filter: '@haat/seller-backend',
      script: useNodemon ? 'dev:nodemon' : 'dev',
    },
  );
}

if (targetMode === 'all' || targetMode === 'admin') {
  services.push(
    { name: 'admin-web', color: '\x1b[33m', filter: '@haat/admin-frontend', script: 'dev' },
    {
      name: 'admin-api',
      color: '\x1b[35m',
      filter: '@haat/admin-backend',
      script: useNodemon ? 'dev:nodemon' : 'dev',
    },
  );
}

const isWin = process.platform === 'win32';
const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';
const children = [];

for (const svc of services) {
  const child = spawn(`${pnpmCmd} --filter ${svc.filter} ${svc.script || 'dev'}`, {
    env: { ...process.env },
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
  });

  const prefix = `${svc.color}[${svc.name}]${reset} `;

  child.stdout.on('data', (data) => {
    const text = data.toString();
    for (const line of text.split('\n')) {
      if (line.trim()) process.stdout.write(`${prefix}${line}\n`);
    }
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    for (const line of text.split('\n')) {
      if (line.trim()) process.stderr.write(`${prefix}${line}\n`);
    }
  });

  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${prefix}exited with code ${code}`);
    }
  });

  children.push(child);
}

// Cleanup children on exit
function shutdown() {
  console.log('\n[HAAT] Stopping development servers...');
  for (const child of children) {
    try {
      if (isWin) {
        spawn('taskkill', ['/pid', child.pid, '/f', '/t'], { stdio: 'ignore' });
      } else {
        child.kill('SIGINT');
      }
    } catch {
      // ignore
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
