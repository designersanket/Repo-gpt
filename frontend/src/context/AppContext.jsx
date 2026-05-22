import React, { createContext, useState, useEffect } from 'react';
import { axiosInstance } from '../services/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [repos, setRepos] = useState([]);
  const [activeRepo, setActiveRepo] = useState(null);
  const [selectedFilePath, setSelectedFilePath] = useState(null);
  const [selectedFileContent, setSelectedFileContent] = useState(null);
  const [highlightedLines, setHighlightedLines] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [usage, setUsage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [indexingStatus, setIndexingStatus] = useState(null);
  const [cloneProgress, setCloneProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Global 401 interceptor — auto-logout on expired/invalid token
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.reload();
        }
        return Promise.reject(err);
      }
    );
    return () => axiosInstance.interceptors.response.eject(interceptor);
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await axiosInstance.get('/repos');
      if (res.data?.success) {
        setRepos(res.data.data);
        if (activeRepo) {
          const updated = res.data.data.find(r => r._id === activeRepo._id);
          if (updated) setActiveRepo(updated);
        } else if (res.data.data.length > 0) {
          const readyRepo = res.data.data.find(r => r.status === 'ready');
          if (readyRepo) loadRepoDetails(readyRepo._id);
          else setActiveRepo(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
    }
  };

  const fetchUserSettings = async () => {
    try {
      const res = await axiosInstance.get('/user/settings');
      if (res.data?.success) {
        setSettings(res.data.data);
        setUsage(res.data.data.usage);
      }
    } catch (err) {
      console.error('Failed to fetch user settings:', err);
    }
  };

  useEffect(() => {
    fetchRepos();
    fetchUserSettings();
  }, []);

  const loadRepoDetails = async (repoId) => {
    try {
      const res = await axiosInstance.get(`/repos/${repoId}`);
      if (res.data?.success) {
        setActiveRepo(res.data.data);
        setSelectedFilePath(null);
        setSelectedFileContent(null);
        setHighlightedLines(null);
      }
    } catch (err) {
      console.error('Failed to load repo details:', err);
    }
  };

  const refreshUserSettings = async () => {
    await fetchUserSettings();
  };

  const selectFile = async (relativeFilePath) => {
    if (!activeRepo) return;
    try {
      const pathParam = encodeURIComponent(relativeFilePath);
      const res = await axiosInstance.get(`/repos/${activeRepo._id}/file?path=${pathParam}`);
      if (res.data?.success) {
        setSelectedFilePath(relativeFilePath);
        setSelectedFileContent(res.data.content);
        setHighlightedLines(null);
      }
    } catch (err) {
      console.error('Failed to load file contents:', err);
      setSelectedFilePath(relativeFilePath);
      setSelectedFileContent(`// Error: Failed to load file content.\n// Path: ${relativeFilePath}\n// ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <AppContext.Provider
      value={{
        repos, setRepos, fetchRepos,
        usage,
        settings,
        refreshUserSettings,
        activeRepo, setActiveRepo, loadRepoDetails,
        selectedFilePath, setSelectedFilePath,
        selectedFileContent, setSelectedFileContent,
        highlightedLines, setHighlightedLines,
        activeTab, setActiveTab,
        indexingStatus, setIndexingStatus,
        cloneProgress, setCloneProgress,
        isUploading, setIsUploading,
        selectFile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
