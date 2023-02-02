const fs = require('fs')
const fsp = require('fs/promises')

/**
 * A file, broken up into a linked list of pages.
 *
 * @param {string} path
 */
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

  /** The file-offset for the header of the current page */
  get pageHeaderOffset() {
    return BrokenBook.HEADER_SIZE + (
      this.pageIndex * (
        this.config.page.maxSize +
        BrokenBook.PAGE_HEADER_SIZE))
  }

  /** The file-offset for the current position of the book */
  get offset() {
    return this.pageHeaderOffset +
      BrokenBook.PAGE_HEADER_SIZE +
      this.pageOffset
  }

  /** Opens a new connection to the file to start operating */
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

  /** Closes the currently-open connection to the file */
	async stop() {
		await this.file.close()
		this.file = null
	}

  /**
   * Reads text, starting at the current position, from the book
   *
   * @param {Buffer} buffer
   * @param {integer} offset - Start reading to this offset of the given buffer
   * @param {integer} size - Read this many bytes
   */
  async read(buffer, offset = 0, size = buffer.length - offset) {
    for await (const nBytes of this.walk(size)) {
      await this.file.read(buffer, offset, nBytes, this.offset)
      offset += nBytes
      size -= nBytes
    }
  }

  /**
   * Updates text, starting at the current position, in the book
   *
   * @param {Buffer} buffer
   * @param {integer} offset - Start updating from this offset of the given buffer
   * @param {integer} size - Update this many bytes
   */
  async update(buffer, offset = 0, size = buffer.length - offset) {
    for await (const nBytes of this.walk(size)) {
      await this.file.write(buffer, offset, nBytes, this.offset)
      offset += nBytes
      size -= nBytes
    }
  }

  /**
   * Appends text to the current page of the book.
   * Assumes there is enough space for the new text.
   * If not at the end of a page, remaining text will be truncated.
   *
   * @param {Buffer} buffer
   * @param {integer} offset - Start appending from this offset of the given buffer
   * @param {integer} nBytes - Append this many bytes
   */
	async appendToPage(buffer, offset = 0, nBytes = buffer.length - offset) {
		await this.file.write(buffer, offset, nBytes, this.offset)
		this.pageOffset += nBytes
		this.pageSize = this.pageOffset
	}


  /**
   * Appends text to the current page of the book.
   * Creates new pages for text not fitting on current page.
   * All affected pages end smaller than max size by more than padding.
   *
   * @param {Buffer} buffer
   * @param {integer} offset - Start appending from this offset of the given buffer
   * @param {integer} nBytes - Append this many bytes
   */
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

  /** Truncates the page to the current position within it */
	async truncatePage() {
		const nBytes = this.pageSize - this.pageOffset
		if (nBytes <= 0)
			return null
		const buffer = Buffer.alloc(nBytes)
		await this.file.read(buffer, 0, nBytes, this.offset)
		this.pageSize = this.pageOffset
		return buffer
	}

  /**
   * Skip a number of bytes without reading them
   *
   * @param {integer} nBytes
   */
  async skip(nBytes) {
    const generator = await this.walk(nBytes)
    let done
    do {
      ; ({done} = await generator.next())
    } while (!done)
  }

  /**
   * Skip backwards a number of bytes without reading them
   *
   * @param {integer} nBytes
   */
	async skipBackwards(nBytes) {
		let pageOffset
		while ((pageOffset = this.pageOffset) < nBytes) {
			const {previousPage} = this
			if (previousPage <= 0)
				throw new Error('Out of bounds')
			await this.turnPage(previousPage - 1)
			this.pageOffset = this.pageSize
			nBytes -= pageOffset
		}
		this.pageOffset -= nBytes
	}

  /**
   * Traverses a number of bytes through the file.
   * Yields the size of each contiguous region as it is made ready to operate on.
   *
   * @param {integer} nBytes
   */
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

  /**
   * Sets the current page index and, optionally, offset.
   * Reads the header of the new page to prepare to operate on it.
   *
   * @param {integer} pageIndex - 0 for the first page
   * @param {integer} pageOffset
   */
  async turnPage(pageIndex = this.nextPage - 1, pageOffset = 0) {
    if (pageIndex < 0)
      throw new Error('Out of bounds')
    this.pageIndex = pageIndex
    this.pageOffset = pageOffset
    await this.#readPageHeader()
  }

  /**
   * Allocates the space needed for a new page
   *
   * @returns {integer} - Index of free page
   */
  async #freePage() {
    const {nPages, pageIndex, pageOffset} = this
    for (let i = 0; i < nPages; i++) {
      await this.turnPage(i)
      if (this.nextPage === 0 && this.previousPage === 0 && this.pageSize === 0) {
        await this.turnPage(pageIndex, pageOffset)
        return i
      }
    }
    this.nPages++
    await this.#updateHeader()
    await this.turnPage(pageIndex, pageOffset)
    return nPages
  }

  /** Creates a new page and splices it into the current position of the book */
	async createPage() {
    await this.updatePageHeader()
    const previousPage = this.pageIndex + 1
		const nextPage = this.nextPage
    const pageIndex = (await this.#freePage()) + 1
		this.nextPage = pageIndex
		await this.updatePageHeader()
		if (nextPage > 0) {
			await this.turnPage(nextPage - 1)
			this.previousPage = pageIndex
			await this.updatePageHeader()
		}
		this.pageIndex = pageIndex - 1
		this.pageOffset = 0
		this.nextPage = nextPage
		this.previousPage = previousPage
		this.pageSize = 0
	}

  /** Deletes the current page and splices the surrounding ones together */
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

  /** Reads the header of the current page into memory */
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

  /** Updates the next page, previous page, and page size in the file */
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

  /**
   * Opens the file for this book, creating a new one if needed
   */
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

  /** Creates a default book header and writes it to the file */
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

  /**
   * Reads the header of this book into memory.
   * The header includes endianness, number, size, and padding of pages.
   */
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

  /** Writes the current header information onto the file */
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
