import axios from 'axios';

// Detect the base path for reverse proxy support (e.g., OOD)
// If served at /rnode/host/port/proxy/8888/, API calls need that prefix
const basePath = window.location.pathname.replace(/\/+$/, '');

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Prepend the base path to all /api requests
apiClient.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('/api')) {
    config.url = basePath + config.url;
  }
  return config;
});

export { basePath };
export default apiClient;
