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
        if (els.welcomeScreen) els.welcomeScreen.classList.add('hidden');
        if (els.playerContainer) els.playerContainer.classList.remove('hidden');
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
        } else if (bgType === 'dynamic-gradient' && imageUrl) {
            // Dynamic gradient: use stored palette with optional bright color filter
            var palette = window._rnpPalette;
            if (palette && palette.length >= 2) {
                var filterBright = typeof Settings !== 'undefined' && Settings.get('dynamicGradientFilterBright');
                var filteredPalette = palette;
                if (filterBright) {
                    filteredPalette = palette.filter(function(c) {
                        var lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
                        return lum < 200 && lum > 30;
                    });
                    if (filteredPalette.length < 2) filteredPalette = palette;
                }
                var gradient = ColorUtils.getGradientFromPalette(filteredPalette);
                els.bgBlur.style.backgroundImage = gradient;
                els.bgBlur.style.backgroundSize = '400% 400%';
            } else {
                els.bgBlur.style.backgroundImage = 'url(' + imageUrl + ')';
                els.bgBlur.style.backgroundSize = 'cover';
            }
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
            // Store palette for dynamic gradient
            window._rnpPalette = colors.palette;
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
            els.trackAlbum.textContent = '';
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
        var fillEl = document.getElementById('volume-bar-fill');
        if (fillEl) fillEl.style.height = Math.round(pct * 100) + '%';
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
        // Volume bar click handler
        var barTrack = document.querySelector('.volume-bar-track');
        if (barTrack) {
            barTrack.addEventListener('click', function(e) {
                var rect = barTrack.getBoundingClientRect();
                var pct = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                AudioEngine.setVolume(pct);
                updateVolumeUI(pct, false);
                Settings.set('volume', Math.round(pct * 100));
            });
        }
    }

    // Render playlist
    var playlistTracks = [];
    var playlistOrigTracks = [];
    var playlistCurrentIndex = -1;

    function getSortGroup(s) {
        var c = s.charAt(0);
        if (/[a-zA-Z]/.test(c)) return 0;
        if (/[0-9]/.test(c)) return 1;
        return 0;
    }

    function renderPlaylist(tracks, currentIndex, customLabel) {
        playlistOrigTracks = tracks || [];
        // Don't sort for NetEase mode - keep original order
        var isNetEase = typeof App !== 'undefined' && App.sourceMode === 'netease';
        if (isNetEase) {
            playlistTracks = playlistOrigTracks.slice();
        } else {
            playlistTracks = playlistOrigTracks.slice().sort(function(a, b) {
                var an = String(a.title || a.name || '');
                var bn = String(b.title || b.name || '');
                var ca = getSortGroup(an), cb = getSortGroup(bn);
                if (ca !== cb) return ca - cb;
                return an.localeCompare(bn, 'zh-CN');
            });
        }
        playlistCurrentIndex = (currentIndex >= 0 && tracks) ? playlistTracks.indexOf(tracks[currentIndex]) : -1;
        var label = customLabel || '';
        if (!label) {
            // Use folder-name as label source
            label = els.folderName.textContent || '全部歌曲';
        }
        els.playlistCount.textContent = label + ' · ' + playlistTracks.length + ' 首';
        renderPlaylistItems();
        // Don't render index for NetEase mode
        if (!isNetEase) {
            renderPlaylistIndex();
        } else {
            if (els.playlistIndex) els.playlistIndex.innerHTML = '';
        }
    }

    function renderPlaylistItems() {
        els.playlistList.innerHTML = '';
        if (!playlistTracks.length) {
            els.playlistList.innerHTML = '<div style="padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px">无匹配结果</div>';
            return;
        }
        var isNetEase = typeof App !== 'undefined' && App.sourceMode === 'netease';
        var folderName = els.folderName ? els.folderName.textContent : '';
        var isDaily = folderName.indexOf('每日推荐') >= 0;

        // Get liked songs for daily recommend
        var likedSet = new Set();
        if (isNetEase && isDaily && typeof NetEaseUI !== 'undefined') {
            likedSet = NetEaseUI.getLikedSongs();
        }

        for (var i = 0; i < playlistTracks.length; i++) {
            var track = playlistTracks[i];
            var item = document.createElement('div');
            item.className = 'playlist-item' + (i === playlistCurrentIndex ? ' active' : '');

            var actionBtn = '';
            if (!isNetEase) {
                // Non-NetEase: show download button
                actionBtn = '<button class="playlist-item-download" title="下载">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                    '</button>';
            }

            item.innerHTML =
                '<span class="playlist-item-number">' + (i === playlistCurrentIndex ? '\u25B6' : (i + 1)) + '</span>' +
                '<div class="playlist-item-info">' +
                    '<div class="playlist-item-title">' + escapeHtml(track.title || '未知曲目') + '</div>' +
                    '<div class="playlist-item-artist">' + escapeHtml(track.artist || '未知艺术家') + '</div>' +
                '</div>' +
                actionBtn;
            (function(trackObj, displayIdx) {
                item.addEventListener('click', function(e) {
                    if (e.target.closest('.playlist-item-download') || e.target.closest('.playlist-item-like')) return;
                    var origIdx = playlistOrigTracks.indexOf(trackObj);
                    if (origIdx >= 0 && typeof App !== 'undefined') App.playTrack(origIdx);
                });
                var dlBtn = item.querySelector('.playlist-item-download');
                if (dlBtn) {
                    dlBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        downloadTrack(trackObj);
                    });
                }
            })(track, i);
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
        var isMobile = window.innerWidth <= 768;
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
            // Close other panels
            els.settingsPanel.classList.add('hidden');
            var sourcePanel = document.getElementById('source-panel');
            if (sourcePanel) sourcePanel.classList.add('hidden');
            // Open
            els.playlistPanel.classList.remove('hidden', 'closing');
            els.btnTogglePlaylist.classList.add('active');
            if (!isMobile) els.btnToggleSettings.style.visibility = 'hidden';
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
        var sourceCloseBtn = document.getElementById('source-close-btn');
        if (sourceCloseBtn) sourceCloseBtn.addEventListener('click', () => toggleSourcePanel(false));

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
        var webdavBarHeader = document.getElementById('webdav-user-bar-header');
        if (webdavBarHeader) {
            webdavBarHeader.addEventListener('click', function() {
                document.getElementById('webdav-user-bar').classList.toggle('open');
                document.getElementById('webdav-saved-list').classList.toggle('hidden');
            });
        }
    }

    function toggleSourcePanel(force) {
        var isOpen = !els.sourcePanel.classList.contains('hidden');
        var open = typeof force === 'boolean' ? force : !isOpen;
        if (open) {
            // Close other panels
            els.settingsPanel.classList.add('hidden');
            els.playlistPanel.classList.add('hidden');
            els.playlistPanel.classList.remove('closing');
            els.btnTogglePlaylist.classList.remove('active');
            els.btnToggleSettings.style.visibility = '';
            // Open
            els.sourcePanel.classList.remove('hidden');
            els.btnSource.classList.add('open');
            renderDefaultFolders();
        } else {
            els.sourcePanel.classList.add('hidden');
            els.btnSource.classList.remove('open');
        }
    }

    function updateSourceLabel(text) {
        els.sourceLabel.textContent = text || 'SaltWeb';
    }

    function updateFolderName(text) {
        // Extract folder name from path
        if (text && text.indexOf('/') !== -1) {
            var parts = text.split('/').filter(Boolean);
            text = parts[parts.length - 1] || '全部歌曲';
        }
        els.folderName.textContent = text || '';
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
        document.getElementById('source-tab-netease').classList.toggle('hidden', mode !== 'netease');
        document.getElementById('source-tab-webdav').classList.toggle('hidden', mode !== 'webdav');
        document.getElementById('source-tab-local').classList.toggle('hidden', mode !== 'local');
        if (mode === 'webdav') { if (typeof App !== 'undefined' && App.loadWebdavSavedList) App.loadWebdavSavedList(); }
        if (mode === 'netease' && typeof NetEaseUI !== 'undefined') { NetEaseUI.init(); NetEaseUI.restoreLogin(); }
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
        // Block default context menu everywhere except context-menu itself
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('.context-menu')) {
                e.preventDefault();
            }
        });

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
                <div class="context-menu-item" data-action="download-cover">下载封面</div>
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
                    } else if (item.dataset.action === 'download-cover') {
                        var t = typeof PlaylistManager !== 'undefined' ? PlaylistManager.getCurrentTrack() : null;
                        var coverName = 'cover.jpg';
                        var downloadSrc = src;
                        if (t) {
                            var artist = t.artist || '';
                            var title = t.title || '';
                            coverName = artist ? artist + ' - ' + title + '.jpg' : title + '.jpg';
                            // Use high quality cover if available
                            if (t.hqCoverUrl) downloadSrc = t.hqCoverUrl;
                        }
                        downloadFile(downloadSrc, coverName);
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

            els.contextMenu.innerHTML = `
                <div class="context-menu-item" data-action="copy-lyric">复制当前歌词</div>
                <div class="context-menu-item" data-action="copy-all-lyrics">复制全部歌词</div>
                <div class="context-menu-item" data-action="download-lyrics">下载歌词(txt)</div>
                <div class="context-menu-item" data-action="download-lyrics-lrc">下载歌词(lrc)</div>
            `;
            els.contextMenu.style.left = `${e.clientX}px`;
            els.contextMenu.style.top = `${e.clientY}px`;
            els.contextMenu.classList.remove('hidden');

            els.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
                item.onclick = () => {
                    if (item.dataset.action === 'copy-lyric') {
                        navigator.clipboard.writeText(fullText).catch(() => {});
                    } else if (item.dataset.action === 'copy-all-lyrics') {
                        copyAllLyrics();
                    } else if (item.dataset.action === 'download-lyrics') {
                        downloadLyrics();
                    } else if (item.dataset.action === 'download-lyrics-lrc') {
                        downloadLyricsWithTimestamp();
                    }
                    els.contextMenu.classList.add('hidden');
                };
            });
        });

        // Mobile lyrics context menu
        var mobileLyrics = document.getElementById('mobile-lyrics');
        if (mobileLyrics) {
            mobileLyrics.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                els.contextMenu.innerHTML = `
                    <div class="context-menu-item" data-action="copy-all-lyrics">复制全部歌词</div>
                    <div class="context-menu-item" data-action="download-lyrics">下载歌词(txt)</div>
                    <div class="context-menu-item" data-action="download-lyrics-lrc">下载歌词(lrc)</div>
                `;
                els.contextMenu.style.left = `${e.clientX}px`;
                els.contextMenu.style.top = `${e.clientY}px`;
                els.contextMenu.classList.remove('hidden');

                els.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
                    item.onclick = () => {
                        if (item.dataset.action === 'copy-all-lyrics') {
                            copyAllLyrics();
                        } else if (item.dataset.action === 'download-lyrics') {
                            downloadLyrics();
                        } else if (item.dataset.action === 'download-lyrics-lrc') {
                            downloadLyricsWithTimestamp();
                        }
                        els.contextMenu.classList.add('hidden');
                    };
                });
            });
        }
    }

    function downloadFile(url, filename) {
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function copyAllLyrics() {
        var lines = els.lyricsContent.querySelectorAll('.lyrics-line');
        var text = '';
        lines.forEach(function(line) {
            var original = line.querySelector('.lyric-original');
            var translation = line.querySelector('.lyric-translation');
            if (original && original.textContent.trim()) {
                text += original.textContent.trim();
                if (translation && translation.textContent.trim()) {
                    text += '\n' + translation.textContent.trim();
                }
                text += '\n';
            }
        });
        navigator.clipboard.writeText(text.trim()).catch(function() {});
    }

    function downloadTrack(track) {
        var sourceMode = typeof App !== 'undefined' ? App.sourceMode : 'default';
        if (sourceMode === 'local') {
            showToast('你der啊！本地文件你下什么');
            return;
        }
        if (sourceMode === 'netease') {
            downloadNeteaseTrack(track);
        } else {
            downloadDefaultTrack(track);
        }
    }

    async function downloadNeteaseTrack(track) {
        var id = track.neteaseId || track.id;
        if (!id) { showToast('无法获取歌曲ID'); return; }
        showToast('获取下载链接...');
        var quality = typeof Settings !== 'undefined' ? Settings.get('neteaseQuality') || '320000' : '320000';
        if (quality === 'flac') quality = '350000';
        var urlData = await NetEaseAPI.getSongUrl(id, quality);
        if (urlData && urlData.data && urlData.data[0] && urlData.data[0].url) {
            var url = urlData.data[0].url;
            var ext = urlData.data[0].type || 'mp3';
            var filename = (track.artist || '') + ' - ' + (track.title || 'track') + '.' + ext;
            var proxyUrl = '/api/netease/download?url=' + encodeURIComponent(url) + '&filename=' + encodeURIComponent(filename);
            // Use fetch to get blob then trigger download
            try {
                showToast('下载中...');
                var resp = await fetch(proxyUrl);
                var blob = await resp.blob();
                var blobUrl = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 10000);
                showToast('下载完成');
            } catch(e) {
                console.error('Download error:', e);
                showToast('下载失败');
            }
        } else {
            showToast('无法获取下载链接');
        }
    }

    function downloadDefaultTrack(track) {
        if (!track.url) { showToast('无下载地址'); return; }
        var filename = (track.artist || '') + ' - ' + (track.title || 'track');
        var ext = track.url.split('.').pop().split('?')[0] || 'mp3';
        downloadFile(track.url, filename + '.' + ext);
        showToast('开始下载');
    }

    function downloadLyrics() {
        var t = typeof PlaylistManager !== 'undefined' ? PlaylistManager.getCurrentTrack() : null;
        var title = t ? (t.title || 'lyrics') : 'lyrics';
        var artist = t ? (t.artist || '') : '';
        var filename = artist ? artist + ' - ' + title + '.txt' : title + '.txt';

        var lines = els.lyricsContent.querySelectorAll('.lyrics-line');
        var text = '';
        lines.forEach(function(line) {
            var original = line.querySelector('.lyric-original');
            var translation = line.querySelector('.lyric-translation');
            if (original && original.textContent.trim()) {
                text += original.textContent.trim();
                if (translation && translation.textContent.trim()) {
                    text += '\n' + translation.textContent.trim();
                }
                text += '\n';
            }
        });

        var blob = new Blob([text.trim()], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        downloadFile(url, filename);
        URL.revokeObjectURL(url);
    }

    function downloadLyricsWithTimestamp() {
        var t = typeof PlaylistManager !== 'undefined' ? PlaylistManager.getCurrentTrack() : null;
        var title = t ? (t.title || 'lyrics') : 'lyrics';
        var artist = t ? (t.artist || '') : '';
        var filename = artist ? artist + ' - ' + title + '.lrc' : title + '.lrc';

        // Get lyrics from LyricsEngine
        var lyrics = typeof LyricsEngine !== 'undefined' ? LyricsEngine.lyrics : [];
        if (!lyrics.length) return;

        var text = '';
        lyrics.forEach(function(line) {
            var time = line.time || 0;
            var min = Math.floor(time / 60000);
            var sec = Math.floor((time % 60000) / 1000);
            var ms = Math.floor((time % 1000) / 10);
            var timeStr = '[' + String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0') + '.' + String(ms).padStart(2, '0') + ']';
            text += timeStr + (line.original || '') + '\n';
            if (line.translation) {
                text += timeStr + line.translation + '\n';
            }
        });

        var blob = new Blob([text.trim()], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        downloadFile(url, filename);
        URL.revokeObjectURL(url);
    }

    function exportSettings() {
        var data = {};
        try { data = JSON.parse(localStorage.getItem('rnp-settings') || '{}'); } catch(e) {}
        // Add NetEase cookie
        var neCookie = localStorage.getItem('netease-cookie');
        if (neCookie) data._neteaseCookie = neCookie;
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'saltmusic-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('配置已导出');
    }

    function importSettings() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    var data = JSON.parse(ev.target.result);
                    // Restore NetEase cookie
                    if (data._neteaseCookie) {
                        localStorage.setItem('netease-cookie', data._neteaseCookie);
                        delete data._neteaseCookie;
                    }
                    // Restore settings
                    localStorage.setItem('rnp-settings', JSON.stringify(data));
                    showToast('配置已导入，刷新页面生效');
                } catch(e) {
                    showToast('导入失败：文件格式错误');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ==================== Settings Panel ====================
    function toggleSettingsPanel() {
        var isOpen = !els.settingsPanel.classList.contains('hidden');
        if (!isOpen) {
            // Close other panels
            els.sourcePanel.classList.add('hidden');
            els.btnSource.classList.remove('open');
            els.playlistPanel.classList.add('hidden');
            els.playlistPanel.classList.remove('closing');
            els.btnTogglePlaylist.classList.remove('active');
        }
        els.settingsPanel.classList.toggle('hidden');
    }

    function initSettingsEvents() {
        els.btnToggleSettings.addEventListener('click', toggleSettingsPanel);
        els.settingsOverlay.addEventListener('click', toggleSettingsPanel);
        var settingsCloseBtn = document.getElementById('settings-close-btn');
        if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', toggleSettingsPanel);

        // Tab switching
        els.settingsTabs.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                renderSettingsPanel(tab.dataset.tab);
            });
        });

        // React to settings changes
        Settings.onChange(null, (key) => {
            Settings.applyBodyClasses();
            Settings.applyCSSVariables();
            LyricsEngine.updateLayout();
            // Re-apply accent color when immersive color changes
            if (key === 'immersiveColor') {
                var img = els.albumArt;
                if (img && img.complete && img.naturalWidth > 0) {
                    extractColorsAndUpdate(img);
                }
            }
            // Re-apply dynamic gradient when filter setting changes
            if (key === 'dynamicGradientFilterBright') {
                var img = els.albumArt;
                if (img && img.complete && img.naturalWidth > 0) {
                    updateBackground(img.src);
                }
            }
        });

        // Handle debug switch via event delegation
        els.settingsContent.addEventListener('change', function(e) {
            if (e.target && e.target.id === 'debug-switch-settings') {
                var panel = document.getElementById('debug-log-panel');
                if (panel) panel.style.display = e.target.checked ? 'block' : 'none';
                var ws = document.getElementById('debug-switch');
                if (ws) ws.checked = e.target.checked;
            }
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
                group('快捷键') +
                '<div class="elem-group"><div class="elem-group-header"><span>快捷键说明</span><svg class="elem-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div><div class="elem-group-body hidden">' +
                '<div class="settings-shortcut-list">' +
                '<div class="settings-shortcut-title">播放控制</div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">Space</span><span>播放/暂停</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">Ctrl + ←</span><span>上一首</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">Ctrl + →</span><span>下一首</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">Ctrl + ↓</span><span>播放/暂停</span></div>' +
                '<div class="settings-shortcut-title">进度与音量</div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">←</span><span>后退 5 秒</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">→</span><span>前进 5 秒</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">0-9</span><span>跳转到 0%-90%</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">B</span><span>回到开头</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">↑</span><span>音量 +10%</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">↓</span><span>音量 -10%</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">M</span><span>静音/取消静音</span></div>' +
                '<div class="settings-shortcut-title">倍速调节</div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">X</span><span class="speed-step-desc">减速 (-' + s.get('speedStep') + 'x)</span></div>' +
                '<div class="settings-shortcut-item"><span class="settings-shortcut-key">C</span><span class="speed-step-desc">加速 (+' + s.get('speedStep') + 'x)</span></div>' +
                '</div>' +
                '</div></div>' +
                '<div class="settings-sep"></div>' +
                group('字体') +
                customFontRow(s.get('customFontFamily')) +
                '<div class="settings-sep"></div>' +
                group('网易云') +
                toggle('neteaseDefaultDaily', '每日推荐为默认页', s.get('neteaseDefaultDaily')) +
                '<div class="settings-sep"></div>' +
                selectGroup('neteaseQuality', [
                    { value: '128000', label: '128kbps' },
                    { value: '192000', label: '192kbps' },
                    { value: '320000', label: '320kbps' },
                    { value: 'flac', label: '无损' },
                ], s.get('neteaseQuality'), '播放音质') +
                '<div class="settings-hint">更高音质需要VIP权益，且消耗更多流量</div>' +
                (typeof NetEaseUI !== 'undefined' && NetEaseUI.isVipUser() ?
                    '<div class="settings-sep"></div>' +
                    selectGroup('neteaseVipType', [
                        { value: 'auto', label: '自动检测' },
                        { value: 'none', label: '普通' },
                        { value: 'vip', label: 'VIP' },
                        { value: 'svip', label: 'SVIP' },
                    ], s.get('neteaseVipType'), 'VIP状态修正') : '') +
                '<div class="settings-sep"></div>' +
                group('配置') +
                '<div class="settings-row" style="gap:8px"><button class="settings-btn" onclick="typeof UI!==\'undefined\'&&UI.exportSettings()">导出配置</button><button class="settings-btn" onclick="typeof UI!==\'undefined\'&&UI.importSettings()">导入配置</button></div>' +
                '<div class="settings-sep"></div>' +
                group('调试') +
                '<div class="settings-row"><span class="settings-label">调试日志</span><input type="checkbox" class="settings-checkbox" id="debug-switch-settings"></div>';
        }

        if (tabName === 'cover') {
            html += selectGroup('horizontalAlign', [
                    { value: 'left', label: '靠左' },
                    { value: 'center', label: '居中' },
                    { value: 'right', label: '靠右' },
            ], s.get('horizontalAlign'), '对齐方式') +
                slider('coverSize', '封面大小', 120, 500, s.get('coverSize'), 'px') +
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
            html += selectGroup('immersiveColor', [
                    { value: 'off', label: '关' },
                    { value: 'primary', label: '鲜艳' },
                    { value: 'secondary', label: '柔和' },
                    { value: 'tertiary', label: '偏色' },
                ], s.get('immersiveColor'), '沉浸主题色') +
                '<div class="settings-sep"></div>' +
                group('背景类型') +
                selectGroup('bgType', [
                    { value: 'blur', label: '模糊' },
                    { value: 'fluid', label: '动态' },
                    { value: 'gradient', label: '旋转' },
                    { value: 'dynamic-gradient', label: '动态渐变' },
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
                    slider('rotateBgZoom', '封面放大', 100, 400, s.get('rotateBgZoom'), '%') +
                    slider('gradientAccent', '强调色蒙版', 0, 80, s.get('gradientAccent'), '%');
            }
            if (s.get('bgType') === 'dynamic-gradient') {
                html += '<div class="settings-sep"></div><div class="settings-group"><div class="settings-group-title">动态渐变设置</div>' +
                    slider('dynamicGradientDarken', '压暗程度', 0, 80, s.get('dynamicGradientDarken'), '%') +
                    slider('dynamicGradientOpacity', '不透明度', 0, 100, s.get('dynamicGradientOpacity'), '%') +
                    slider('dynamicGradientSpeed', '动画速度', 5, 60, s.get('dynamicGradientSpeed'), 's') +
                    slider('dynamicGradientDim', '强调色蒙版', 0, 100, s.get('dynamicGradientDim'), '%') +
                    toggle('dynamicGradientFilterBright', '屏蔽高亮色', s.get('dynamicGradientFilterBright'));
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
                toggle('showTranslation', '显示翻译', s.get('showTranslation')) +
                '<div class="settings-sep"></div>' + group('位置') +
                slider('lyricAlignment', '歌词位置', 10, 90, s.get('lyricAlignment'), '%') +
                slider('lyricLineSpacing', '行距', 2, 40, s.get('lyricLineSpacing'), 'px') +
                '<div class="settings-sep"></div>' +
                '<div class="mobile-lyric-group">' + group('文字效果设置') + '</div>' +
                '<div class="mobile-lyric-settings">' +
                slider('mobileLyricSize', '歌词字号', 10, 20, s.get('mobileLyricSize'), 'px') +
                slider('mobileLyricWeight', '歌词粗细', 300, 700, s.get('mobileLyricWeight'), '') +
                slider('mobileTransSize', '翻译字号', 8, 16, s.get('mobileTransSize'), 'px') +
                slider('mobileTransWeight', '翻译粗细', 300, 500, s.get('mobileTransWeight'), '') +
                slider('mobileLineSpacing', '歌词行距', 0, 12, s.get('mobileLineSpacing'), 'px') +
                '</div>' +
                // Parent collapsible: 文字效果
                '<div class="elem-group"><div class="elem-group-header"><span>文字效果</span><svg class="elem-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div><div class="elem-group-body hidden">' +
                elemSection('歌词原文', 'lyricOrig', s, 'lyricFontFamily', 'lyricFontSize', 'lyricFontWeight') +
                '<div class="settings-sep"></div>' +
                elemSection('歌词翻译', 'lyricTrans', s, 'transFontFamily', 'transFontSize', 'transFontWeight') +
                '<div class="settings-sep"></div>' +
                elemSection('曲名', 'trackTitle', s, 'titleFontFamily', 'titleFontSize', 'titleFontWeight') +
                '<div class="settings-sep"></div>' +
                elemSection('歌手', 'trackArtist', s, 'artistFontFamily', 'artistFontSize', 'artistFontWeight') +
                '</div></div>';
        }

        els.settingsContent.innerHTML = html;
        // Collapsible element groups
        els.settingsContent.querySelectorAll('.elem-group-header, .elem-subgroup-header').forEach(function(h) {
            h.addEventListener('click', function() {
                var parent = this.parentElement;
                parent.classList.toggle('open');
                var body = parent.querySelector('.elem-group-body, .elem-subgroup-body');
                if (body) body.classList.toggle('hidden');
            });
        });
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
                // Per-element glow/shadow
                if (key === 'lyricOrigGlow') document.body.classList.toggle('rnp-glow-lyric', val);
                if (key === 'lyricOrigShadow') document.body.classList.toggle('rnp-shadow-lyric', val);
                if (key === 'lyricTransGlow') document.body.classList.toggle('rnp-glow-trans', val);
                if (key === 'lyricTransShadow') document.body.classList.toggle('rnp-shadow-trans', val);
                if (key === 'trackTitleGlow') document.body.classList.toggle('rnp-glow-title', val);
                if (key === 'trackTitleShadow') document.body.classList.toggle('rnp-shadow-title', val);
                if (key === 'trackArtistGlow') document.body.classList.toggle('rnp-glow-artist', val);
                if (key === 'trackArtistShadow') document.body.classList.toggle('rnp-shadow-artist', val);
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
                    // VIP type change: update UI immediately
                    if (key === 'neteaseVipType' && typeof NetEaseUI !== 'undefined') {
                        NetEaseUI.updateLoginUI();
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
                    if (key === 'neteaseVipType') {
                        if (typeof NetEaseUI !== 'undefined') NetEaseUI.updateLoginUI();
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
        var fontSelect = document.getElementById('custom-font-select');
        var fontFile = document.getElementById('custom-font-file');
        var btnUploadFont = document.getElementById('btn-upload-font');

        function loadFontList() {
            fetch('/api/fonts').then(function(r) { return r.json(); }).then(function(fonts) {
                var allSelects = document.querySelectorAll('.custom-font-select');
                for (var s = 0; s < allSelects.length; s++) {
                    var sel = allSelects[s];
                    var cur = sel.value;
                    var firstOpt = sel.querySelector('option[value=""]');
                    sel.innerHTML = firstOpt ? firstOpt.outerHTML : '<option value="">默认</option>';
                    for (var f = 0; f < fonts.length; f++) {
                        var fn = fonts[f].replace(/\.[^.]+$/, '');
                        var opt = '<option value="' + fn + '"' + (fn === cur ? ' selected' : '') + '>' + fn + '</option>';
                        sel.innerHTML += opt;
                    }
                    if (cur) sel.value = cur;
                }
            });
        }
        setTimeout(loadFontList, 100);

        // Handle all font selects (global + per-element)
        if (els.settingsContent) {
            els.settingsContent.addEventListener('change', function(e) {
            var t = e.target;
            if (!t.classList.contains('custom-font-select')) return;
            var fontKey = t.getAttribute('data-font') || 'customFontFamily';
            var name = t.value;
            Settings.set(fontKey, name);
            if (fontKey === 'customFontFamily') {
                if (name) {
                    applyFontByName(name);
                } else {
                    var s2 = document.getElementById('custom-font-style');
                    if (s2) s2.remove();
                    document.body.classList.remove('rnp-custom-font');
                    document.documentElement.style.removeProperty('--rnp-custom-font-family');
                }
            } else {
                // Per-element font - set CSS variable
                var varMap = { lyricFontFamily: '--font-lyric', transFontFamily: '--font-trans', titleFontFamily: '--font-title', artistFontFamily: '--font-artist' };
                var cssVar = varMap[fontKey];
                if (name) {
                    document.documentElement.style.setProperty(cssVar, '"' + name + '", "Inter", sans-serif');
                    applyFontByNameIfNeeded(name);
                    var dEl = document.getElementById('debug-log');
                    if (dEl && dEl.style.display !== 'none') dEl.textContent += '[font] set ' + cssVar + '=' + name + '\n';
                } else {
                    document.documentElement.style.removeProperty(cssVar);
                }
            }
        });
        }

        function applyFontByNameIfNeeded(fontName) {
            var existing = document.getElementById('custom-font-' + fontName.toLowerCase().replace(/[^a-z0-9]/g, ''));
            if (existing) return;
            var dEl = document.getElementById('debug-log');
            fetch('/api/fonts').then(function(r) { return r.json(); }).then(function(fonts) {
                var found = null;
                for (var i = 0; i < fonts.length; i++) {
                    if (fonts[i].replace(/\.[^.]+$/, '') === fontName) { found = fonts[i]; break; }
                }
                if (dEl && dEl.style.display !== 'none') dEl.textContent += '[font-face] ' + fontName + ' found=' + (found || 'NO') + '\n';
                if (!found) return;
                var ext = found.split('.').pop().toLowerCase();
                var fmt = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext === 'woff2' ? 'woff2' : 'woff';
                var s2 = document.createElement('style');
                s2.id = 'custom-font-' + fontName.toLowerCase().replace(/[^a-z0-9]/g, '');
                s2.textContent = '@font-face { font-family: "' + fontName + '"; src: url("/fonts/' + found + '") format("' + fmt + '"); }';
                document.head.appendChild(s2);
            });
        }

        function applyFontByName(fontName) {
            fetch('/api/fonts').then(function(r) { return r.json(); }).then(function(fonts) {
                var found = null;
                for (var i = 0; i < fonts.length; i++) {
                    if (fonts[i].replace(/\.[^.]+$/, '') === fontName) { found = fonts[i]; break; }
                }
                if (!found) return;
                var ext = found.split('.').pop().toLowerCase();
                var fmt = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext === 'woff2' ? 'woff2' : 'woff';
                var style = document.getElementById('custom-font-style');
                if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
                style.textContent = '@font-face { font-family: "' + fontName + '"; src: url("/fonts/' + found + '") format("' + fmt + '"); }';
                document.body.classList.add('rnp-custom-font');
                document.documentElement.style.setProperty('--rnp-custom-font-family', '"' + fontName + '", "Inter", sans-serif');
            });
        }

        if (btnUploadFont) btnUploadFont.addEventListener('click', function() { fontFile.click(); });
        if (fontFile) fontFile.addEventListener('change', function() {
            var file = fontFile.files[0];
            if (!file) return;
            var fd = new FormData();
            fd.append('font', file);
            fetch('/api/fonts/upload', { method: 'POST', body: fd }).then(function(r) { return r.json(); }).then(function(d) {
                var name = (d.name || file.name).replace(/\.[^.]+$/, '');
                var ext = (d.name || file.name).split('.').pop().toLowerCase();
                var fmt = ext === 'ttf' ? 'truetype' : ext === 'otf' ? 'opentype' : ext === 'woff2' ? 'woff2' : 'woff';
                var style = document.getElementById('custom-font-style');
                if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
                style.textContent = '@font-face { font-family: "' + name + '"; src: url("/fonts/' + (d.name || file.name) + '") format("' + fmt + '"); }';
                Settings.set('customFontFamily', name);
                document.body.classList.add('rnp-custom-font');
                document.documentElement.style.setProperty('--rnp-custom-font-family', '"' + name + '", "Inter", sans-serif');
                loadFontList();
                if (fontSelect) fontSelect.value = name;
                fontFile.value = '';
            }).catch(function() {});
        });

        // Speed step input (live update)
        var speedStepInput = document.getElementById('speed-step-input');
        if (speedStepInput) speedStepInput.addEventListener('input', () => {
            var v = parseFloat(speedStepInput.value);
            if (!isNaN(v) && v > 0 && v <= 1) {
                Settings.set('speedStep', v);
                // Update shortcut description in real-time
                document.querySelectorAll('.speed-step-desc').forEach(el => {
                    var text = el.textContent;
                    if (text.startsWith('减速')) el.textContent = '减速 (-' + v + 'x)';
                    else if (text.startsWith('加速')) el.textContent = '加速 (+' + v + 'x)';
                });
            }
        });
    }

    // HTML helpers
    function elemSection(label, prefix, s, fontKey, sizeKey, weightKey) {
        var glowKey = prefix + 'Glow';
        var shadowKey = prefix + 'Shadow';
        return '<div class="elem-subgroup">' +
            '<div class="elem-subgroup-header" style="cursor:pointer"><span>' + label + '</span><svg class="elem-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div>' +
            '<div class="elem-subgroup-body hidden">' +
            slider(sizeKey, '字号', 10, 56, s.get(sizeKey), 'px') +
            slider(weightKey, '粗细', 100, 900, s.get(weightKey), '') +
            toggle(glowKey, '文字发光', s.get(glowKey)) +
            toggle(shadowKey, '文字阴影', s.get(shadowKey)) +
            '<div class="settings-row" style="flex-wrap:wrap;padding-top:4px"><span class="settings-label" style="flex:1 0 100%;margin-bottom:2px;font-size:11px;color:rgba(255,255,255,0.4)">字体</span>' +
            '<select class="custom-font-select settings-select" data-font="' + fontKey + '" style="flex:1;font-size:11px"><option value="">跟随全局</option>' +
            (s.get(fontKey) ? '<option value="' + s.get(fontKey) + '" selected>' + s.get(fontKey) + '</option>' : '') +
            '</select></div></div></div>';
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
        return '<div class="settings-row" style="flex-wrap:wrap">' +
            '<span class="settings-label" style="flex:1 0 100%;margin-bottom:4px">全局字体</span>' +
            '<select id="custom-font-select" class="custom-font-select settings-select" style="flex:1;font-size:11px">' +
                '<option value="">默认</option>' +
                (currentFamily ? '<option value="' + currentFamily + '" selected>' + currentFamily + '</option>' : '') +
            '</select>' +
            '<button class="settings-select-btn" id="btn-upload-font" style="margin-left:4px">上传</button>' +
            '<input type="file" id="custom-font-file" accept=".ttf,.otf,.woff,.woff2" style="display:none">' +
        '</div>';
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
        updateFolderName,
        updateSourceTab,
        renderSourceFolders,
        updateTitleSize,
        exportSettings,
        importSettings,
        get els() { return els; }
    };
})();
