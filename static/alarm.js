// Alarm system for WebTimer
// Beeps when timer reaches 0 until the alarm is deleted
// Based on: https://stackoverflow.com/a/... (CC BY-SA 4.0)

class AlarmSystem {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.alarmInterval = null;
        this.activeAlarms = new Set();
    }

    // Initialize audio context (only when needed)
    initAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("AudioContext not supported:", e);
                return false;
            }
        }
        return true;
    }

    // Start beeping alarm
    startAlarm(timerId) {
        if (this.activeAlarms.has(timerId)) {
            return; // Already alarming for this timer
        }

        if (!this.initAudioContext()) {
            return;
        }

        this.activeAlarms.add(timerId);

        // Create beep pattern: 2 short beeps, pause, repeat
        const beepPattern = () => {
            if (!this.activeAlarms.has(timerId)) {
                return; // Stop if alarm was cleared
            }

            // Beep 1
            this.playBeep(800, 200);
            
            // Short pause
            setTimeout(() => {
                if (!this.activeAlarms.has(timerId)) return;
                
                // Beep 2  
                this.playBeep(1000, 200);
                
                // Longer pause before repeating
                setTimeout(() => {
                    if (this.activeAlarms.has(timerId)) {
                        beepPattern(); // Repeat pattern
                    }
                }, 300);
            }, 250);
        };

        // Start the beep pattern
        beepPattern();
    }

    // Play a single beep
    playBeep(frequency, duration) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.1; // Volume (0.0 to 1.0)
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }

    // Stop alarm for a specific timer
    stopAlarm(timerId) {
        this.activeAlarms.delete(timerId);
        
        // If no more active alarms, clean up
        if (this.activeAlarms.size === 0 && this.audioContext) {
            this.audioContext.close().then(() => {
                this.audioContext = null;
            });
        }
    }

    // Stop all alarms
    stopAllAlarms() {
        this.activeAlarms.clear();
        if (this.audioContext) {
            this.audioContext.close().then(() => {
                this.audioContext = null;
            });
        }
    }

    // Check if a timer is currently alarming
    isAlarming(timerId) {
        return this.activeAlarms.has(timerId);
    }
}

// Global alarm system instance
const alarmSystem = new AlarmSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AlarmSystem, alarmSystem };
}