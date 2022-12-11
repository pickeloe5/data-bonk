const config = require('./config')

const util = {
	readInt(buffer, offset) {
		if (config.bigEndian)
			return buffer.readInt32BE(offset)
		return buffer.readInt32LE(offset)
	},
	writeInt(buffer, offset, value) {
		if (config.bigEndian)
			buffer.writeInt32BE(value, offset)
		else
			buffer.writeInt32LE(value, offset)
		return 4
	}
}

module.exports = util
