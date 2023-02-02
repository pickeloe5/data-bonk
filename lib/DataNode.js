/**
 * Represents an arbitrary value in the database
 *
 * @param {DataFile} dataFile
 */
class DataNode {

  dataFile

  constructor(dataFile) {
    this.dataFile = dataFile
  }

  async createImpl(value, key) {
    await this.dataFile.createEntry(value, key)
    await this.dataFile.stop()
    return this.#clone()
  }

  /**
   * Creates an entry in an array or map
   *
   * @param {*} value
   * @param {string} [key] - If creating an entry in a map, this is the key
   * @returns {DataNode} - A new node, since this one is closed
   */
  async create(value, key) {
    return await this.createImpl(value, key)
  }

  async readImpl() {
    const result = await this.dataFile.read()
    await this.dataFile.stop()
    return result
  }

  /**
   * Reads the value at the current position in the book
   *
   * @returns {*}
   */
  async read() {
    return await this.readImpl()
  }

  async updateImpl(value) {
    await this.dataFile.update(value)
    await this.dataFile.stop()
    return this.#clone()
  }

  /**
   * Updates the value at the current position in the book
   *
   * @param {*} value
   * @returns {DataNode} - A new node, since this one is closed
   */
  async update(value) {
    return await this.updateImpl(value)
  }

  async deleteImpl(key) {
    await this.dataFile.deleteEntry(key)
    await this.dataFile.stop()
    return this.#clone()
  }

  /**
   * Deletes an entry from an array or map
   *
   * @param {(integer|string)} key
   * @returns {DataNode} - A new node, since this one is closed
   */
  async delete(key) {
    return await this.deleteImpl(key)
  }

  async traverseImpl(key) {
    await this.dataFile.traverse(key)
    return this.#clone()
  }

  /**
   * Traverses to a key in an array or map
   *
   * @param {(integer|string)} key
   * @returns {DataNode} - A new node, since a new value is to be represented
   */
  async traverse(key) {
    return await this.traverseImpl(key)
  }

  #clone() {return new DataNode(this.dataFile)}

}

module.exports = DataNode
