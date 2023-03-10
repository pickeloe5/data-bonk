const BrokenBook = require('.')

/**
 * Deletes text from the current position in the book
 *
 * @async
 * @param {integer} nBytes
 */
BrokenBook.prototype.delete = async function _delete(nBytes) {

	// No-op short-circuit
	if (nBytes <= 0)
		return;

	const nPageBytes = this.pageSize - this.pageOffset

	// Single-page short-circuit
	if (nBytes <= nPageBytes) {
		const {pageOffset} = this
		this.pageOffset += nBytes
		const suffix = await this.truncatePage()
		this.pageOffset = pageOffset
		this.pageSize = this.pageOffset
		if (suffix !== null)
			await this.appendToPage(suffix)
		await this.updatePageHeader()
		return;
	}

	// Partial-page short-circuit
	if (this.pageOffset > 0) {
		this.pageSize = this.pageOffset
		await this.updatePageHeader()
		await this.turnPage()
		await this.delete(nBytes - nPageBytes)
		return;
	}

	if (nBytes > nPageBytes && this.nextPage <= 0)
		throw new Error('Delete operation extended past last page')
	await this.deletePage()
	await this.delete(nBytes - nPageBytes)

}
