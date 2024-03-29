const fs = require('fs')

const express = require('express')
const https = require('https')
const http = require('http')

const cors = require('cors')

const Config = require('sigmundd-config')
const Log = require('sigmundd-log')
const Metrics = require('sigmundd-metrics')
const security = require('sigmundd-security')
const version = require('./package.json').version



var parser = require('fast-xml-parser');
var hash = require('object-hash');


const { Server } = require("socket.io");

let config = new Config(process.env.PWD)
let log = new Log(config.log)

log.debug('Config: ' + JSON.stringify(config))

let metrics = new Metrics.Metrics(config.metrics)

const corsOptions = {
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'X-Access-Token'
  ],
  credentials: true,
  origin: '*',
  methods: 'GET,HEAD,OPTIONS,POST',
  preflightContinue: false
}

metrics.addCustomMetric({
  name: 'version',
  help: 'Version of this Service',
  labelNames: ['version']
}, Metrics.MetricType.GAUGE);
metrics.customMetrics['version'].labels(version).set(1)

metrics.addCustomMetric({
  name: 'present_item',
  help: 'The Item which is loaded.',
  labelNames: ['show_name', 'title', 'performer', 'duration']
}, Metrics.MetricType.GAUGE);
metrics.customMetrics['present_item'].labels('' ,'', '', '').set(1)

metrics.addCustomMetric({
  name: 'past_item',
  help: 'The past Item which is loaded.',
  labelNames: ['show_name', 'title', 'performer', 'duration']
}, Metrics.MetricType.GAUGE);
metrics.customMetrics['past_item'].labels('' ,'', '', '').set(1)


metrics.addCustomMetric({
  name: 'xml_update',
  help: 'Number of Times XML File has been updated on disk'
}, Metrics.MetricType.COUNTER);
metrics.addCustomMetric({
  name: 'xml_poll',
  help: 'Number of Times XML File has been polled'
}, Metrics.MetricType.COUNTER);
metrics.addCustomMetric({
  name: 'present_update',
  help: 'Number of Times Present Item has been updated'
}, Metrics.MetricType.COUNTER);
metrics.addCustomMetric({
  name: 'past_update',
  help: 'Number of Times past Item has been updated'
}, Metrics.MetricType.COUNTER);


let myItems = {
  present: {},
  past: [],
}

let current_hash = ''


let app = express()

app.use(metrics.collect)
app.use(security(config.security))

app.use(cors(corsOptions))

app.get('/_version', (req, res) => {
  res.send(version)
})

app.get('/_config', (req, res) => {
  res.json(config)
})

app.get('/_health', (req, res) => {
  res.sendStatus(200)
})

app.get('/_ready', (req, res) => {
  if(present.sequence) {
    res.sendStatus(200)
  } else {
    res.sendStatus(503)
  }
})

app.get('/present', (req, res) => {
  log.debug('Get /present')
  res.json(myItems.present)
})

app.get('/past', (req, res) => {
  log.debug('Get /past')
  res.json(myItems.past)
})

app.get('/_metrics', metrics.endpoint)


app.options('*', cors(corsOptions))

let server
if (config.ssl.active) {
  server = https.createServer({
    key: fs.readFileSync(config.ssl.key),
    cert: fs.readFileSync(config.ssl.cert)
  }, app)
} else {
  log.warn('SSL is not active. This is NOT recommended for live systems!')
  server = http.createServer(app)
}
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


io.on('connection', (socket) => {
  log.debug('a user connected');
  socket.on('disconnect', () => {
    log.debug('user disconnected');
  });
});

if (config.filemode === 'watch') {
  const chokidar = require('chokidar');
  chokidar.watch(config.turboplayerxml).on('all', (event, path) => {
    log.debug('XML ' + path + ' ' + event)
    metrics.customMetrics['xml_update'].inc();
    loadTurboPlayerXML();
  });
}
if (config.filemode === 'poll') {
  setInterval(() => {
    log.debug('Polling ' + config.turboplayerxml)
    metrics.customMetrics['xml_poll'].inc();
    loadTurboPlayerXML();
  }, config.pollinterval)
}
loadTurboPlayerXML();

function loadTurboPlayerXML() {
  try {
    let xml = fs.readFileSync(config.turboplayerxml, 'utf16le')
    let json = parser.parse(xml, {attrNodeName: false, ignoreAttributes : false, attributeNamePrefix : "",});
    let items = json.wddxPacket.item
    loadElement(items)
  } catch (error) {
    log.error(error)
    io.emit('error', {});
  }
  
}
                                          
function loadElement(items) {
  let candidate = {}
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item.sequence === 'present') {
        candidate = item;
      }
    }
  } else {
    candidate = items;
  }
  let time = new Date().toISOString();
  if (current_hash !== hash(candidate) ){
    current_hash = hash(candidate)
    metrics.customMetrics['present_item'].labels(candidate.Show_Name, candidate.Title, candidate.Music_Performer, candidate.Time_Duration).set(1)
    metrics.customMetrics['present_update'].inc();
    candidate.lastcheck = time
    candidate.update = time
    log.info('New Item: ' + JSON.stringify(candidate))
    io.emit('present_update', candidate);
    if (Object.keys(myItems.present).length !== 0) {
      log.debug('Added to past: ' + JSON.stringify(myItems.present))
      myItems.past.push(myItems.present)
    }
    myItems.present = candidate;
  } else {
    myItems.present.lastcheck = time
    log.debug('No Change')
  }
}

server.listen(config.port)

log.info(`turboplayer2sockets is running on Port ${config.port}`)
