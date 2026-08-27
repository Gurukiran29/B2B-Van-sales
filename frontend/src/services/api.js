import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

export const productApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getLowStock: () => api.get('/products/low-stock'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  adjustStock: (data) => api.post('/products/adjust-stock', data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const shopApi = {
  getAll: (params) => api.get('/shops', { params }),
  getById: (id) => api.get(`/shops/${id}`),
  getVillages: () => api.get('/shops/villages'),
  getRoutes: () => api.get('/shops/routes'),
  getStatement: (id) => api.get(`/shops/${id}/statement`),
  create: (data) => api.post('/shops', data),
  update: (id, data) => api.put(`/shops/${id}`, data),
};

export const billingApi = {
  createInvoice: (invoiceData) => api.post('/billing', invoiceData),
  getAllInvoices: () => api.get('/billing'),
  getById: (id) => api.get(`/billing/${id}`),
  getByShopId: (shopId) => api.get(`/billing/shop/${shopId}`),
};

export const paymentApi = {
  settle: (settlementData) => api.post('/payments/settle', settlementData),
  getAllPayments: () => api.get('/payments'),
  getByShopId: (shopId) => api.get(`/payments/shop/${shopId}`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export const adminApi = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getStats: () => api.get('/admin/stats'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  deleteShop: (id) => api.delete(`/admin/shops/${id}`),
};

export default api;
