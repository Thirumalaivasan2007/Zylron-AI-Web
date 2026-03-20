import axios from 'axios';

const api = axios.create({
    // Prioritize external tunnel URLs if provided, otherwise fallback to dynamic LAN IP
    baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.token) {
            config.headers['Authorization'] = `Bearer ${user.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
