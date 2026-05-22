import { useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import { AppContext } from '../context/AppContext';

export const useWebSocket = () => {
  const socketRef = useRef(null);

  const {
    setIndexingStatus,
    setCloneProgress,
    fetchRepos,
    loadRepoDetails,
  } = useContext(AppContext);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL, {
      path: '/code-mind-socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to RepoGPT WebSockets.');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('WebSocket Connection Error:', err);
    });

    // High-level indexing progress
    socketRef.current.on('indexing-progress', (data) => {
      console.log('Indexing Progress:', data);

      setIndexingStatus({
        repoId: data.repoId,
        status: data.status,
        progress: data.progress,
        error: data.error,
      });

      if (data.status === 'ready' || data.status === 'failed') {
        fetchRepos();

        if (data.status === 'ready') {
          loadRepoDetails(data.repoId);
        }
      }
    });

    // Git clone progress
    socketRef.current.on('clone-progress', (data) => {
      console.log('Clone Progress:', data);

      setCloneProgress({
        repoId: data.repoId,
        stage: data.stage,
        percentage: data.percentage,
        receivedObjects: data.receivedObjects,
        totalObjects: data.totalObjects,
        transferred: data.transferred,
        speed: data.speed,
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from RepoGPT WebSockets.');
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const joinRepoRoom = (repoId) => {
    if (socketRef.current && repoId) {
      socketRef.current.emit('join-repo', repoId);
    }
  };

  return { joinRepoRoom };
};