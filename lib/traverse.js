const Kind = require('./Kind')
const util = require('./util')

class UnexpectedLeafError extends Error {
	constructor(kind, key) {
		super(`Kind: ${Kind.getName(kind)}, key: ${key}`)
	}
}

function traverse(buffer, offset, key) {
	const kind = buffer[offset++]
	switch (kind) {
		case Kind.ARRAY:
			return traverseArray(buffer, offset, key)
			break
		case Kind.MAP:
			return traverseMap(buffer, offset, key)
			break
		default:
			throw new UnexpectedLeafError(kind, key)
	}
}

function traverseArray(buffer, offset, key) {
	if (typeof key !== 'number')
		throw new Error('Invalid key')
	const length = util.readInt(buffer, offset)
	offset += 4
	if (key < 0 || key >= length)
		throw new Error('Absent key')
	offset += 4 * key
	return [offset, Kind.ARRAY, length - key]
}

function traverseMap(buffer, offset, key) {
	if (typeof key !== 'string')
		throw new Error('Invalid key')
	const length = util.readInt(buffer, offset)
	offset += 4
	for (let i = 0; i < length; i++) {
		const itKeyLength = util.readInt(buffer, offset)
		offset += 4
		if (itKeyLength !== key.length) {
			offset += 4 + itKeyLength
			continue
		}
		const itKey = buffer
			.subarray(offset, offset + itKeyLength)
			.toString()
		offset += itKeyLength
		if (itKey !== key) {
			offset += 4
			continue
		}
		return [offset, Kind.MAP, length - i]
	}
	throw new Error('Absent key')
}

module.exports = traverse
