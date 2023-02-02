const {performance} = require('perf_hooks')
const Path = require('path')
const fs = require('fs')
const DataBonk = require('../lib')

async function measureDataBonk() {
  const path = Path.join(__dirname, 'performance.broken-book.bin')
  let engine = await DataBonk.create(path, {users:[]})

  let bookmark = null
  let now
  for (let i = 0; i < 2000; i++) {
    if (i === 1900)
      now = performance.now()
    await engine.dataFile.start()
    await engine.dataFile.traverse('users')
    await engine.dataFile.createEntry({
      name: `pickeloe${i}`,
      password: `password${i}`
    }, undefined, bookmark)
    bookmark = {
      pageIndex: engine.dataFile.book.pageIndex,
      pageOffset: engine.dataFile.book.pageOffset
    }
    await engine.dataFile.stop()
  }

  engine = null
  fs.unlinkSync(path)
  return performance.now() - now
}

async function measureControl() {
  const path = Path.join(__dirname, 'performance.json')
  fs.writeFileSync(path, JSON.stringify({users:[]}))

  let now
  for (let i = 0; i < 2000; i++) {
    if (i === 1900)
      now = performance.now()
    const db = JSON.parse(fs.readFileSync(path).toString())
    db.users.push({
      name: `pickeloe${i}`,
      password: `password${i}`
    })
    fs.writeFileSync(path, JSON.stringify(db))
  }

  fs.unlinkSync(path)
  return performance.now() - now
}

async function testPerformance() {
  const control = await measureControl()
  const dataBonk = await measureDataBonk()
  console.log('Inserting 100 into 1900 records: ' + dataBonk)
  console.log('Control: ' + control)
}

module.exports = testPerformance
