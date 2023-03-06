FROM alpine:3.9

RUN apk add --no-cache libstdc++ libgcc
RUN apk add --no-cache git
RUN mkdir /core
# Add Dependencies
#ADD node_modules/scrypt/build/Release/scrypt.node /core/scrypt.node
#ADD node_modules/sha3/build/Release/sha3.node  /core/sha3.node
#ADD node_modules/websocket/build/Release/bufferutil.node /core/bufferutil.node
#ADD node_modules/websocket/build/Release/validation.node /core/validation.node

ADD apm-agent /core/app
WORKDIR /core
ENTRYPOINT ["/core/app"]
