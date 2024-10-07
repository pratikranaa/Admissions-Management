import os
from flask_cors import CORS
import json
import shutil
from werkzeug.utils import secure_filename
from modules.ocr_module import process_candidate_pdfs
import csv
from io import StringIO

app = Flask(__name__, static_folder='static')
CORS(app)

UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
OCR_RESULTS_FOLDER = os.path.join(RESULTS_FOLDER, 'ocr_results')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OCR_RESULTS_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

def process_files(transcript_folder, forms_folder):
    verification_results = []

    def generate():
        for update in process_candidate_pdfs(transcript_folder, forms_folder, OCR_RESULTS_FOLDER):
            if ': Verification result -' in update:
                parts = update.split(': ')
                student = parts[0]
                #result = parts[-1]
                result = parts[-1].replace('Verification result - ', '').strip()  # Clean up the result string
                verification_results.append({'student': student, 'result': result})
                response = json.dumps({
                    'status': 'Result',
                    'student': student,
                    'result': result
                }) + '\n'
                print(f"Debug: Sending result response: {response}")
                yield response
            else:
                response = json.dumps({
                    'status': 'Processing',
                    'message': update
                }) + '\n'
                print(f"Debug: Sending processing response: {response}")
                yield response

        response = json.dumps({
            'status': 'Completed',
            'message': 'All files processed.'
        }) + '\n'
        print(f"Debug: Sending completed response: {response}")
        yield response

    return generate(), verification_results

@app.route('/verify', methods=['POST'])
def verify():
    transcript_folder = os.path.join(UPLOAD_FOLDER, 'transcripts')
    forms_folder = os.path.join(UPLOAD_FOLDER, 'forms')

    os.makedirs(transcript_folder, exist_ok=True)
    os.makedirs(forms_folder, exist_ok=True)

    transcripts = request.files.getlist('transcripts')
    forms = request.files.getlist('forms')

    for file in transcripts:
        filename = secure_filename(file.filename)
        file.save(os.path.join(transcript_folder, filename))
        print(f"Debug: Saved transcript file: {filename}")

    for file in forms:
        filename = secure_filename(file.filename)
        file.save(os.path.join(forms_folder, filename))
        print(f"Debug: Saved form file: {filename}")

    generator, verification_results = process_files(transcript_folder, forms_folder)

    def generate():
        yield from generator
        app.verification_results = verification_results  # Store results for CSV export
        print(f"Debug: Stored verification results: {verification_results}")
        

        # Cleanup: Remove files after processing
        for folder in [transcript_folder, forms_folder, OCR_RESULTS_FOLDER]:
            for file in os.listdir(folder):
                file_path = os.path.join(folder, file)
                try:
                    os.remove(file_path)
                    print(f"Debug: Removed file: {file_path}")
                except Exception as e:
                    print(f"Debug: Error removing file {file_path}: {e}")

        # Cleanup: Remove PNG files in the root directory
        for file in os.listdir('.'):
            if file.endswith('.png'):
                try:
                    os.remove(file)
                    print(f"Debug: Removed PNG file: {file}")
                except Exception as e:
                    print(f"Debug: Error removing PNG file {file}: {e}")
    
    response = Response(generate(), mimetype='application/json')
    return response


@app.route('/export-csv', methods=['GET'])
def export_csv():
    if not hasattr(app, 'verification_results'):
        error_response = jsonify({'error': 'No verification results available'})
        print(f"Debug: No verification results available, sending error response: {error_response}")
        return error_response, 400

    csv_output = StringIO()
    csv_writer = csv.writer(csv_output)
    csv_writer.writerow(['Student', 'Result'])

    for item in app.verification_results:
        # Strip the "Verification result - " prefix from the result
        result = item['result'].replace('Verification result - ', '')
        csv_writer.writerow([item['student'], result])
        print(f"Debug: Writing CSV row: {item['student']}, {result}")

    output = csv_output.getvalue()
    csv_output.close()

    response = Response(
        output,
        mimetype='text/csv',
        headers={
            'Content-Disposition': 'attachment; filename=verification_results.csv',
            'Content-Type': 'text/csv'
        }
    )
    print(f"Debug: Sending CSV response")
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5500, debug=True)
