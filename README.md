# turboplayer2sockets

Tracks Turboplayer-Export-XML and presents the data with sockets.

## Config

The easy way is to simply create a __config.json__.

- __port__: Port for the Service. (default: 3000)
- __turboplayerxml__: Where is the xml-file. (default: /opt/turboplayer.xml)
- __log/loglevel__: The Loglevel. (default: INFO)

Example:

```json
{
  "port": 3000,
  "turboplayerxml": "/opt/turboplayer.xml",
  "log": {
    "loglevel":"INFO"
  }
}
```

Additional Config from otherr packages:

- Under the key __security__: <https://www.npmjs.com/package/sigmundd-security>
- Under the key __log__: <https://www.npmjs.com/package/sigmundd-log>
- Under the key __metrics__: <https://www.npmjs.com/package/sigmundd-metrics>

## Usage

There are two ways to get information: Sockets and a REST-API.  

You may combine both methods, e.g. loading the present element on client start
and then listening to changes on the sockets.

### Sockets

We are using [socket.io](https://socket.io/)

In your HTML-File add the following snippet before the `</body>` (end body tag):

```html
<script src="SERVER/socket.io/socket.io.js"></script>
<script>
  var socket = io();
  socket.on('present_update', function(item) {
    // Do something here with the new Item.
  });
  socket.on('error', function(item) {
    // Some Error on the Server occured. You might want to see this. Or not. Your Play
  });
</script>
```

### REST

Another Option is to use the REST-Paths:

- `/_health`: Receive Status 200 if Server is Online
- `/_ready`: Receive Status 200 if a present item is loaded, else 503
- `/_version`: Backend Version as __text/plain__
- `/_config`: Get the current config as __application/json__
- `/present`: Load the present Item as __application/json__

### Present Item

The present item consists of the following fields:

- __sequence__ : The Current sequence. always `present`
- __Show_Name__: The Name of the current show as string
- __Title__: The Title of the current song
- __Music_Performer__: The Performer of the current song
- __Time_Duration__: The planned duration of the current song in MM:SS.fff

Example:

```json
{
  "sequence": "present",
  "Show_Name": "Amsl Nicenstein",
  "Title": "Yarama Bastıkca",
  "Music_Performer": "Ah! Kosmos & Özgür Yılmaz",
  "Time_Duration": "00:04:23.000"
}
```

## Deployment

There are two direct ways to run this microservice: native and docker  

### Native

Just install the npm-packages, add a config,  then run the service.
If the file is not created, default values from above are used:

1. `npm install`
2. ---> Create config.json (see above)
3. `node index.js`

(You may opt to use some kind of process-manager, like systemd or pm2)

### Docker

Build the Image, then run it.

1. `docker build -t turboplayer2sockets:latest .`
2. `docker run -d turboplayer2sockets:latest`

You may use the given _docker.sh_, which just needs some environment variables.
If these are not set, default values from above are used:

- __T2S_PORT__: Port for the Service
- __T2S_TURBOPLAYER_XML__: Path to Turboplayer-XML
- __T2S_LOGLEVEL__: Loglevel for Application (DEBUG, NOTICE, INFO, WARN, ERROR, FATAL)

## Telemetrics

2 types of telemetrics are avaiable: logs and promethes metrics.

### Logs

Logs are written to STDOUT in the following Format:

`YYYY-MM-DDTHH:ii:ss\tHOST\tturboplayer2sockets\tLEVEL\tMESSAGE`

Example:

`2021-09-19T19:26:34     LT-9410794      turboplayer2sockets     INFO    turboplayer2sockets is running on Port 3000`

### Prometheus

The Metrics are reachable via REST: `/_metrics` and consist fo the following stats:

- version Version of this Service
- present_item The Item which is loaded.
- xml_update Number of Times XML File has been updated on disk
- present_update Number of Times Present Item has been updated
- process_cpu_user_seconds_total Total user CPU time spent in seconds.
- process_cpu_system_seconds_total Total system CPU time spent in seconds.
- process_cpu_seconds_total Total user and system CPU time spent in seconds.
- process_start_time_seconds Start time of the process since unix epoch in seconds.
- process_resident_memory_bytes Resident memory size in bytes.
- nodejs_eventloop_lag_seconds Lag of event loop in seconds.
- nodejs_eventloop_lag_min_seconds The minimum recorded event loop delay.
- nodejs_eventloop_lag_max_seconds The maximum recorded event loop delay.
- nodejs_eventloop_lag_mean_seconds The mean of the recorded event loop delays.
- nodejs_eventloop_lag_stddev_seconds The standard deviation of the recorded event loop delays.
- nodejs_eventloop_lag_p50_seconds The 50th percentile of the recorded event loop delays.
- nodejs_eventloop_lag_p90_seconds The 90th percentile of the recorded event loop delays.
- nodejs_eventloop_lag_p99_seconds The 99th percentile of the recorded event loop delays.
- nodejs_active_handles Number of active libuv handles grouped by handle type. Every handle type is C++ class name.
- nodejs_active_handles_total Total number of active handles.
- nodejs_active_requests Number of active libuv requests grouped by request type. Every request type is C++ class name.
- nodejs_active_requests_total Total number of active requests.
- nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
- nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
- nodejs_external_memory_bytes Node.js external memory size in bytes.
- nodejs_heap_space_size_total_bytes Process heap space size total from Node.js in bytes.
- nodejs_heap_space_size_used_bytes Process heap space size used from Node.js in bytes.
- nodejs_heap_space_size_available_bytes Process heap space size available from Node.js in bytes.
- nodejs_version_info Node.js version info.

## TODO

- unit tests
