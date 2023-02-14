import axios from "axios";
import config from "../../config";

const instance = axios.create();
instance.defaults.baseURL = config.stakeApiUrl;
instance.defaults.headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

instance.interceptors.response.use(function (response) {
  return response.data.result;
}, function (error) {
  return Promise.reject(error.response && error.response.data);
});

export default instance;