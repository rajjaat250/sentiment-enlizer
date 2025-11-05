import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from textblob import TextBlob
from werkzeug.utils import secure_filename
# We no longer need to import nltk here or download 'punkt'
# The build.sh script now handles the NLTK download.

UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXTENSIONS = {'txt'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json() or {}
    comment = data.get('comment', '')
    # Basic safety: cap length
    if len(comment) > 10000:
        comment = comment[:10000]

    blob = TextBlob(comment)
    polarity = round(blob.sentiment.polarity, 4)

    if polarity > 0.05:
        sentiment = 'Positive'
    elif polarity < -0.05:
        sentiment = 'Negative'
    else:
        sentiment = 'Neutral'

    response = {
        'sentiment': sentiment,
        'polarity': polarity,
        'emoji': polarity_to_emoji(polarity)
    }
    return jsonify(response)

@app.route('/upload', methods=['POST'])
def upload():
    # Accepts a .txt file with one comment per line
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(save_path)

        results = analyze_file(save_path)
        return jsonify(results)
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def polarity_to_emoji(p):
    if p > 0.3:
        return '😍'
    if p > 0.05:
        return '😊'
    if p < -0.3:
        return '😡'
    if p < -0.05:
        return '😕'
    return '😐'

def analyze_file(path):
    positive = negative = neutral = 0
    items = []
    try:
        with open(path, encoding='utf-8') as f:
            for line in f:
                text = line.strip()
                if not text:
                    continue
                blob = TextBlob(text)
                p = round(blob.sentiment.polarity, 4)
                if p > 0.05:
                    label = 'Positive'
                    positive += 1
                elif p < -0.05:
                    label = 'Negative'
                    negative += 1
                else:
                    label = 'Neutral'
                    neutral += 1
                items.append({'text': text, 'polarity': p, 'label': label, 'emoji': polarity_to_emoji(p)})
    except Exception as e:
        # Handle file read errors, e.g., wrong encoding
        return {'error': f'Error processing file: {e}'}


    total = positive + negative + neutral
    if total == 0:
        # Avoid ZeroDivisionError if the file was empty
        summary = {
            'total': 0, 'positive': 0, 'negative': 0, 'neutral': 0,
            'positive_pct': 0, 'negative_pct': 0, 'neutral_pct': 0,
            'items': []
        }
        return summary
    
    summary = {
        'total': total,
        'positive': positive,
        'negative': negative,
        'neutral': neutral,
        'positive_pct': round(100 * positive / total, 2),
        'negative_pct': round(100 * negative / total, 2),
        'neutral_pct': round(100 * neutral / total, 2),
        'items': items
    }
    return summary

if __name__ == '__main__':
    app.run(debug=True)
