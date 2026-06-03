/**
 * Playlist Module
 * Manages the list of tracks and playback order
 */

const PlaylistManager = (() => {
    let tracks = [];         // Array of metadata objects
    let currentIndex = -1;
    let shuffleMode = false;
    let repeatMode = 'off';  // 'off', 'all', 'one'
    let shuffleOrder = [];
    let shuffleIndex = -1;

    // Event callbacks
    const listeners = {
        trackchange: [],
        playlistchange: [],
        indexchange: []
    };

    function on(event, callback) {
        if (listeners[event]) listeners[event].push(callback);
    }

    function emit(event, data) {
        if (listeners[event]) listeners[event].forEach(cb => cb(data));
    }

    // Set tracks
    function setTracks(newTracks) {
        tracks = [...newTracks];
        currentIndex = -1;
        generateShuffleOrder();
        emit('playlistchange', tracks);
    }

    // Add tracks
    function addTracks(newTracks) {
        tracks.push(...newTracks);
        generateShuffleOrder();
        emit('playlistchange', tracks);
    }

    // Get track at index
    function getTrack(index) {
        return tracks[index] || null;
    }

    // Set current index without triggering auto-play (first load)
    function setCurrentIndexSilent(index) {
        if (index >= 0 && index < tracks.length) {
            currentIndex = index;
            if (shuffleMode) shuffleIndex = shuffleOrder.indexOf(index);
            emit('indexchange', currentIndex);
            // Emit trackchange for UI update but app handles playing
            emit('trackchange', tracks[currentIndex]);
        }
    }

    // Set current index
    function setCurrentIndex(index) {
        if (index >= 0 && index < tracks.length) {
            currentIndex = index;
            // Update shuffle index
            if (shuffleMode) {
                shuffleIndex = shuffleOrder.indexOf(index);
            }
            emit('indexchange', currentIndex);
            emit('trackchange', tracks[currentIndex]);
        }
    }

    // Get current track
    function getCurrentTrack() {
        return tracks[currentIndex] || null;
    }

    // Next track
    function next(forceSkip) {
        if (tracks.length === 0) return -1;

        if (shuffleMode) {
            shuffleIndex++;
            if (shuffleIndex >= shuffleOrder.length) {
                generateShuffleOrder();
                shuffleIndex = 0;
            }
            currentIndex = shuffleOrder[shuffleIndex];
        } else if (repeatMode === 'one' && !forceSkip) {
            emit('trackchange', tracks[currentIndex]);
            return currentIndex;
        } else {
            currentIndex++;
            if (currentIndex >= tracks.length) {
                // Loop back to start in all modes
                currentIndex = 0;
            }
        }

        emit('indexchange', currentIndex);
        emit('trackchange', tracks[currentIndex]);
        return currentIndex;
    }

    // Previous track
    function prev(forceSkip) {
        if (tracks.length === 0) return -1;

        if (shuffleMode) {
            shuffleIndex = (shuffleIndex - 1 + shuffleOrder.length) % shuffleOrder.length;
            currentIndex = shuffleOrder[shuffleIndex];
        } else if (repeatMode === 'one' && !forceSkip) {
            emit('trackchange', tracks[currentIndex]);
            return currentIndex;
        } else {
            currentIndex--;
            if (currentIndex < 0) {
                // Loop to end in all modes
                currentIndex = tracks.length - 1;
            }
        }

        emit('indexchange', currentIndex);
        emit('trackchange', tracks[currentIndex]);
        return currentIndex;
    }

    // Play mode cycling: sequential -> repeat(one) -> shuffle -> sequential
    function cyclePlaymode() {
        if (!shuffleMode && repeatMode === 'off') {
            // sequential -> single repeat
            shuffleMode = false;
            repeatMode = 'one';
        } else if (!shuffleMode && repeatMode === 'one') {
            // single repeat -> shuffle
            shuffleMode = true;
            repeatMode = 'off';
            generateShuffleOrder();
            if (currentIndex >= 0) {
                shuffleIndex = shuffleOrder.indexOf(currentIndex);
            }
        } else {
            // shuffle -> sequential
            shuffleMode = false;
            repeatMode = 'off';
        }
        return getPlaymode();
    }

    // Get current playmode
    function getPlaymode() {
        if (shuffleMode) return 'shuffle';
        if (repeatMode === 'one') return 'repeat';
        return 'sequential';
    }

    // Cycle repeat (kept for backward compat)
    function cycleRepeat() { return 'off'; }
    function toggleShuffle() { return false; }

    // Generate shuffle order (Fisher-Yates)
    function generateShuffleOrder() {
        shuffleOrder = tracks.map((_, i) => i);
        for (let i = shuffleOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
        }
    }

    // Find track by file reference
    function findTrackByFile(file) {
        return tracks.findIndex(t => t.file === file);
    }

    function getLength() { return tracks.length; }
    function getShuffleMode() { return shuffleMode; }
    function getRepeatMode() { return repeatMode; }

    return {
        setTracks,
        addTracks,
        getTrack,
        setCurrentIndex,
        setCurrentIndexSilent,
        getCurrentTrack,
        next,
        prev,
        cyclePlaymode,
        getPlaymode,
        toggleShuffle,
        cycleRepeat,
        findTrackByFile,
        on,
        get length() { return getLength(); },
        get currentIndex() { return currentIndex; },
        get shuffleMode() { return shuffleMode; },
        get repeatMode() { return repeatMode; },
        get tracks() { return tracks; }
    };
})();
