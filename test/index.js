const testSimpleTypes = require('./simple-types')
const testSimpleArrays = require('./simple-arrays')
const testSimpleMaps = require('./simple-maps')
const testLargeArrays = require('./large-arrays')
const testLargeMaps = require('./large-maps')
const testPerformance = require('./performance')

; (async function() {
  await testSimpleTypes()
  await testSimpleArrays()
  await testSimpleMaps()
  await testLargeArrays()
  await testLargeMaps()
  await testPerformance()
  console.log('Suite complete')
})()
