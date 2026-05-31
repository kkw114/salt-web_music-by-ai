/**
 * Lyrics Module
 * LRC parser + synced lyrics display
 * Based on refined-now-playing-netease
 */

const LyricsEngine = (() => {
    let lyrics = [];
    let currentLine = 0;
    let containerEl = null;
    let contentEl = null;
    let isUnsynced = false;
    let shouldTransit = false;

    const overrides = {
        scale: (offset) => { offset = Math.abs(offset); if (offset === 0) return 1; return Math.max(1 - offset * 0.08, 0.7); },
        opacity: (offset) => { offset = Math.abs(offset); if (offset === 0) return 1; if (offset === 1) return 0.6; return Math.max(0.4 - (offset - 1) * 0.1, 0.15); },
        blur: (offset) => { offset = Math.abs(offset); if (offset === 0) return 0; if (offset <= 1) return 0.5; return Math.min(0.5 + (offset - 1) * 0.8, 4); }
    };

    function parseLRC(text) {
        if (!text) return [];
        const lines = text.split('\n');
        const result = [];
        let offset = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const metaMatch = trimmed.match(/^\[(ti|ar|al|by|offset):(.*)\]$/i);
            if (metaMatch) {
                if (metaMatch[1].toLowerCase() === 'offset') offset = parseInt(metaMatch[2].trim()) || 0;
                continue;
            }
            const timeRegex = /\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;
            const timestamps = [];
            let match, lastIndex = 0;
            while ((match = timeRegex.exec(trimmed)) !== null) {
                const min = parseInt(match[1]), sec = parseInt(match[2]);
                const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
                timestamps.push(min * 60000 + sec * 1000 + ms);
                lastIndex = timeRegex.lastIndex;
            }
            if (timestamps.length > 0) {
                const text = trimmed.substring(lastIndex).trim();
                const isInterlude = !text || /^[.…・]+$/.test(text);
                for (const time of timestamps) result.push({ time: time + offset, original: text, translation: '', isInterlude });
            }
        }
        result.sort((a, b) => a.time - b.time);
        const merged = [];
        for (let i = 0; i < result.length; i++) {
            if (i > 0 && Math.abs(result[i].time - result[i - 1].time) < 50) {
                if (merged.length > 0 && !merged[merged.length - 1].translation && result[i].original)
                    merged[merged.length - 1].translation = result[i].original;
            } else merged.push({ ...result[i] });
        }
        return { lyrics: merged };
    }

    function setLyrics(parsedLyrics, translationLyrics) {
        lyrics = parsedLyrics || [];
        currentLine = 0;
        shouldTransit = false;
        if (translationLyrics && translationLyrics.length > 0) {
            for (const trans of translationLyrics) {
                const match = lyrics.find(l => Math.abs(l.time - trans.time) < 100);
                if (match) match.translation = trans.original;
            }
        }
        isUnsynced = lyrics.length > 0 && lyrics.every(l => l.time === 0);
        if (isUnsynced) lyrics.forEach((l, i) => l.time = i * 5000);
        renderLyrics();
        return lyrics;
    }

    function renderLyrics() {
        if (!contentEl) return;
        contentEl.innerHTML = '';
        if (!lyrics.length) {
            var ph = document.createElement('div');
            ph.className = 'lyrics-placeholder';
            ph.textContent = '暂无歌词';
            ph.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;color:rgba(255,255,255,0.3);';
            contentEl.appendChild(ph);
            return;
        }
        lyrics.forEach((line, index) => {
            var el = document.createElement('div');
            el.className = 'lyrics-line';
            el.dataset.index = index;
            el.setAttribute('offset', '1');
            if (line.isInterlude) {
                el.classList.add('interlude');
                el.innerHTML = '<div class="interlude-dots"><span class="interlude-dot"></span><span class="interlude-dot"></span><span class="interlude-dot"></span></div>';
            } else {
                var html = '<div class="lyric-original">' + esc(line.original) + '</div>';
                if (line.translation) html += '<div class="lyric-translation">' + esc(line.translation) + '</div>';
                el.innerHTML = html;
            }
            el.addEventListener('click', () => {
                if (!line.isInterlude && typeof AudioEngine !== 'undefined') AudioEngine.seek(line.time / 1000);
            });
            contentEl.appendChild(el);
        });
        updateLayout(true);
    }

    function esc(text) { var div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

    function update(timeMs) {
        if (!lyrics.length) return;
        var found = 0;
        for (var i = 0; i < lyrics.length; i++) {
            if (lyrics[i].time <= timeMs) found = i; else break;
        }
        if (found !== currentLine) { currentLine = found; updateLayout(false); }
    }

    function getLineSpacing() { return typeof Settings !== 'undefined' ? Settings.get('lyricLineSpacing') : 8; }

    function updateLayout(initialRender) {
        if (!contentEl || !containerEl) return;
        if (typeof Settings !== 'undefined') {
            var r = document.documentElement;
            r.style.setProperty('--font-size-lyric', Settings.get('lyricFontSize') + 'px');
            r.style.setProperty('--lyric-alignment', Settings.get('lyricAlignment') + '%');
            r.style.setProperty('--rnp-lyric-weight', Settings.get('lyricFontWeight'));
            r.style.setProperty('--font-size-trans', Settings.get('transFontSize') + 'px');
            r.style.setProperty('--rnp-trans-weight', Settings.get('transFontWeight'));
        }
        var lines = contentEl.children, containerH = containerEl.clientHeight;
        if (!containerH) return;
        var alignPct = (typeof Settings !== 'undefined' ? Settings.get('lyricAlignment') : 45) / 100;
        var idx = Math.max(0, currentLine);
        if (initialRender || !shouldTransit) {
            for (var c of lines) c.style.transition = 'none';
            requestAnimationFrame(() => requestAnimationFrame(() => { for (var c of lines) c.style.transition = ''; }));
        }
        shouldTransit = true;
        for (var i = 0; i < lines.length; i++) {
            var el = lines[i], offset = i - idx;
            el.setAttribute('offset', offset === 0 ? '0' : (offset > 0 ? '1' : '-1'));
            var yPos;
            if (i === idx) yPos = containerH * alignPct;
            else if (i < idx) {
                var y = containerH * alignPct;
                for (var j = idx - 1; j >= i; j--) { var s = overrides.scale(j - idx); y -= (lines[j].offsetHeight * s) + getLineSpacing(); }
                yPos = y;
            } else {
                var y = containerH * alignPct;
                for (var j = idx; j < i; j++) { var s = overrides.scale(j - idx); y += (lines[j].offsetHeight * s) + getLineSpacing(); }
                yPos = y;
            }
            var scale = overrides.scale(offset), opacity = overrides.opacity(offset), blur = overrides.blur(offset);
            el.style.transform = 'translateY(' + yPos + 'px) scale(' + scale + ')';
            el.style.opacity = opacity;
            el.style.filter = blur > 0 ? 'blur(' + blur + 'px)' : 'none';
        }
    }

    var wheelTimer = null, visualLine = -1;

    function highlightVisual(lineIdx, slow) {
        if (!contentEl || !containerEl) return;
        var lines = contentEl.children, containerH = containerEl.clientHeight;
        var alignPct = (typeof Settings !== 'undefined' ? Settings.get('lyricAlignment') : 45) / 100;
        for (var i = 0; i < lines.length; i++) {
            var el = lines[i], offset = i - lineIdx;
            el.setAttribute('offset', offset === 0 ? '0' : (offset > 0 ? '1' : '-1'));
            var yPos;
            if (i === lineIdx) yPos = containerH * alignPct;
            else if (i < lineIdx) {
                var y = containerH * alignPct;
                for (var j = lineIdx - 1; j >= i; j--) { var s = overrides.scale(j - lineIdx); y -= (lines[j].offsetHeight * s) + getLineSpacing(); }
                yPos = y;
            } else {
                var y = containerH * alignPct;
                for (var j = lineIdx; j < i; j++) { var s = overrides.scale(j - lineIdx); y += (lines[j].offsetHeight * s) + getLineSpacing(); }
                yPos = y;
            }
            var scale = overrides.scale(offset), opacity = overrides.opacity(offset), blur = overrides.blur(offset);
            if (slow) el.style.transition = 'transform 0.8s cubic-bezier(0.25,0.1,0.25,1), filter 0.8s ease, opacity 0.8s ease';
            el.style.transform = 'translateY(' + yPos + 'px) scale(' + scale + ')';
            el.style.opacity = opacity;
            el.style.filter = blur > 0 ? 'blur(' + blur + 'px)' : 'none';
        }
    }

    function init(container, content) {
        containerEl = container; contentEl = content;
        var ro = new ResizeObserver(() => { shouldTransit = false; updateLayout(false); });
        ro.observe(containerEl);
        containerEl.addEventListener('wheel', function(e) {
            e.preventDefault();
            if (!lyrics.length) return;
            var ni = [];
            for (var i = 0; i < lyrics.length; i++) if (!lyrics[i].isInterlude) ni.push(i);
            if (!ni.length) return;
            if (visualLine < 0) visualLine = currentLine;
            var cur = 0;
            for (var i = 0; i < ni.length; i++) if (ni[i] <= visualLine) cur = i;
            var dir = e.deltaY > 0 ? 1 : -1, next = Math.max(0, Math.min(ni.length - 1, cur + dir));
            visualLine = ni[next];
            highlightVisual(visualLine);
            clearTimeout(wheelTimer);
            wheelTimer = setTimeout(function() { visualLine = -1; highlightVisual(currentLine, true); }, 3000);
        }, { passive: false });
        containerEl.addEventListener('mouseleave', function() { clearTimeout(wheelTimer); if (visualLine >= 0) { visualLine = -1; highlightVisual(currentLine, true); } });
    }

    function reset() { lyrics = []; currentLine = 0; visualLine = -1; if (contentEl) contentEl.innerHTML = ''; }
    function getLyricAtTime(timeMs) { for (var i = lyrics.length - 1; i >= 0; i--) if (lyrics[i].time <= timeMs) return i; return 0; }

    return { init, parseLRC, setLyrics, update, reset, getLyricAtTime, updateLayout, get currentLine() { return currentLine; }, get lyrics() { return lyrics; }, get isUnsynced() { return isUnsynced; }, overrides };
})();
