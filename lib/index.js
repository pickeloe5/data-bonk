const BrokenBook = require('./BrokenBook')

class Engine {
	dataFile
	constructor(path) {
		this.dataFile = new BrokenBook(path)
	}
}
