import axios from 'axios';

const api = axios.create({
    // Dynamically choose between local and production URLs
    baseURL: window.location.hostname === 'localhost' 
        ? "http://localhost:5000/api" 
        : "https://zylron-ai-web.onrender.com/api",
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
