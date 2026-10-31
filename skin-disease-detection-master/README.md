# Skin Disease Detection

This Flask demo loads the supplied MobileNet/Keras model to classify an uploaded skin lesion into one of its seven training labels. It is an experimental model and is not a diagnosis or a substitute for a qualified clinician.

## Run on Windows

Use 64-bit Python 3.12. From this folder, create an isolated environment and install the dependencies:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python app.py
```

Then open <http://127.0.0.1:5000>.

The existing model was serialized with Keras 2; the app uses `tf-keras` compatibility mode to load it with TensorFlow 2.16.
