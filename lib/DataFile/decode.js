let Kind

async function decode(book, bigEndian = false) {
	const kindBuffer = Buffer.alloc(1)
	await book.read(kindBuffer)
	switch (kindBuffer[0]) {
		case Kind.NULL:
			return null
		case Kind.FALSE:
			return false
		case Kind.TRUE:
			return true
		case Kind.NUMBER:
			return await decodeNumber(book, bigEndian)
		case Kind.STRING:
			return await decodeString(book, bigEndian)
		case Kind.ARRAY:
			return await decodeArray(book, bigEndian)
		case Kind.MAP:
			return await decodeMap(book, bigEndian)
	}
	const kind = Kind.getName(kindBuffer[0])
	throw new Error(`Failed to decode data kind: ${kind}`)
}

async function decodeNumber(book, bigEndian = false) {
	const buffer = Buffer.alloc(4)
	await book.read(buffer)
	if (bigEndian)
		return buffer.readFloatBE(0)
	return buffer.readFloatLE(0)
}

async function decodeString(book, bigEndian = false) {
	let buffer = Buffer.alloc(4)
	await book.read(buffer)
	const size = bigEndian ?
		buffer.readInt32BE(0) :
		buffer.readInt32LE(0)
	buffer = Buffer.alloc(size)
	await book.read(buffer)
	return buffer.toString()
}

async function decodeArray(book, bigEndian = false) {
	const buffer = Buffer.alloc(4)
	await book.read(buffer)
	const size = bigEndian ?
		buffer.readInt32BE(0) :
		buffer.readInt32LE(0)
	if (size <= 0)
		return []
	const array = new Array(size)
	for (let i = 0; i < size; i++)
		array[i] = await decode(book, bigEndian)
	return array
}

async function decodeMap(book, bigEndian = false) {
	let buffer = Buffer.alloc(4)
	await book.read(buffer)
	const size = bigEndian ?
		buffer.readInt32BE(0) :
		buffer.readInt32LE(0)
	const map = {}
	for (let i = 0; i < size; i++) {
		const key = await decodeString(book, bigEndian)
		map[key] = await decode(book, bigEndian)
	}
	return map
}

module.exports = decode
Kind = require('./Kind')
