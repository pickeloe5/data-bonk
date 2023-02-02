const Path = require('path')
const fs = require('fs')
const DataBonk = require('../lib')

async function testLargeMaps() {
  const path = Path.join(__dirname, 'large-maps.broken-book.bin')
  let engine = await DataBonk.create(path, {})

  for (let i = 0; i < 200; i++) {
    await engine.dataFile.start()
    await engine.dataFile.createEntry(
      {password: `password${i}`},
      `pickeloe${i}`)
    await engine.dataFile.stop()
  }

  await engine.dataFile.start()
  await engine.dataFile.traverse('pickeloe5')
  const pickeloe5 = await engine.dataFile.read()
  await engine.dataFile.stop()
  if (pickeloe5?.password !== 'password5')
    throw new Error('Bad password for pickeloe5')

  engine = null
  fs.unlinkSync(path)
}

module.exports = testLargeMaps
