/**
 * simulate_tick.js
 *
 * This script runs a simple client‑side "tick" that decrements the numeric
 * value shown in any element with the class `time-left`. It is executed
 * once per second.
 *
 * Expected HTML structure (as rendered by the server):
 *   <div class="timer-item" data-timer-id="123">
 *       <span class="time-left">45</span>
 *   </div>
 *
 * The script will:
 *   1. Parse the current text content of each `.time-left` element as an integer.
 *   2. Subtract 1 (but never go below 0).
 *   3. Update the element's text.
 *   4. When the value reaches 0, add the `expired` class so the existing
 *      alarm‑handling logic can react.
 */

function tickTimeLeft() {
    const elements = document.querySelectorAll('.time-left');
    elements.forEach(el => {
        const current = parseInt(el.textContent, 10);
        if (isNaN(current)) {
            // If the content is not a number, skip it.
            return;
        }
        const next = Math.max(0, current - 1);
        el.textContent = next.toString();

        // Add or remove the `expired` class based on the new value.
        if (next === 0) {
            el.classList.add('expired');
        } else {
            el.classList.remove('expired');
        }
    });
}

// Run the tick every second.
setInterval(tickTimeLeft, 1000);
