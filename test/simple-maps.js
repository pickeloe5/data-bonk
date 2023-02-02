const Path = require('path')
const fs = require('fs')
const DataBonk = require('../lib')

async function testSimpleMaps() {
  const path = Path.join(__dirname, 'simple-maps.broken-book.bin')
  let engine = await DataBonk.create(path, {})
  const dummyKey = 'dummyKey'
  const dummyValue = 'dummyValue'

  await engine.dataFile.start()
  await engine.dataFile.createEntry(dummyValue, dummyKey)
  await engine.dataFile.stop()

  await engine.dataFile.start()
  await engine.dataFile.traverse(dummyKey)
  if ((await engine.dataFile.read()) !== dummyValue)
    throw new Error('Bad entry created')
  await engine.dataFile.stop()

  await engine.dataFile.start()
  await engine.dataFile.deleteEntry(dummyKey)
  await engine.dataFile.stop()

  await engine.dataFile.start()
  if (JSON.stringify(await engine.dataFile.read()) !== '{}')
    throw new Error('Bad parent after entry deleted')
  await engine.dataFile.stop()

  engine = null
  fs.unlinkSync(path)
}

module.exports = testSimpleMaps
