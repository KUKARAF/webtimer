// Time conversion functionality for WebTimer
// Converts time inputs with 'm' (minutes) and 'h' (hours) to seconds

function convertTimeToSeconds(inputValue) {
    // Check if input ends with 'm' (minutes)
    if (inputValue.endsWith('m')) {
        const minutes = parseInt(inputValue.slice(0, -1));
        if (!isNaN(minutes)) {
            return minutes * 60;
        }
    }
    // Check if input ends with 'h' (hours)
    else if (inputValue.endsWith('h')) {
        const hours = parseInt(inputValue.slice(0, -1));
        if (!isNaN(hours)) {
            return hours * 3600;
        }
    }
    // If no suffix, assume it's already in seconds
    else {
        const seconds = parseInt(inputValue);
        if (!isNaN(seconds)) {
            return seconds;
        }
    }
    return null; // Return null if conversion fails
}

// Add input event listener to duration input for immediate conversion
document.addEventListener('DOMContentLoaded', function() {
    const durationInput = document.getElementById('duration-input');
    if (durationInput) {
        durationInput.addEventListener('input', function() {
            const inputValue = durationInput.value.trim();
            if (inputValue) {
                const convertedValue = convertTimeToSeconds(inputValue);
                if (convertedValue !== null) {
                    // Update the input value with converted seconds
                    durationInput.value = convertedValue.toString();
                }
            }
        });
    }
});