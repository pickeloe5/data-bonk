const BrokenBook = require('.')

async function create(buffer, offset = 0, nBytes = buffer.length - offset) {

	// No-op short-circuit
	if (nBytes <= 0)
		return;

	const {maxSize, padding} = this.config.page
	const suffix = await this.truncatePage()

	// Single-page short-circuit
	if (nBytes <= maxSize - this.pageSize) {
		await this.appendToPage(buffer, offset, nBytes)
		if (suffix !== null)
			await this.appendToPage(suffix)
		await this.updatePageHeader()
		return;
	}

	// Enforce-padding long-circuit
	const paddedSize = maxSize - padding
	if (this.pageSize > paddedSize) {
		this.pageOffset = paddedSize
		const prefix = await this.truncatePage()
		await this.createPage()
		await this.appendToPage(prefix)
	}

	// Straight-appends
	await this.appendToPages(buffer, offset, nBytes)
	if (suffix !== null)
		await this.appendToPages(suffix)
	await this.updatePageHeader()

}
BrokenBook.prototype.create = create
