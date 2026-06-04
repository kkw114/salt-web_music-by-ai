/**
 * Audio Engine
 * Howler.js wrapper for local file playback
 */

const AudioEngine = (() => {
    let sound = null;
    let currentObjectUrl = null;
    let isPlaying = false;
    let volume = 0.8;
    let isMuted = false;
    let currentRate = 1;
    let updateInterval = null;

    // Song cache to avoid reloading
    const songCache = new Map();
    const CACHE_MAX = 50;

    function getCachedUrl(url) {
        return songCache.get(url) || null;
    }

    function cacheSongUrl(originalUrl, blobUrl) {
        if (songCache.size >= CACHE_MAX) {
            // Remove oldest entry
            var firstKey = songCache.keys().next().value;
            var oldUrl = songCache.get(firstKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            songCache.delete(firstKey);
        }
        songCache.set(originalUrl, blobUrl);
    }

    // Event callbacks
    const listeners = {
        play: [],
        pause: [],
        end: [],
        timeupdate: [],
        load: [],
        error: []
    };

    function on(event, callback) {
        if (listeners[event]) listeners[event].push(callback);
    }

    function off(event, callback) {
        if (listeners[event]) {
            listeners[event] = listeners[event].filter(cb => cb !== callback);
        }
    }

    function emit(event, data) {
        if (listeners[event]) {
            listeners[event].forEach(cb => cb(data));
        }
    }

    // Load and play a file from File object or Object URL
    function play(source) {
        // Cleanup previous
        stop();

        let url;
        if (source instanceof File) {
            url = URL.createObjectURL(source);
            currentObjectUrl = url;
        } else if (typeof source === 'string') {
            url = source;
            // Check cache for URL-based sources
            var cached = getCachedUrl(url);
            if (cached) {
                url = cached;
            }
        } else {
            return;
        }

        sound = new Howl({
            src: [url],
            html5: true,
            volume: isMuted ? 0 : volume,
            onplay: () => {
                isPlaying = true;
                startTimeUpdate();
                emit('play');
            },
            onpause: () => {
                isPlaying = false;
                stopTimeUpdate();
                emit('pause');
            },
            onend: () => {
                isPlaying = false;
                stopTimeUpdate();
                emit('end');
            },
            onload: () => {
                emit('load', {
                    duration: sound.duration()
                });
                // Cache URL-based sources
                if (source && typeof source === 'string' && !getCachedUrl(source)) {
                    // Store original URL mapping for cache
                    songCache.set(source, url);
                }
            },
            onloaderror: (id, err) => {
                console.error('Load error:', err);
                emit('error', err);
            }
        });

        sound.rate(currentRate);
        sound.play();
    }

    // Load without auto-playing
    function load(source) {
        stop();
        isPlaying = false;
        var url;
        if (source instanceof File) { url = URL.createObjectURL(source); currentObjectUrl = url; }
        else if (typeof source === 'string') { url = source; }
        else return;

        sound = new Howl({
            src: [url], html5: true, volume: isMuted ? 0 : volume,
            onplay: () => { isPlaying = true; startTimeUpdate(); emit('play'); },
            onpause: () => { isPlaying = false; stopTimeUpdate(); emit('pause'); },
            onend: () => { isPlaying = false; stopTimeUpdate(); emit('end'); },
            onload: () => { emit('load', { duration: sound.duration() }); },
            onloaderror: (id, err) => { console.error('Load error:', err); }
        });
        sound.rate(currentRate);
    }

    function pause() {
        if (sound && isPlaying) {
            sound.pause();
        }
    }

    function resume() {
        if (sound) {
            sound.play();
        }
    }

    function togglePlay() {
        if (isPlaying) pause();
        else resume();
    }

    function stop() {
        if (sound) {
            sound.stop();
            sound.unload();
            sound = null;
        }
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
        isPlaying = false;
        stopTimeUpdate();
        emit('pause');
    }

    let seekTimer = null;
    let isSeeking = false;

    function seek(time) {
        if (sound) {
            // Debounce rapid seeks
            if (seekTimer) clearTimeout(seekTimer);
            isSeeking = true;
            seekTimer = setTimeout(function() {
                sound.seek(time);
                isSeeking = false;
            }, 50);
            // Emit timeupdate immediately for UI responsiveness
            emit('timeupdate', {
                current: time,
                duration: sound.duration()
            });
        }
    }

    function seekPercent(percent) {
        if (sound) {
            const duration = sound.duration();
            seek(duration * Math.max(0, Math.min(1, percent)));
        }
    }

    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        if (sound && !isMuted) {
            sound.volume(volume);
        }
    }

    function getVolume() {
        return volume;
    }

    function toggleMute() {
        isMuted = !isMuted;
        if (sound) {
            sound.volume(isMuted ? 0 : volume);
        }
        return isMuted;
    }

    function getPosition() {
        return sound ? sound.seek() : 0;
    }

    function getDuration() {
        return sound ? sound.duration() : 0;
    }

    function setRate(rate) {
        currentRate = rate;
        if (sound) sound.rate(rate);
    }

    function getRate() {
        return currentRate;
    }

    function getIsPlaying() {
        return isPlaying;
    }

    // Time update loop
    function startTimeUpdate() {
        stopTimeUpdate();
        updateInterval = setInterval(() => {
            if (sound && isPlaying && !isSeeking) {
                var current = sound.seek();
                var duration = sound.duration();
                emit('timeupdate', {
                    current: current,
                    duration: duration
                });
                // Detect end if near the end and not progressing
                if (duration > 0 && current > 0 && current >= duration - 0.5) {
                    // Let onend handle it naturally, but force if stuck
                    setTimeout(function() {
                        if (sound && isPlaying && sound.seek() >= duration - 0.3) {
                            isPlaying = false;
                            stopTimeUpdate();
                            emit('end');
                        }
                    }, 1000);
                }
            }
        }, 50); // ~20fps update
    }

    function stopTimeUpdate() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    return {
        play,
        load,
        pause,
        resume,
        togglePlay,
        stop,
        seek,
        seekPercent,
        setVolume,
        getVolume,
        toggleMute,
        getPosition,
        getDuration,
        setRate,
        getRate,
        getIsPlaying,
        on,
        off,
        get isMuted() { return isMuted; }
    };
})();
