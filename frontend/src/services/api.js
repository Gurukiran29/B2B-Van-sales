import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('van_sales_token');
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
      // Avoid clearing token indiscriminately on transient 401s
      console.warn('Unauthorized request to:', error.config?.url);
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
};

export const billingApi = {
  createInvoice: (data) => api.post('/billing', data),
  getAllInvoices: (shopId) => api.get('/billing', { params: { shopId } }),
  getInvoiceById: (id) => api.get(`/billing/${id}`),
  getInvoiceByNumber: (invoiceNumber) => api.get(`/billing/number/${invoiceNumber}`),
  deleteInvoice: (id) => api.delete(`/billing/${id}`),
};

export const paymentApi = {
  settlePayment: (data) => api.post('/payments/settle', data),
  getAllPayments: () => api.get('/payments'),
  getPaymentsByShopId: (shopId) => api.get(`/payments/shop/${shopId}`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export const adminApi = {
  getSystemStats: () => api.get('/admin/stats'),
  getAllUsers: (role) => api.get('/admin/users', { params: { role } }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  deleteShop: (id) => api.delete(`/admin/shops/${id}`),
};

export default api;
