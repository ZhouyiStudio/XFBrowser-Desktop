const fs = require('fs');

function checkScript(filename) {
  let s = fs.readFileSync(filename, 'utf8');
  let i = s.indexOf('<script>');
  let j = s.indexOf('</script>', i);
  let code = s.slice(i + 8, j);
  try {
    new Function(code);
    console.log(filename + ': OK (' + code.split('\n').length + ' lines)');
  } catch(e) {
    console.log(filename + ': ERROR - ' + e.message);
  }
}

checkScript('index.html');
checkScript('mainpage.html');
