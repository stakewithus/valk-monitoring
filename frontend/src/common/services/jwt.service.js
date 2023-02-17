import Cookies from 'js-cookie';
import jwtDecode from 'jwt-decode';

const ID_TOKEN_KEY = '__valk_access_token__';
const ID_REFRESH_TOKEN_KEY = '__valk_refresh_token__';
const EXPIRES = 365;

export const getToken = () => {
  return Cookies.get(ID_TOKEN_KEY);
};

export const saveToken = token => {
  return Cookies.set(ID_TOKEN_KEY, token, {
    expires: EXPIRES
  });
};

export const destroyToken = () => {
  return Cookies.remove(ID_TOKEN_KEY);
};

export const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    return null;
  }
};

export const getRefreshToken = () => {
  return Cookies.get(ID_REFRESH_TOKEN_KEY);
};

export const saveRefreshToken = token => {
  return Cookies.set(ID_REFRESH_TOKEN_KEY, token, {
    expires: EXPIRES * 3
  });
};

export const destroyRefreshToken = () => {
  return Cookies.remove(ID_REFRESH_TOKEN_KEY);
};

export default {
  getToken,
  saveToken,
  destroyToken,
  getRefreshToken,
  saveRefreshToken,
  destroyRefreshToken
};