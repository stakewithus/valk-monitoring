import nock from 'nock';

const nockConsulAPI = async (host, port) => {
  const baseUri = `http://${host}:${port}`;
  nock(baseUri)
    .get('/v1/agent/services')
    .times(2)
    .reply(200, {
      'terra-backend': {
        ID: 'terra-backend',
        Service: 'terra-backend',
        Tags: [],
        Meta: {},
        Port: 0,
        Address: '',
        Weights: {
          Passing: 1,
          Warning: 1,
        },
        EnableTagOverride: false,
      },
    });
  nock(baseUri)
    .put('/v1/agent/service/register')
    .reply(200, '');
  nock(baseUri)
    .get('/v1/agent/checks')
    .times(3)
    .reply(200, {});
  nock(baseUri)
    .put('/v1/agent/check/register')
    .times(2)
    .reply(200, '');
};

export default nockConsulAPI;
