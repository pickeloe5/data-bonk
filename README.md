# Data-Bonk

### A Light-Weight Database Engine With Zero Magic

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Documentation](https://data-bonk.nickmatt.dev/docs)
- [Landing page](https://data-bonk.nickmatt.dev)
- Format specificiations
	- [Broken-Book](https://data-bonk.nickmatt.dev/spec/broken-book.html)
	- [Proprietary BSON](https://data-bonk.nickmatt.dev/spec/proprietary-bson.html)

## Installation

```
npm install https://github.com/pickeloe5/data-bonk
```

## Usage
```
const Path = require('path')
const DataBonk = require('data-bonk')

const path = Path.join(__dirname, 'data-file.broken-book.bin')
const defaultValue = {users:[]}

; (async function() {
	const db = await DataBonk.create(path, defaultValue)
	const users = db.root.traverse('users')
	await users.create({name: 'Jon'})
	await users.traverse(0).read()
	await users.traverse(0).update({name: 'Jane'})
	await users.delete(0)
})()
```
