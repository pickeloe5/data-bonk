let BrokenBook

class DataFile {

	book

	constructor(path) {
		this.book = new BrokenBook(path)
	}

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
		// Create textual representation of value in book
	}

	async createEntry(value, key) {
		// Insert into array or map
	}

	async read() {
		// Read one complete value and return it
	}

	async update(value) {
		// Replace present with given value
	}

	async deleteEntry(key) {
		// Remove from array or map
	}

	async traverse(key) {
		// Move into array or map
	}

}

module.exports = Cursor
BrokenBook = require('../BrokenBook')
