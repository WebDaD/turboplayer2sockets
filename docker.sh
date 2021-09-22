#!/bin/bash

docker build -t turboplayer2sockets:latest . 

docker stop turboplayer2sockets || :

docker rm turboplayer2sockets || :

docker run \
--volume "${T2S_TURBOPLAYER_XML}":/opt/turboplayer.xml:ro \
--env LOG_LOGLEVEL="${T2S_LOGLEVEL}" \
--name turboplayer2sockets \
--restart unless-stopped \
-p "${T2S_PORT}":3000 \
-d turboplayer2sockets:latest
