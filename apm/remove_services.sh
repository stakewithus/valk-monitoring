#!/bin/bash
PROJECT=$1
REGION=$2

# Remove Specific consul service of sentry
# docker-compose exec consul consul services deregister -id=bcl-PROJECT:REGION
docker-compose exec consul consul services deregister -id=bcl-$PROJECT:$REGION

# Remove kv store of sentry
docker-compose exec consul consul kv delete -recurse projects/nodes/bcl-$PROJECT

# Remove entire project
while true; do
    read -p "Do you remove entire project? " yn
    case $yn in
        [Yy]* ) docker-compose exec consul consul kv delete -recurse projects/global/bcl-$PROJECT; break;;
        [Nn]* ) exit;;
        * ) echo "Please answer yes or no.";;
    esac
done