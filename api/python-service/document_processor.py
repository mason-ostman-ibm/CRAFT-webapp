#!/usr/bin/env python3
"""
Document Processor Service - Integrated from Mason's risk-document-completion
Provides RAG-powered Excel document completion with smart column detection
"""

import pandas as pd
import openpyxl
from openpyxl.styles import Alignment
import openpyxl.utils
import os
import re
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from dotenv import load_dotenv
from astrapy import DataAPIClient
from sentence_transformers import SentenceTransformer
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AstraDB for RAG
ASTRA_DB_API_ENDPOINT = os.getenv("ASTRA_DB_API_ENDPOINT")
ASTRA_DB_APPLICATION_TOKEN = os.getenv("ASTRA_DB_APPLICATION_TOKEN")

# Initialize clients
astra_client = None
collection = None
embedding_model = None

if ASTRA_DB_API_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN:
    try:
        astra_client = DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
        astra_database = astra_client.get_database(ASTRA_DB_API_ENDPOINT)
        collection = astra_database.get_collection("qa_collection")
        embedding_model = SentenceTransformer('ibm-granite/granite-embedding-30m-english')
        logger.info("✓ RAG system initialized with AstraDB")
    except Exception as e:
        logger.warning(f"RAG system not available: {e}")
else:
    logger.warning("RAG system disabled - AstraDB credentials not configured")


def initialize_model():
    """Initialize the WatsonX LLM model"""
    credentials = Credentials(
        url=os.getenv("WATSON_URL", "https://us-south.ml.cloud.ibm.com"),
        api_key=os.getenv("IBM_WATSONX_API_KEY")
    )

    project_id = os.getenv("IBM_WATSONX_PROJECT_ID")
    model_id = os.getenv("WATSON_TEXT_MODEL", "meta-llama/llama-3-3-70b-instruct")

    parameters = {
        "temperature": 0.7,
        "max_tokens": 2000,
        "top_p": 1
    }

    model = ModelInference(
        model_id=model_id,
        params=parameters,
        credentials=credentials,
        project_id=project_id
    )

    logger.info(f"✓ Model initialized: {model_id}")
    return model


def detect_qa_columns_in_sheet(df, model):
    """
    Use LLM to intelligently detect which columns contain questions and answers
    
    Args:
        df: pandas DataFrame of the sheet
        model: Initialized LLM model
    
    Returns:
        tuple: (question_column_name, answer_column_name) or (None, None)
    """
    sample_data = df.head(5).to_string()

    prompt = f"""Given this spreadsheet data, identify which column contains questions and which contains answers.

{sample_data}

Respond in this exact format:
Question column: [column name]
Answer column: [column name]"""

    messages = [
        {
            "role": "user",
            "content": prompt
        }
    ]

    try:
        response = model.chat(messages=messages)
        answer = response["choices"][0]["message"]["content"]

        # Parse the response
        question_match = re.search(r'Question column:\s*(.+)', answer)
        answer_match = re.search(r'Answer column:\s*(.+)', answer)

        if question_match and answer_match:
            question_col = question_match.group(1).strip()
            answer_col = answer_match.group(1).strip()
            logger.info(f"✓ Detected columns - Q: {question_col}, A: {answer_col}")
            return question_col, answer_col

        return None, None
    except Exception as e:
        logger.error(f"Error detecting columns: {e}")
        return None, None


def get_relevant_context(question, top_k=5, similarity_threshold=0.5):
    """
    Search for relevant Q&A pairs using RAG with AstraDB
    
    Args:
        question: The user's question
        top_k: Number of top matches to return
        similarity_threshold: Minimum similarity score
    
    Returns:
        String formatted context for LLM prompt
    """
    if not collection or not embedding_model:
        return "No RAG context available. Use general knowledge."

    try:
        query_embedding = embedding_model.encode(question).tolist()

        results = collection.find(
            sort={"$vector": query_embedding},
            limit=top_k,
            projection={"question": 1, "answer": 1, "category": 1},
            include_similarity=True
        )

        context = ""
        relevant_count = 0

        for result in results:
            similarity = result.get('$similarity', 0)

            if similarity < similarity_threshold:
                continue

            q = result.get('question', 'N/A')
            a = result.get('answer', 'N/A')

            answer_lower = str(a).lower().strip()
            if answer_lower in ['unanswered', 'nan', 'none', '', 'n/a']:
                continue

            relevant_count += 1
            context += f"Example {relevant_count}:\n"
            context += f"Q: {q}\n"
            context += f"A: {a}\n\n"

        if not context:
            context = "No relevant examples found. Use your general knowledge about IBM and business practices."

        logger.info(f"✓ Retrieved {relevant_count} relevant examples for RAG")
        return context.strip()

    except Exception as e:
        logger.error(f"Error retrieving RAG context: {e}")
        return "RAG retrieval error. Use general knowledge."


