import os

# This project serializes its model with Keras 2. Use the legacy Keras API
# bundled alongside TensorFlow 2.16 so the existing JSON and weights load.
os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")

from flask import Flask, render_template, request
import numpy as np
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import model_from_json
from tensorflow.keras import backend as K
from werkzeug.utils import secure_filename

app = Flask(__name__)

SKIN_CLASSES = {
  0: 'Actinic Keratoses (Solar Keratoses) or intraepithelial Carcinoma (Bowen’s disease)',
  1: 'Basal Cell Carcinoma',
  2: 'Benign Keratosis',
  3: 'Dermatofibroma',
  4: 'Melanoma',
  5: 'Melanocytic Nevi',
  6: 'Vascular skin lesion'

}

@app.route('/')
def index():
    return render_template('index.html', title='Home')

@app.route('/uploaded', methods = ['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        f = request.files.get('file')
        if f is None or not f.filename:
            return render_template('index.html', title='Home'), 400

        filename = secure_filename(f.filename)
        if not filename:
            return render_template('index.html', title='Home'), 400

        path = os.path.join(app.root_path, 'static', 'data', filename)
        f.save(path)
        with open(os.path.join(app.root_path, 'modelnew.json'), 'r', encoding='utf-8') as j_file:
            loaded_json_model = j_file.read()
        model = model_from_json(loaded_json_model)
        model.load_weights(os.path.join(app.root_path, 'modelnew.h5'))
        img1 = image.load_img(path, target_size=(224,224))
        img1 = np.array(img1)
        img1 = img1.reshape((1,224,224,3))
        img1 = img1/255
        prediction = model.predict(img1)
        pred = np.argmax(prediction)
        disease = SKIN_CLASSES[pred]
        accuracy = prediction[0][pred]
        K.clear_session()
        return render_template('uploaded.html', title='Success', predictions=disease, acc=accuracy*100, img_file=filename)
    return render_template('index.html', title='Home')

if __name__ == "__main__":
    app.run(debug=False)
