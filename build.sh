#!/bin/bash
ARG=$1

if [ $ARG == 'apm' ]
then
    cd apm
    npm install
    npm run build
fi

