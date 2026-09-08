import pickle
import os

# Get the absolute path to the directory where this script is located
# This ensures it can find the models folder even when called from app.py
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "text_classifier.pkl")
VEC_PATH = os.path.join(BASE_DIR, "models", "tfidf_vectorizer.pkl")

# Load the model and vectorizer once when the utility is imported
try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    with open(VEC_PATH, "rb") as f:
        vectorizer = pickle.load(f)
    print("Text classification models loaded successfully.")
except FileNotFoundError:
    print(f"Error: Model files not found at {MODEL_PATH}. Did you run traintext.py?")
    model = None
    vectorizer = None

def classify_text(text):
    """
    Predicts if text is Negative (Safe) or Positive (Violent/Toxic)
    based on the sentiment value in the training dataset.
    """
    if model is None or vectorizer is None:
        return "Error", 0.0
    
    # Preprocess text (Optional: you can add cleaning here)
    vec = vectorizer.transform([text])
    
    # Get prediction and confidence level
    prediction = model.predict(vec)[0]
    probabilities = model.predict_proba(vec)
    confidence = probabilities.max()
    
    return prediction, float(confidence)