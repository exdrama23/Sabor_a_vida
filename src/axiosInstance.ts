import axios from "axios";

// * Configurando axios
const api = axios.create();
api.defaults.withCredentials = true;
api.defaults.baseURL =  window.location.hostname.includes('localhost') ? 'http://localhost:2923/api' : 'https://wealthy-courtney-sabor-a-vida-f6291b31.koyeb.app';

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken') || '';
  config.headers['Authorization'] = `Bearer ${accessToken}`;
  return config;
});

export default api;