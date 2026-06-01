/**
 * Metadata Module
 * Read ID3 tags from audio files using jsmediatags
 */

const MetadataReader = (() => {
    const DEFAULT_COVER = '';

    // Read metadata from a File object
    function readFromFile(file) {
        return new Promise((resolve) => {
            // Quick fallback using filename
            const fallback = {
                title: cleanFilename(file.name),
                artist: '未知艺术家',
                album: '未知专辑',
                cover: null,
                coverUrl: null,
                duration: 0,
                file: file
            };

            try {
                jsmediatags.read(file, {
                    onSuccess: (tag) => {
                        const tags = tag.tags;
                        let coverUrl = null;

                        // Extract album art
                        if (tags.picture) {
                            const { data, format } = tags.picture;
                            const bytes = new Uint8Array(data);
                            const blob = new Blob([bytes], { type: format || 'image/jpeg' });
                            coverUrl = URL.createObjectURL(blob);
                        }

                        resolve({
                            title: tags.title || fallback.title,
                            artist: tags.artist || fallback.artist,
                            album: tags.album || fallback.album,
                            cover: tags.picture || null,
                            coverUrl: coverUrl,
                            track: tags.track || '',
                            year: tags.year || '',
                            genre: tags.genre ? (Array.isArray(tags.genre) ? tags.genre[0] : tags.genre) : '',
                            duration: 0, // will be set by audio engine
                            file: file
                        });
                    },
                    onError: (error) => {
                        console.warn('Metadata read error for', file.name, error);
                        resolve(fallback);
                    }
                });
            } catch (e) {
                console.warn('Metadata read exception:', e);
                resolve(fallback);
            }
        });
    }

    // Read metadata for multiple files
    async function readMultiple(files) {
        const results = [];
        for (const file of files) {
            const meta = await readFromFile(file);
            results.push(meta);
        }
        return results;
    }

    // Clean filename to a readable title
    function cleanFilename(name) {
        return name
            .replace(/\.[^.]+$/, '') // remove extension
            .replace(/^\d+[\.\-\s]+/, '') // remove track numbers
            .replace(/[_]/g, ' ') // underscores to spaces
            .trim();
    }

    // Check if file is an audio file
    function isAudioFile(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        return ['mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a', 'wma', 'opus', 'webm'].includes(ext);
    }

    // Check if file is a lyrics file
    function isLRCFile(filename) {
        return filename.toLowerCase().endsWith('.lrc');
    }

    return {
        readFromFile,
        readMultiple,
        cleanFilename,
        isAudioFile,
        isLRCFile,
        DEFAULT_COVER
    };
})();
