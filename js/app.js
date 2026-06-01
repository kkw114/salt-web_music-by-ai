/**
 * App - Main Application
 */

const App = (() => {
    let lrcFileMap = {};
    let firstLoad = true;

    let sourceMode = 'default';
    let currentSubfolder = '';
    let localDirHandle = null;
    let localSubfolders = [];
    let currentLabel = 'testmusic';

    function fmtRate(r) {
        var s = r.toFixed(2);
        if (s.endsWith('00')) s = s.slice(0, -3);
        else if (s.endsWith('0')) s = s.slice(0, -1);
        return s + 'x';
    }

    function init() {
        try {
            UI.init();
            UI.initSettingsEvents();
            UI.initSourceEvents();
            UI.updatePlaymodeUI(PlaylistManager.getPlaymode());
            UI.showLyricsPanel();
            UI.initVolumeUI();
            bindEvents();
            bindKeyboardShortcuts();
            // Restore playback settings
            AudioEngine.setVolume(Settings.get('volume') / 100 || 0.8);
            UI.updateVolumeUI(AudioEngine.getVolume(), false);
            var savedRate = Settings.get('rate') || 1;
            AudioEngine.setRate(savedRate);
            document.getElementById('btn-speed').textContent = fmtRate(savedRate);
        } catch(e) { console.error('App init error:', e); }

        sourceMode = 'default';
        var lastSrc = Settings.get('lastSource') || 'default';
        var lastSub = Settings.get('lastSubfolder') || '';
        var lastIdx = Settings.get('lastTrackIndex');
        if (lastSrc === 'default' && lastSub) {
            currentSubfolder = lastSub;
            currentLabel = lastSub || 'testmusic';
        } else {
            currentSubfolder = '';
            currentLabel = 'testmusic';
        }
        UI.updateSourceLabel(currentLabel);
        var _restoreSub = currentSubfolder;
        loadFromServer().then(function() {
            if (lastSrc === 'default' && lastIdx >= 0 && lastIdx < PlaylistManager.length) {
                PlaylistManager.setCurrentIndexSilent(lastIdx);
            }
            fetch('/api/folders').then(function(r) { return r.json(); }).then(function(d) {
                UI.renderSourceFolders(d.subfolders, d.totalCount, _restoreSub);
            });
        });
        // Always restore local folder in background, switch to it if last source was local
        tryRestoreLocalFolder();
    }

    function bindEvents() {
        var els = UI.els;
        els.btnPlay.addEventListener('click', function() { AudioEngine.togglePlay(); });
        els.btnNext.addEventListener('click', function() { playNext(); });
        els.btnPrev.addEventListener('click', function() { playPrev(); });
        els.btnPlaymode.addEventListener('click', function() { UI.updatePlaymodeUI(PlaylistManager.cyclePlaymode()); });
        els.btnMute.addEventListener('click', function() {
            UI.updateVolumeUI(AudioEngine.getVolume(), AudioEngine.toggleMute());
            Settings.set('volume', Math.round(AudioEngine.getVolume() * 100));
        });

        setupSlider(els.progressBar, function(pct) { AudioEngine.seekPercent(pct); });

        els.btnMute.addEventListener('wheel', function(e) {
            e.preventDefault();
            var v = AudioEngine.getVolume() + (e.deltaY > 0 ? -0.05 : 0.05);
            v = Math.max(0, Math.min(1, v));
            AudioEngine.setVolume(v);
            UI.updateVolumeUI(v, false);
            Settings.set('volume', Math.round(v * 100));
        });

        els.btnTogglePlaylist.addEventListener('click', function() { UI.togglePlaylistPanel(); });
        document.getElementById('btn-close-playlist').addEventListener('click', function() { UI.togglePlaylistPanel(); });

        var speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        var btnSpeed = document.getElementById('btn-speed');
        btnSpeed.addEventListener('click', function() {
            var cur = AudioEngine.getRate();
            var next = speeds.find(function(s) { return s > cur + 0.001; }) || speeds[0];
            AudioEngine.setRate(next);
            btnSpeed.textContent = fmtRate(next);
            Settings.set('rate', next);
        });
        document.addEventListener('keyup', function(e) {
            if (e.code === 'KeyX' || e.code === 'KeyC') btnSpeed.textContent = fmtRate(AudioEngine.getRate());
        });

        AudioEngine.on('play', function() {
            UI.updatePlayButton(true);
            var t = PlaylistManager.getCurrentTrack();
            if (t) { UI.updateTrackInfo(t); UI.updateAlbumArt(t.coverUrl); }
        });
        AudioEngine.on('pause', function() { UI.updatePlayButton(false); });
        AudioEngine.on('timeupdate', function(d) { UI.updateProgress(d.current, d.duration); LyricsEngine.update(d.current * 1000); });
        AudioEngine.on('end', function() {
            if (PlaylistManager.next(false) === -1) UI.updatePlayButton(false);
        });
        AudioEngine.on('load', function(d) { UI.updateProgress(0, d.duration); });

        PlaylistManager.on('trackchange', function(track) {
            if (track) {
                Settings.set('lastTrackIndex', PlaylistManager.currentIndex);
                loadAndPlayTrack(track);
            }
        });

        document.addEventListener('dragover', function(e) { e.preventDefault(); UI.showDropOverlay(); });
        document.addEventListener('dragleave', function(e) { if (!e.relatedTarget) UI.hideDropOverlay(); });
        document.addEventListener('drop', async function(e) {
            e.preventDefault(); UI.hideDropOverlay();
            var lrcs = [].filter.call(e.dataTransfer.files, function(f) { return MetadataReader.isLRCFile(f.name); });
            for (var k = 0; k < lrcs.length; k++) await loadLRCFile(lrcs[k]);
        });
    }

    function setupSlider(el, onChange) {
        var d = false;
        var p = function(e) { var r = el.getBoundingClientRect(); return Math.max(0, Math.min(1, ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width)); };
        el.addEventListener('mousedown', function(e) { d = true; onChange(p(e)); });
        el.addEventListener('touchstart', function(e) { d = true; onChange(p(e)); }, {passive:true});
        document.addEventListener('mousemove', function(e) { if (d) onChange(p(e)); });
        document.addEventListener('touchmove', function(e) { if (d) onChange(p(e)); }, {passive:true});
        document.addEventListener('mouseup', function() { d = false; });
        document.addEventListener('touchend', function() { d = false; });
    }

    function bindKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            var ctrl = e.ctrlKey || e.metaKey;
            if (!ctrl && e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                var pct = parseInt(e.key) * 10;
                var dur = AudioEngine.getDuration();
                if (dur > 0) AudioEngine.seek(dur * pct / 100);
                return;
            }
            if (!ctrl && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); AudioEngine.seek(0); return; }
            if (!ctrl && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
                e.preventDefault();
                var v = AudioEngine.getVolume() + (e.code === 'ArrowUp' ? 0.1 : -0.1);
                v = Math.max(0, Math.min(1, v));
                AudioEngine.setVolume(v);
                UI.updateVolumeUI(v, false);
                Settings.set('volume', Math.round(v * 100));
                return;
            }
            if (ctrl && e.code === 'ArrowLeft') { e.preventDefault(); playPrev(); return; }
            if (ctrl && e.code === 'ArrowRight') { e.preventDefault(); playNext(); return; }
            if (ctrl && e.code === 'ArrowDown') { e.preventDefault(); AudioEngine.togglePlay(); return; }
            if (!ctrl && e.code === 'ArrowLeft') { e.preventDefault(); AudioEngine.seek(AudioEngine.getPosition() - 5); return; }
            if (!ctrl && e.code === 'ArrowRight') { e.preventDefault(); AudioEngine.seek(AudioEngine.getPosition() + 5); return; }

            switch (e.code) {
                case 'Space': e.preventDefault(); AudioEngine.togglePlay(); break;
                case 'KeyN': playNext(); break;
                case 'KeyP': playPrev(); break;
                case 'KeyM': UI.updateVolumeUI(AudioEngine.getVolume(), AudioEngine.toggleMute()); Settings.set('volume', Math.round(AudioEngine.getVolume() * 100)); break;
                case 'KeyX': e.preventDefault(); var step = Settings.get('speedStep') || 0.05; var r = Math.max(0.5, AudioEngine.getRate() - step); AudioEngine.setRate(r); document.getElementById('btn-speed').textContent = fmtRate(r); Settings.set('rate', r); break;
                case 'KeyC': e.preventDefault(); var step2 = Settings.get('speedStep') || 0.05; var r2 = AudioEngine.getRate() + step2; if (r2 > 2) r2 = 0.5; AudioEngine.setRate(r2); document.getElementById('btn-speed').textContent = fmtRate(r2); Settings.set('rate', r2); break;
            }
        });
    }

    // ========== Source Management ==========

    async function loadDefaultSource() {
        sourceMode = 'default';
        currentSubfolder = '';
        currentLabel = 'testmusic';
        UI.updateSourceLabel(currentLabel);
        // Don't auto-load tracks - wait for user to pick a folder
    }

    function setSourceMode(mode) {
        sourceMode = mode;
        Settings.set('lastSource', mode);
        UI.updateSourceTab(mode);
        if (mode === 'default') { loadDefaultSource(); }
        else if (mode === 'local') { if (localDirHandle) renderLocalFolders(); }
    }

    function selectSubfolder(path, silent) {
        if (!silent) {
            Settings.set('lastSource', sourceMode);
            Settings.set('lastSubfolder', path || '');
        }
        if (sourceMode === 'default') {
            currentSubfolder = path || '';
            UI.updateSourceLabel(currentSubfolder || 'testmusic');
            loadFromServer();
        } else if (sourceMode === 'local') {
            currentSubfolder = path || '';
            readLocalDir();
        }
    }

    async function loadFromServer() {
        try {
            UI.els.folderName.textContent = '加载中...';
            var url = '/api/files';
            if (currentSubfolder) url += '?sub=' + encodeURIComponent(currentSubfolder);
            var resp = await fetch(url);
            var data = await resp.json();
            if (!Array.isArray(data) || !data.length) { UI.els.folderName.textContent = '未找到音乐文件'; return; }
            populateTracks(data);
            UI.els.folderName.textContent = currentSubfolder || 'testmusic';
        } catch(e) { console.error('Load error:', e); UI.els.folderName.textContent = '加载失败'; }
    }

    function getSortGroup(s) {
        var c = s.charAt(0);
        if (/[a-zA-Z]/.test(c)) return 0;
        if (/[0-9]/.test(c)) return 1;
        return 0; // Chinese etc. sorts with A-Z by pinyin
    }

    function populateTracks(data) {
        lrcFileMap = {};
        firstLoad = !AudioEngine.getIsPlaying();
        for (var i = 0; i < data.length; i++) {
            var t = data[i];
            if (t.lrcUrl) lrcFileMap[t.name] = t.lrcUrl;
            if (t.hasCover) t.coverUrl = '/api/cover?file=' + encodeURIComponent(t.url.replace('/music/', ''));
            else t.coverUrl = null;
        }
        data.sort(function(a, b) {
            var an = String(a.title || a.name || '');
            var bn = String(b.title || b.name || '');
            var ca = getSortGroup(an), cb = getSortGroup(bn);
            if (ca !== cb) return ca - cb;
            return an.localeCompare(bn, 'zh-CN');
        });
        PlaylistManager.setTracks(data);
        UI.showPlayer();
        UI.renderPlaylist(data, -1);
        PlaylistManager.setCurrentIndexSilent(0);
    }

    // ========== Local Folder Mode ==========

    var localFileCache = {};
    var localTracksCache = {};

    function getFolderDB() {
        return new Promise(function(resolve, reject) {
            var req = indexedDB.open('rlp-folders', 1);
            req.onupgradeneeded = function() { req.result.createObjectStore('handles'); };
            req.onsuccess = function() { resolve(req.result); };
            req.onerror = function() { reject(req.error); };
        });
    }

    async function saveFolderHandle(handle) {
        try {
            var db = await getFolderDB();
            var tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').put(handle, 'lastFolder');
            return new Promise(function(resolve) { tx.oncomplete = resolve; });
        } catch(e) {}
    }

    async function restoreFolderHandle() {
        try {
            var db = await getFolderDB();
            var tx = db.transaction('handles', 'readonly');
            var req = tx.objectStore('handles').get('lastFolder');
            return new Promise(function(resolve, reject) {
                req.onsuccess = function() { resolve(req.result); };
                req.onerror = reject;
            });
        } catch(e) { return null; }
    }

    async function openLocalFolder() {
        if (!('showDirectoryPicker' in window)) {
            // Fallback for HTTP (non-localhost): use input[webkitdirectory]
            tryLocalFolderFallback();
            return;
        }
        try {
            var h = await window.showDirectoryPicker({ mode: 'read' });
            saveFolderHandle(h);
            await scanLocalHandle(h, false);
            selectSubfolder('');
        } catch(e) { if (e.name !== 'AbortError') console.error('Local folder error:', e); }
    }

    function tryLocalFolderFallback() {
        var input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.style.display = 'none';
        input.onchange = async function() {
            var files = [];
            Array.prototype.push.apply(files, input.files);
            if (!files.length) return;
            // Group files by relative path for subfolder detection
            var rootName = '';
            var subFolders = {};
            for (var i = 0; i < files.length; i++) {
                var f = files[i];
                var path = f.webkitRelativePath || f.name;
                var slash = path.indexOf('/');
                if (slash > 0) {
                    var folder = path.substring(0, slash);
                    if (!subFolders[folder]) subFolders[folder] = { files: [], lrcs: [] };
                    if (MetadataReader.isAudioFile(f.name)) subFolders[folder].files.push(f);
                    else if (MetadataReader.isLRCFile(f.name)) subFolders[folder].lrcs.push(f);
                } else {
                    if (!rootName) rootName = f.name;
                    if (!subFolders['']) subFolders[''] = { files: [], lrcs: [] };
                    if (MetadataReader.isAudioFile(f.name)) subFolders[''].files.push(f);
                    else if (MetadataReader.isLRCFile(f.name)) subFolders[''].lrcs.push(f);
                }
            }
            if (rootName) currentLabel = rootName;
            UI.updateSourceLabel(rootName || '本地');
            sourceMode = 'local';
            currentSubfolder = '';
            localFileCache = {};
            localTracksCache = {};
            localSubfolders = [];
            for (var k in subFolders) {
                if (subFolders.hasOwnProperty(k)) {
                    var sd = subFolders[k];
                    if (k === '') {
                        localTracksCache[''] = { files: sd.files, lrcs: sd.lrcs };
                    } else {
                        localSubfolders.push({ name: k, path: k, count: sd.files.length });
                        localTracksCache[k] = { files: sd.files, lrcs: sd.lrcs };
                    }
                }
            }
            var rootCount = localTracksCache[''] ? localTracksCache[''].files.length : 0;
            UI.renderSourceFolders(localSubfolders, rootCount, '', document.getElementById('source-local-folders'));
            UI.toggleSourcePanel(true);
            selectSubfolder('');
        };
        input.click();
    }

    async function scanLocalHandle(h, silent) {
        localDirHandle = h;
        currentLabel = h.name;
        Settings.set('lastLocalFolder', h.name);
        if (!silent) UI.updateSourceLabel(h.name);
        sourceMode = 'local';
        currentSubfolder = '';
        localFileCache = {};
        localTracksCache = {};
        localSubfolders = [];

        var rootHandles = [], rootLrcHandles = [], dirHandles = [];
        for await (var e of h.values()) {
            if (e.kind === 'directory') dirHandles.push(e);
            else if (e.kind === 'file') {
                if (MetadataReader.isAudioFile(e.name)) rootHandles.push(e);
                else if (MetadataReader.isLRCFile(e.name)) rootLrcHandles.push(e);
            }
        }
        localFileCache[''] = { handles: rootHandles, lrcHandles: rootLrcHandles };

        for (var di = 0; di < dirHandles.length; di++) {
            var d = dirHandles[di];
            var sh = [], slh = [];
            try {
                for await (var se of d.values()) {
                    if (se.kind === 'file') {
                        if (MetadataReader.isAudioFile(se.name)) sh.push(se);
                        else if (MetadataReader.isLRCFile(se.name)) slh.push(se);
                    }
                }
            } catch(ex) {}
            if (sh.length > 0) {
                localSubfolders.push({ name: d.name, path: d.name, handle: d, count: sh.length });
                localFileCache[d.name] = { handles: sh, lrcHandles: slh };
            }
        }
        UI.renderSourceFolders(localSubfolders, rootHandles.length, '', document.getElementById('source-local-folders'));
        // Don't auto-load tracks - wait for user to click
    }

    async function readLocalDir() {
        var key = currentSubfolder || '';

        // If already cached with metadata, use directly
        var cached = localTracksCache[key];
        if (cached && cached.tracks) {
            setTracksFromCache(cached.tracks, key || localDirHandle.name);
            return;
        }

        if (!key) {
            // "全部歌曲" - load all directories, read all metadata, cache individually
            var allFiles = [], allLrcs = [];
            var names = [''];
            for (var si = 0; si < localSubfolders.length; si++) names.push(localSubfolders[si].name);

            // Load all files from all directories
            UI.els.folderName.textContent = '加载文件...';
            var fileGroups = {}; // name -> { files, lrcs }
            for (var ni = 0; ni < names.length; ni++) {
                var r = await loadOneDirFiles(names[ni]);
                fileGroups[names[ni]] = r;
                allFiles.push.apply(allFiles, r.files);
                allLrcs.push.apply(allLrcs, r.lrcs);
            }
            if (!allFiles.length) { UI.els.folderName.textContent = '未找到音乐文件'; return; }

            // Read metadata for ALL files at once
            var combinedEntry = { files: allFiles, lrcs: allLrcs };
            await applyLocalTracks(combinedEntry);
            // Now combinedEntry.tracks has all tracks with metadata

            // Split tracks back into per-folder caches
            var offset = 0;
            for (var si2 = 0; si2 < names.length; si2++) {
                var n = names[si2];
                var count = fileGroups[n].files.length;
                if (count > 0) {
                    var folderTracks = combinedEntry.tracks.slice(offset, offset + count);
                    var folderCacheEntry = localTracksCache[n] || {};
                    folderCacheEntry.tracks = folderTracks;
                    folderCacheEntry.files = fileGroups[n].files;
                    folderCacheEntry.lrcs = fileGroups[n].lrcs;
                    localTracksCache[n] = folderCacheEntry;
                    offset += count;
                }
            }
            // combinedEntry IS the 'all' cache
            localTracksCache[''] = combinedEntry;

            UI.renderSourceFolders(localSubfolders, allFiles.length, '', document.getElementById('source-local-folders'));
            return;
        }

        // Subfolder not cached yet (should not happen if "全部歌曲" loaded first)
        var r2 = await loadOneDirFiles(key);
        if (!r2.files.length) { UI.els.folderName.textContent = '未找到音乐文件'; return; }
        localTracksCache[key] = r2;
        await applyLocalTracks(r2);
    }

    function setTracksFromCache(tracks, label) {
        lrcFileMap = {};
        var key = currentSubfolder || '';
        var entry = localTracksCache[key];
        var lrcSource = null;
        if (entry && entry.lrcMap) lrcSource = entry.lrcMap;
        else if (localTracksCache[''] && localTracksCache[''].lrcMap) lrcSource = localTracksCache[''].lrcMap;
        if (lrcSource) {
            for (var k in lrcSource) {
                if (lrcSource.hasOwnProperty(k)) lrcFileMap[k] = lrcSource[k];
            }
        }
        firstLoad = !AudioEngine.getIsPlaying();
        PlaylistManager.setTracks(tracks);
        UI.showPlayer();
        UI.els.folderName.textContent = label;
        UI.renderPlaylist(tracks, -1);
        PlaylistManager.setCurrentIndexSilent(0);
    }

    async function loadOneDirFiles(dirKey) {
        if (localTracksCache[dirKey]) return localTracksCache[dirKey];
        var entry = localFileCache[dirKey];
        if (!entry) return { files: [], lrcs: [] };
        var files = [], lrcs = [];
        for (var i = 0; i < entry.handles.length; i++) {
            try { files.push(await entry.handles[i].getFile()); } catch(ex) {}
        }
        for (var j = 0; j < entry.lrcHandles.length; j++) {
            try { lrcs.push(await entry.lrcHandles[j].getFile()); } catch(ex) {}
        }
        var result = { files: files, lrcs: lrcs };
        localTracksCache[dirKey] = result;
        return result;
    }

    async function applyLocalTracks(cached) {
        var af = cached.files, lf = cached.lrcs;
        lrcFileMap = {};
        if (!af.length) { UI.els.folderName.textContent = '未找到音乐文件'; return; }
        af.sort(function(a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });

        UI.els.folderName.textContent = '载入中...';
        var concurrency = 8;
        var tracks = new Array(af.length);
        var completed = 0;
        var idx = 0;

        function processOne() {
            if (idx >= af.length) return Promise.resolve();
            var i = idx++;
            var file = af[i];
            return MetadataReader.readFromFile(file).then(function(meta) {
                meta.file = file;
                tracks[i] = meta;
                completed++;
                UI.els.folderName.textContent = '载入中...(' + completed + '/' + af.length + ')';
                return processOne();
            }).catch(function() {
                // Fallback if metadata read fails
                tracks[i] = { title: MetadataReader.cleanFilename(file.name), artist: '', album: '', coverUrl: null, track: '', year: '', genre: '', file: file };
                completed++;
                return processOne();
            });
        }

        var workers = [];
        for (var w = 0; w < Math.min(concurrency, af.length); w++) {
            workers.push(processOne());
        }
        await Promise.all(workers);

        for (var i = 0; i < lf.length; i++) {
            var l = lf[i], lb = l.name.replace(/\.lrc$/i, '').toLowerCase();
            for (var j = 0; j < tracks.length; j++) {
                if (tracks[j] && tracks[j].file.name.replace(/\.[^.]+$/, '').toLowerCase() === lb) { lrcFileMap[tracks[j].file.name] = l; break; }
            }
        }
        // Save metadata into cache for instant switching back
        cached.tracks = tracks;
        cached.lrcMap = lrcFileMap;
        cached.currentIndex = 0;

        firstLoad = !AudioEngine.getIsPlaying();
        PlaylistManager.setTracks(tracks);
        UI.showPlayer();
        UI.els.folderName.textContent = currentSubfolder || localDirHandle.name;
        UI.renderPlaylist(tracks, -1);
        PlaylistManager.setCurrentIndexSilent(0);
    }

    function scanLocalDirContents() { readLocalDir(); }

    function renderLocalFolders() {
        var fc = 0;
        for (var i = 0; i < localSubfolders.length; i++) fc += localSubfolders[i].count || 0;
        UI.renderSourceFolders(localSubfolders, fc, currentSubfolder, document.getElementById('source-local-folders'));
    }

    async function loadAllLocalMeta() {
        // Load all directory files, read metadata, cache per folder - all in background
        var names = [''];
        for (var si = 0; si < localSubfolders.length; si++) names.push(localSubfolders[si].name);
        var allFiles = [], allLrcs = [];
        var fileGroups = {};
        for (var ni = 0; ni < names.length; ni++) {
            var r = await loadOneDirFiles(names[ni]);
            fileGroups[names[ni]] = r;
            allFiles.push.apply(allFiles, r.files);
            allLrcs.push.apply(allLrcs, r.lrcs);
        }
        if (!allFiles.length) return;
        var combinedEntry = { files: allFiles, lrcs: allLrcs };
        await applyLocalTracksSilent(combinedEntry);
        // Split back into per-folder caches
        var offset = 0;
        for (var si2 = 0; si2 < names.length; si2++) {
            var n = names[si2];
            var count = fileGroups[n].files.length;
            if (count > 0) {
                var folderTracks = combinedEntry.tracks.slice(offset, offset + count);
                var fcEntry = localTracksCache[n] || {};
                fcEntry.tracks = folderTracks;
                fcEntry.files = fileGroups[n].files;
                fcEntry.lrcs = fileGroups[n].lrcs;
                localTracksCache[n] = fcEntry;
                offset += count;
            }
        }
        localTracksCache[''] = combinedEntry;
    }

    // Like applyLocalTracks but doesn't touch UI (runs in background)
    async function applyLocalTracksSilent(cached) {
        var af = cached.files;
        if (!af.length) return;
        af.sort(function(a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });
        var concurrency = 8;
        var tracks = new Array(af.length);
        var completed = 0;
        var idx = 0;

        function processOne() {
            if (idx >= af.length) return Promise.resolve();
            var i = idx++;
            return MetadataReader.readFromFile(af[i]).then(function(meta) {
                meta.file = af[i];
                tracks[i] = meta;
                completed++;
                return processOne();
            }).catch(function() {
                tracks[i] = { title: MetadataReader.cleanFilename(af[i].name), artist: '', album: '', coverUrl: null, track: '', year: '', genre: '', file: af[i] };
                completed++;
                return processOne();
            });
        }
        var workers = [];
        for (var w = 0; w < Math.min(concurrency, af.length); w++) workers.push(processOne());
        await Promise.all(workers);
        // Match LRC files
        var lf = cached.lrcs || [];
        var lrcMap = {};
        for (var i = 0; i < lf.length; i++) {
            var l = lf[i], lb = l.name.replace(/\.lrc$/i, '').toLowerCase();
            for (var j = 0; j < tracks.length; j++) {
                if (tracks[j] && tracks[j].file.name.replace(/\.[^.]+$/, '').toLowerCase() === lb) { lrcMap[tracks[j].file.name] = l; break; }
            }
        }
        cached.tracks = tracks;
        cached.lrcMap = lrcMap;
        cached.currentIndex = 0;
    }

    async function tryRestoreLocalFolder() {
        if (!('showDirectoryPicker' in window)) return;
        var handle = await restoreFolderHandle();
        if (!handle) return;
        var lastSrc = Settings.get('lastSource') || 'default';
        try {
            var perm = await handle.queryPermission({ mode: 'read' });
            if (perm === 'granted') {
                var prevSrc = sourceMode;
                var prevSub = currentSubfolder;
                var prevLabel = currentLabel;
                await scanLocalHandle(handle, lastSrc !== 'local');
                if (lastSrc === 'local') {
                    // Was in local mode - stay there and load tracks
                    var lastSub = Settings.get('lastSubfolder') || '';
                    var lastIdx = Settings.get('lastTrackIndex');
                    if (lastSub) currentSubfolder = lastSub;
                    loadAllLocalMeta().then(function() {
                        selectSubfolder(currentSubfolder, true);
                        if (lastIdx >= 0 && lastIdx < PlaylistManager.length) {
                            PlaylistManager.setCurrentIndexSilent(lastIdx);
                        }
                    });
                } else {
                    // Restore default state
                    sourceMode = prevSrc;
                    currentSubfolder = prevSub;
                    currentLabel = prevLabel;
                    loadAllLocalMeta();
                }
                return;
            }
        } catch(e) {}
        // Need user gesture - show restore button
        var container = document.getElementById('source-local-folders');
        if (!container) return;
        var lastName = Settings.get('lastLocalFolder') || '';
        var btn = document.createElement('button');
        btn.className = 'source-local-btn';
        btn.style.marginTop = '8px';
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 恢复: ' + (lastName || '未知文件夹');
        btn.addEventListener('click', async function() {
            try {
                var perm2 = await handle.queryPermission({ mode: 'read' });
                if (perm2 !== 'granted') perm2 = await handle.requestPermission({ mode: 'read' });
                if (perm2 === 'granted') await scanLocalHandle(handle, false);
            } catch(e) { console.error('Restore error:', e); }
        });
        container.appendChild(btn);
    }

    // ========== Track Loading ==========

    function loadAndPlayTrack(track) {
        UI.animateTrackChange();
        UI.updateTrackInfo(track);
        UI.updateAlbumArt(track.coverUrl);
        LyricsEngine.reset();
        var lrcRef = null;
        if (sourceMode === 'local') lrcRef = lrcFileMap[track.file ? track.file.name : track.name];
        else lrcRef = lrcFileMap[track.name];
        if (lrcRef) {
            if (lrcRef instanceof File) lrcRef.text().then(function(t) { LyricsEngine.setLyrics(LyricsEngine.parseLRC(t).lyrics); }).catch(function() {});
            else if (typeof lrcRef === 'string') fetch(lrcRef).then(function(r) { return r.text(); }).then(function(t) { LyricsEngine.setLyrics(LyricsEngine.parseLRC(t).lyrics); }).catch(function() {});
        }
        var src = track.url || track.file;
        if (firstLoad) { firstLoad = false; AudioEngine.load(src); }
        else AudioEngine.play(src);
        UI.renderPlaylist(PlaylistManager.tracks, PlaylistManager.currentIndex);
    }

    function playTrack(i) { PlaylistManager.setCurrentIndex(i); }
    function playNext() { if (PlaylistManager.next(true) === -1) UI.updatePlayButton(false); }
    function playPrev() { PlaylistManager.prev(true); }

    async function loadLRCFile(f) {
        try {
            LyricsEngine.setLyrics(LyricsEngine.parseLRC(await f.text()).lyrics);
            var t = PlaylistManager.getCurrentTrack();
            if (t) {
                if (sourceMode === 'local' && t.file) lrcFileMap[t.file.name] = f;
                else lrcFileMap[t.name] = f;
            }
        } catch(e) {}
    }

    return {
        init: init,
        playTrack: playTrack,
        playNext: playNext,
        playPrev: playPrev,
        setSourceMode: setSourceMode,
        selectSubfolder: selectSubfolder,
        openLocalFolder: openLocalFolder,
        get sourceMode() { return sourceMode; },
        get currentSubfolder() { return currentSubfolder; }
    };
})();

document.addEventListener('DOMContentLoaded', function() { App.init(); });
