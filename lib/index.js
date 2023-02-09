const fs = require('fs')
const DataFile = require('./DataFile')
const DataNode = require('./DataNode')
const Query = require('./Query')

/**
 * Represents a database
 *
 * @param {DataFile} dataFile
 */
class Engine extends DataNode {

	constructor(dataFile) {
    super(dataFile)
	}

  root = new Query(this)

	/**
	 * Instantiates a new engine at the given path with the given default value
	 *
	 * @param {string} path
	 * @param {*} defaultValue
	 */
	static async create(path, defaultValue) {
		if (!fs.existsSync(path))
			return new Engine(await DataFile.create(path, defaultValue))
		return new Engine(new DataFile(path))
	}

	async create(value, key) {
		await this.dataFile.start()
		await this.createImpl(value, key)
		return this
	}

	async read() {
		await this.dataFile.start()
		return await this.readImpl(value, key)
		return this
	}

	async update(value) {
		await this.dataFile.start()
		await this.updateImpl(value)
		return this
	}

	async delete(key) {
		await this.dataFile.start()
		await this.deleteImpl(key)
		return this
	}

	async traverse(key) {
		await this.dataFile.start()
		return await this.traverseImpl(key)
	}

}

module.exports = Engine
