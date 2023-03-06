FROM node:10-alpine as client
COPY package.json package-lock.json /app/
WORKDIR /app
RUN ["npm", "install"]
COPY . /app
RUN ["npm","run","build"]

FROM nginx:1.16-alpine
COPY --from=client /app/dist /usr/share/nginx/html
