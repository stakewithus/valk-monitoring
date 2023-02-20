const tokens = {};

const get = (user) => tokens[user] || null;

const set = (user, token) => {
  tokens[user] = token;
  return user;
};

export default {
  get,
  set,
};
