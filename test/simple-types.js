const Path = require('path')
const fs = require('fs')
const DataBonk = require('../lib')

async function testSimpleTypes() {
  const path = Path.join(__dirname, 'simple-types.broken-book.bin')
  let engine = await DataBonk.create(path, null)

  async function expect(expected) {
    expected = JSON.stringify(expected)
    await engine.dataFile.start()
    const received = JSON.stringify(await engine.dataFile.read())
    await engine.dataFile.stop()
    if (received !== expected)
      throw new Error(`'${received}' !== '${expected}'`)
  }

  async function updateAndExpect(value) {
    await engine.dataFile.start()
    await engine.dataFile.update(value)
    await engine.dataFile.stop()
    await expect(value)
  }

  await expect(null)
  await updateAndExpect(false)
  await updateAndExpect(true)
  await updateAndExpect(0)
  await updateAndExpect('')
  await updateAndExpect([])
  await updateAndExpect({})

  engine = null
  await fs.unlinkSync(path)
}

module.exports = testSimpleTypes
