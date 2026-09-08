from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
from datetime import datetime

# Import database and models
from database.models import db, ActivityLog, Parent

# Import the classifiers
from utils.textclassifier import classify_text
from utils.imageclassifier import predict_image

app = Flask(__name__)

# --- CORS CONFIGURATION ---
CORS(app, resources={
    r"/*": {
        "origins": ["*", "chrome-extension://*"]
    }
})

# --- CONFIGURATION ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, 'database', 'db.sqlite3')}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "childsafe_secret_key_123"

# Initialize
db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins="*")


# ─── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.route("/classify/health", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "ChildSafe backend is running"})


# ─── AUTH ROUTES (used by popup.js) ───────────────────────────────────────────
@app.route("/auth/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    parent = Parent.query.filter_by(email=email).first()
    if not parent or parent.password != password:
        return jsonify({"message": "Invalid email or password."}), 401

    return jsonify({
        "token": f"token_{parent.id}",   # simple token — no JWT dependency needed
        "parent_id": parent.id,
        "email": parent.email
    }), 200


@app.route("/auth/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    if Parent.query.filter_by(email=email).first():
        return jsonify({"message": "An account with this email already exists."}), 409

    parent = Parent(email=email, password=password)
    db.session.add(parent)
    db.session.commit()
    return jsonify({"message": "Account created successfully.", "parent_id": parent.id}), 201


# ─── CONTENT CLASSIFICATION ────────────────────────────────────────────────────
def _classify_content(data):
    """Shared classification logic used by multiple routes."""
    text = data.get("text") or data.get("content")
    image_data = data.get("image") or data.get("image_data")
    url = data.get("url", "Unknown URL")
    parent_id = data.get("parent_id")
    category_hint = data.get("category", "")  # 'text' or 'image' from background.js

    is_blocked = False
    block_reason = ""
    category = "Safe"

    # 1. NLP Text Analysis
    if text and (not category_hint or category_hint == "text"):
        prediction, confidence = classify_text(text)
        if prediction == "Negative":
            is_blocked = True
            block_reason = "Toxic Text Detected"
            category = "Toxic Content"

    # 2. Image Analysis
    if not is_blocked and (image_data or category_hint == "image"):
        target = image_data or text or ""
        img_prediction, img_conf = predict_image(target)
        if img_prediction == "Blocked":
            is_blocked = True
            block_reason = "Unsafe Image Detected"
            category = "Explicit Image"

    final_status = "Blocked" if is_blocked else "Safe"

    # 3. Log to DB and notify dashboard
    if parent_id and str(parent_id) not in ("null", "None", ""):
        try:
            log = ActivityLog(
                parent_id=int(parent_id),
                url=url,
                content_type=category,
                result=final_status
            )
            db.session.add(log)
            db.session.commit()

            if is_blocked:
                socketio.emit("new_alert", {
                    "url": url,
                    "category": category,
                    "reason": block_reason,
                    "time": datetime.now().strftime("%H:%M:%S")
                })
        except Exception as e:
            print(f"[DB/Socket error] {e}")

    return {
        "status": final_status,
        "harmful_score": 1.0 if is_blocked else 0.0,
        "reason": block_reason,
        "url": url
    }


@app.route("/classify", methods=["POST"])
@app.route("/classify/text", methods=["POST"])
@app.route("/classify/image", methods=["POST"])
@app.route("/check-content", methods=["POST"])
def check_content():
    """Unified endpoint — handles all classification routes."""
    return jsonify(_classify_content(request.json or {}))


# ─── LOGS ENDPOINT (dashboard) ────────────────────────────────────────────────
@app.route("/logs/<int:parent_id>", methods=["GET"])
def get_logs(parent_id):
    logs = ActivityLog.query.filter_by(parent_id=parent_id)\
               .order_by(ActivityLog.timestamp.desc()).limit(50).all()
    return jsonify([{
        "url": log.url,
        "category": log.content_type,
        "result": log.result,
        "time": log.timestamp.strftime("%H:%M:%S")
    } for log in logs])


# ─── STARTUP ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    with app.app_context():
        db_path = os.path.join(BASE_DIR, "database")
        if not os.path.exists(db_path):
            os.makedirs(db_path)
        db.create_all()

        # Seed a default parent account for testing
        if not Parent.query.filter_by(email="parent@example.com").first():
            seed = Parent(email="parent@example.com", password="password123")
            db.session.add(seed)
            db.session.commit()
            print("✅ Default parent created: parent@example.com / password123")
        else:
            print("✅ Default parent account already exists.")

        print(" ChildSafe Backend & Database Ready.")

    socketio.run(app, debug=True, port=5000)