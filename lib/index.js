const fs = require('fs/promises')
const write = require('./write')
const config = require('./config')
const update = require('./update')

async function start() {
	const buffer = Buffer.alloc(config.maxPageLength)
	const length = write(buffer, 0, ['asdf', ['qwer']])
	update(buffer, 'asdf asdf', 0)
	const file = await fs.open('test.bin', 'w+')
	await file.write(buffer, 0, length + 5)
	await file.close()
}

start()
