const Kind = require('./Kind')
const config = require('./config')
const skip = require('./skip')
const write = require('./write')
const traverse = require('./traverse')
const util = require('./util')

class Update {
	
	static instance = new Update()

	#readingBuffer = null
	#readingOffset = 0
	#writingBuffer = Buffer.alloc(config.maxPageLength)
	#writingOffset = 0
	#breadCrumbs = []

	start(buffer) {
		this.#clearState(buffer)
		return this
	}

	traverse(key) {
		const breadCrumb = traverse(
			this.#readingBuffer,
			this.#readingOffset,
			key)
		this.#readingOffset = util.readInt(
			this.#readingBuffer,
			breadCrumb[0])
		this.#breadCrumbs.push(breadCrumb)
		return this
	}

	stop(value) {
		if (this.#breadCrumbs.length <= 0)
			throw new Error('Updating root')
		const lengthAfter = write(this.#writingBuffer, this.#readingOffset, value)
		const lengthBefore = skip(this.#readingBuffer, this.#readingOffset)
		const delta = lengthAfter - lengthBefore
		if (delta === 0) {
			this.#writingBuffer.copy(
				this.#readingBuffer,
				this.#readingOffset,
				this.#readingOffset,
				this.#readingOffset + lengthAfter)
		} else {
			const start = this.#breadCrumbs[0][0]
			this.#readingBuffer.copy(
				this.#writingBuffer,
				start, start,
				this.#readingOffset)
			this.#readingBuffer.copy(
				this.#writingBuffer,
				this.#readingOffset + lengthAfter,
				this.#readingOffset + lengthBefore)
			this.#retraceBreadCrumbs(delta)
			this.#writingBuffer.copy(
				this.#readingBuffer,
				start, start)
		}
		this.#clearState()
		return this
	}

	#clearState(buffer = null) {
		this.#readingBuffer = buffer
		this.#readingOffset = 0
		this.#writingOffset = 0
		this.#breadCrumbs = []
	}

	#retrace(delta) {
		let length
		this.#writingOffset++
		switch (this.#readingBuffer[this.#readingOffset++]) {
			case Kind.ARRAY:
				length = util.readInt(
					this.#readingBuffer,
					this.#readingOffset)
				this.#readingOffset += 4
				this.#writingOffset += 4
				this.#retraceArray(delta, length)
				break
			case Kind.MAP:
				length = util.readInt(
					this.#readingBuffer,
					this.#readingOffset)
				const keyLength = util.readInt(
					this.#readingBuffer,
					this.#readingOffset)
				this.#readingOffset += 4 + keyLength
				this.#writingOffset += 4 + keyLength
				this.#retraceMap(delta, length)
				break
		}
	}

	#retraceOffset(delta) {
		const readingOffset = this.#readingOffset,
			writingOffset = this.#writingOffset
		this.#readingOffset = util.readInt(
			this.#readingBuffer,
			this.#readingOffset)
		util.writeInt(
			this.#writingBuffer,
			this.#writingOffset,
			this.#writingOffset = this.#readingOffset + delta)
		this.#retrace(delta)
		this.#readingOffset = readingOffset
		this.#writingOffset = writingOffset
	}

	#retraceArray(delta, length) {
		for (let i = 0; i < length; i++)
			this.#retraceOffset(delta)
	}

	#retraceMap(delta, length) {
		this.#retraceOffset(delta)
		for (let i = 0; i < length; i++) {
			this.#readingOffset += util.readInt(
				this.#readingBuffer,
				this.#readingOffset)
			this.#retraceOffset(delta)
		}
	}

	#retraceBreadCrumbs(delta) {
		for (let i = this.#breadCrumbs.length - 1; i >= 0; i--) {
			const [offset, kind, length] = this.#breadCrumbs[i]
			this.#writingOffset =
				this.#readingOffset =
				offset + 4
			switch (kind) {
				case Kind.ARRAY:
					this.#retraceArray(delta, length)
					break
				case Kind.MAP:
					this.#retraceMap(delta, length)
					break
				default:
					throw new Error('Invalid bread-crumb')
			}
		}
	}

}

function update(buffer, value, ...keys) {
	Update.instance.start(buffer)
	for (const key of keys)
		Update.instance.traverse(key)
	Update.instance.stop(value)
}

module.exports = update
