import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('van_sales_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('van_sales_token');
      localStorage.removeItem('van_sales_user');
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  getProfile: () => api.get('/auth/me'),
};

export const productApi = {
  getAll: (category) => api.get('/products', { params: { category } }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  transferStock: (data) => api.post('/products/transfer-stock', data),
  adjustStock: (data) => api.post('/products/adjust-stock', data),
};

export const shopApi = {
  getAll: (village, route) => api.get('/shops', { params: { village, route } }),
  getById: (id) => api.get(`/shops/${id}`),
  getVillages: () => api.get('/shops/villages'),
  getRoutes: () => api.get('/shops/routes'),
  create: (data) => api.post('/shops', data),
  update: (id, data) => api.put(`/shops/${id}`, data),
  getStatement: (id) => api.get(`/shops/${id}/statement`),
};

export const billingApi = {
  createInvoice: (data) => api.post('/billing', data),
  getAllInvoices: (shopId) => api.get('/billing', { params: { shopId } }),
  getInvoiceById: (id) => api.get(`/billing/${id}`),
};

export const paymentApi = {
  settle: (data) => api.post('/payments/settle', data),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  getStats: () => api.get('/admin/stats'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  deleteShop: (id) => api.delete(`/admin/shops/${id}`),
};

export default api;
