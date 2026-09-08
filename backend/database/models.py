from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize the db object here; it will be bound to the app in app.py
db = SQLAlchemy()

class Parent(db.Model):
    __tablename__ = 'parents'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    # Relationship to logs (Optional: allows parent.logs to see all child activities)
    logs = db.relationship('ActivityLog', backref='parent', lazy=True)

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('parents.id'), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    content_type = db.Column(db.String(50)) # e.g., 'Text' or 'Image'
    result = db.Column(db.String(50), nullable=False) # e.g., 'Safe' or 'Blocked'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class BlockedKeyword(db.Model):
    """Optional: Allows parents to add custom blocked words via the dashboard"""
    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('parents.id'), nullable=False)
    keyword = db.Column(db.String(100), nullable=False)