const fs = require('fs')
const DataFile = require('./DataFile')
const ChildNode = require('./ChildNode')

class Engine {

  dataFile

	constructor(dataFile) {
    this.dataFile = dataFile
	}

	static async create(path, defaultValue) {
		if (!fs.existsSync(path))
			return new Engine(await DataFile.create(path, defaultValue))
		return new Engine(new DataFile(path))
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
