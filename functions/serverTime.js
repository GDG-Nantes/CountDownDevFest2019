const functions = require('firebase-functions')
var timesyncServer = require('timesync/server')
const express = require('express')
const cookieParser = require('cookie-parser')()
const cors = require('cors')
const app = express()
const admin = require('firebase-admin')
admin.initializeApp()

app.use(
  cors({
    origin: '*',
  }),
)
app.use(cookieParser)

// handle timesync requests
app.options(
  '/whatTime',
  cors({
    origin: '*',
  }),
)
app.use('/whatTime', timesyncServer.requestHandler)

exports.app = functions.https.onRequest(app)
