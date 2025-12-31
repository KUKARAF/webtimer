/**
 * timer_renderer.js
 *
 * Provides a single public function `fetchAndRenderTimers()` that:
 *   1. Retrieves the list of all timers from the server.
 *   2. Renders each timer into the #timer-list container.
 *
 * Each rendered timer item contains:
 *   - A visible name (or "Unnamed" if none).
 *   - A span `.time-left` that is refreshed every 10 seconds via a GET request
 *     to `/timers/<id>`.
 *   - A delete button that issues a DELETE request to `/timers/<id>` and,
 *     on success, removes the timer element from the DOM.
 *
 * The module also starts a global interval that updates the time‑left for
 * every rendered timer.  This keeps the implementation simple and avoids
 * creating a separate interval per timer.
 */

const TIMER_POLL_INTERVAL_MS = 10_000; // 10 seconds

/**
 * Helper: perform a fetch request and return JSON (or null on error).
 */
async function fetchJSON(url, options = {}) {
    try {
        const resp = await fetch(url, options);
        if (!resp.ok) {
            console.warn(`Request to ${url} failed with status ${resp.status}`);
            return null;
        }
        // Some endpoints (e.g., DELETE) may not return JSON.
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await resp.json();
        }
        return null;
    } catch (e) {
        console.error(`Network error while fetching ${url}:`, e);
        return null;
    }
}

/**
 * Render a single timer object into a DOM element.
 *
 * Expected timer shape (as returned by the backend):
 * {
 *   id: string,
 *   name: string | null,
 *   time_left: string,   // formatted HH:MM:SS
 *   expired: boolean
 * }
 */
function createTimerElement(timer) {
    const item = document.createElement('div');
    item.className = 'timer-item';
    item.dataset.timerId = timer.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'timer-name';
    nameSpan.textContent = timer.name?.trim() ? timer.name : 'Unnamed';
    item.appendChild(nameSpan);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'time-left';
    timeSpan.textContent = timer.time_left;
    if (timer.expired) {
        timeSpan.classList.add('expired');
    }
    item.appendChild(timeSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'timer-delete-btn';
    deleteBtn.title = 'Delete timer';
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', async () => {
        const result = await fetchJSON(`/timers/${timer.id}`, { method: 'DELETE' });
        if (result !== null) {
            // Successful delete – remove element from DOM
            item.remove();
        } else {
            console.warn(`Failed to delete timer ${timer.id}`);
        }
    });
    item.appendChild(deleteBtn);

    return item;
}

/**
 * Refresh the `.time-left` element for a given timer DOM node.
 */
async function refreshTimerItem(item) {
    const timerId = item.dataset.timerId;
    const data = await fetchJSON(`/timers/${timerId}`);
    if (!data) return; // keep existing display on error

    const timeSpan = item.querySelector('.time-left');
    if (timeSpan) {
        timeSpan.textContent = data.time_left;
        if (data.expired) {
            timeSpan.classList.add('expired');
            // Start alarm if not already sounding
            if (typeof alarmSystem !== 'undefined' && !alarmSystem.isAlarming(timerId)) {
                alarmSystem.startAlarm(timerId);
                // Add visual indicator
                if (!item.querySelector('.alarm-indicator')) {
                    const ind = document.createElement('span');
                    ind.className = 'alarm-indicator';
                    ind.title = 'Alarm sounding';
                    timeSpan.appendChild(ind);
                }
            }
        } else {
            timeSpan.classList.remove('expired');
            // Remove alarm indicator if timer recovered (unlikely)
            const ind = item.querySelector('.alarm-indicator');
            if (ind) ind.remove();
        }
    }
}

/**
 * Global interval that updates all rendered timers.
 */
let timerPoller = null;
function startGlobalTimerPoller() {
    if (timerPoller) clearInterval(timerPoller);
    timerPoller = setInterval(() => {
        const items = document.querySelectorAll('.timer-item');
        items.forEach(item => refreshTimerItem(item));
    }, TIMER_POLL_INTERVAL_MS);
}

/**
 * Public function: fetch the list of timers and render them.
 *
 * The backend should expose a JSON endpoint at `/timers` that returns an
 * array of timer objects (see `createTimerElement` for the expected shape).
 */
async function fetchAndRenderTimers() {
    const container = document.getElementById('timer-list');
    if (!container) {
        console.error('Cannot find #timer-list element');
        return;
    }

    // Show a temporary loading indicator
    container.innerHTML = '<div class="loading">Loading timers...</div>';

    const timers = await fetchJSON('/timers');
    if (!Array.isArray(timers)) {
        container.innerHTML = '<div class="error">Failed to load timers.</div>';
        return;
    }

    // Clear container and render each timer
    container.innerHTML = '';
    timers.forEach(timer => {
        const el = createTimerElement(timer);
        container.appendChild(el);
    });

    // Start (or restart) the periodic poller
    startGlobalTimerPoller();
}

/**
 * Helper used by the "Create Timer" button.
 *
 * Sends a POST request with the form data, then refreshes the list.
 */
async function createTimer() {
    const nameInput = document.getElementById('timer-name-input');
    const durationInput = document.getElementById('duration-input');

    const name = nameInput.value.trim();
    const durationRaw = durationInput.value.trim();

    if (!durationRaw) {
        alert('Please enter a duration.');
        return;
    }

    // Convert possible "5m"/"1h" shortcuts using the existing helper
    const durationSeconds = convertTimeToSeconds(durationRaw);
    if (durationSeconds === null) {
        alert('Invalid duration format.');
        return;
    }

    const formData = new FormData();
    if (name) formData.append('timer_name', name);
    formData.append('duration_seconds', durationSeconds);

    const result = await fetchJSON('/timers', {
        method: 'POST',
        body: formData
    });

    if (result !== null) {
        // Clear inputs
        nameInput.value = '';
        durationInput.value = '';
        // Refresh the timer list
        await fetchAndRenderTimers();
    } else {
        alert('Failed to create timer.');
    }
}

// Export the main function for external callers (e.g., index.html)
window.fetchAndRenderTimers = fetchAndRenderTimers;
