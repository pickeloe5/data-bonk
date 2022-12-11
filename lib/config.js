const os = require('os')

module.exports = {
	bigEndian: os.endianness() === 'BE',
	maxPageLength: 8192
}
