import axios from "axios";

// * Configurando axios
const api = axios.create();
api.defaults.withCredentials = true;
api.defaults.baseURL = 'http://localhost:2923/api';

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken') || '';
  config.headers['Authorization'] = `Bearer ${accessToken}`;
  return config;
});

export default api;