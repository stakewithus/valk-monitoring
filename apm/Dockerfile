FROM alpine:3.9

RUN apk add --no-cache libstdc++ libgcc
RUN apk add --no-cache git
RUN mkdir /core

ADD apm-agent /core/app
WORKDIR /core
ENTRYPOINT ["/core/app"]
