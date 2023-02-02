const Path = require('path')
const fs = require('fs')
const DataBonk = require('../lib')

async function testLargeArrays() {
  const path = Path.join(__dirname, 'large-arrays.broken-book.bin')
  let engine = await DataBonk.create(path, {users:[]})
  const dummySize = 200

  for (let i = 0; i < dummySize; i++) {
    await engine.dataFile.start()
    await engine.dataFile.traverse('users')
    await engine.dataFile.createEntry({
      name: `pickeloe${i}`,
      password: `password${i}`
    })
    await engine.dataFile.stop()
  }

  await engine.dataFile.start()
  let db = await engine.dataFile.read()
  await engine.dataFile.stop()

  if (!db || typeof db !== 'object')
    throw new Error('Expected root to be map')
  let {users} = db
  if (!users || !Array.isArray(users))
    throw new Error('Expected users parent to be an array')
  if (users.length !== dummySize)
    throw new Error(`Expected ${dummySize} users`)
  for (let i = 0; i < dummySize; i++)
    if (users[i].name !== `pickeloe${i}`)
      throw new Error(`Bad username came through`)
  db = null
  users = null

  await engine.dataFile.start()
  await engine.dataFile.traverse('users')
  await engine.dataFile.traverse(99)
  let user100 = await engine.dataFile.read()
  await engine.dataFile.stop()
  if (user100?.name !== 'pickeloe99')
    throw new Error('Bad 100th username')
  user100 = null

  for (let i = 0; i < 100; i += 10) {
    await engine.dataFile.start()
    await engine.dataFile.traverse('users')
    await engine.dataFile.deleteEntry(i)
    await engine.dataFile.stop()
  }

  await engine.dataFile.start()
  await engine.dataFile.traverse('users')
  users = await engine.dataFile.read()
  await engine.dataFile.stop()
  if (users.length !== dummySize - 10)
    throw new Error('Expected 10 entries to be removed')
  users = null

  engine = null
  fs.unlinkSync(path)
}

module.exports = testLargeArrays
