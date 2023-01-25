const fs = require('fs')
const DataFile = require('./DataFile')

class Engine {

	dataFile

	constructor(dataFile) {
		this.dataFile = dataFile
	}

	static async create(path, defaultValue) {
		if (!fs.existsSync(path))
			return await DataFile.create(path, defaultValue)
		return new DataFile(path)
	}

}
