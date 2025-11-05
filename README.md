# Comment Sentiment Analyzer

Small Flask app to analyze comment sentiments (single and batch). Features:
- Live sentiment analysis (TextBlob)
- File upload for batch comments (TXT)
- Pie chart visualization (Chart.js)
- Dark mode
- Emoji reaction and summary with percentages

## Run locally
1. Create venv: `python -m venv venv` and activate it.
2. Install: `pip install -r requirements.txt`.
3. Run: `python app.py` (or `gunicorn app:app` for production).
4. Open http://127.0.0.1:5000

## Deploy
You can deploy to Render / Heroku by pushing this repo. Ensure environment uses the Procfile and `requirements.txt`.
