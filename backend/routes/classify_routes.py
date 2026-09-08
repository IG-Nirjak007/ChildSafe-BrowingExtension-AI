# backend/routes/classify_routes.py

from flask import Blueprint, request, jsonify, current_app
from database.models import db, ActivityLog, Parent
from utils.textclassifier import classify_text
from utils.imageclassifier import predict_image

classify_bp = Blueprint('classify', __name__)


@classify_bp.route('/classify/health', methods=['GET'])
def health():
    return jsonify({ 'status': 'ok' })


# ─────────────────────────────────────────────────────────────────────────────
# POST /classify/image
# Body: { "image": "<base64>", "url": "https://...", "parent_id": 1 }
# ─────────────────────────────────────────────────────────────────────────────
@classify_bp.route('/classify/image', methods=['POST'])
def classify_image_endpoint():
    try:
        data      = request.get_json(force=True)
        image_data = data.get('image')
        url        = data.get('url', 'Unknown URL')
        parent_id  = data.get('parent_id')

        if not image_data:
            return jsonify({'harmful_score': 0.0, 'label': 'safe'}), 400

        prediction, confidence = predict_image(image_data)
        is_harmful   = (prediction == "Blocked")
        harmful_score = float(confidence) if is_harmful else float(1 - confidence)

        # ── Log + alert if harmful ────────────────────────────────────────────
        if is_harmful and parent_id:
            _log_and_alert(parent_id, url, 'Image', harmful_score)

        return jsonify({
            'harmful_score': harmful_score,
            'label':  'harmful' if is_harmful else 'safe',
            'status': prediction,
        })

    except Exception as e:
        print(f'[classify_image error] {e}')
        return jsonify({'harmful_score': 0.0, 'label': 'safe', 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /classify/text
# Body: { "text": "...", "url": "https://...", "parent_id": 1 }
# ─────────────────────────────────────────────────────────────────────────────
@classify_bp.route('/classify/text', methods=['POST'])
def classify_text_endpoint():
    try:
        data      = request.get_json(force=True)
        text      = str(data.get('text', '')).strip()
        url       = data.get('url', 'Unknown URL')
        parent_id = data.get('parent_id')

        if not text:
            return jsonify({'harmful_score': 0.0, 'label': 'safe'})

        prediction, confidence = classify_text(text)
        is_harmful    = (prediction == "Negative")
        harmful_score = float(confidence) if is_harmful else float(1 - confidence)

        # ── Log + alert if harmful ────────────────────────────────────────────
        if is_harmful and parent_id:
            _log_and_alert(parent_id, url, 'Text', harmful_score)

        return jsonify({
            'harmful_score': harmful_score,
            'label':      'harmful' if is_harmful else 'safe',
            'prediction': prediction,
        })

    except Exception as e:
        print(f'[classify_text error] {e}')
        return jsonify({'harmful_score': 0.0, 'label': 'safe', 'error': str(e)}), 500


# ─── Shared: log to DB + emit SocketIO alert ──────────────────────────────────
def _log_and_alert(parent_id, url, content_type, score):
    """Save ActivityLog and push real-time alert to the parent dashboard."""
    try:
        # Log to database
        log = ActivityLog(
            parent_id=parent_id,
            url=url,
            content_type=content_type,
            result='Blocked'
        )
        db.session.add(log)
        db.session.commit()

        # Get parent name for the alert
        parent = Parent.query.get(parent_id)
        parent_name = parent.email.split('@')[0] if parent else 'Parent'

        # Emit real-time SocketIO alert to the React dashboard
        from app import socketio  # import here to avoid circular import
        socketio.emit('new_alert', {
            'parent_name': parent_name,
            'url':         url,
            'reason':      f'Unsafe {content_type} Detected',
            'time':        'Just now'
        }, broadcast=True)

    except Exception as e:
        print(f'[_log_and_alert error] {e}')
        db.session.rollback()