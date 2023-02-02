const DataNode = require('./DataNode')

class ChildNode extends DataNode {

  constructor(dataFile) {
    super(dataFile)
  }

  async create(value, key) {
    await this.dataFile.createEntry(value, key)
    await this.dataFile.stop()
    return this.dataFile
  }

  async read() {
    const result = await this.dataFile.read()
    await this.dataFile.stop()
    return result
  }

  async update(value) {
    await this.dataFile.update(value)
    await this.dataFile.stop()
    return this.dataFile
  }

  async delete(key) {
    await this.dataFile.deleteEntry(key)
    await this.dataFile.stop()
    return this.dataFile
  }

  async traverse(key) {
    await this.dataFile.traverse(key)
    return this
  }

}

module.exports = ChildNode
