function *encode(value, bigEndian = false) {

	const kindBuffer = Buffer.alloc(1)

	if (value == null) {
		kindBuffer[0] = 0
		yield kindBuffer
		return;
	}

	if (typeof value === 'boolean') {
		kindBuffer[0] = value ? 2 : 1
		yield kindBuffer
		return;
	}

	if (typeof value === 'number') {
		kindBuffer[0] = 3
		yield kindBuffer
		yield* encodeFloat(value, bigEndian)
		return;
	}

	if (typeof value === 'string') {
		kindBuffer[0] = 4
		yield kindBuffer
		yield* encodeString(value, bigEndian)
		return;
	}

	if (Array.isArray(value)) {
		kindBuffer[0] = 5
		yield kindBuffer
		const {length} = value
		yield* encodeInt(length, bigEndian)
		for (let i = 0; i < length; i++)
			yield* encode(value[i], bigEndian)
		return;
	}

	if (typeof value === 'object') {
		kindBuffer[0] = 6
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