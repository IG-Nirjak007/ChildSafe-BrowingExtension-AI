from flask import Blueprint, request, jsonify
from database.models import db, Parent
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
from functools import wraps

# ── Pull from environment; hard-fail on startup if missing in production ──────
SECRET_KEY = os.getenv("SECRET_KEY", "childsafe_secret_key_123")

auth = Blueprint("auth", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# JWT helper — reusable decorator to protect routes that need authentication
# Usage: add @token_required above any route, then accept current_parent param
# ─────────────────────────────────────────────────────────────────────────────
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Accept token from Authorization: Bearer <token> header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_parent = Parent.query.get(payload["parent_id"])
            if not current_parent:
                return jsonify({"message": "User no longer exists"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Session expired, please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token"}), 401

        return f(current_parent, *args, **kwargs)
    return decorated


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/register
# ─────────────────────────────────────────────────────────────────────────────
@auth.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)  # silent=True avoids 400 on bad JSON

    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"message": "Email and password required"}), 400

    # Basic length validation — prevents empty string registrations
    email    = data["email"].strip().lower()
    password = data["password"]

    if not email or not password:
        return jsonify({"message": "Email and password cannot be empty"}), 400

    if len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    # Check duplicate
    if Parent.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    hashed = generate_password_hash(password)
    new_parent = Parent(email=email, password=hashed)

    try:
        db.session.add(new_parent)
        db.session.commit()
        return jsonify({"message": "Parent registered successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Database error", "error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /auth/login
# ─────────────────────────────────────────────────────────────────────────────
@auth.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)

    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"message": "Missing credentials"}), 400

    email = data["email"].strip().lower()
    parent = Parent.query.filter_by(email=email).first()

    # FIX: always check hash even if parent not found (prevents timing attacks)
    # A timing attack lets an attacker figure out whether an email is registered
    # by measuring how long the response takes. Checking hash unconditionally
    # makes both cases take the same amount of time.
    dummy_hash = generate_password_hash("dummy_value_to_waste_time")
    password_to_check = parent.password if parent else dummy_hash

    if parent and check_password_hash(password_to_check, data["password"]):
        token = jwt.encode({
            "parent_id": parent.id,
            "email": parent.email,
            # FIX: use timezone-aware UTC (utcnow() is deprecated in Python 3.12+)
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24),
            "iat": datetime.datetime.now(datetime.timezone.utc),  # issued-at timestamp
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({
            "message": "Login successful",
            "token": token,
            "parent_id": parent.id,   # dashboard needs this to call /logs/<parent_id>
            "email": parent.email
        }), 200

    # FIX: same message whether email is wrong OR password is wrong
    # (don't leak which one failed)
    return jsonify({"message": "Invalid email or password"}), 401


# ─────────────────────────────────────────────────────────────────────────────
# GET /auth/me   (protected — requires Bearer token)
# Lets the React dashboard verify a stored token is still valid on page load
# ─────────────────────────────────────────────────────────────────────────────
@auth.route("/me", methods=["GET"])
@token_required
def me(current_parent):
    return jsonify({
        "parent_id": current_parent.id,
        "email": current_parent.email
    }), 200