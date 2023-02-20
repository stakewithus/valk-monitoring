import request from '../common/vault-request';

const list = async () => {
  const res = await request()('/v1/sys/policies/acl', 'LIST')({});
  if (!res || !res.data) {
    return [];
  }
  return res.data.keys;
};

export default {
  list,
};
