import axios from 'axios';
import { BASE_URL } from './config';

const API = axios.create({ baseURL: `${BASE_URL}/api` });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// auth
export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);

// services -> direct array
export const getServices = () => API.get('/services');

// student
export const takeToken = (serviceId) => API.post('/tokens', { serviceId });
export const getStatus = (serviceId) => API.get(`/tokens/status?serviceId=${serviceId}`);
export const cancelToken = (tokenId) => API.patch(`/tokens/${tokenId}/cancel`);

// admin (queue -> direct array)
export const getQueue = (serviceId) => API.get(`/admin/queue/${serviceId}`);
export const callNext = (serviceId) => API.post('/admin/call-next', { serviceId });
export const skipToken = (tokenId) => API.post('/admin/skip', { tokenId });
export const completeToken = (tokenId) => API.post('/admin/complete', { tokenId });

export const errMsg = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || fallback;

export default API;
