class DataNode {

  dataFile

  constructor(dataFile) {
    this.dataFile = dataFile
  }

  async create(value, key) {}
  async read() {}
  async update(value) {}
  async delete(key) {}
  async traverse(key) {}

}

module.exports = DataNode
