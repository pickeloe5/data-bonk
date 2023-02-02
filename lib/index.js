const fs = require('fs')
const DataFile = require('./DataFile')
const DataNode = require('./DataNode')
const ChildNode = require('./ChildNode')
const Query = require('./Query')

class Engine extends DataNode {

	constructor(dataFile) {
    super(dataFile)
	}

  root = new Query(this)

	static async create(path, defaultValue) {
		if (!fs.existsSync(path))
			return new Engine(await DataFile.create(path, defaultValue))
		return new Engine(new DataFile(path))
	}

  async create() {
    throw new Error('Create operation not valid at root of D.B.')
  }

  async read() {
    const child = await this.#makeChild()
    return await child.read()
  }

  async update(value) {
    const child = await this.#makeChild()
    await child.update(value)
    return this
  }

  async delete() {
    throw new Error('Delete operation not valid at root of D.B.')
  }

  async traverse(key) {
    const child = await this.#makeChild()
    return await child.traverse(key)
  }

  async #makeChild() {
    await this.dataFile.start()
    return new ChildNode(this.dataFile)
  }

}

module.exports = Engine
