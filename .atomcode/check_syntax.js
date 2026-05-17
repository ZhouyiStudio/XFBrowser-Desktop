const fs = require('fs');

// Check index.html
let s = fs.readFileSync('index.html', 'utf8');
let i = s.indexOf('<script>');
let j = s.indexOf('</script>', i);
let code = s.slice(i + 8, j);
try {
  new Function(code);
  console.log('index.html script: OK');
} catch(e) {
  console.log('index.html script ERROR:', e.message);
}

// Check mainpage.html
s = fs.readFileSync('mainpage.html', 'utf8');
i = s.indexOf('<script>');
j = s.indexOf('</script>', i);
code = s.slice(i + 8, j);
try {
  new Function(code);
  console.log('mainpage.html script: OK');
} catch(e) {
  console.log('mainpage.html script ERROR:', e.message);
}
