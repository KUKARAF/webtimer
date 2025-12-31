/**
 * simulate_tick.js
 *
 * This script runs a client‑side "tick" that decrements the time shown in any
 * element with the class `time-left`. The expected format is a zero‑padded
 * HH:MM:SS string (e.g., "00:09:12"). The script will:
 *
 *   1. Locate the first HH:MM:SS pattern inside the element's text.
 *   2. Convert it to total seconds, subtract one (never below 0).
 *   3. Convert the result back to HH:MM:SS and replace only that portion.
 *   4. Add the `expired` class when the timer reaches "00:00:00".
 *
 * If an element does not contain a valid time string, it is ignored.
 */

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
    const elements = document.querySelectorAll('.time-left');
    elements.forEach(el => {
        const originalText = el.textContent;
        // Find the first occurrence of HH:MM:SS in the text.
        const timeRegex = /\b(\d{2}):(\d{2}):(\d{2})\b/;
        const match = originalText.match(timeRegex);
        if (!match) {
            // No time pattern found; skip this element.
            return;
        }

        const { newTime, isZero } = decrementTimeString(match[0]);

        // Replace only the matched time substring.
        const updatedText = originalText.replace(timeRegex, newTime);
        el.textContent = updatedText;

        // Add or remove the `expired` class based on the new value.
        if (isZero) {
            el.classList.add('expired');
        } else {
            el.classList.remove('expired');
        }
    });
}

// Run the tick every second.
setInterval(tickTimeLeft, 1000);
