let Kind

/**
 * Encodes a value into proprietary BSON.
 * Yields buffers of bytes of encoded data.
 *
 * @param {*} value
 * @param {boolean} bigEndian
 */
function *encode(value, bigEndian = false) {

	const kindBuffer = Buffer.alloc(1)

	if (value == null) {
		kindBuffer[0] = Kind.NULL
		yield kindBuffer
		return;
	}

	if (typeof value === 'boolean') {
		kindBuffer[0] = value ? Kind.TRUE : Kind.FALSE
		yield kindBuffer
		return;
	}

	if (typeof value === 'number') {
		kindBuffer[0] = Kind.NUMBER
		yield kindBuffer
		yield* encodeFloat(value, bigEndian)
		return;
	}

	if (typeof value === 'string') {
		kindBuffer[0] = Kind.STRING
		yield kindBuffer
		yield* encodeString(value, bigEndian)
		return;
	}

	if (Array.isArray(value)) {
		kindBuffer[0] = Kind.ARRAY
		yield kindBuffer
		const {length} = value
		yield* encodeInt(length, bigEndian)
		for (let i = 0; i < length; i++)
			yield* encode(value[i], bigEndian)
		return;
	}

	if (typeof value === 'object') {
		kindBuffer[0] = Kind.MAP
		yield kindBuffer
		yield* encodeMap(value, bigEndian)
		return;
	}

	const sValue = typeof value?.toString === 'function' ?
		value.toString() :
		String(value)
	throw new Error(`Unable to encode value: '${sValue}'`)
}

function *encodeInt(value, bigEndian = false) {
	const buffer = Buffer.alloc(4)
	if (bigEndian)
		buffer.writeInt32BE(value, 0)
	else
		buffer.writeInt32LE(value, 0)
	yield buffer
}

function *encodeString(value, bigEndian = false) {
	yield* encodeInt(value.length, bigEndian)
	yield Buffer.from(value)
}

function *encodeFloat(value, bigEndian = false) {
	const buffer = Buffer.alloc(4)
	if (bigEndian)
		buffer.writeFloatBE(value, 0)
	else
		buffer.writeFloatLE(value, 0)
	yield buffer
}

function *encodeMap(value, bigEndian = false) {
	const keys = Object.getOwnPropertyNames(value)
	const {length} = keys
	yield* encodeInt(length, bigEndian)
	for (let i = 0; i < length; i++) {
		const key = keys[i]
		yield* encodeString(key, bigEndian)
		yield* encode(value[key], bigEndian)
	}
}

module.exports = encode
Kind = require('./Kind')
