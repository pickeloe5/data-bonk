const Kind = new (class {
	NULL = 0
	FALSE = 1
	TRUE = 2
	NUMBER = 3
	STRING = 4
	ARRAY = 5
	MAP = 6
	getName(number) {
		for (const name in Kind)
			if (Kind[name] === number)
				return name
		throw new Error(`Could not get name of kind: ${number}`)
	}
})()
module.exports = Kind
