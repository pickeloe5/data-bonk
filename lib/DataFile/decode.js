const quadBuffer = Buffer.alloc(4)

async function decode(book, bigEndian = false) {
	const kindBuffer = Buffer.alloc(1)
	await book.read(kind)
	switch (kindBuffer[0]) {
		case 0:
			return null
		case 1:
			return false
		case 2:
			return true
		case 3:
			return await decodeFloat(book, bigEndian)
		case 4:
			return await decodeString(book, bigEndian)
		case 5:
			return await decodeArray(book, bigEndian)
		case 6:
			return await decodeMap(book, bigEndian)
	}
	throw new Error(`Unknown data kind: ${kindBuffer[0]}`)
}

async function decodeFloat(book, bigEndian = false) {
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
