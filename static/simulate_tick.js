// TODO: simulate_tick.js currently disabled due to issues – fix later

/**
 * simulate_tick.js
 *
 * This script runs a client‑side "tick" that decrements the time shown in any
 * element with the class `time-left`. The expected format is a zero‑padded
 * HH:MM:SS string (e.g., "00:09:12").
 *
 * Added console logging to help debug issues:
 *   - When the script is loaded.
 *   - Each tick execution.
 *   - Each element processed, including original and updated time.
 *   - Cases where no time pattern is found.
 *   - When a timer reaches zero.
 */

console.debug('[simulate_tick] script loaded');

// Helper to pad numbers to two digits.
function pad2(num) {
    return String(num).padStart(2, '0');
}

/**
 * Decrement a HH:MM:SS time string by one second.
 * Returns the new time string (still zero‑padded) and a flag indicating
 * whether the timer has reached zero.
 *
 * @param {string} timeStr - The original time string (e.g., "00:09:12").
 * @returns {{newTime: string, isZero: boolean}}
 */
function decrementTimeString(timeStr) {
    const match = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) {
        console.warn(`[simulate_tick] Invalid time format: "${timeStr}"`);
        // Not a valid HH:MM:SS format; return original.
        return { newTime: timeStr, isZero: false };
    }

    let hours = parseInt(match[1], 10);
    let minutes = parseInt(match[2], 10);
    let seconds = parseInt(match[3], 10);

    // Convert to total seconds, decrement, clamp at 0.
    let total = hours * 3600 + minutes * 60 + seconds;
    total = Math.max(0, total - 1);

    const newHours = Math.floor(total / 3600);
    const newMinutes = Math.floor((total % 3600) / 60);
    const newSeconds = total % 60;

    const newTime = `${pad2(newHours)}:${pad2(newMinutes)}:${pad2(newSeconds)}`;
    const isZero = total === 0;

    return { newTime, isZero };
}

/**
 * Walk through all `.time-left` elements and decrement any HH:MM:SS
 * substring they contain.
 */
function tickTimeLeft() {
    console.debug('[simulate_tick] tick executed');
    const elements = document.querySelectorAll('.time-left');
    elements.forEach(el => {
        const originalText = el.textContent;
        // Find the first occurrence of HH:MM:SS in the text.
        const timeRegex = /\b(\d{2}):(\d{2}):(\d{2})\b/;
        const match = originalText.match(timeRegex);
        if (!match) {
            console.info(`[simulate_tick] No HH:MM:SS pattern found in element:`, el);
            return; // No time pattern found; skip this element.
        }

        console.debug(`[simulate_tick] Found time "${match[0]}" in element:`, el);
        const { newTime, isZero } = decrementTimeString(match[0]);

        // Replace only the matched time substring.
        const updatedText = originalText.replace(timeRegex, newTime);
        el.textContent = updatedText;

        console.debug(`[simulate_tick] Updated element text from "${originalText}" to "${updatedText}"`);

        // Add or remove the `expired` class based on the new value.
        if (isZero) {
            console.log(`[simulate_tick] Timer reached zero for element:`, el);
            el.classList.add('expired');
        } else {
            el.classList.remove('expired');
        }
    });
}

// Run the tick every second.
setInterval(tickTimeLeft, 1000);
