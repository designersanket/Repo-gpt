import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [repos, setRepos] = useState([]);
  const [activeRepo, setActiveRepo] = useState(null);
  const [selectedFilePath, setSelectedFilePath] = useState(null);
  const [selectedFileContent, setSelectedFileContent] = useState(null);
  const [highlightedLines, setHighlightedLines] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'graph' | 'commits'
  const [indexingStatus, setIndexingStatus] = useState(null);
  const [cloneProgress, setCloneProgress] = useState(null); // { repoId, stage, percentage, receivedObjects, totalObjects, transferred, speed }
  const [isUploading, setIsUploading] = useState(false);

  // Fetch all repos on mount
  const fetchRepos = async () => {
    try {
      const res = await axios.get('/api/repos');
      if (res.data?.success) {
        setRepos(res.data.data);
        // If there's an active repo already, update it from the list
        if (activeRepo) {
          const updated = res.data.data.find(r => r._id === activeRepo._id);
          if (updated) setActiveRepo(updated);
        } else if (res.data.data.length > 0) {
          // Set first ready repo as active
          const readyRepo = res.data.data.find(r => r.status === 'ready');
          if (readyRepo) {
            loadRepoDetails(readyRepo._id);
          } else {
            setActiveRepo(res.data.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  // Fetch full details of a repo (including fileTree)
  const loadRepoDetails = async (repoId) => {
    try {
      const res = await axios.get(`/api/repos/${repoId}`);
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

  // Helper to open a file and read its raw content from target repo
  const selectFile = async (relativeFilePath) => {
    if (!activeRepo) return;
    try {
      // We can fetch files directly via a helper route or search the disk.
      // Wait, is there a route to read a file? Let's check!
      // In our Node backend, we don't have a specific file contents route yet. Let's make sure we create one in `repoRoutes.js` or add it to repoController.
      // Wait, let's create a small route in `repoRoutes` to fetch a file's raw content!
      // Yes, a `GET /api/repos/:id/file?path=relative_path` endpoint.
      // Let's add that to `repoController.js` and `repoRoutes.js` to ensure the Monaco Editor can read files. This is vital for code exploration!
      const pathParam = encodeURIComponent(relativeFilePath);
      const res = await axios.get(`/api/repos/${activeRepo._id}/file?path=${pathParam}`);
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
        repos,
        setRepos,
        fetchRepos,
        activeRepo,
        setActiveRepo,
        loadRepoDetails,
        selectedFilePath,
        setSelectedFilePath,
        selectedFileContent,
        setSelectedFileContent,
        highlightedLines,
        setHighlightedLines,
        activeTab,
        setActiveTab,
        indexingStatus,
        setIndexingStatus,
        cloneProgress,
        setCloneProgress,
        isUploading,
        setIsUploading,
        selectFile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