def ask_llm(question, model, context=""):
    """
    Ask the LLM a question with optional RAG context
    
    Args:
        question: The question to answer
        model: Initialized LLM model
        context: Additional context (optional)
    
    Returns:
        Generated answer
    """
    try:
        # Get RAG context if available
        rag_context = get_relevant_context(question, top_k=5, similarity_threshold=0.5)
        
        # Combine with any additional context
        full_context = f"{rag_context}\n\n{context}" if context else rag_context

        messages = [
            {
                "role": "system",
                "content": """You are a professional document completion assistant for IBM. Your role is to fill out governance, compliance, and business documents with accurate, concise information.

INSTRUCTIONS:
1. You are filling out forms and documents on behalf of IBM
2. Answer questions directly and professionally, as if completing an official form
3. Use the provided context examples as reference for style, format, and content
4. Match the tone and detail level of the context examples
5. Be concise - forms require brief, direct answers, not explanations
6. If context is provided, adapt it to answer the specific question
7. Do NOT mention that you're using context or reference materials
8. Do NOT include meta-commentary like "based on the context"
9. NEVER respond with just "unanswered" or leave the answer blank
10. If you don't have relevant information, write "Information not available"

FORMATTING:
- For yes/no questions: Answer "Yes" or "No" followed by brief details if needed
- For descriptive questions: Provide 1-3 sentences maximum unless more detail is clearly needed
- For lists: Use bullet points or numbered lists as appropriate
- Maintain professional business language throughout

Remember: You ARE the person filling out this document. Write answers directly as they should appear in the form."""
            },
            {
                "role": "user",
                "content": f"""Using the following reference examples, answer the question below.

REFERENCE EXAMPLES:
{full_context}

QUESTION TO ANSWER:
{question}

Provide your answer:"""
            }
        ]

        response = model.chat(messages=messages)
        answer = response["choices"][0]["message"]["content"]

        if not answer or answer.strip() == "":
            return "Error: Empty response from model"

        return answer

    except Exception as e:
        logger.error(f"Error asking LLM: {e}")
        return f"Error: {str(e)}"


