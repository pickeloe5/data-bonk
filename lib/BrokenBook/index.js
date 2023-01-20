const fs = require('fs')
const fsp = require('fs/promises')

class BrokenBook {

  path

  constructor(path) {
    this.path = path
  }

  static HEADER_SIZE = 13
  static PAGE_HEADER_SIZE = 12

  file = null
  config = null
  nPages = 0

  pageIndex = -1
  pageOffset = 0

  nextPage = 0
  previousPage = 0
  pageSize = 0

  #quadBuffer = Buffer.alloc(4)
  #headBuffer = Buffer.alloc(BrokenBook.HEADER_SIZE)

  get pageHeaderOffset() {
    return BrokenBook.HEADER_SIZE + (
      this.pageIndex * (
        this.config.page.maxSize +
        BrokenBook.PAGE_HEADER_SIZE))
  }

  get offset() {
    return this.pageHeaderOffset +
      BrokenBook.PAGE_HEADER_SIZE +
      this.pageOffset
  }

  async start() {
    if (this.file !== null)
      throw new Error('Concurrent modification')
    const exists = await this.#openFile()
    if (!exists)
      await this.#createHeader()
    else
      await this.#readHeader()
    this.pageIndex = 0
    this.pageOffset = 0
		if (!exists) {
			this.nextPage = 0
			this.previousPage = 0
			this.pageSize = 0
			await this.updatePageHeader()
		} else {
			await this.#readPageHeader()
		}
  }

	async stop() {
		await this.file.close()
		this.file = null
	}

  async read(buffer, offset = 0, size = buffer.length - offset) {
    for await (const nBytes of this.walk(size)) {
      await this.file.read(buffer, offset, nBytes, this.offset)
      offset += nBytes
      size -= nBytes
    }
  }

  async update(buffer, offset = 0, size = buffer.length - offset) {
    for await (const nBytes of this.walk(size)) {
      await this.file.write(buffer, offset, nBytes, this.offset)
      offset += nBytes
      size -= nBytes
    }
  }

	async appendToPage(buffer, offset = 0, nBytes = buffer.length - offset) {
		await this.file.write(buffer, offset, nBytes, this.offset)
		this.pageOffset += nBytes
		this.pageSize = this.pageOffset
	}

	async appendToPages(buffer, offset = 0, nBytes = buffer.length - offset) {
		const space =
			this.config.page.maxSize -
			this.config.page.padding -
			this.pageOffset
		if (space >= nBytes) {
			await this.appendToPage(buffer, offset, nBytes)
			return;
		}
		if (space > 0) {
			await this.file.write(buffer, offset, space, this.offset)
			this.pageOffset += space
			this.pageSize = this.pageOffset
			nBytes -= space
			offset += space
		}
		await this.createPage()
		await this.appendToPages(buffer, offset, nBytes)
	}

	async truncatePage() {
		const nBytes = this.pageSize - this.pageOffset
		if (nBytes <= 0)
			return null
		const buffer = Buffer.alloc(nBytes)
		await this.file.read(buffer, 0, nBytes, this.offset)
		this.pageSize = this.pageOffset
		return buffer
	}

  async skip(nBytes) {
    const generator = await this.walk(nBytes)
    let done
    do {
      ; ({done} = await generator.next())
    } while (!done)
  }

  async* walk(nBytes) {
    while (nBytes > 0) {
      const space = this.pageSize - this.pageOffset
      if (space >= nBytes) {
        yield nBytes
        this.pageOffset += nBytes
        return;
      }
      yield space
      await this.turnPage()
      nBytes -= space
    }
  }

  async turnPage(pageIndex = this.nextPage - 1) {
    if (pageIndex <= 0)
      throw new Error('Out of bounds')
    this.pageIndex = pageIndex
    this.pageOffset = 0
    await this.#readPageHeader()
  }

	async createPage() {
		const previousPage = this.pageIndex + 1
		const pageIndex = ++this.nPages
		const nextPage = this.nextPage
		this.nextPage = pageIndex + 1
		await this.updatePageHeader()
		if (nextPage > 0) {
			await this.turnPage(nextPage - 1)
			this.previousPage = pageIndex + 1
			await this.updatePageHeader()
		}
		this.pageIndex = pageIndex
		this.pageOffset = 0
		this.nextPage = nextPage
		this.previousPage = previousPage
		this.pageSize = 0
	}

