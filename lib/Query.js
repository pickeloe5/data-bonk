class Query {

  engine
  path

  constructor(engine, path = []) {
    this.engine = engine
    this.path = path
  }

  async create(value, key) {
    const node = await this.#getNode()
    await node.create(value, key)
    return this
  }

  async read() {
    const node = await this.#getNode()
    return await node.read()
  }

  async update(value) {
    const node = await this.#getNode()
    await node.update(value)
    return this
  }

  async delete(key) {
    const node = await this.#getNode()
    await node.delete(key)
    return this
  }

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
