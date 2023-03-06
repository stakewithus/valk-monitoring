#!/bin/bash
ARG=$1

# if [ $ARG == 'frontend' ]
# then
#     cd frontend
#     npm run docker
# fi

if [ $ARG == 'apm' ]
then
    cd apm
    npm install
    npm run build
fi

