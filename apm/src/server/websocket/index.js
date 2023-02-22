import WebSocket from 'ws';

const wsSend = (client) => (type, payload) => new Promise((resolve, reject) => {
  const msg = {
    type,
    data: payload,
  };
  client.send(JSON.stringify(msg), (err) => {
    if (err) {
      reject(err);
    }
    resolve();
  });
});

const broadcast = (wss) => (type, message) => {
  wss.clients.forEach(async (client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        wsSend(client)(type, message);
      } catch (err) {
        console.log('broadcastBlocks error');
        console.log(err && err.toString());
      }
    }
  });
};

export default {
  broadcast,
};
