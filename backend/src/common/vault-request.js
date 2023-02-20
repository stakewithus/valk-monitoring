import httpClient from './http_client';

const vault = () => {
  const [host, port] = process.env.VAULT_ADDRESS.split(':');
  return httpClient(host, port, {
    headers: {
      'X-Vault-Token': process.env.VAULT_TOKEN || '',
    },
  });
};

const encodeUsername = (username = '') => Buffer.from(username.toLowerCase()).toString('hex');
const decodeUsername = (username) => Buffer.from(username, 'hex').toString();
const getUserEntity = async (username) => vault()(`/v1/identity/entity/name/${encodeUsername(username)}`, 'GET')({});
const deleteUserEntity = async (username) => vault()(`/v1/identity/entity/name/${encodeUsername(username)}`, 'DELETE')({});

const createUserEntity = async (username, {
  metadata,
}) => vault()('/v1/identity/entity', 'POST')({
  body: {
    name: encodeUsername(username),
    metadata,
  },
});

const updateUserEntity = async (username, {
  metadata,
}) => {
  const entity = await getUserEntity(username);
  const currentMetadata = entity.data ? entity.data.metadata : {
    username,
  };
  return vault()(`/v1/identity/entity/name/${encodeUsername(username)}`, 'POST')({
    body: {
      name: encodeUsername(username),
      metadata: {
        ...currentMetadata,
        ...metadata,
      },
    },
  });
};

export default vault;
export {
  encodeUsername,
  decodeUsername,
  createUserEntity,
  updateUserEntity,
  getUserEntity,
  deleteUserEntity,
};
