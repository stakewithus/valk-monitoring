FROM node:10-alpine

COPY package.json *.lock /app/

WORKDIR /app

RUN ["sh", "-c", "yarn"]

COPY . /app

CMD ["yarn", "start"]
