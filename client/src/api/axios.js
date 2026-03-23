import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request (if available)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('peerflow_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Global response error handler
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('peerflow_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
