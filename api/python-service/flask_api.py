#!/usr/bin/env python3
"""
Flask API Service - Bridge between Node.js Express and Python document processor
Provides REST API endpoints for the Python-based document processing
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import logging
from pathlib import Path
from document_processor import process_document, initialize_model, detect_qa_columns_in_sheet
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)

# Cache model to avoid re-initialization
_model_cache = None


def get_model():
    """Get or initialize the model (cached)"""
    global _model_cache
    if _model_cache is None:
        logger.info("Initializing model...")
        _model_cache = initialize_model()
        logger.info("Model initialized")
    return _model_cache


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "Python Document Processor",
        "rag_enabled": os.getenv("ASTRA_DB_API_ENDPOINT") is not None
    })


@app.route('/process', methods=['POST'])
def process_excel():
    """
    Process Excel file with RAG-powered AI completion
    
    Expects multipart/form-data with:
    - file: Excel file
    - context: Optional context string
    
    Returns JSON with processing results
    """
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        context = request.form.get('context', '')
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not file.filename.endswith('.xlsx'):
            return jsonify({"error": "File must be .xlsx format"}), 400
        
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_input:
            file.save(temp_input.name)
            input_path = temp_input.name
        
        logger.info(f"Processing file: {file.filename}")
        
        # Process the document
        result = process_document(input_path, context=context)
        
        # Read the output file
        with open(result['output_path'], 'rb') as f:
            output_data = f.read()
        
        # Clean up temp files
        os.unlink(input_path)
        output_path = result['output_path']
        
        # Save output to temp location for download
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_output:
            temp_output.write(output_data)
            download_path = temp_output.name
        
        # Clean up the original output
        if os.path.exists(output_path):
            os.unlink(output_path)
        
        return jsonify({
            "success": True,
            "download_path": download_path,
            "filename": f"{Path(file.filename).stem}_completed.xlsx",
            "sheets_processed": result['sheets_processed'],
            "total_sheets": result['total_sheets'],
            "questions_answered": result['questions_answered'],
            "details": result['details']
        })
    
    except Exception as e:
        logger.error(f"Error processing file: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route('/download/<path:filepath>', methods=['GET'])
def download_file(filepath):
    """Download processed file"""
    try:
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        filename = request.args.get('filename', 'completed.xlsx')
        
        response = send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
        # Clean up file after sending
        @response.call_on_close
        def cleanup():
            try:
                if os.path.exists(filepath):
                    os.unlink(filepath)
                    logger.info(f"Cleaned up temp file: {filepath}")
            except Exception as e:
                logger.warning(f"Failed to clean up {filepath}: {e}")
        
        return response
    
    except Exception as e:
        logger.error(f"Error downloading file: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route('/detect-columns', methods=['POST'])
def detect_columns():
    """
    Detect Q&A columns in an Excel sheet
    
    Expects multipart/form-data with:
    - file: Excel file
    - sheet_name: Optional sheet name (defaults to first sheet)
    
    Returns JSON with detected column names
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        sheet_name = request.form.get('sheet_name', 0)
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name
        
        # Read the sheet
        df = pd.read_excel(temp_path, sheet_name=sheet_name)
        
        if df.empty:
            os.unlink(temp_path)
            return jsonify({"error": "Sheet is empty"}), 400
        
        # Detect columns
        model = get_model()
        question_col, answer_col = detect_qa_columns_in_sheet(df, model)
        
        # Clean up
        os.unlink(temp_path)
        
        if not question_col or not answer_col:
            return jsonify({"error": "Could not detect Q&A columns"}), 400
        
        return jsonify({
            "success": True,
            "question_column": question_col,
            "answer_column": answer_col
        })
    
    except Exception as e:
        logger.error(f"Error detecting columns: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PYTHON_SERVICE_PORT', 5000))
    logger.info(f"Starting Python Document Processor API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)

# Made with Bob
