const Path = require('path')
const fs = require('fs')
const DataBonk = require('../lib')

async function testSimpleArrays() {
  const path = Path.join(__dirname, 'simple-arrays.broken-book.bin')
  let engine = await DataBonk.create(path, [])
  const dummy = 'dummy'

  await engine.dataFile.start()
  await engine.dataFile.createEntry(dummy)
  await engine.dataFile.stop()

  await engine.dataFile.start()
  await engine.dataFile.traverse(0)
  if ((await engine.dataFile.read()) !== dummy)
    throw new Error('Bad entry created')
  await engine.dataFile.stop()

  await engine.dataFile.start()
  await engine.dataFile.deleteEntry(0)
  await engine.dataFile.stop()

  await engine.dataFile.start()
  if (JSON.stringify(await engine.dataFile.read()) !== '[]')
    throw new Error('Bad parent after entry deleted')
  await engine.dataFile.stop()

  engine = null
  fs.unlinkSync(path)
}

module.exports = testSimpleArrays
