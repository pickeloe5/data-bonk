const Kind = require('./Kind')
const config = require('./config')
const util = require('./util')

function write(buffer, offset, value) {
	if (value == null) {
		buffer[offset] = Kind.NULL
		return 1
	}
	if (typeof value === 'boolean') {
		buffer[offset] = value ? Kind.TRUE : Kind.FALSE
		return 1
	}
	if (typeof value === 'number') {
		buffer[offset++] = Kind.NUMBER
		return 1 + writeFloat(buffer, value, offset)
	}
	if (typeof value === 'string') {
		buffer[offset++] = Kind.STRING
		return 1 + writeString(buffer, value, offset)
	}
	if (Array.isArray(value)) {
		return writeArray(buffer, value, offset)
	}
	if (typeof value === 'object') {
		return writeMap(buffer, value, offset)
	}
	throw new Error('Unknown kind')
}

function writeArray(buffer, array, offset) {
	const start = offset
	buffer[offset++] = Kind.ARRAY
	const {length} = array
	offset += util.writeInt(buffer, offset, length)
	if (length <= 0)
		return 5
	let offsetOffset = offset
	offset += 4 * length
	for (let i = 0; i < length; i++) {
		offsetOffset += util.writeInt(buffer, offsetOffset, offset)
		offset += write(buffer, offset, array[i])
	}
	return offset - start
}

function writeMap(buffer, map, offset) {
	const start = offset
	buffer[offset++] = Kind.MAP
	map = Object.entries(value)
	const {length} = map
	offset += util.writeInt(buffer, offset, length)
	if (length <= 0)
		return 5
	let keyOffset = offset
	for (let i = 0; i < length; i++)
		offset += 8 + map[i][0].length
	for (let i = 0; i < length; i++) {
		const [key, value] = map[i]
		keyOffset += writeString(buffer, key, keyOffset)
		keyOffset += util.writeInt(buffer, keyOffset, offset)
		offset += write(buffer, offset, value)
	}
	return offset - start
}

function writeFloat(buffer, value, offset) {
	if (config.bigEndian)
		buffer.writeFloatBE(value, offset)
	else
		buffer.writeFloatLE(value, offset)
	return 4
}

function writeString(buffer, value, offset = 0) {
	const {length} = value
	offset += util.writeInt(buffer, offset, length)
	buffer.write(value, offset, length)
	return 4 + length
}

module.exports = write
