/**
 * UI Module
 * Handles all rendering, animations, and visual effects
 * Inspired by refined-now-playing-netease
 */

const UI = (() => {
    const els = {};

    function init() {
        try {
        // Cache DOM elements
        els.welcomeScreen = document.getElementById('welcome-screen');
        els.playerContainer = document.getElementById('player-container');
        els.bgBlur = document.getElementById('bg-blur');
        els.bgContainer = document.getElementById('bg-container');
        els.albumArt = document.getElementById('album-art');
        els.albumGlow = document.getElementById('album-glow');
        els.trackTitle = document.getElementById('track-title');
        els.trackArtist = document.getElementById('track-artist');
        els.trackAlbum = document.getElementById('track-album');
        els.folderName = document.getElementById('folder-name');
        els.lyricsPanel = document.getElementById('lyrics-panel');
        els.lyricsContainer = document.getElementById('lyrics-container');
        els.lyricsContent = document.getElementById('lyrics-content');
        els.playlistPanel = document.getElementById('playlist-panel');
        els.playlistList = document.getElementById('playlist-list');
        els.playlistCount = document.getElementById('playlist-count');
        els.progressFill = document.getElementById('progress-fill');
        els.progressThumb = document.getElementById('progress-thumb');
        els.progressBar = document.getElementById('progress-bar');
        els.timeCurrent = document.getElementById('time-current');
        els.timeDuration = document.getElementById('time-duration');
        els.btnPlay = document.getElementById('btn-play');
        els.iconPlay = document.getElementById('icon-play');
        els.iconPause = document.getElementById('icon-pause');
        els.btnPrev = document.getElementById('btn-prev');
        els.btnNext = document.getElementById('btn-next');
        els.btnMute = document.getElementById('btn-mute');
        els.iconVolume = document.getElementById('icon-volume');
        els.iconMuted = document.getElementById('icon-muted');
        els.volumePct = document.getElementById('volume-pct');
        els.btnOpenFolder = document.getElementById('btn-open-folder');
        els.btnSource = document.getElementById('btn-source');
        els.sourceLabel = document.getElementById('source-label');
        els.btnTogglePlaylist = document.getElementById('btn-toggle-playlist');
        els.dropOverlay = document.getElementById('drop-overlay');

        // New elements
        els.btnPlaymode = document.getElementById('btn-playmode');
        els.iconSeq = document.getElementById('icon-seq');
        els.iconRepeat = document.getElementById('icon-repeat');
        els.iconShuffle = document.getElementById('icon-shuffle');
        els.btnToggleSettings = document.getElementById('btn-toggle-settings');
        els.settingsPanel = document.getElementById('settings-panel');
        els.settingsOverlay = document.getElementById('settings-overlay');
        els.settingsContent = document.getElementById('settings-content');
        els.settingsTabs = document.getElementById('settings-tabs');
        els.contextMenu = document.getElementById('context-menu');
        els.sourcePanel = document.getElementById('source-panel');
        els.sourceOverlay = document.getElementById('source-overlay');
        els.sourceContent = document.getElementById('source-content');
        els.sourceTabs = document.getElementById('source-tabs');
        els.playlistIndex = document.getElementById('playlist-index');

        // Initialize settings
        Settings.init();
        initIdleDetection();
        initContextMenu();
        renderSettingsPanel('appearance');

        // Initialize lyrics engine
        LyricsEngine.init(els.lyricsContainer, els.lyricsContent);

        // Set overridable animation functions for settings support
        LyricsEngine.overrides.scale = getScaleForOffset;
        LyricsEngine.overrides.opacity = getOpacityForOffset;
        LyricsEngine.overrides.blur = getBlurForOffset;
        } catch(e) {
            console.error('UI init error:', e);
        }
    }

    // Dynamic functions using settings
    function getScaleForOffset(offset) {
        if (!Settings.get('lyricZoom')) return 1;
        offset = Math.abs(offset);
        if (offset === 0) return 1;
        return Math.max(1 - offset * 0.1, 0.65);
    }

    function getOpacityForOffset(offset) {
        if (!Settings.get('lyricFade')) return 1;
        offset = Math.abs(offset);
        if (offset === 0) return 1;
        return Math.max(0.5 - (offset - 1) * 0.15, 0.12);
    }

    function getBlurForOffset(offset) {
        if (!Settings.get('lyricBlur')) return 0;
        offset = Math.abs(offset);
        if (offset === 0) return 0;
        return Math.min(1 + offset * 0.7, 4.5);
    }

    function updateLyricLayout() {
        const fs = Settings.get('lyricFontSize');
        document.documentElement.style.setProperty('--font-size-lyric', `${fs}px`);
        document.documentElement.style.setProperty('--lyric-alignment', `${Settings.get('lyricAlignment')}%`);
    }

    // Show player, hide welcome
    function showPlayer() {
        els.welcomeScreen.classList.add('hidden');
        els.playerContainer.classList.remove('hidden');
    }

    function showWelcome() {
        els.welcomeScreen.classList.remove('hidden');
        els.playerContainer.classList.add('hidden');
    }

    // Update background with album art
    function updateBackground(imageUrl, gradientColors) {
        var bgType = Settings.get('bgType');

        // Remove existing fluid layer
        var oldFluid = document.getElementById('bg-fluid');
        if (oldFluid) oldFluid.remove();

        // Crossfade only when image actually changes (not on bg type switch)
        var lastBgUrl = els.bgBlur._lastUrl;
        var sameImage = lastBgUrl === imageUrl && imageUrl != null;
        if (bgType === 'blur' && imageUrl && !sameImage) {
            els.bgBlur.style.opacity = '0';
            setTimeout(function() {
                els.bgBlur.style.backgroundImage = 'url(' + imageUrl + ')';
                els.bgBlur.style.backgroundSize = 'cover';
                els.bgBlur.style.opacity = '1';
            }, 200);
            els.bgBlur._lastUrl = imageUrl;
        } else if (!sameImage) {
            els.bgBlur.style.opacity = '1';
            els.bgBlur._lastUrl = imageUrl;
        }

        // Reset styles
        els.bgBlur.style.backgroundSize = '';
        els.bgBlur.style.animation = '';
        els.bgBlur.style.filter = '';
        els.bgBlur.style.backgroundColor = '';
        els.bgBlur.style.transform = '';
        els.bgContainer.style.opacity = bgType === 'none' ? '0' : String(Settings.get(bgType + 'Opacity') / 100);

        if (bgType === 'none') {
            els.bgBlur.style.backgroundImage = 'none';
        } else if (bgType === 'solid') {
            els.bgBlur.style.backgroundImage = 'none';
            if (Settings.get('solidFollowAccent')) {
                // Use current accent color directly
                var accent = getComputedStyle(document.documentElement).getPropertyValue('--rnp-accent-color').trim();
                els.bgBlur.style.backgroundColor = accent || 'rgb(120,120,120)';
            } else {
                els.bgBlur.style.backgroundColor = Settings.get('solidColor');
            }
        } else if (bgType === 'gradient' && imageUrl) {
            els.bgBlur.style.backgroundImage = 'url(' + imageUrl + ')';
            els.bgBlur.style.backgroundSize = 'cover';
        } else if (bgType === 'fluid' && imageUrl) {
            els.bgBlur.style.backgroundImage = 'none';
            var fluid = document.createElement('div');
            fluid.id = 'bg-fluid';
            fluid.className = 'rnp-bg-fluid';
            fluid.style.backgroundImage = 'url(' + imageUrl + ')';
            els.bgContainer.appendChild(fluid);
        } else if (imageUrl) {
            els.bgBlur.style.backgroundImage = 'url(' + imageUrl + ')';
            els.bgBlur.style.backgroundSize = 'cover';
        } else {
            els.bgBlur.style.backgroundImage = 'none';
        }
    }

    // Update album art
    function updateAlbumArt(coverUrl) {
        if (coverUrl) {
            var img = els.albumArt;
            img.onload = function() {
                extractColorsAndUpdate(img);
            };
            img.onerror = function() {
                img.onload = null;
                els.albumGlow.style.background = 'none';
                updateBackground(null);
            };
            img.src = coverUrl;
            img.style.display = 'block';
            // If already loaded (cached), call immediately
            if (img.complete && img.naturalWidth > 0) {
                extractColorsAndUpdate(img);
            }
        } else {
            els.albumArt.src = '';
            els.albumArt.onload = null;
            els.albumGlow.style.background = 'none';
            updateBackground(null);
            ColorUtils.applyAccentColor(120, 120, 120);
        }
    }

    function extractColorsAndUpdate(img) {
        try {
            var colors = ColorUtils.getAccentColor(img);
            ColorUtils.applyAccentColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            if (Settings.get('coverBlurryShadow')) {
                els.albumGlow.style.background = ColorUtils.getGradientFromPalette(colors.palette);
            } else {
                els.albumGlow.style.background = 'none';
            }
            updateBackground(img.src, colors.palette);
            updateTitleSize();
        } catch(ex) {
            els.albumGlow.style.background = 'none';
            updateBackground(img.src);
        }
    }

    // Update track info with dynamic title sizing
    function updateTrackInfo(track) {
        if (track) {
            els.trackTitle.textContent = track.title || '未知曲目';
            els.trackArtist.textContent = track.artist || '未知艺术家';
            els.trackAlbum.textContent = track.album || '';
            updateTitleSize();
        } else {
            els.trackTitle.textContent = '未在播放';
            els.trackArtist.textContent = '选择一首歌曲开始';
            els.trackAlbum.textContent = '';
        }
    }

    // Dynamic title font sizing
    let lastTitle = '';
    function updateTitleSize() {
        const title = els.trackTitle;
        const text = title.textContent;
        if (text === lastTitle && title.style.fontSize) return;
        lastTitle = text;

        const container = title.parentElement;
        const maxWidth = container ? container.clientWidth * 0.95 : 320;
        if (maxWidth < 100) return;

        const test = document.createElement('span');
        test.style.cssText = 'position:fixed;left:-9999px;top:-9999px;white-space:nowrap;font-family:inherit;font-weight:600;';
        test.textContent = text;
        document.body.appendChild(test);

        let lo = 16, hi = 48, best = 22;
        while (lo <= hi) {
            const mid = Math.floor((lo + hi) / 2);
            test.style.fontSize = `${mid}px`;
            if (test.offsetWidth <= maxWidth) { best = mid; lo = mid + 1; }
            else { hi = mid - 1; }
        }
        test.remove();
        title.style.fontSize = `${Math.min(best, 40)}px`;
    }

    // Update play/pause button
    function updatePlayButton(playing) {
        if (playing) {
            els.iconPlay.classList.add('hidden');
            els.iconPause.classList.remove('hidden');
        } else {
            els.iconPlay.classList.remove('hidden');
            els.iconPause.classList.add('hidden');
        }
    }

    // Update progress bar
    function updateProgress(current, duration) {
        if (!duration || duration === Infinity) return;
        const percent = (current / duration) * 100;
        els.progressFill.style.width = `${percent}%`;
        els.progressThumb.style.left = `${percent}%`;
        els.timeCurrent.textContent = formatTime(current);
        els.timeDuration.textContent = formatTime(duration);
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function updateVolumeUI(volume, muted) {
        var pct = muted ? 0 : volume;
        els.volumePct.textContent = Math.round(pct * 100) + '%';
        if (muted || volume === 0) {
            els.iconVolume.classList.add('hidden');
            els.iconMuted.classList.remove('hidden');
        } else {
            els.iconVolume.classList.remove('hidden');
            els.iconMuted.classList.add('hidden');
        }
    }

    function initVolumeUI() {
        updateVolumeUI(0.8, false);
    }

    // Render playlist
    var playlistTracks = [];
    var playlistCurrentIndex = -1;

    function getSortGroup(s) {
        var c = s.charAt(0);
        if (/[a-zA-Z]/.test(c)) return 0;
        if (/[0-9]/.test(c)) return 1;
        return 0; // Chinese sorts with A-Z by pinyin
    }

    function renderPlaylist(tracks, currentIndex) {
        playlistTracks = (tracks || []).slice().sort(function(a, b) {
            var an = String(a.title || a.name || '');
            var bn = String(b.title || b.name || '');
            var ca = getSortGroup(an), cb = getSortGroup(bn);
            if (ca !== cb) return ca - cb;
            return an.localeCompare(bn, 'zh-CN');
        });
        playlistCurrentIndex = (currentIndex >= 0 && tracks) ? playlistTracks.indexOf(tracks[currentIndex]) : -1;
        var label = '';
        if (typeof App !== 'undefined') {
            label = (App.currentSubfolder || App.sourceMode === 'local' ? (App.currentSubfolder || '全部歌曲') : 'testmusic');
            if (!label || label === 'testmusic') label = '全部歌曲';
        }
        els.playlistCount.textContent = label + ' · ' + playlistTracks.length + ' 首';
        renderPlaylistItems();
        renderPlaylistIndex();
    }

    function renderPlaylistItems() {
        els.playlistList.innerHTML = '';
        if (!playlistTracks.length) {
            els.playlistList.innerHTML = '<div style="padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px">无匹配结果</div>';
            return;
        }
        for (var i = 0; i < playlistTracks.length; i++) {
            var track = playlistTracks[i];
            var item = document.createElement('div');
            item.className = 'playlist-item' + (i === playlistCurrentIndex ? ' active' : '');
            item.innerHTML =
                '<span class="playlist-item-number">' + (i === playlistCurrentIndex ? '\u25B6' : (i + 1)) + '</span>' +
                '<div class="playlist-item-info">' +
                    '<div class="playlist-item-title">' + escapeHtml(track.title || '未知曲目') + '</div>' +
                    '<div class="playlist-item-artist">' + escapeHtml(track.artist || '未知艺术家') + '</div>' +
                '</div>';
            (function(idx) {
                item.addEventListener('click', function() {
                    if (typeof App !== 'undefined') App.playTrack(idx);
                });
            })(i);
            els.playlistList.appendChild(item);
        }
        var activeItem = els.playlistList.querySelector('.playlist-item.active');
        if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function renderPlaylistIndex() {
        if (!els.playlistIndex) return;
        els.playlistIndex.innerHTML = '';
        var seen = {};
        var items = [];
        var order = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#';
        for (var i = 0; i < playlistTracks.length; i++) {
            var title = (playlistTracks[i].title || '');
            var ch = getPinyinInitial(title);
            if (!seen[ch]) {
                seen[ch] = true;
                items.push({ char: ch, index: i });
            }
        }
        if (items.length <= 1) return;
        items.sort(function(a, b) { return order.indexOf(a.char) - order.indexOf(b.char); });
        items.forEach(function(entry) {
            var el = document.createElement('div');
            el.className = 'playlist-index-item';
            el.textContent = entry.char;
            el.setAttribute('data-char', entry.char);
            el.addEventListener('click', function() {
                var allItems = els.playlistList.querySelectorAll('.playlist-item');
                for (var j = 0; j < allItems.length; j++) {
                    var itemTitle = (allItems[j].querySelector('.playlist-item-title') || {}).textContent || '';
                    if (getPinyinInitial(itemTitle) === entry.char) {
                        allItems[j].scrollIntoView({ behavior: 'smooth', block: 'start' });
                        break;
                    }
                }
            });
            els.playlistIndex.appendChild(el);
        });
    }

    function getPinyinInitial(s) {
        var c = s.charAt(0);
        if (/[a-zA-Z]/.test(c)) return c.toUpperCase();
        if (/[0-9]/.test(c)) return '#';
        if (!/[\u4e00-\u9fff]/.test(c)) return '#';
        // Chinese: determine pinyin initial via localeCompare
        var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        try {
            for (var i = 0; i < alpha.length; i++) {
                if (c.localeCompare(alpha[i], 'zh-CN') < 0) {
                    return i > 0 ? alpha[i - 1] : alpha[0];
                }
            }
        } catch(e) {}
        return '#';
    }

    function initPlaylistEvents() {}

    function togglePlaylistPanel() {
        var isOpen = !els.playlistPanel.classList.contains('hidden') && !els.playlistPanel.classList.contains('closing');
        if (isOpen) {
            // Close with animation
            els.playlistPanel.classList.add('closing');
            els.btnTogglePlaylist.classList.remove('active');
            els.btnToggleSettings.style.visibility = '';
            setTimeout(function() {
                els.playlistPanel.classList.add('hidden');
                els.playlistPanel.classList.remove('closing');
            }, 250);
        } else {
            // Open
            els.playlistPanel.classList.remove('hidden', 'closing');
            els.btnTogglePlaylist.classList.add('active');
            els.btnToggleSettings.style.visibility = 'hidden';
            if (els.settingsPanel) els.settingsPanel.classList.add('hidden');
        }
    }

    function showLyricsPanel() {
        els.lyricsPanel.classList.remove('hidden');
    }

    function updatePlaymodeUI(mode) {
        els.iconSeq.classList.toggle('hidden', mode !== 'sequential');
        els.iconRepeat.classList.toggle('hidden', mode !== 'repeat');
        els.iconShuffle.classList.toggle('hidden', mode !== 'shuffle');
        els.btnPlaymode.classList.toggle('active', mode !== 'sequential');
        els.btnPlaymode.title = mode === 'sequential' ? '顺序播放' : mode === 'repeat' ? '单曲循环' : '随机播放';
        els.btnPlaymode.style.background = mode === 'sequential' ? 'transparent' : '';
    }

    function animateTrackChange() {
        els.albumArt.style.opacity = '0';
        els.albumArt.style.transform = 'scale(0.95)';
        setTimeout(() => {
            els.albumArt.style.opacity = '1';
            els.albumArt.style.transform = 'scale(1)';
        }, 50);
    }

    function showDropOverlay() { els.dropOverlay.classList.remove('hidden'); }
    function hideDropOverlay() { els.dropOverlay.classList.add('hidden'); }

    // ========== Source Panel ==========

    var sourceTabActive = 'default';

    function initSourceEvents() {
        els.btnSource.addEventListener('click', () => toggleSourcePanel());
        els.sourceOverlay.addEventListener('click', () => toggleSourcePanel(false));

        els.sourceTabs.querySelectorAll('.source-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                var mode = tab.dataset.tab;
                if (mode === sourceTabActive) return;
                sourceTabActive = mode;
                updateSourceTabUI(mode);
                showSourceTabContent(mode);
                if (typeof App !== 'undefined') App.setSourceMode(mode);
            });
        });

        var allItem = document.querySelector('#source-tab-default .source-folder-item[data-path=""]');
        if (allItem) {
            allItem.addEventListener('click', () => {
                selectSourceFolder(allItem, '');
            });
        }

        var btnLocal = document.getElementById('btn-local-folder');
        if (btnLocal) {
            btnLocal.addEventListener('click', () => {
                if (typeof App !== 'undefined') App.openLocalFolder();
            });
        }
    }

    function toggleSourcePanel(force) {
        var isOpen = !els.sourcePanel.classList.contains('hidden');
        var open = typeof force === 'boolean' ? force : !isOpen;
        if (open) {
            els.sourcePanel.classList.remove('hidden');
            els.btnSource.classList.add('open');
            renderDefaultFolders();
        } else {
            els.sourcePanel.classList.add('hidden');
            els.btnSource.classList.remove('open');
        }
    }

    function updateSourceLabel(text) {
        els.sourceLabel.textContent = text || 'testmusic';
    }

    function updateSourceTab(mode) {
        sourceTabActive = mode;
        updateSourceTabUI(mode);
        showSourceTabContent(mode);
    }

    var cachedDefaultFolders = null;

    function renderDefaultFolders() {
        if (cachedDefaultFolders) {
            renderSourceFolders(cachedDefaultFolders.subfolders, cachedDefaultFolders.totalCount, App ? App.currentSubfolder || '' : '');
            return;
        }
        cachedDefaultFolders = { subfolders: [], totalCount: 0 };
        fetch('/api/folders').then(r => r.json()).then(data => {
            cachedDefaultFolders = data;
            renderSourceFolders(data.subfolders, data.totalCount, App ? App.currentSubfolder || '' : '');
        }).catch(() => {});
    }

    function renderSourceFolders(subfolders, totalCount, activePath, target) {
        var container = target || document.querySelector('#source-tab-default .source-folder-list');
        if (!container || typeof container === 'string') container = document.getElementById(container);
        if (!container) container = document.getElementById('source-tab-default');
        if (!container) return;

        // Update cache for default tab
        if (!target && subfolders) {
            cachedDefaultFolders = { subfolders: subfolders, totalCount: totalCount || 0 };
        }

        container.innerHTML = '';

        var allItem = document.createElement('div');
        allItem.className = 'source-folder-item' + (!activePath ? ' active' : '');
        allItem.setAttribute('data-path', '');
        allItem.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>全部歌曲</span><span class="source-folder-count">' + (totalCount || 0) + '</span>';
        allItem.addEventListener('click', function() { selectSourceFolder(allItem, ''); });
        container.appendChild(allItem);

        if (subfolders && subfolders.length) {
            for (var idx = 0; idx < subfolders.length; idx++) {
                var sf = subfolders[idx];
                var sfPath = sf.path || sf.name || '';
                var item = document.createElement('div');
                item.className = 'source-folder-item' + (activePath === sfPath ? ' active' : '');
                item.setAttribute('data-path', sfPath);
                item.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>' + escapeHtml(sf.name) + '</span><span class="source-folder-count">' + (sf.count || 0) + '</span>';
                (function(el, p) {
                    el.addEventListener('click', function() { selectSourceFolder(el, p); });
                })(item, sfPath);
                container.appendChild(item);
            }
        }
    }

    function selectSourceFolder(item, path) {
        var container = item.parentElement;
        if (container) {
            container.querySelectorAll('.source-folder-item').forEach(el => el.classList.remove('active'));
        }
        item.classList.add('active');
        if (typeof App !== 'undefined') App.selectSubfolder(path);
    }

    function updateSourceTabUI(mode) {
        els.sourceTabs.querySelectorAll('.source-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === mode);
        });
    }

    function showSourceTabContent(mode) {
        document.getElementById('source-tab-default').classList.toggle('hidden', mode !== 'default');
        document.getElementById('source-tab-webdav').classList.toggle('hidden', mode !== 'webdav');
        document.getElementById('source-tab-local').classList.toggle('hidden', mode !== 'local');
    }

    // ==================== Idle Detection ====================
    function initIdleDetection() {
        let idleTimer;
        function resetIdle() {
            document.body.classList.remove('rnp-idle');
            clearTimeout(idleTimer);
            if (Settings.get('idleMode')) {
                idleTimer = setTimeout(function() {
                    // First fade out
                    document.body.classList.add('rnp-idle');
                    // Then after transition, retract panels
                    setTimeout(function() {
                        if (!document.body.classList.contains('rnp-idle')) return;
                        if (els.sourcePanel) els.sourcePanel.classList.add('hidden');
                        if (els.btnSource) els.btnSource.classList.remove('open');
                        if (els.settingsPanel) els.settingsPanel.classList.add('hidden');
                        if (els.playlistPanel) els.playlistPanel.classList.add('hidden');
                        if (els.btnTogglePlaylist) els.btnTogglePlaylist.classList.remove('active');
                        if (els.btnToggleSettings) els.btnToggleSettings.style.visibility = '';
                    }, 550);
                }, Settings.get('idleTimeout') * 1000);
            }
        }
        document.addEventListener('mousemove', resetIdle);
        document.addEventListener('mousedown', resetIdle);
        document.addEventListener('keydown', resetIdle);
        document.addEventListener('wheel', resetIdle);
        resetIdle();
        Settings.onChange(null, () => {
            clearTimeout(idleTimer);
            document.body.classList.remove('rnp-idle');
            resetIdle();
        });
    }

    // ==================== Context Menu ====================
    function initContextMenu() {
        // Close on click outside
        document.addEventListener('click', () => els.contextMenu.classList.add('hidden'));
        els.contextMenu.addEventListener('click', (e) => e.stopPropagation());

        // Album art context menu
        els.albumArt.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const src = els.albumArt.src;
            if (!src) return;
            els.contextMenu.innerHTML = `
                <div class="context-menu-item" data-action="copy-cover">复制封面地址</div>
                <div class="context-menu-item" data-action="open-cover">在浏览器中打开</div>
            `;
            els.contextMenu.style.left = `${e.clientX}px`;
            els.contextMenu.style.top = `${e.clientY}px`;
            els.contextMenu.classList.remove('hidden');

            els.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
                item.onclick = () => {
                    if (item.dataset.action === 'copy-cover') {
                        navigator.clipboard.writeText(src).catch(() => {});
                    } else if (item.dataset.action === 'open-cover') {
                        window.open(src, '_blank');
                    }
                    els.contextMenu.classList.add('hidden');
                };
            });
        });

        // Lyrics context menu
        els.lyricsContent.addEventListener('contextmenu', (e) => {
            const line = e.target.closest('.lyrics-line');
            if (!line || line.classList.contains('interlude')) return;
            e.preventDefault();

            const original = line.querySelector('.lyric-original')?.textContent || '';
            const translation = line.querySelector('.lyric-translation')?.textContent || '';
            const fullText = translation ? `${original}\n${translation}` : original;

            els.contextMenu.innerHTML = `<div class="context-menu-item" data-action="copy-lyric">复制歌词</div>`;
            els.contextMenu.style.left = `${e.clientX}px`;
            els.contextMenu.style.top = `${e.clientY}px`;
            els.contextMenu.classList.remove('hidden');

            els.contextMenu.querySelector('.context-menu-item').onclick = () => {
                navigator.clipboard.writeText(fullText).catch(() => {});
                els.contextMenu.classList.add('hidden');
            };
        });
    }

    // ==================== Settings Panel ====================
    function toggleSettingsPanel() {
        els.settingsPanel.classList.toggle('hidden');
    }

    function initSettingsEvents() {
        els.btnToggleSettings.addEventListener('click', toggleSettingsPanel);
        els.settingsOverlay.addEventListener('click', toggleSettingsPanel);

        // Tab switching
        els.settingsTabs.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                renderSettingsPanel(tab.dataset.tab);
            });
        });

        // React to settings changes
        Settings.onChange(null, () => {
            Settings.applyBodyClasses();
            Settings.applyCSSVariables();
            LyricsEngine.updateLayout();
        });
    }

    function renderSettingsPanel(tabName) {
        // Update tabs
        els.settingsTabs.querySelectorAll('.settings-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });

        const s = Settings;
        let html = '';

        if (tabName === 'appearance') {
            html += toggle('idleMode', '沉浸模式', s.get('idleMode'));
            if (s.get('idleMode')) {
                html += slider('idleTimeout', '等待时长', 1, 10, s.get('idleTimeout'), 's');
            }
            html += toggle('progressBottom', '进度条贴底', s.get('progressBottom')) +
                '<div class="settings-sep"></div>' +
                group('倍速') +
                '<div class="settings-row"><span class="settings-label">快捷键梯度</span><input type="text" id="speed-step-input" class="settings-select" style="width:60px;text-align:center" value="' + s.get('speedStep') + '"></div>' +
                '<div class="settings-sep"></div>' +
                group('字体') +
                customFontRow(s.get('customFontFamily'));
        }

        if (tabName === 'cover') {
            html += selectGroup('horizontalAlign', [
                    { value: 'left', label: '靠左' },
                    { value: 'center', label: '居中' },
                    { value: 'right', label: '靠右' },
            ], s.get('horizontalAlign'), '对齐方式') +
                selectGroup('rectangleCover', [
                    { value: 'true', label: '矩形' },
                    { value: 'false', label: '圆形' },
            ], String(s.get('rectangleCover')), '封面样式') +
                toggle('coverBlurryShadow', '封面发光', s.get('coverBlurryShadow'));
            if (!s.get('rectangleCover')) {
                html += toggle('coverRotate', '封面旋转', s.get('coverRotate'));
                if (s.get('coverRotate')) {
                    html += slider('coverRotateSpeed', '旋转速度', 2, 30, s.get('coverRotateSpeed'), 's');
                }
            }
        }

        if (tabName === 'background') {
            html += group('背景类型') +
                selectGroup('bgType', [
                    { value: 'blur', label: '模糊' },
                    { value: 'fluid', label: '动态' },
                    { value: 'gradient', label: '旋转' },
                    { value: 'solid', label: '纯色' },
                    { value: 'none', label: '无' },
                ], s.get('bgType'));
            if (s.get('bgType') === 'blur') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">模糊设置</div>' +
                    slider('blurDim', '压暗程度', 0, 100, s.get('blurDim'), '%') +
                    slider('blurOpacity', '不透明度', 0, 100, s.get('blurOpacity'), '%') +
                    slider('bgBlur', '模糊强度', 0, 100, s.get('bgBlur'), 'px');
            }
            if (s.get('bgType') === 'fluid') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">动态设置</div>' +
                    slider('fluidDim', '压暗程度', 0, 100, s.get('fluidDim'), '%') +
                    slider('fluidOpacity', '不透明度', 0, 100, s.get('fluidOpacity'), '%') +
                    slider('fluidBgBlur', '动态模糊', 0, 40, s.get('fluidBgBlur'), 'px');
            }
            if (s.get('bgType') === 'gradient') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">旋转设置</div>' +
                    slider('gradientDim', '压暗程度', 0, 100, s.get('gradientDim'), '%') +
                    slider('gradientOpacity', '不透明度', 0, 100, s.get('gradientOpacity'), '%') +
                    slider('rotateBgSpeed', '旋转速度', 1, 30, s.get('rotateBgSpeed'), 's') +
                    slider('rotateBgBlur', '旋转模糊', 0, 80, s.get('rotateBgBlur'), 'px') +
                    slider('rotateBgZoom', '封面放大', 100, 400, s.get('rotateBgZoom'), '%');
            }
            if (s.get('bgType') === 'solid') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">纯色设置</div>' +
                    slider('solidDim', '压暗程度', 0, 100, s.get('solidDim'), '%') +
                    slider('solidOpacity', '不透明度', 0, 100, s.get('solidOpacity'), '%') +
                    toggle('solidFollowAccent', '跟随强调色', s.get('solidFollowAccent'));
                if (!s.get('solidFollowAccent')) {
                    html += '<div class="settings-row"><span class="settings-label">自定义背景色</span><input type="color" id="solid-color-picker" value="' + s.get('solidColor') + '" style="width:40px;height:28px;border:none;border-radius:4px;cursor:pointer"></div>';
                }
            }
        }

        if (tabName === 'lyrics') {
            html += group('效果') +
                toggle('lyricFade', '淡出效果', s.get('lyricFade')) +
                toggle('lyricZoom', '缩放效果', s.get('lyricZoom')) +
                toggle('lyricBlur', '模糊效果', s.get('lyricBlur')) +
                toggle('textGlow', '文字发光', s.get('textGlow')) +
                toggle('textShadow', '文字阴影', s.get('textShadow')) +
                toggle('showTranslation', '显示翻译', s.get('showTranslation')) +
                '<div class="settings-sep"></div>' +
                group('字号') +
                slider('lyricFontSize', '歌词字号', 16, 56, s.get('lyricFontSize'), 'px') +
                slider('lyricFontWeight', '歌词粗细', 100, 900, s.get('lyricFontWeight'), '');
            if (s.get('showTranslation')) {
                html += slider('transFontSize', '翻译字号', 10, 36, s.get('transFontSize'), 'px') +
                    slider('transFontWeight', '翻译粗细', 100, 700, s.get('transFontWeight'), '');
            }
            html += slider('titleFontSize', '曲名字号', 14, 48, s.get('titleFontSize'), 'px') +
                slider('titleFontWeight', '曲名粗细', 300, 900, s.get('titleFontWeight'), '') +
                '<div class="settings-sep"></div>' + group('位置') +
                slider('lyricAlignment', '歌词位置', 10, 90, s.get('lyricAlignment'), '%') +
                slider('lyricLineSpacing', '行距', 2, 40, s.get('lyricLineSpacing'), 'px');
        }

        els.settingsContent.innerHTML = html;
        bindSettingsControls();
    }

    function bindSettingsControls() {
        els.settingsContent.querySelectorAll('.settings-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const key = cb.dataset.key;
                const val = cb.checked;
                Settings.set(key, val);
                // Special handling
                if (key === 'lyricFade' || key === 'lyricZoom' || key === 'lyricBlur') {
                    LyricsEngine.updateLayout();
                }
                if (key === 'textGlow') {
                    document.body.classList.toggle('rnp-text-glow', val);
                }
                if (key === 'textShadow') {
                    document.body.classList.toggle('rnp-shadow', val);
                }
                if (key === 'coverBlurryShadow') {
                    if (!val) { els.albumGlow.style.display = 'none'; }
                    else { els.albumGlow.style.display = ''; }
                }
                if (key === 'showTranslation') {
                    document.body.classList.toggle('rnp-show-translation', val);
                    renderSettingsPanel('lyrics');
                }
                if (key === 'coverRotate') {
                    renderSettingsPanel('cover');
                }
                if (key === 'idleMode') {
                    renderSettingsPanel('appearance');
                }
                if (key === 'solidFollowAccent') {
                    document.body.classList.toggle('solid-follow-accent', val);
                    renderSettingsPanel('background');
                    if (Settings.get('bgType') === 'solid') {
                        if (val) {
                            var a = getComputedStyle(document.documentElement).getPropertyValue('--rnp-accent-color').trim();
                            els.bgBlur.style.backgroundColor = a || 'rgb(120,120,120)';
                        } else {
                            els.bgBlur.style.backgroundColor = Settings.get('solidColor');
                        }
                    }
                }
                if (key === 'rectangleCover') {
                    renderSettingsPanel('cover');
                }
            });
        });

        els.settingsContent.querySelectorAll('.settings-slider').forEach(sl => {
            const updateVal = () => {
                const display = sl.parentElement.querySelector('span:last-child');
                if (display) display.textContent = sl.value + (sl.dataset.unit || '');
            };
            sl.addEventListener('input', () => {
                const key = sl.dataset.key;
                const val = parseInt(sl.value);
                Settings.set(key, val);
                updateVal();
                if (key === 'lyricFontSize' || key === 'lyricAlignment' || key === 'lyricFontWeight' || key === 'transFontSize' || key === 'transFontWeight' || key === 'lyricLineSpacing' || key === 'titleFontSize' || key === 'titleFontWeight') {
                    var cssKey = key === 'lyricFontSize' ? '--font-size-lyric' :
                                 key === 'lyricAlignment' ? '--lyric-alignment' :
                                 key === 'lyricFontWeight' ? '--rnp-lyric-weight' :
                                 key === 'titleFontSize' ? '--title-font-size' :
                                 key === 'titleFontWeight' ? '--title-font-weight' :
                                 key === 'lyricLineSpacing' ? '--lyric-line-spacing' :
                                 key === 'transFontSize' ? '--font-size-trans' : '--rnp-trans-weight';
                    document.documentElement.style.setProperty(cssKey, val + (key === 'lyricAlignment' ? '%' : (key === 'lyricLineSpacing' || key === 'titleFontSize' ? 'px' : '')));
                    LyricsEngine.updateLayout();
                }
                if (key === 'bgBlur' || key === 'rotateBgSpeed' || key === 'rotateBgBlur' || key === 'rotateBgZoom' || key === 'fluidBgBlur' || key === 'fluidBgSpeed' || key === 'coverRotateSpeed' || key.endsWith('Dim') || key.endsWith('Opacity')) {
                    Settings.applyCSSVariables();
                    if (key.endsWith('Opacity')) {
                        els.bgContainer.style.opacity = String(val / 100);
                    }
                }
                // Re-render background tab when type changes to show/hide sub-settings
                if (key === 'bgType') {
                    renderSettingsPanel('background');
                    var src = els.albumArt.src;
                    if (src) updateBackground(src, null);
                }
            });
        });

        els.settingsContent.querySelectorAll('.settings-select-group').forEach(group => {
            group.querySelectorAll('.settings-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    var key = group.dataset.key;
                    var val = btn.dataset.value;
                    if (key === 'rectangleCover') val = val === 'true';
                    Settings.set(key, val);
                    group.querySelectorAll('.settings-select-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    if (key === 'bgType') {
                        renderSettingsPanel('background');
                        var src = els.albumArt.src;
                        if (src) updateBackground(src, null);
                    }
                    if (key === 'rectangleCover') {
                        renderSettingsPanel('cover');
                    }
                });
            });
        });

        // Solid color picker
        var cp = document.getElementById('solid-color-picker');
        if (cp) cp.addEventListener('input', () => {
            Settings.set('solidColor', cp.value);
            document.documentElement.style.setProperty('--solid-bg-color', cp.value);
            if (Settings.get('bgType') === 'solid' && !Settings.get('solidFollowAccent')) {
                els.bgBlur.style.backgroundColor = cp.value;
            }
        });

        // Custom font
        var fontInput = document.getElementById('custom-font-input');
        var fontFile = document.getElementById('custom-font-file');
        var btnLoadFont = document.getElementById('btn-load-font');
        var btnResetFont = document.getElementById('btn-reset-font');

        if (btnLoadFont) btnLoadFont.addEventListener('click', () => fontFile.click());
        if (fontFile) fontFile.addEventListener('change', async () => {
            var file = fontFile.files[0];
            if (!file) return;
            var fontName = file.name.replace(/\.[^.]+$/, '');
            var reader = new FileReader();
            reader.onload = () => {
                var style = document.createElement('style');
                style.id = 'custom-font-style';
                style.textContent = `@font-face { font-family: "${fontName}"; src: url(${reader.result}) format("${file.name.endsWith('.ttf') ? 'truetype' : file.name.endsWith('.otf') ? 'opentype' : file.name.endsWith('.woff2') ? 'woff2' : 'woff'}"); }`;
                var old = document.getElementById('custom-font-style');
                if (old) old.remove();
                document.head.appendChild(style);
                Settings.set('customFontFamily', fontName);
                if (fontInput) fontInput.value = fontName;
                document.body.classList.add('rnp-custom-font');
                document.documentElement.style.setProperty('--rnp-custom-font-family', `"${fontName}", sans-serif`);
            };
            reader.readAsDataURL(file);
        });
        if (fontInput) fontInput.addEventListener('input', () => {
            var name = fontInput.value.trim();
            Settings.set('customFontFamily', name);
            if (name) {
                document.body.classList.add('rnp-custom-font');
                document.documentElement.style.setProperty('--rnp-custom-font-family', `"${name}", 'Inter', sans-serif`);
            } else {
                document.body.classList.remove('rnp-custom-font');
                document.documentElement.style.removeProperty('--rnp-custom-font-family');
            }
        });
        if (btnResetFont) btnResetFont.addEventListener('click', () => {
            Settings.set('customFontFamily', '');
            var style = document.getElementById('custom-font-style');
            if (style) style.remove();
            document.body.classList.remove('rnp-custom-font');
            document.documentElement.style.removeProperty('--rnp-custom-font-family');
            renderSettingsPanel('appearance');
        });

        // Speed step input (live update)
        var speedStepInput = document.getElementById('speed-step-input');
        if (speedStepInput) speedStepInput.addEventListener('input', () => {
            var v = parseFloat(speedStepInput.value);
            if (!isNaN(v) && v > 0 && v <= 1) Settings.set('speedStep', v);
        });
    }

    // HTML helpers
    function group(title) {
        return `<div class="settings-group"><div class="settings-group-title">${title}</div>`;
    }
    function toggle(key, label, checked) {
        return `<div class="settings-row"><span class="settings-label">${label}</span><input type="checkbox" class="settings-checkbox" data-key="${key}" ${checked ? 'checked' : ''}></div>`;
    }
    function slider(key, label, min, max, val, unit) {
        var displayUnit = unit || '';
        return `<div class="settings-row"><span class="settings-label">${label}</span><input type="range" class="settings-slider" data-key="${key}" data-unit="${displayUnit}" min="${min}" max="${max}" value="${val}"><span style="font-size:11px;color:rgba(255,255,255,0.3);min-width:30px;text-align:right">${val}${displayUnit}</span></div>`;
    }
    function selectGroup(key, options, current, customLabel) {
        const labelMap = { bgType: '类型', horizontalAlign: '曲名对齐' };
        const label = customLabel || labelMap[key] || '';
        const btns = options.map(o =>
            `<button class="settings-select-btn ${o.value === current ? 'selected' : ''}" data-value="${o.value}">${o.label}</button>`
        ).join('');
        return `<div class="settings-row"><span class="settings-label">${label}</span><div class="settings-select-group" data-key="${key}">${btns}</div></div>`;
    }

    function customFontRow(currentFamily) {
        return `<div class="settings-row" style="flex-wrap:wrap">
            <span class="settings-label" style="flex:1 0 100%;margin-bottom:4px">自定义字体</span>
            <input type="text" id="custom-font-input" class="settings-select" style="flex:1;font-size:11px"
                placeholder="字体名称 (如 SimSun)" value="${currentFamily || ''}">
            <button class="settings-select-btn" id="btn-load-font" style="margin-left:4px">上传</button>
            <input type="file" id="custom-font-file" accept=".ttf,.otf,.woff,.woff2" style="display:none">
            ${currentFamily ? `<button class="settings-select-btn" id="btn-reset-font" style="margin-left:2px">清除</button>` : ''}
        </div>`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        init,
        initSettingsEvents,
        showPlayer,
        showWelcome,
        updateBackground,
        updateAlbumArt,
        updateTrackInfo,
        updatePlayButton,
        updateProgress,
        updateVolumeUI,
        initVolumeUI,
        renderPlaylist,
        togglePlaylistPanel,
        toggleSettingsPanel,
        showLyricsPanel,
        updatePlaymodeUI,
        animateTrackChange,
        showDropOverlay,
        hideDropOverlay,
        initSourceEvents,
        toggleSourcePanel,
        updateSourceLabel,
        updateSourceTab,
        renderSourceFolders,
        updateTitleSize,
        get els() { return els; }
    };
})();