def process_document(file_path, output_path=None, context=""):
    """
    Main function to process Excel document with RAG-powered answers
    
    Args:
        file_path: Path to input Excel file
        output_path: Path to output Excel file (optional)
        context: Additional context for AI processing (optional)
    
    Returns:
        dict: Processing results with statistics
    """
    logger.info(f"{'='*60}")
    logger.info("EXCEL AI PROCESSOR - Document Processing")
    logger.info(f"{'='*60}")

    # Initialize model
    logger.info("Initializing WatsonX model...")
    model = initialize_model()

    # Load workbook
    logger.info(f"Loading workbook: {file_path}")
    wb = openpyxl.load_workbook(file_path, data_only=False, keep_vba=False)
    logger.info(f"Found {len(wb.sheetnames)} sheets")

    total_questions_answered = 0
    sheets_processed = 0
    processing_details = []

    # Process each sheet
    for sheet_name in wb.sheetnames:
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing sheet: {sheet_name}")
        logger.info(f"{'='*60}")

        ws = wb[sheet_name]
        df = pd.read_excel(file_path, sheet_name=sheet_name)

        if df.empty:
            logger.info(f"  ⊘ Skipping empty sheet")
            continue

        # Detect Q&A columns using LLM
        logger.info(f"  Detecting Q&A columns...")
        question_col_name, answer_col_name = detect_qa_columns_in_sheet(df, model)

        if not question_col_name or not answer_col_name:
            logger.info(f"  ⊘ Could not detect Q&A columns, skipping sheet")
            continue

        logger.info(f"  ✓ Question column: {question_col_name}")
        logger.info(f"  ✓ Answer column: {answer_col_name}")

        # Get column indices
        try:
            question_col_idx = df.columns.get_loc(question_col_name) + 1
            answer_col_idx = df.columns.get_loc(answer_col_name) + 1
        except KeyError:
            logger.info(f"  ⊘ Column names not found, skipping sheet")
            continue

        # Set column widths
        ws.column_dimensions[openpyxl.utils.get_column_letter(question_col_idx)].width = 60
        ws.column_dimensions[openpyxl.utils.get_column_letter(answer_col_idx)].width = 80

        # Process rows
        questions_in_sheet = 0
        for idx, row in df.iterrows():
            excel_row = idx + 2

            question = row.get(question_col_name)
            answer = row.get(answer_col_name)

            if pd.isna(question) or str(question).strip() == "":
                continue

            question_str = str(question).strip()
            answer_str = str(answer).strip() if pd.notna(answer) else ""

            # Check if answer is missing
            if not answer_str or answer_str.lower() in ['nan', 'unanswered', '']:
                logger.info(f"  Answering row {excel_row}: {question_str[:60]}...")

                # Get answer from LLM with RAG
                generated_answer = ask_llm(question_str, model, context)

                # Handle merged cells
                answer_cell = ws.cell(row=excel_row, column=answer_col_idx)
                if isinstance(answer_cell, openpyxl.cell.cell.MergedCell):
                    for merged_range in list(ws.merged_cells.ranges):
                        if answer_cell.coordinate in merged_range:
                            ws.unmerge_cells(str(merged_range))
                            break
                    answer_cell = ws.cell(row=excel_row, column=answer_col_idx)

                # Fill in the answer
                answer_cell.value = generated_answer
                answer_cell.alignment = Alignment(wrap_text=True, vertical='top')

                # Format question cell
                question_cell = ws.cell(row=excel_row, column=question_col_idx)
                if isinstance(question_cell, openpyxl.cell.cell.MergedCell):
                    for merged_range in list(ws.merged_cells.ranges):
                        if question_cell.coordinate in merged_range:
                            ws.unmerge_cells(str(merged_range))
                            break
                    question_cell = ws.cell(row=excel_row, column=question_col_idx)

                question_cell.alignment = Alignment(wrap_text=True, vertical='top')

                # Adjust row height
                estimated_lines = max(len(generated_answer) // 80, 1)
                min_height = max(15 * estimated_lines, 15)
                ws.row_dimensions[excel_row].height = min(min_height, 150)

                questions_in_sheet += 1
                total_questions_answered += 1

        sheets_processed += 1
        processing_details.append({
            "sheet": sheet_name,
            "questions_answered": questions_in_sheet
        })
        logger.info(f"  ✓ Answered {questions_in_sheet} questions in this sheet")

    # Save workbook
    if output_path is None:
        from pathlib import Path
        input_path = Path(file_path)
        output_path = str(input_path.parent / f"{input_path.stem}_completed{input_path.suffix}")

    logger.info(f"\n{'='*60}")
    logger.info("PROCESSING SUMMARY")
    logger.info(f"{'='*60}")
    logger.info(f"Sheets processed: {sheets_processed}/{len(wb.sheetnames)}")
    logger.info(f"Total questions answered: {total_questions_answered}")
    logger.info(f"Output file: {output_path}")
    logger.info(f"{'='*60}\n")

    wb.save(output_path)

    return {
        "success": True,
        "output_path": output_path,
        "sheets_processed": sheets_processed,
        "total_sheets": len(wb.sheetnames),
        "questions_answered": total_questions_answered,
        "details": processing_details
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python document_processor.py <input_file.xlsx> [output_file.xlsx] [context]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    context = sys.argv[3] if len(sys.argv) > 3 else ""

    result = process_document(input_file, output_file, context)
    print(f"\n✓ Processing complete!")
    print(f"Questions answered: {result['questions_answered']}")
    print(f"File saved to: {result['output_path']}")

# Made with Bob
