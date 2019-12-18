'use strict'

const request = require('request')
const mkdirp = require('mkdirp')
const path = require('path')
const fs = require('fs')
const sha256 = require('sha256-file')


const [, , ...flags] = process.argv

const isWin = flags.includes('--platform=windows') || require('./util').isWin

// First, look for the download link.
let dir, filePath
const defaultBin = path.join(__dirname, '..', 'bin')
const defaultPath = path.join(defaultBin, 'details')
const url = 'https://yt-dl.org/downloads/latest/youtube-dl'
const sha256Url = 'https://yt-dl.org/downloads/latest/SHA2-256SUMS'

function sha256Download(url, callback) {
  let status

  request.get(url, { followRedirect: false }, function (err, res) {
    if (err) return callback(err)

    if (res.statusCode !== 302) {
      return callback(
        new Error(
          'Did not get redirect for the latest version link. Status: ' +
          res.statusCode
        )
      )
    }

    const url = res.headers.location
    const downloadFile = request.get(url)

    downloadFile.on('response', function response (res) {
      if (res.statusCode !== 200) {
        status = new Error('Response Error: ' + res.statusCode)
        return
      }
      downloadFile.pipe(fs.createWriteStream(path.join(dir, 'sha256'), { mode: 493 }))
    })

    downloadFile.on('error', function error (err) {
      callback(err)
    })

    downloadFile.on('end', function end () {
      callback()
    })
  })

}

function download (url, callback) {
  let status

  // download the correct version of the binary based on the platform
  url = exec(url)

  request.get(url, { followRedirect: false }, function (err, res) {
    if (err) return callback(err)

    if (res.statusCode !== 302) {
      return callback(
        new Error(
          'Did not get redirect for the latest version link. Status: ' +
            res.statusCode
        )
      )
    }

    const url = res.headers.location
    const downloadFile = request.get(url)
    const newVersion = /yt-dl\.org\/downloads\/(\d{4}\.\d\d\.\d\d(\.\d)?)\/youtube-dl/.exec(
      url
    )[1]

    downloadFile.on('response', function response (res) {
      if (res.statusCode !== 200) {
        status = new Error('Response Error: ' + res.statusCode)
        return
      }
      downloadFile.pipe(fs.createWriteStream(filePath, { mode: 493 }))
    })

    downloadFile.on('error', function error (err) {
      callback(err)
    })

    downloadFile.on('end', function end () {
      callback(status, newVersion)
      sha256(path.join(dir, exec('youtube-dl')), (err, sum) => {
        if (err) throw(err)
        const info = fs.readFileSync(path.join(dir, 'sha256')).toString().split("\n");
        const item = info.find(i => i.includes(exec('youtube-dl')));
        if (item && item.split(" ")[0] === sum) {
          console.log('youtube-dl package available');
        } else {
          throw new Error('youtube-dl version error');
        }
      })
    })
  })
}

const exec = path => (isWin ? path + '.exe' : path)

function downloadCb(binDir, callback) {
  download(url, function error (err, newVersion) {
    if (err) return callback(err)
    fs.writeFileSync(
      defaultPath,
      JSON.stringify({
        version: newVersion,
        path: binDir ? filePath : binDir,
        exec: exec('youtube-dl')
      }),
      'utf8'
    )
    return callback(null, 'Downloaded youtube-dl ' + newVersion)
  })
}
function createBase (binDir) {
  dir = binDir || defaultBin
  mkdirp.sync(dir)
  if (binDir) mkdirp.sync(defaultBin)
  filePath = path.join(dir, exec('youtube-dl'))
}

function downloader (binDir, callback) {
  if (typeof binDir === 'function') {
    callback = binDir
    binDir = null
  }

  createBase(binDir)

  sha256Download(sha256Url, function error (err) {
    if (err) return callback(err)
    return downloadCb(binDir, callback)
  })
}

module.exports = downloader
