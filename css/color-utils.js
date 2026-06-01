/**
 * Color Utilities
 * Extracted and adapted from refined-now-playing-netease
 * Extracts dominant colors from album art using canvas sampling
 */

const ColorUtils = (() => {
    const canvas = document.getElementById('color-canvas') || document.createElement('canvas');
    canvas.style.display = 'none';
    if (!canvas.parentNode) document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // RGB to HSL
    function rgb2Hsl([r, g, b]) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    // HSL to RGB
    function hsl2Rgb([h, s, l]) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [r * 255, g * 255, b * 255];
    }

    // Normalize color to ensure it's vibrant enough
    function normalizeColor([r, g, b]) {
        if (Math.max(r, g, b) - Math.min(r, g, b) < 5) {
            return [150, 150, 150];
        }
        const mix = (a, b, p) => Math.round(a * (1 - p) + b * p);
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (luminance < 60) {
            [r, g, b] = [r, g, b].map(c => mix(c, 255, 0.3 * (1 - luminance / 60)));
        } else if (luminance > 180) {
            [r, g, b] = [r, g, b].map(c => mix(c, 0, 0.5 * ((luminance - 180) / 76)));
        }
        let [h, s, l] = rgb2Hsl([r, g, b]);
        s = Math.max(0.3, Math.min(0.8, s));
        l = Math.max(0.5, Math.min(0.8, l));
        [r, g, b] = hsl2Rgb([h, s, l]);
        return [r, g, b];
    }

    // Calculate luminance
    function calcLuminance([r, g, b]) {
        [r, g, b] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    // Simple quantization - sample pixels and find dominant colors
    function extractColors(imageElement, numColors = 6) {
        try {
            const sampleSize = 50;
            canvas.width = sampleSize;
            canvas.height = sampleSize;
            ctx.drawImage(imageElement, 0, 0, 
                imageElement.naturalWidth || imageElement.width, 
                imageElement.naturalHeight || imageElement.height, 
                0, 0, sampleSize, sampleSize);
            
            const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
            const pixels = imageData.data;
            
            // Collect pixels into buckets
            const colorMap = {};
            for (let i = 0; i < pixels.length; i += 4) {
                const r = Math.round(pixels[i] / 32) * 32;
                const g = Math.round(pixels[i + 1] / 32) * 32;
                const b = Math.round(pixels[i + 2] / 32) * 32;
                const key = `${r},${g},${b}`;
                colorMap[key] = (colorMap[key] || 0) + 1;
            }

            // Sort by frequency
            const sorted = Object.entries(colorMap)
                .map(([key, count]) => {
                    const [r, g, b] = key.split(',').map(Number);
                    return { color: [r, g, b], count };
                })
                .sort((a, b) => b.count - a.count);

            // Filter out very dark and very light colors for primary
            const filtered = sorted.filter(({ color: [r, g, b] }) => {
                const lum = calcLuminance([r, g, b]);
                return lum > 20 && lum < 240 && (Math.max(r, g, b) - Math.min(r, g, b)) > 10;
            });

            const palette = (filtered.length >= numColors ? filtered : sorted)
                .slice(0, numColors)
                .map(({ color }) => color);

            return palette;
        } catch (e) {
            console.warn('Color extraction failed:', e);
            return [[120, 120, 120]];
        }
    }

    // Get the best accent color from palette
    function getAccentColor(imageElement) {
        const palette = extractColors(imageElement, 8);
        if (!palette.length) return { primary: [120, 120, 120], palette: [] };

        // Pick the most vibrant, moderately bright color
        let best = palette[0];
        let bestScore = 0;
        for (const color of palette) {
            const [h, s, l] = rgb2Hsl(color);
            const score = s * 100 + (1 - Math.abs(l - 0.55)) * 50;
            if (score > bestScore) {
                bestScore = score;
                best = color;
            }
        }

        const primary = normalizeColor(best);
        return { primary, palette };
    }

    // Apply accent color to CSS variables
    function applyAccentColor(r, g, b) {
        const root = document.documentElement;
        root.style.setProperty('--rnp-accent-color', `rgb(${r}, ${g}, ${b})`);
        root.style.setProperty('--rnp-accent-color-rgb', `${r}, ${g}, ${b}`);

        // Shade 1: lighter
        const [h, s, l] = rgb2Hsl([r, g, b]);
        const shade1 = hsl2Rgb([h, Math.min(s + 0.1, 1), Math.min(l + 0.25, 0.9)]);
        root.style.setProperty('--rnp-accent-color-shade-1', 
            `rgb(${Math.round(shade1[0])}, ${Math.round(shade1[1])}, ${Math.round(shade1[2])})`);
        root.style.setProperty('--rnp-accent-color-shade-1-rgb', 
            `${Math.round(shade1[0])}, ${Math.round(shade1[1])}, ${Math.round(shade1[2])}`);

        // Shade 2: lightest / text color
        const shade2 = hsl2Rgb([h, Math.min(s * 0.5, 0.5), Math.min(l + 0.35, 0.95)]);
        root.style.setProperty('--rnp-accent-color-shade-2', 
            `rgb(${Math.round(shade2[0])}, ${Math.round(shade2[1])}, ${Math.round(shade2[2])})`);
        root.style.setProperty('--rnp-accent-color-shade-2-rgb', 
            `${Math.round(shade2[0])}, ${Math.round(shade2[1])}, ${Math.round(shade2[2])}`);

        // On-primary (dark text for buttons)
        const lum = calcLuminance([r, g, b]);
        const onPrimary = lum > 128 ? [10, 10, 10] : [250, 250, 250];
        root.style.setProperty('--rnp-accent-color-on-primary', 
            `rgb(${onPrimary[0]}, ${onPrimary[1]}, ${onPrimary[2]})`);

        // Glow color (saturated version)
        const glow = hsl2Rgb([h, Math.min(s + 0.2, 1), Math.min(l + 0.1, 0.7)]);
        root.style.setProperty('--rnp-accent-color-bg', 
            `rgb(${Math.round(glow[0])}, ${Math.round(glow[1])}, ${Math.round(glow[2])})`);
    }

    // Generate gradient from palette
    function getGradientFromPalette(palette) {
        if (!palette || palette.length < 2) {
            return 'linear-gradient(-45deg, #333, #666)';
        }
        const colors = palette.slice(0, 6).map(([r, g, b]) => `rgb(${r},${g},${b})`);
        return `linear-gradient(-45deg, ${colors.join(',')})`;
    }

    return {
        rgb2Hsl,
        hsl2Rgb,
        normalizeColor,
        calcLuminance,
        extractColors,
        getAccentColor,
        applyAccentColor,
        getGradientFromPalette
    };
})();
