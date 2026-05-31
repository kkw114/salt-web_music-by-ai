const express = require('express');
const path = require('path');
const fs = require('fs');
const { parseFile } = require('music-metadata');

const app = express();
const PORT = process.env.PORT || 3000;
const MUSIC_DIR = process.env.MUSIC_DIR || path.join(__dirname, 'testmusic');

const AUDIO_EXTS = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma', '.opus', '.webm'];

app.use(express.static(__dirname));
app.use('/music', express.static(MUSIC_DIR));

// Cache: filePath -> { meta, coverBuffer, coverFormat }
const metaCache = new Map();

function cleanFilename(name) {
    return name.replace(/\.[^.]+$/, '').replace(/^\d+[.\-\s]+/, '').replace(/_/g, ' ').trim();
}

async function getMeta(fullPath) {
    if (metaCache.has(fullPath)) return metaCache.get(fullPath);
    const meta = await parseFile(fullPath);
    let coverBuffer = null;
    let coverFormat = null;
    if (meta.common.picture && meta.common.picture.length > 0) {
        coverBuffer = Buffer.from(meta.common.picture[0].data);
        coverFormat = meta.common.picture[0].format || 'image/jpeg';
    }
    const entry = { meta, coverBuffer, coverFormat };
    metaCache.set(fullPath, entry);
    return entry;
}

async function scanRecursive(dir, basePath) {
    const results = [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = basePath ? basePath + '/' + entry.name : entry.name;
        if (entry.isDirectory()) {
            const sub = await scanRecursive(fullPath, relPath);
            results.push(...sub);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (AUDIO_EXTS.includes(ext)) {
                const lrcName = entry.name.replace(/\.[^.]+$/, '') + '.lrc';
                const lrcFullPath = path.join(dir, lrcName);
                const lrcRelPath = basePath ? basePath + '/' + lrcName : lrcName;
                results.push({
                    fullPath,
                    name: entry.name,
                    relPath: relPath.replace(/\\/g, '/'),
                    hasLrc: fs.existsSync(lrcFullPath),
                    lrcRelPath: lrcRelPath.replace(/\\/g, '/')
                });
            }
        }
    }
    return results;
}

function countAudioFiles(dir) {
    let count = 0;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile() && AUDIO_EXTS.includes(path.extname(entry.name).toLowerCase())) {
                count++;
            }
        }
    } catch(e) {}
    return count;
}

function scanFlat(dir, basePath) {
    const results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (AUDIO_EXTS.includes(ext)) {
                    const lrcName = entry.name.replace(/\.[^.]+$/, '') + '.lrc';
                    const lrcFullPath = path.join(dir, lrcName);
                    const lrcRelPath = basePath ? basePath + '/' + lrcName : lrcName;
                    results.push({
                        fullPath,
                        name: entry.name,
                        relPath: (basePath ? basePath + '/' + entry.name : entry.name).replace(/\\/g, '/'),
                        hasLrc: fs.existsSync(lrcFullPath),
                        lrcRelPath: lrcRelPath.replace(/\\/g, '/')
                    });
                }
            }
        }
    } catch(e) {}
    return results;
}

app.get('/api/folders', (req, res) => {
    try {
        const subfolders = [];
        const entries = fs.readdirSync(MUSIC_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const count = countAudioFiles(path.join(MUSIC_DIR, entry.name));
                subfolders.push({ name: entry.name, path: entry.name, count });
            }
        }
        // Count files in root
        const rootCount = countAudioFiles(MUSIC_DIR);
        // Also count files recursively in subfolders (for "all" indicator)
        let totalCount = rootCount;
        for (const sf of subfolders) totalCount += sf.count;
        res.json({ subfolders, rootCount, totalCount });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/files', async (req, res) => {
    try {
        let dir = MUSIC_DIR;
        let basePath = '';
        const sub = req.query.sub;
        if (sub) {
            dir = path.join(MUSIC_DIR, sub);
            if (!dir.startsWith(MUSIC_DIR)) { res.status(403).end(); return; }
            basePath = sub;
        }
        const files = sub ? scanFlat(dir, basePath) : await scanRecursive(MUSIC_DIR, '');
        files.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

        const tracks = [];
        for (const f of files) {
            try {
                const { meta, coverBuffer } = await getMeta(f.fullPath);
                tracks.push({
                    name: f.name,
                    title: meta.common.title || cleanFilename(f.name),
                    artist: meta.common.artist || '未知艺术家',
                    album: meta.common.album || '未知专辑',
                    hasCover: !!coverBuffer,
                    track: meta.common.track && meta.common.track.no ? String(meta.common.track.no) : '',
                    year: meta.common.year || '',
                    genre: meta.common.genre && meta.common.genre.length ? meta.common.genre[0] : '',
                    url: '/music/' + f.relPath,
                    lrcUrl: f.hasLrc ? '/music/' + f.lrcRelPath : null
                });
            } catch (e) {
                console.warn('Metadata error for', f.name, e.message);
                tracks.push({
                    name: f.name,
                    title: cleanFilename(f.name),
                    artist: '未知艺术家',
                    album: '未知专辑',
                    hasCover: false,
                    track: '',
                    year: '',
                    genre: '',
                    url: '/music/' + f.relPath,
                    lrcUrl: f.hasLrc ? '/music/' + f.lrcRelPath : null
                });
            }
        }
        res.json(tracks);
    } catch (e) {
        console.error('API error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/cover', async (req, res) => {
    try {
        const file = req.query.file;
        if (!file) { res.status(400).end(); return; }
        const fullPath = path.join(MUSIC_DIR, file);
        if (!fullPath.startsWith(MUSIC_DIR)) { res.status(403).end(); return; }
        const { coverBuffer, coverFormat } = await getMeta(fullPath);
        if (!coverBuffer) { res.status(404).end(); return; }
        res.set('Content-Type', coverFormat);
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(coverBuffer);
    } catch (e) {
        res.status(404).end();
    }
});

app.listen(PORT, '::', () => {
    const os = require('os');
    const ifaces = os.networkInterfaces();
    console.log('Server running on:');
    console.log('  http://localhost:' + PORT);
    for (const [name, addrs] of Object.entries(ifaces)) {
        for (const addr of addrs) {
            if (!addr.internal) {
                const host = addr.family === 'IPv6' ? '[' + addr.address + ']' : addr.address;
                console.log('  http://' + host + ':' + PORT + '  (' + name + ')');
            }
        }
    }
    console.log('Music dir:', MUSIC_DIR);
});
