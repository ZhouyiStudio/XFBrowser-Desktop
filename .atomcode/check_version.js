try {
  console.log('electron version:', require('electron/package.json').version);
} catch(e) {
  try {
    console.log('electron version:', require('electron').version);
  } catch(e2) {
    console.log('electron not found directly');
  }
}
