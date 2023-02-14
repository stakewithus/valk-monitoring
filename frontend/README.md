# valk-client

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run your tests
```
npm run test
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).


### Deployment

Add .env file
- VALK_SERVER_IMAGE=app-valk-server:1.0.1
- VALK_SERVER_PORT_EXPOSE=3001
- VALK_SERVER_PORT_PUBLIC=3001
- VALK_CLIENT_IMAGE=app-valk-client:1.0.1
- VALK_CLIENT_PORT_EXPOSE=80
- VALK_CLIENT_PORT_PUBLIC=8086


```
npm run docker:build
```