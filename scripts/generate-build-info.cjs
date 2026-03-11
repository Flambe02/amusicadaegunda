const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const srcGeneratedDir = path.join(rootDir, 'src', 'generated');
const packageJson = require(path.join(rootDir, 'package.json'));

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

const generatedAt = new Date().toISOString();
const commit = getGitCommit();
const buildId = `${packageJson.version}-${commit}-${generatedAt.replace(/[:.]/g, '-')}`;

const payload = {
  version: packageJson.version,
  commit,
  generatedAt,
  buildId,
};

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(
  path.join(publicDir, 'build-info.json'),
  JSON.stringify(payload, null, 2),
  'utf8'
);

fs.mkdirSync(srcGeneratedDir, { recursive: true });
fs.writeFileSync(
  path.join(srcGeneratedDir, 'buildInfo.js'),
  `export const BUILD_INFO = ${JSON.stringify(payload, null, 2)};\n`,
  'utf8'
);

console.log(`Build info generated: ${buildId}`);
