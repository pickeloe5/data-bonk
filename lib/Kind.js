let Kind

class KindEnum {
	NULL = 0
	FALSE = 1
	TRUE = 2
	NUMBER = 3
	STRING = 4
	ARRAY = 5
	MAP = 6
	getName(kind) {
		for (const name in Kind)
			if (Kind[name] === kind)
				return name
	}
}

Kind = new KindEnum()

module.exports = Kind
