import { useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import { AppContext } from '../context/AppContext';

export const useWebSocket = () => {
  const socketRef = useRef(null);
  const { setIndexingStatus, setCloneProgress, fetchRepos, loadRepoDetails } = useContext(AppContext);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return; // Don't connect if not logged in

    socketRef.current = io(import.meta.env.VITE_BACKEND_URL || window.location.origin, {
      path: '/code-mind-socket.io',
      transports: ['websocket', 'polling'],
      auth: { token }, // Send JWT for server-side auth
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to RepoGPT WebSockets.');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('WebSocket error:', err.message);
    });

    socketRef.current.on('indexing-progress', (data) => {
      setIndexingStatus({ repoId: data.repoId, status: data.status, progress: data.progress, error: data.error });
      if (data.status === 'ready' || data.status === 'failed') {
        fetchRepos();
        if (data.status === 'ready') loadRepoDetails(data.repoId);
      }
    });

    socketRef.current.on('clone-progress', (data) => {
      setCloneProgress({
        repoId: data.repoId, stage: data.stage, percentage: data.percentage,
        receivedObjects: data.receivedObjects, totalObjects: data.totalObjects,
        transferred: data.transferred, speed: data.speed,
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from RepoGPT WebSockets.');
    });

    return () => socketRef.current?.disconnect();
  }, []);

  // join-repo no longer needed — user room is auto-joined on connect
  const joinRepoRoom = (repoId) => {
    if (socketRef.current?.connected && repoId) {
      socketRef.current.emit('join-repo', repoId);
    }
  };

  return { joinRepoRoom };
};
