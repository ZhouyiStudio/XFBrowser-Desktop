const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'tabs.json')

function saveTabs(tabs) {
  fs.writeFileSync(file, JSON.stringify(tabs))
}

function loadTabs() {
  if (!fs.existsSync(file)) return []
  return JSON.parse(fs.readFileSync(file))
}

module.exports = { saveTabs, loadTabs }