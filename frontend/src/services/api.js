import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

export const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
});

const token = localStorage.getItem('token');
if (token) {
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

const api = {
  login: async (email, password) => {
    const res = await axiosInstance.post('/auth/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    }
    return res.data;
  },

  register: async (username, email, password) => {
    const res = await axiosInstance.post('/auth/register', { username, email, password });
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    }
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    delete axiosInstance.defaults.headers.common['Authorization'];
  },

  // Repositories
  getRepos: async () => {
    const res = await axiosInstance.get('/repos');
    return res.data;
  },

  getRepoById: async (id) => {
    const res = await axiosInstance.get(`/repos/${id}`);
    return res.data;
  },

  cloneRepo: async (gitUrl, name) => {
    const res = await axiosInstance.post('/repos/clone', {
      gitUrl,
      name,
    });

    return res.data;
  },

  uploadZip: async (formData) => {
    const res = await axiosInstance.post(
      '/repos/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return res.data;
  },

  reindexRepo: async (id) => {
    const res = await axiosInstance.post(
      `/repos/${id}/reindex`
    );

    return res.data;
  },

  deleteRepo: async (id) => {
    const res = await axiosInstance.delete(`/repos/${id}`);
    return res.data;
  },

  // Chat / AI
  queryRepo: async (repoId, query) => {
    const res = await axiosInstance.post('/chat/query', {
      repoId,
      query,
    });

    return res.data;
  },

  getChatHistory: async (repoId) => {
    const res = await axiosInstance.get(
      `/chat/history/${repoId}`
    );

    return res.data;
  },

  getDependencies: async (repoId) => {
    const res = await axiosInstance.get(
      `/chat/dependencies/${repoId}`
    );

    return res.data;
  },

  getCommits: async (repoId) => {
    const res = await axiosInstance.get(
      `/chat/commits/${repoId}`
    );

    return res.data;
  },

  getUserSettings: async () => {
    const res = await axiosInstance.get('/user/settings');
    return res.data;
  },

  saveUserApiKey: async (apiKey, apiProvider) => {
    const res = await axiosInstance.post('/user/settings/api-key', { apiKey, apiProvider });
    return res.data;
  },

  removeUserApiKey: async () => {
    const res = await axiosInstance.delete('/user/settings/api-key');
    return res.data;
  },

  getAdminSummary: async () => {
    const res = await axiosInstance.get('/admin/summary');
    return res.data;
  },

  getAdminTopUsers: async () => {
    const res = await axiosInstance.get('/admin/top-users');
    return res.data;
  },

  getAdminViolations: async () => {
    const res = await axiosInstance.get('/admin/violations');
    return res.data;
  },
};

export default api;