	async deletePage() {
		const {previousPage, nextPage} = this
		this.pageOffset = 0
		this.nextPage = 0
		this.previousPage = 0
		this.pageSize = 0
		await this.updatePageHeader()
		if (previousPage > 0) {
			await this.turnPage(previousPage - 1)
			this.nextPage = nextPage
			await this.updatePageHeader()
		}
		if (nextPage > 0) {
			await this.turnPage(nextPage - 1)
			this.previousPage = previousPage
			await this.updatePageHeader()
		}
	}

  async #readPageHeader() {
    const {PAGE_HEADER_SIZE} = BrokenBook
    const buffer = Buffer.alloc(PAGE_HEADER_SIZE)
    await this.file.read(
      buffer, 0, PAGE_HEADER_SIZE,
      this.pageHeaderOffset)
    if (this.config.bigEndian) {
      this.nextPage = buffer.readInt32BE(0)
      this.previousPage = buffer.readInt32BE(4)
      this.pageSize = buffer.readInt32BE(8)
    } else {
      this.nextPage = buffer.readInt32LE(0)
      this.previousPage = buffer.readInt32LE(4)
      this.pageSize = buffer.readInt32LE(8)
    }
  }

  async updatePageHeader() {
    const {PAGE_HEADER_SIZE} = BrokenBook
    const buffer = Buffer.alloc(PAGE_HEADER_SIZE)
    if (this.config.bigEndian) {
      buffer.writeInt32BE(this.nextPage, 0)
      buffer.writeInt32BE(this.previousPage, 4)
      buffer.writeInt32BE(this.pageSize, 8)
    } else {
      buffer.writeInt32LE(this.nextPage, 0)
      buffer.writeInt32LE(this.previousPage, 4)
      buffer.writeInt32LE(this.pageSize, 8)
    }
    await this.file.write(
      buffer, 0, PAGE_HEADER_SIZE,
      this.pageHeaderOffset)
  }

  async #openFile() {
    const {path} = this
    const exists = fs.existsSync(path)
    if (!exists) {
      const file = await fsp.open(path, 'w')
      await file.close()
    }
    this.file = await fsp.open(path, 'r+')
    return exists
  }

  async #createHeader() {
    this.config = {
      page: {
        maxSize: 8192,
        padding: 2048
      },
      bigEndian: false
    }
    this.nPages = 1
    await this.#updateHeader()
  }

  async #readHeader() {
    const {HEADER_SIZE} = BrokenBook
    const buffer = Buffer.alloc(HEADER_SIZE)
    await this.file.read(buffer, 0, HEADER_SIZE, 0)
    const bigEndian = !!(buffer[0] & 1)
    let page
    if (bigEndian) {
      page = {
        maxSize: buffer.readInt32BE(5),
        padding: buffer.readInt32BE(9)
      }
      this.nPages = buffer.readInt32BE(1)
    } else {
      page = {
        maxSize: buffer.readInt32LE(5),
        padding: buffer.readInt32LE(9)
      }
      this.nPages = buffer.readInt32LE(1)
    }
    this.config = {page, bigEndian}
  }

  async #updateHeader() {
    const {HEADER_SIZE} = BrokenBook
    const {
      config: {page: {maxSize, padding}, bigEndian},
      nPages} = this
    const buffer = Buffer.alloc(HEADER_SIZE)
    buffer[0] = bigEndian ? 1 : 0
    if (bigEndian) {
      buffer.writeInt32BE(nPages, 1)
      buffer.writeInt32BE(maxSize, 5)
      buffer.writeInt32BE(padding, 9)
    } else {
      buffer.writeInt32LE(nPages, 1)
      buffer.writeInt32LE(maxSize, 5)
      buffer.writeInt32LE(padding, 9)
    }
    await this.file.write(buffer, 0, HEADER_SIZE, 0)
  }

}

module.exports = BrokenBook
require('./create')
require('./delete')
