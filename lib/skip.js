const Kind = require('./Kind')
const util = require('./util')

function skip(buffer, offset) {
	let start, length
	switch (buffer[offset++]) {
		case Kind.NULL:
		case Kind.FALSE:
		case Kind.TRUE:
			return 1
		case Kind.NUMBER:
			return 5
		case Kind.STRING:
			return 1 + skipString(buffer, offset)
		case Kind.ARRAY:
			length = util.readInt(buffer, offset)
			if (length <= 0)
				return 5
			start = offset - 1
			offset += 4 * length
			offset = skipOffset(buffer, offset)
			return offset - start
		case Kind.MAP:
			length = util.readInt(buffer, offset)
			if (length <= 0)
				return 5
			start = offset - 1
			for (let i = 0; i < length; i++) {
				offset += 4
				offset += skipString(buffer, offset)
			}
			offset = skipOffset(buffer, offset)
			return offset - start
		default:
			throw new Error('Unknown kind')
	}
}

function skipString(buffer, offset) {
	return 4 + util.readInt(buffer, offset)
}

function skipOffset(buffer, offset) {
	offset = util.readInt(buffer, offset)
	offset += skip(buffer, offset)
	return offset
}

module.exports = skip
