let Kind

async function skip(book, bigEndian = false) {
	const kindBuffer = Buffer.alloc(1)
	await book.read(kindBuffer)
	const kind = kindBuffer[0]
	switch (kind) {
		case Kind.NULL:
		case Kind.FALSE:
		case Kind.TRUE:
			return 1;
		case Kind.NUMBER:
			await book.skip(4)
			return 5;
		case Kind.STRING:
			return 1 + await skipString(book, bigEndian)
		case Kind.ARRAY:
			return 1 + await skipArray(book, bigEndian)
		case Kind.MAP:
			return 1 + await skipMap(book, bigEndian)
	}
	throw new Error(`Failed to skip kind: ${Kind.getName(kind)}`)
}

async function skipString(book, bigEndian = false) {
	const sizeBuffer = Buffer.alloc(4)
	await book.read(sizeBuffer)
	const size = bigEndian ?
		sizeBuffer.readInt32BE(0) :
		sizeBuffer.readInt32LE(0)
	if (size > 0)
		await book.skip(size)
	return 4 + size
}

async function skipArray(book, bigEndian = false) {
	const sizeBuffer = Buffer.alloc(4)
	await book.read(sizeBuffer)
	const size = bigEndian ?
		sizeBuffer.readInt32BE(0) :
		sizeBuffer.readInt32LE(0)
	let nBytes = 4
	for (let i = 0; i < size; i++)
		nBytes += await skip(book, bigEndian)
	return nBytes
}

async function skipMap(book, bigEndian = false) {
	const sizeBuffer = Buffer.alloc(4)
	await book.read(sizeBuffer)
	const size = bigEndian ?
		sizeBuffer.readInt32BE(0) :
		sizeBuffer.readInt32LE(0)
	let nBytes = 4
	for (let i = 0; i < size; i++) {
		nBytes += await skipString(book, bigEndian)
		nBytes += await skip(book, bigEndian)
	}
	return nBytes
}

module.exports = skip
Kind = require('./Kind')
