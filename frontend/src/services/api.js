import axios from 'axios';

// API Axios instances (using local Vite server proxy)
axios.defaults.baseURL = '';

const api = {
  // Authentication
  login: async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    }
    return res.data;
  },

  register: async (username, email, password) => {
    const res = await axios.post('/api/auth/register', { username, email, password });
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    }
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  },

  // Repositories Ingestion
  getRepos: async () => {
    const res = await axios.get('/api/repos');
    return res.data;
  },

  getRepoById: async (id) => {
    const res = await axios.get(`/api/repos/${id}`);
    return res.data;
  },

  cloneRepo: async (gitUrl, name) => {
    const res = await axios.post('/api/repos/clone', { gitUrl, name });
    return res.data;
  },

  uploadZip: async (formData) => {
    const res = await axios.post('/api/repos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  reindexRepo: async (id) => {
    const res = await axios.post(`/api/repos/${id}/reindex`);
    return res.data;
  },

  deleteRepo: async (id) => {
    const res = await axios.delete(`/api/repos/${id}`);
    return res.data;
  },

  // Code retrieval and chats
  queryRepo: async (repoId, query) => {
    const res = await axios.post('/api/chat/query', { repoId, query });
    return res.data;
  },

  getChatHistory: async (repoId) => {
    const res = await axios.get(`/api/chat/history/${repoId}`);
    return res.data;
  },

  getDependencies: async (repoId) => {
    const res = await axios.get(`/api/chat/dependencies/${repoId}`);
    return res.data;
  },

  getCommits: async (repoId) => {
    const res = await axios.get(`/api/chat/commits/${repoId}`);
    return res.data;
  },
};

// Initialize Authorization header from local storage on bootstrap
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default api;
