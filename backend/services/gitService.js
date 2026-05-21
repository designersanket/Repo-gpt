const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');

/**
 * Clones a repository with real-time progress via spawn.
 * onProgress({ stage, percentage, receivedObjects, totalObjects, speed })
 */
const cloneRepository = (gitUrl, targetDir, onProgress) => {
  return new Promise(async (resolve, reject) => {
    if (fs.existsSync(targetDir)) await removeDir(targetDir);
    fs.mkdirSync(targetDir, { recursive: true });

    // --progress forces git to emit progress even when stderr is not a tty
    const git = spawn('git', ['clone', '--depth', '1', '--no-single-branch', '--progress', gitUrl, targetDir]);

    let lastStage = 'connecting';

    const parseProgress = (line) => {
      // Receiving objects:  45% (123/273), 1.23 MiB | 2.34 MiB/s
      const recvMatch = line.match(/Receiving objects:\s+(\d+)%\s+\((\d+)\/(\d+)\)(?:,\s+([\d.]+\s+\S+))?(?:\s+\|\s+([\d.]+\s+\S+\/s))?/);
      if (recvMatch) {
        onProgress && onProgress({
          stage: 'receiving',
          percentage: Math.round(parseInt(recvMatch[1]) * 0.6), // 0-60% range
          receivedObjects: parseInt(recvMatch[2]),
          totalObjects: parseInt(recvMatch[3]),
          transferred: recvMatch[4] || '',
          speed: recvMatch[5] || '',
        });
        lastStage = 'receiving';
        return;
      }

      // Resolving deltas:  80% (45/56)
      const deltaMatch = line.match(/Resolving deltas:\s+(\d+)%\s+\((\d+)\/(\d+)\)/);
      if (deltaMatch) {
        onProgress && onProgress({
          stage: 'resolving',
          percentage: 60 + Math.round(parseInt(deltaMatch[1]) * 0.25), // 60-85% range
          receivedObjects: parseInt(deltaMatch[2]),
          totalObjects: parseInt(deltaMatch[3]),
          transferred: '',
          speed: '',
        });
        lastStage = 'resolving';
        return;
      }

      // Checking out files:  90% (45/50)
      const checkoutMatch = line.match(/Checking out files:\s+(\d+)%/);
      if (checkoutMatch) {
        onProgress && onProgress({
          stage: 'checkout',
          percentage: 85 + Math.round(parseInt(checkoutMatch[1]) * 0.14), // 85-99%
          receivedObjects: 0,
          totalObjects: 0,
          transferred: '',
          speed: '',
        });
        lastStage = 'checkout';
        return;
      }

      // Counting objects
      if (line.includes('Counting objects')) {
        onProgress && onProgress({ stage: 'counting', percentage: 5, receivedObjects: 0, totalObjects: 0, transferred: '', speed: '' });
      }

      // Compressing objects
      if (line.includes('Compressing objects')) {
        onProgress && onProgress({ stage: 'compressing', percentage: 10, receivedObjects: 0, totalObjects: 0, transferred: '', speed: '' });
      }
    };

    // git clone writes progress to stderr
    git.stderr.on('data', (data) => {
      const lines = data.toString().split(/\r|\n/);
      lines.forEach(line => { if (line.trim()) parseProgress(line.trim()); });
    });

    git.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git clone failed with exit code ${code}`));
    });

    git.on('error', (err) => reject(new Error(`Failed to spawn git: ${err.message}`)));
  });
};

/**
 * Extracts an uploaded ZIP archive to target directory.
 */
const extractZip = async (zipPath, targetDir) => {
  if (fs.existsSync(targetDir)) {
    await removeDir(targetDir);
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(targetDir, true);
};

/**
 * Removes a directory, handling Windows read-only .git files.
 */
const removeDir = (dirPath) => {
  return new Promise((resolve) => {
    try {
      // Set all files writable first (needed for .git on Windows)
      const makeWritable = (p) => {
        try {
          const stat = fs.statSync(p);
          if (stat.isDirectory()) {
            fs.readdirSync(p).forEach(f => makeWritable(path.join(p, f)));
          } else {
            fs.chmodSync(p, 0o666);
          }
        } catch (_) {}
      };
      makeWritable(dirPath);
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch (_) {}
    resolve();
  });
};

/**
 * Recursively builds folder/file tree ignoring system/build directories.
 */
const buildFileTree = (dirPath, repoRootPath = dirPath) => {
  const name = path.basename(dirPath);
  const relativePath = path.relative(repoRootPath, dirPath).replace(/\\/g, '/');
  const stats = fs.statSync(dirPath);

  const IGNORE_LIST = [
    'node_modules', '.git', 'dist', 'build', '.venv', 'venv', '__pycache__',
    'vector-db', 'repositories', '.idea', '.vscode', '.DS_Store', 'package-lock.json', 'yarn.lock'
  ];

  if (stats.isDirectory()) {
    const children = [];
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      if (IGNORE_LIST.includes(item)) {
        continue;
      }
      const childPath = path.join(dirPath, item);
      children.push(buildFileTree(childPath, repoRootPath));
    }

    return {
      name: relativePath === '' ? 'root' : name,
      path: relativePath === '' ? '.' : relativePath,
      type: 'directory',
      children: children.sort((a, b) => {
        // Sort folders first, then alphabetical
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      }),
    };
  } else {
    return {
      name,
      path: relativePath,
      type: 'file',
    };
  }
};

/**
 * Detect languages used in the repository by reading file extensions.
 */
const detectLanguages = (dirPath) => {
  const languages = new Set();
  const extMap = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.cpp': 'C++',
    '.cc': 'C++',
    '.h': 'C/C++ Header',
    '.hpp': 'C/C++ Header'
  };

  const walk = (currentPath) => {
    if (!fs.existsSync(currentPath)) return;
    const stats = fs.statSync(currentPath);

    if (stats.isDirectory()) {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        if (['node_modules', '.git', 'dist', 'build', 'venv', '.venv'].includes(item)) continue;
        walk(path.join(currentPath, item));
      }
    } else {
      const ext = path.extname(currentPath).toLowerCase();
      if (extMap[ext]) {
        languages.add(extMap[ext]);
      }
    }
  };

  walk(dirPath);
  return Array.from(languages);
};

module.exports = {
  cloneRepository,
  extractZip,
  buildFileTree,
  detectLanguages,
  removeDir,
};
