var downloader = require('../lib/downloader')

downloader(function error (err, done) {
  if (err) throw err;
  console.log(done)
})
