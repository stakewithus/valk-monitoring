import axios from "axios";
import config from "../../config";

const instance = axios.create();
instance.defaults.baseURL = config.valkApiUrl;
instance.defaults.headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

instance.interceptors.response.use(function (response) {
  return response.data && response.data.detail;
}, function (error) {
  return Promise.reject(error.response && error.response.data && error.response.data.detail);
});

export const setDefaultHeaders = (headers) => {
  for (const key in headers) {
    if (headers.hasOwnProperty(key)) {
      instance.defaults.headers[key] = headers[key];
    }
  }
};

export const setAuthorizationHeader = (token) => {
  instance.defaults.headers.Authorization = 'Bearer ' + token;
};

export const removeAuthorizationHeader = () => {
  delete instance.defaults.headers.Authorization;
};

export default instance;