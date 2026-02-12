const express = require('express');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const MUSIC_DIR = path.join(__dirname, 'public', 'music');
const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

const db = new Database('memories.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    emotion TEXT DEFAULT 'peaceful',
    image TEXT,
    music_playlist TEXT DEFAULT '[]',
    memory_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

ensureColumn('memories', 'music_playlist', `TEXT DEFAULT '[]'`);

function getMusicFiles() {
  if (!fs.existsSync(MUSIC_DIR)) {
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
  }

  return fs.readdirSync(MUSIC_DIR)
    .filter((fileName) => SUPPORTED_AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map((fileName) => ({
      name: fileName,
      url: `/music/${encodeURIComponent(fileName)}`
    }));
}

function safeParsePlaylist(rawValue, fallback = []) {
  if (!rawValue) return [...fallback];

  if (Array.isArray(rawValue)) {
    return rawValue.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  }

  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
      }
    } catch (error) {
      return [...fallback];
    }
  }

  return [...fallback];
}

function sanitizePlaylist(playlist, availableFileSet = null) {
  const unique = [];
  const seen = new Set();

  playlist.forEach((item) => {
    const normalized = path.basename(item).trim();
    if (!normalized || seen.has(normalized)) return;
    if (availableFileSet && !availableFileSet.has(normalized)) return;

    seen.add(normalized);
    unique.push(normalized);
  });

  return unique;
}

function normalizeMemoryRow(row) {
  if (!row) return row;

  return {
    ...row,
    music_playlist: safeParsePlaylist(row.music_playlist, [])
  };
}

function getSetting(key, fallbackValue) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallbackValue;

  try {
    return JSON.parse(row.value);
  } catch (error) {
    return fallbackValue;
  }
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, JSON.stringify(value));
}

function getGlobalPlaylist() {
  const files = getMusicFiles();
  const availableSet = new Set(files.map((item) => item.name));
  const saved = getSetting('global_playlist', []);
  const normalized = sanitizePlaylist(safeParsePlaylist(saved, []), availableSet);

  if (normalized.length === 0) {
    const defaultPlaylist = files.map((item) => item.name);
    setSetting('global_playlist', defaultPlaylist);
    return defaultPlaylist;
  }

  if (JSON.stringify(saved) !== JSON.stringify(normalized)) {
    setSetting('global_playlist', normalized);
  }

  return normalized;
}

app.get('/api/memories', (req, res) => {
  try {
    const memories = db.prepare('SELECT * FROM memories ORDER BY COALESCE(memory_date, created_at) DESC').all();
    res.json(memories.map(normalizeMemoryRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/memories/:id', (req, res) => {
  try {
    const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(req.params.id);
    if (memory) {
      res.json(normalizeMemoryRow(memory));
    } else {
      res.status(404).json({ error: '记忆未找到' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memories', upload.single('image'), (req, res) => {
  try {
    const { title, content, emotion, memory_date, music_playlist } = req.body;
    const id = uuidv4();
    const imagePath = req.file ? '/uploads/' + req.file.filename : null;
    const availableFileSet = new Set(getMusicFiles().map((item) => item.name));
    const normalizedPlaylist = sanitizePlaylist(safeParsePlaylist(music_playlist, []), availableFileSet);
    
    const stmt = db.prepare(`
      INSERT INTO memories (id, title, content, emotion, image, music_playlist, memory_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      title,
      content,
      emotion || 'peaceful',
      imagePath,
      JSON.stringify(normalizedPlaylist),
      memory_date || new Date().toISOString()
    );
    
    const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
    res.status(201).json(normalizeMemoryRow(memory));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/memories/:id', upload.single('image'), (req, res) => {
  try {
    const { title, content, emotion, memory_date, music_playlist } = req.body;
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: '记忆未找到' });
    }
    
    const imagePath = req.file ? '/uploads/' + req.file.filename : existing.image;
    const availableFileSet = new Set(getMusicFiles().map((item) => item.name));
    const normalizedPlaylist = sanitizePlaylist(
      safeParsePlaylist(music_playlist, safeParsePlaylist(existing.music_playlist, [])),
      availableFileSet
    );
    
    const stmt = db.prepare(`
      UPDATE memories
      SET title = ?, content = ?, emotion = ?, image = ?, music_playlist = ?, memory_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      title || existing.title,
      content || existing.content,
      emotion || existing.emotion,
      imagePath,
      JSON.stringify(normalizedPlaylist),
      memory_date || existing.memory_date,
      id
    );
    
    const memory = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
    res.json(normalizeMemoryRow(memory));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/memories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM memories WHERE id = ?').get(id);
    
    if (!existing) {
      return res.status(404).json({ error: '记忆未找到' });
    }
    
    db.prepare('DELETE FROM memories WHERE id = ?').run(id);
    res.json({ message: '记忆已消散于虚空' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/music/files', (req, res) => {
  try {
    res.json({ files: getMusicFiles() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/audio/settings', (req, res) => {
  try {
    const files = getMusicFiles();
    const availableSet = new Set(files.map((item) => item.name));
    const globalPlaylist = sanitizePlaylist(getGlobalPlaylist(), availableSet);

    res.json({
      global_playlist: globalPlaylist,
      volume: getSetting('global_volume', 0.3)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/audio/settings', (req, res) => {
  try {
    const { global_playlist, volume } = req.body;
    const files = getMusicFiles();
    const availableSet = new Set(files.map((item) => item.name));

    if (global_playlist !== undefined) {
      const normalizedPlaylist = sanitizePlaylist(safeParsePlaylist(global_playlist, []), availableSet);
      setSetting('global_playlist', normalizedPlaylist);
    }

    if (volume !== undefined) {
      const normalizedVolume = Number.isFinite(Number(volume))
        ? Math.min(Math.max(Number(volume), 0), 1)
        : 0.3;
      setSetting('global_volume', normalizedVolume);
    }

    res.json({
      global_playlist: sanitizePlaylist(getGlobalPlaylist(), availableSet),
      volume: getSetting('global_volume', 0.3)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`前灵境已开启于 http://localhost:${PORT}`);
  console.log('记忆的碎片正在虚空中漂浮...');
});
