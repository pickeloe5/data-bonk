/**
 * Represents an arbitrary value in the database, similar to a DataNode.
 * Keeps track of its path, to allow for multiple operations to be executed.
 * Returns to this path if any operations move away from it.
 *
 * @param {Engine} engine
 * @param {Array<(integer|string)>} path
 */
class Query {

  engine
  path

  constructor(engine, path = []) {
    this.engine = engine
    this.path = path
  }

  /**
   * Creates an entry in an array or map
   *
   * @param {*} value
   * @param {string} [key] - If creating an entry in a map, this is the key
   * @returns {Query} - This
   */
  async create(value, key) {
    const node = await this.#getNode()
    await node.create(value, key)
    return this
  }

  /**
   * Reads the value at the current position in the book
   *
   * @returns {*}
   */
  async read() {
    const node = await this.#getNode()
    return await node.read()
  }

  /**
   * Updates the value at the current position in the book
   *
   * @param {*} value
   * @returns {Query} - This
   */
  async update(value) {
    const node = await this.#getNode()
    await node.update(value)
    return this
  }

  /**
   * Deletes an entry from an array or map
   *
   * @param {(integer|string)} key
   * @returns {Query} - This
   */
  async delete(key) {
    const node = await this.#getNode()
    await node.delete(key)
    return this
  }


  /**
   * Traverses to a key in an array or map
   *
   * @param {(integer|string)} key
   * @returns {Query} - A new query for the new path
   */
  traverse(key) {
    return new Query(this.engine, [...this.path, key])
  }

  async #getNode() {
    let node = this.engine
    for (const key of this.path)
      node = await node.traverse(key)
    return node
  }

}

module.exports = Query
