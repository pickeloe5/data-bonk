let BrokenBook, Kind, encode, decode, skip

class DataFile {

	book
	bigEndian = false

	constructor(path, bigEndian = false) {
		this.book = new BrokenBook(path)
		if (bigEndian)
			this.bigEndian = true
	}

	#byteBuffer = Buffer.alloc(1)
	#quadBuffer = Buffer.alloc(4)

	static async create(path, value) {
		const file = new DataFile(path)
		await file.start()
		await file.create(value)
		await file.stop()
		return file
	}

	async start() {
		await this.book.start()
	}

	async stop() {
		await this.book.stop()
	}

	async create(value) {
		for await (const buffer of encode(value, this.bigEndian))
			await this.book.create(buffer)
	}

	async createEntry(value, key, bookmark) {
		const kind = await this.#readByte()
		if (key !== undefined) {
			if (kind !== Kind.MAP) throw new Error(
				`Can not create entry with key for kind: ${Kind.getName(kind)}`)
			if (typeof key !== 'string') throw new Error(
				`Can not create entry with key of type: ${typeof key}`)
			await this.#createMapEntry(value, key)
			return;
		}
		if (kind !== Kind.ARRAY) throw new Error(
			`Can not create entry without key for kind: ${Kind.getName(kind)}`)
		await this.#createArrayEntry(value, bookmark)
	}

	async #createArrayEntry(value, bookmark) {
		let size = await this.#readInt()
		size++
		await this.book.skipBackwards(4)
    await this.book.update(this.#bufferInt(size))
    if (bookmark) {
      await this.book.turnPage(bookmark.pageIndex, bookmark.pageOffset)
    } else {
  		for (let i = 1; i < size; i++)
  			await skip(this.book, this.bigEndian, size > 250)
    }
		await this.create(value)
	}

	async #createMapEntry(value, key) {
		const {
			pageIndex: parentPageIndex,
			pageOffset: parentPageOffset
		} = this.book
		let size = await this.#readInt()
		// Skip to end of map, checking for duplicate keys
		for (let i = 0; i < size; i++) {
			if ((await this.#readString()) === key)
				throw new Error(`Duplicate key: ${key}`)
			await skip(this.book, this.bigEndian)
		}
		size++
		const {
			pageIndex: entryPageIndex,
			pageOffset: entryPageOffset
		} = this.book
		// Increment the size of the map
		await this.book.turnPage(parentPageIndex, parentPageOffset)
		await this.book.update(this.#bufferInt(size))
		// Store new entry
		await this.book.turnPage(entryPageIndex, entryPageOffset)
    await this.book.create(this.#bufferInt(key.length))
		await this.book.create(Buffer.from(key))
		await this.create(value)
	}

	async read() {
		return await decode(this.book, this.bigEndian)
	}

	async update(value) {
		const {pageIndex, pageOffset} = this.book
		const nBytes = await skip(this.book, this.bigEndian)
		await this.book.turnPage(pageIndex, pageOffset)
		await this.book.delete(nBytes)
		await this.create(value)
	}

	async deleteEntry(key) {
		const {
			pageIndex: parentPageIndex,
			pageOffset: parentPageOffset
		} = this.book
		await this.traverse(key)
		const {
			pageIndex: entryPageIndex,
			pageOffset: entryPageOffset
		} = this.book
		let nBytes = await skip(this.book, this.bigEndian)
		await this.book.turnPage(parentPageIndex, parentPageOffset)
		const kind = await this.#readByte()
		let size = await this.#readInt()
		size--
		await this.book.skipBackwards(4)
		await this.book.update(this.#bufferInt(size))
		await this.book.turnPage(entryPageIndex, entryPageOffset)
		if (kind === Kind.MAP) {
			const keySize = 4 + key.length
			await this.book.skipBackwards(keySize)
			nBytes += keySize
		}
		await this.book.delete(nBytes)
	}

	async traverse(key) {
		switch (typeof key) {
			case 'number':
				await this.#traverseArray(key)
				return;
			case 'string':
				await this.#traverseMap(key)
				return;
			default:
				throw new Error(`Failed to traverse key of type: ${typeof key}`)
		}
	}

	async #traverseArray(key) {
		const kind = await this.#readByte()
		if (kind !== Kind.ARRAY)
			throw new Error(`Failed to traverse array kind: ${Kind.getName(kind)}`)
		const size = await this.#readInt()
		if (key < 0 || key >= size)
			throw new Error(`Failed to traverse array key: ${key}`)
		for (let i = 0; i < key; i++)
			await skip(this.book, this.bigEndian)
	}

	async #traverseMap(key) {
		const kind = await this.#readByte()
		if (kind !== Kind.MAP)
			throw new Error(`Failed to traverse map kind: ${Kind.getName(kind)}`)
		const size = await this.#readInt()
		for (let i = 0; i < size; i++) {
			if ((await this.#readString()) === key)
				return;
			await skip(this.book, this.bigEndian)
		}
		throw new Error(`Failed to traverse map key: '${key}'`)
	}

	async #readByte() {
		await this.book.read(this.#byteBuffer)
		return this.#byteBuffer[0]
	}

	async #readInt() {
		await this.book.read(this.#quadBuffer)
		return this.bigEndian ?
			this.#quadBuffer.readInt32BE(0) :
			this.#quadBuffer.readInt32LE(0)
	}

	async #readString() {
		const size = await this.#readInt()
		if (size <= 0)
			return ''
		const buffer = Buffer.alloc(size)
		await this.book.read(buffer)
		return buffer.toString()
	}

  #bufferInt(value) {
    if (this.bigEndian)
      this.#quadBuffer.writeInt32BE(value, 0)
    else
      this.#quadBuffer.writeInt32LE(value, 0)
     return this.#quadBuffer
  }

}

module.exports = DataFile
BrokenBook = require('../BrokenBook')
Kind = require('./Kind')
encode = require('./encode')
decode = require('./decode')
skip = require('./skip')
