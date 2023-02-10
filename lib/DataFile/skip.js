const DataFile = require('.')
let Kind

/**
 * Skips a singular arbitrary value from a book without reading it
 */
DataFile.prototype.skip = async function skip() {
	const kindBuffer = Buffer.alloc(1)
	await this.book.read(kindBuffer)
	const kind = kindBuffer[0]
	switch (kind) {
		case Kind.NULL:
		case Kind.FALSE:
		case Kind.TRUE:
			return 1;
		case Kind.NUMBER:
			await this.book.skip(4)
			return 5;
		case Kind.STRING:
			return 1 + await skipString(this)
		case Kind.ARRAY:
			return 1 + await skipArray(this)
		case Kind.MAP:
			return 1 + await skipMap(this)
	}
	throw new Error(`Failed to skip kind: ${Kind.getName(kind)}`)
}

async function skipString(dataFile) {
	const sizeBuffer = Buffer.alloc(4)
	await dataFile.book.read(sizeBuffer)
	const size = dataFile.bigEndian ?
		sizeBuffer.readInt32BE(0) :
		sizeBuffer.readInt32LE(0)
	if (size > 0)
		await dataFile.book.skip(size)
	return 4 + size
}

async function skipArray(dataFile) {
	const sizeBuffer = Buffer.alloc(4)
	await dataFile.book.read(sizeBuffer)
	const size = dataFile.bigEndian ?
		sizeBuffer.readInt32BE(0) :
		sizeBuffer.readInt32LE(0)
	let nBytes = 4
	for (let i = 0; i < size; i++)
		nBytes += await dataFile.skip()
	return nBytes
}

async function skipMap(dataFile) {
	const sizeBuffer = Buffer.alloc(4)
	await dataFile.book.read(sizeBuffer)
	const size = dataFile.bigEndian ?
		sizeBuffer.readInt32BE(0) :
		sizeBuffer.readInt32LE(0)
	let nBytes = 4
	for (let i = 0; i < size; i++) {
		nBytes += await skipString(dataFile)
		nBytes += await dataFile.skip()
	}
	return nBytes
}

Kind = require('./Kind')
