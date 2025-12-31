#!/usr/bin/env python3

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sqlite3
import threading
import time
from datetime import datetime, timedelta
import uuid
import os
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__)

# Configuration
app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
app.config['ENV'] = os.environ.get('FLASK_ENV', 'production')
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

# Enable CORS for all routes (configure as needed)
CORS(app, resources={r"/*": {"origins": "*"}})

# Rate limiting to prevent abuse
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Database setup
DB_PATH = os.environ.get('DB_PATH', 'timers.db')

# Logging setup
if not app.debug:
    handler = RotatingFileHandler('webtimer.log', maxBytes=10000, backupCount=3)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS timers (
            id TEXT PRIMARY KEY,
            name TEXT,
            duration_seconds INTEGER,
            created_at TIMESTAMP,
            expires_at TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Timer cleanup thread
class TimerCleanupThread(threading.Thread):
    def __init__(self):
        super().__init__()
        self.daemon = True
        self.running = True
    
    def run(self):
        while self.running:
            time.sleep(60)  # Clean up every minute
            self.cleanup_expired_timers()
    
    def cleanup_expired_timers(self):
        try:
            conn = get_db_connection()
            now = datetime.now()
            conn.execute('DELETE FROM timers WHERE expires_at <= ?', (now.isoformat(),))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error cleaning up expired timers: {e}")
    
    def stop(self):
        self.running = False

# Initialize cleanup thread
cleanup_thread = TimerCleanupThread()
cleanup_thread.start()

@app.route('/timers', methods=['POST'])
def create_timer():
    # Handle both JSON and form data
    if request.is_json:
        data = request.get_json()
        duration_seconds = data.get('duration_seconds')
        name = data.get('name')
    else:
        # Handle form data from HTMX
        duration_seconds = request.form.get('duration_seconds')
        name = request.form.get('timer_name')  # Note: form uses 'timer_name', not 'name'
    
    # Convert duration_seconds to int if it's a string
    if duration_seconds is not None and isinstance(duration_seconds, str):
        try:
            duration_seconds = int(duration_seconds)
        except ValueError:
            return jsonify({'error': 'duration_seconds must be a valid number'}), 400
    
    if not duration_seconds:
        return jsonify({'error': 'duration_seconds is required'}), 400
    
    if duration_seconds <= 0:
        return jsonify({'error': 'duration_seconds must be positive'}), 400
    
    timer_id = str(uuid.uuid4())
    created_at = datetime.now()
    expires_at = created_at + timedelta(seconds=duration_seconds)
    
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO timers (id, name, duration_seconds, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (timer_id, name, duration_seconds, created_at.isoformat(), expires_at.isoformat()))
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': timer_id,
            'name': name,
            'duration_seconds': duration_seconds,
            'created_at': created_at.isoformat(),
            'expires_at': expires_at.isoformat()
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/timers/<identifier>', methods=['GET'])
def get_timer(identifier):
    try:
        conn = get_db_connection()
        
        # Try to find by ID first
        timer = conn.execute('SELECT * FROM timers WHERE id = ?', (identifier,)).fetchone()
        
        # If not found by ID, try to find by name
        if not timer:
            timer = conn.execute('SELECT * FROM timers WHERE name = ?', (identifier,)).fetchone()
        
        conn.close()
        
        if not timer:
            return jsonify({'error': 'Timer not found'}), 404
        
        expires_at = datetime.fromisoformat(timer['expires_at'])
        now = datetime.now()
        
        if expires_at <= now:
            time_left = 0
        else:
            time_left = int((expires_at - now).total_seconds())
        
        return jsonify({
            'id': timer['id'],
            'name': timer['name'],
            'duration_seconds': timer['duration_seconds'],
            'created_at': timer['created_at'],
            'expires_at': timer['expires_at'],
            'time_left_seconds': time_left
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/timers/<identifier>', methods=['DELETE'])
def delete_timer(identifier):
    try:
        conn = get_db_connection()
        
        # Try to delete by ID first
        cursor = conn.execute('DELETE FROM timers WHERE id = ?', (identifier,))
        
        # If not found by ID, try to delete by name
        if cursor.rowcount == 0:
            cursor = conn.execute('DELETE FROM timers WHERE name = ?', (identifier,))
        
        conn.commit()
        conn.close()
        
        if cursor.rowcount == 0:
            return jsonify({'error': 'Timer not found'}), 404
        
        return jsonify({'message': 'Timer deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/timers', methods=['GET'])
def list_timers():
    try:
        conn = get_db_connection()
        timers = conn.execute('SELECT * FROM timers').fetchall()
        conn.close()
        
        result = []
        now = datetime.now()
        
        for timer in timers:
            expires_at = datetime.fromisoformat(timer['expires_at'])
            time_left = int((expires_at - now).total_seconds()) if expires_at > now else 0
            
            result.append({
                'id': timer['id'],
                'name': timer['name'],
                'duration_seconds': timer['duration_seconds'],
                'created_at': timer['created_at'],
                'expires_at': timer['expires_at'],
                'time_left_seconds': time_left
            })
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/timers/simple', methods=['GET'])
def list_timers_simple():
    """Simple endpoint for HTMX frontend - returns HTML fragments"""
    try:
        conn = get_db_connection()
        timers = conn.execute('SELECT * FROM timers').fetchall()
        conn.close()
        
        now = datetime.now()
        
        if not timers:
            return "<div class='empty-state'>No active timers. Create one above!</div>"
        
        html_parts = []
        for timer in timers:
            expires_at = datetime.fromisoformat(timer['expires_at'])
            time_left = int((expires_at - now).total_seconds())
            time_left = max(0, time_left)  # Ensure non-negative
            
            # Format time left as HH:MM:SS
            hours, remainder = divmod(time_left, 3600)
            minutes, seconds = divmod(remainder, 60)
            time_formatted = f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"
            
            timer_name = timer['name'] if timer['name'] else f"Timer {timer['id'][:8]}"
            expired_class = "expired" if time_left <= 0 else ""
            
            html_part = f'''
            <div class="timer-item" data-timer-id="{timer['id']}">
                <div class="timer-info">
                    <div class="timer-name">{timer_name}</div>
                    <div class="timer-time">
                        <span class="time-left {expired_class}">{time_formatted}</span> left
                        (created: {timer['created_at']})
                    </div>
                </div>
                <div class="timer-actions">
                    <button 
                        class="delete-btn" 
                        hx-delete="/timers/{timer['id']}" 
                        hx-target="#timer-list" 
                        hx-swap="innerHTML"
                    >
                        Delete
                    </button>
                </div>
            </div>
            '''
            html_parts.append(html_part)
        
        return '\n'.join(html_parts)
    except Exception as e:
        app.logger.error(f"Error in simple timer list: {e}")
        return f"<div class='empty-state'>Error loading timers: {str(e)}</div>"

@app.route('/')
def index():
    """Serve the main HTML interface"""
    return render_template('index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files with proper cache headers"""
    response = send_from_directory('static', filename)
    
    # Set cache headers for service worker and manifest
    if filename == 'sw.js' or filename == 'manifest.json':
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    else:
        # Cache other static assets for better performance
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    
    return response

@app.route('/static/icons/<path:filename>')
def serve_icons(filename):
    """Serve icon files with proper cache headers"""
    response = send_from_directory('static/icons', filename)
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response

@app.route('/test-alarm')
def test_alarm():
    """Serve the alarm test page"""
    return send_from_directory('.', 'test_alarm.html')

@app.route('/health')
@limiter.exempt  # Exempt health check from rate limiting
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database connectivity
        conn = get_db_connection()
        conn.execute('SELECT 1')
        conn.close()
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'service': 'webtimer'
        }), 200
    except Exception as e:
        app.logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' https://unpkg.com 'unsafe-eval'; style-src 'self' 'unsafe-inline'; script-src-elem 'self' https://unpkg.com 'unsafe-inline'; script-src-attr 'unsafe-inline'"
    return response

if __name__ == '__main__':
    # This block is for development only
    # In production, Gunicorn will import the app from run_production.py
    init_db()
    
    # Determine if we're in debug mode based on environment
    debug_mode = app.config['DEBUG']
    
    if debug_mode:
        app.logger.info(f"Starting webtimer service in {'debug' if debug_mode else 'production'} mode")
        app.logger.info(f"Database path: {DB_PATH}")
        app.logger.info(f"Listening on 0.0.0.0:5000")
        app.run(host='0.0.0.0', port=5000, debug=debug_mode)
    else:
        app.logger.warning("Running in production mode - use Gunicorn instead of Flask development server!")