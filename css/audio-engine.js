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

    function seek(time) {
        if (sound) {
            sound.seek(time);
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
            if (sound && isPlaying) {
                emit('timeupdate', {
                    current: sound.seek(),
                    duration: sound.duration()
                });
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
