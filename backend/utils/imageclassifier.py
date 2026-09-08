import os
import base64
import io
import requests

# Wrap TensorFlow import to avoid crashing if unavailable
try:
    import tensorflow as tf
    import numpy as np
    from PIL import Image
    HAS_TENSORFLOW = True
    print("TensorFlow loaded successfully.")
except ImportError:
    HAS_TENSORFLOW = False
    print("Warning: TensorFlow could not be loaded. Using Rule-Based Mode for Image Classification.")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "image_cnn_model.h5")

# Load CNN model once
cnn_model = None
if HAS_TENSORFLOW and os.path.exists(MODEL_PATH):
    try:
        cnn_model = tf.keras.models.load_model(MODEL_PATH)
        print("Image CNN model loaded successfully.")
    except Exception as e:
        print(f"Warning: Could not load CNN model: {e}")


def rule_based_detection(data):
    """Rule-based image detection using URL keywords."""
    unsafe_keywords = [
        "adult", "porn", "violence", "blood",
        "weapon", "nude", "drugs", "gambling", "xxx", "nsfw"
    ]
    text = str(data).lower()
    for keyword in unsafe_keywords:
        if keyword in text:
            return "Blocked", 0.90
    return "Safe", 0.85


def predict_image(image_data):
    """
    Accepts either:
      - A base64 data URI (data:image/jpeg;base64,...)
      - A plain base64 string
      - A URL string (starts with http)
    Returns: (label, confidence) where label is 'Safe' or 'Blocked'
    """
    if not image_data or not isinstance(image_data, str):
        return "Safe", 0.5

    # If CNN is available, try to classify the image
    if HAS_TENSORFLOW and cnn_model is not None:
        try:
            image_bytes = None
            
            # --- Case 1: URL ---
            if image_data.startswith("http"):
                print(f"[ImageClassifier] Fetching image URL: {image_data[:50]}...")
                response = requests.get(image_data, timeout=5)
                if response.status_code == 200:
                    image_bytes = response.content
            
            # --- Case 2: Base64 ---
            else:
                # Strip data URI prefix if present
                raw = image_data
                if "," in raw:
                    raw = raw.split(",", 1)[1]
                image_bytes = base64.b64decode(raw)

            if image_bytes:
                img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                img = img.resize((224, 224))

                img_array = np.array(img, dtype=np.float32) / 255.0
                img_array = np.expand_dims(img_array, axis=0)

                preds = cnn_model.predict(img_array, verbose=0)
                score = float(preds[0][0]) if preds.shape[-1] == 1 else float(preds[0].max())

                label = "Blocked" if score > 0.5 else "Safe"
                return label, score

        except Exception as e:
            print(f"[ImageClassifier] CNN prediction error: {e}")
            # Fall through to rule-based

    # Fallback: rule-based on the URL / string content
    return rule_based_detection(image_data)