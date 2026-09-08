# ChildSafe: Browsing Extension & Monitoring System

A real-time AI-powered web content filter and parental monitoring system. It uses machine learning models to detect unsafe text and images directly in the browser, blurring harmful content and alerting parents via a dashboard.

---

## Key Features

* **Real-time DOM Scanning:** Automatically monitors web page content using Chrome Extension Manifest V3 and the `MutationObserver` API.
* **Text Toxicity Detection:** Uses TF-IDF vectorization and Logistic Regression to detect toxic or inappropriate text with sub-100ms latency.
* **NSFW & Visual Safety Filter:** A 3-block Convolutional Neural Network (CNN) built in TensorFlow to identify adult or violent visual content.
* **Client-Side Blurring:** Dynamically applies CSS blur filters over detected unsafe elements to protect young users instantly.
* **Parental Dashboard:** Built with React and Flask; utilizes **Socket.io WebSockets** to stream security alerts to parents in real time.

---

## Tech Stack

* **Frontend / Extension:** JavaScript (ES6+), React, Vite, Chrome Extension API (Manifest V3)
* **Backend:** Python, Flask, Flask-SocketIO, SQLAlchemy
* **Machine Learning:** TensorFlow, Keras, Scikit-Learn (TF-IDF + Logistic Regression, CNN)
* **Database:** SQLite / PostgreSQL

---

## Project Structure

```text
├── backend/       # Flask REST API, SocketIO handlers & ML model inference
├── dashboard/     # React parental monitoring interface
├── extension/     # Chrome Extension (Manifest V3 content scripts & background workers)
├── .gitignore
└── README.md
