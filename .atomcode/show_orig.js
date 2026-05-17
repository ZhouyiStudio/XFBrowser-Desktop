const { spawn } = require('child_process');
const git = spawn('git', ['show', 'HEAD:index.html'], { cwd: 'C:\\Users\\Zhouyi\\Desktop\\XFBrowser' });
let data = '';
git.stdout.on('data', chunk => data += chunk);
git.on('close', () => {
  const lines = data.split('\n');
  for (let i = 529; i < Math.min(650, lines.length); i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
});
