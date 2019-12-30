const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
var downloader = require('../lib/downloader')

const deleteFolderRecursive = function (path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      let curPath = path + '/' + file
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath)
      } else {
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}

const [, , ...flags] = process.argv
const isWin =
  flags.includes('--platform=windows') || require('../lib/util').isWin
const executableName = isWin ? 'youtube-dl.exe' : 'youtube-dl'
const detailsName = 'details'

if (fs.existsSync(path.join(__dirname, '../prebuilt/', executableName))) {
  mkdirp.sync(path.join(__dirname, '../bin/'))
  fs.renameSync(
    path.join(__dirname, '../prebuilt/', executableName),
    path.join(__dirname, '../bin/', executableName)
  )
  fs.renameSync(
    path.join(__dirname, '../prebuilt/', detailsName),
    path.join(__dirname, '../bin/', detailsName)
  )
  deleteFolderRecursive(path.join(__dirname, '../prebuilt/'))
} else {
  downloader(function error (err, done) {
    if (err) return console.log(err.stack)
    console.log(done)
  })
}
