# Integration Guide - Mason's RAG Features

This guide explains how Mason's excellent work from `risk-document-completion` has been integrated into the Excel AI Processor.

## What We Integrated

### 1. **RAG (Retrieval-Augmented Generation)** ✨
Mason's implementation uses AstraDB vector database with IBM Granite embeddings for context-aware answer generation.

**Benefits:**
- More accurate answers based on historical Q&A pairs
- Semantic search for relevant examples
- Learns from existing documents

**Location:** `api/python-service/document_processor.py`

### 2. **Smart Column Detection** 🎯
LLM-powered detection of Q&A columns - no hardcoding required!

**Benefits:**
- Works with any Excel format
- Automatically identifies question and answer columns
- Handles various naming conventions

**Location:** `document_processor.py` - `detect_qa_columns_in_sheet()`

### 3. **Advanced Excel Processing** 📊
Handles complex Excel features like merged cells, formatting, and dynamic row heights.

**Benefits:**
- Professional document formatting
- Preserves Excel structure
- Handles edge cases

**Location:** `document_processor.py` - `process_document()`

### 4. **Professional Prompting** 💼
Mason's refined system prompts for form completion.

**Benefits:**
- Answers formatted for official documents
- Appropriate tone and detail level
- No meta-commentary

**Location:** `document_processor.py` - `ask_llm()`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Carbon)                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Upload     │  │   Process    │  │   Validate   │     │
│  │   Page       │  │   Page       │  │   Page       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Express API (Port 3000)                 │
│                                                              │
│  • File upload handling                                      │
│  • Instana monitoring                                        │
│  • OAuth2 authentication                                     │
│  • Routes requests to Python service                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           Python Flask Service (Port 5000)                   │
│                                                              │
│  • Mason's document_processor.py                             │
│  • RAG with AstraDB                                          │
│  • Smart column detection                                    │
│  • Advanced Excel processing                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  WatsonX.ai  │  │   AstraDB    │  │   Instana    │     │
│  │     LLM      │  │  Vector DB   │  │  Monitoring  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd excel-ai-processor/api/python-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# WatsonX.ai (Required)
WATSON_URL=https://us-south.ml.cloud.ibm.com
IBM_WATSONX_API_KEY=your_api_key
IBM_WATSONX_PROJECT_ID=your_project_id
WATSON_TEXT_MODEL=meta-llama/llama-3-3-70b-instruct

# AstraDB for RAG (Optional but Recommended)
ASTRA_DB_API_ENDPOINT=https://your-db-id.apps.astra.datastax.com
ASTRA_DB_APPLICATION_TOKEN=your_token

# Python Service
PYTHON_SERVICE_PORT=5000
```

### 3. Start the Services

**Terminal 1 - Python Service:**
```bash
cd excel-ai-processor/api/python-service
source venv/bin/activate
python flask_api.py
```

**Terminal 2 - Node.js API:**
```bash
cd excel-ai-processor
npm run server
```

**Terminal 3 - Frontend:**
```bash
cd excel-ai-processor
npm run dev
```

## API Endpoints

### Python Service (Port 5000)

#### Health Check
```bash
GET http://localhost:5000/health
```

#### Process Document
```bash
POST http://localhost:5000/process
Content-Type: multipart/form-data

file: <Excel file>
context: <Optional context string>
```

#### Detect Columns
```bash
POST http://localhost:5000/detect-columns
Content-Type: multipart/form-data

file: <Excel file>
sheet_name: <Optional sheet name>
```

### Node.js Service (Port 3000)

The Node.js service proxies requests to the Python service and adds:
- Instana monitoring
- OAuth2 authentication
- File management
- User journey tracking

## RAG Configuration

### Setting Up AstraDB

1. **Create AstraDB Account**
   - Go to https://astra.datastax.com
   - Create a new database
   - Create a collection named `qa_collection`

2. **Get Credentials**
   - API Endpoint: From database dashboard
   - Application Token: Generate from settings

3. **Populate Knowledge Base**
   ```python
   # Example: Add Q&A pairs to AstraDB
   from astrapy import DataAPIClient
   from sentence_transformers import SentenceTransformer
   
   client = DataAPIClient(token)
   db = client.get_database(endpoint)
   collection = db.get_collection("qa_collection")
   
   embedding_model = SentenceTransformer('ibm-granite/granite-embedding-30m-english')
   
   # Add a Q&A pair
   question = "What is IBM's data retention policy?"
   answer = "IBM retains data for 7 years as per compliance requirements."
   embedding = embedding_model.encode(question).tolist()
   
   collection.insert_one({
       "question": question,
       "answer": answer,
       "category": "compliance",
       "$vector": embedding
   })
   ```

## Features Comparison

| Feature | Original (Node.js only) | With Mason's Integration |
|---------|------------------------|--------------------------|
| Column Detection | Hardcoded | LLM-powered, automatic |
| Answer Quality | Basic | RAG-enhanced, contextual |
| Excel Handling | Simple | Advanced (merged cells, etc.) |
| Prompting | Generic | Professional, form-focused |
| Knowledge Base | None | AstraDB vector search |
| Embeddings | None | IBM Granite model |

## Testing

### Test Without RAG
```bash
# Set environment without AstraDB credentials
unset ASTRA_DB_API_ENDPOINT
unset ASTRA_DB_APPLICATION_TOKEN

# Process will work but without RAG context
python flask_api.py
```

### Test With RAG
```bash
# Set AstraDB credentials
export ASTRA_DB_API_ENDPOINT="your_endpoint"
export ASTRA_DB_APPLICATION_TOKEN="your_token"

# Process will use RAG for better answers
python flask_api.py
```

## Troubleshooting

### Python Service Won't Start
```bash
# Check Python version (need 3.8+)
python --version

# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### RAG Not Working
```bash
# Verify AstraDB connection
python -c "from astrapy import DataAPIClient; print('AstraDB OK')"

# Check embeddings model
python -c "from sentence_transformers import SentenceTransformer; print('Embeddings OK')"
```

### Column Detection Fails
- Ensure Excel file has clear question/answer structure
- Check that first few rows contain sample data
- Verify WatsonX.ai credentials are correct

## Performance Tips

1. **Model Caching**: The LLM model is cached after first use
2. **RAG Threshold**: Adjust `similarity_threshold` in `get_relevant_context()`
3. **Batch Processing**: Process multiple sheets in one request
4. **Embedding Cache**: Consider caching embeddings for common questions

## Next Steps

1. **Populate Knowledge Base**: Add your organization's Q&A pairs to AstraDB
2. **Tune RAG Parameters**: Adjust `top_k` and `similarity_threshold`
3. **Custom Prompts**: Modify system prompts for your use case
4. **Monitor Performance**: Use Instana to track processing times

## Credits

This integration incorporates excellent work from:
- **Mason Ostman** - Original RAG implementation and document processing
- **Repository**: https://github.com/mason-ostman-ibm/risk-document-completion

## Support

For issues related to:
- **RAG/Python Service**: Check Mason's original repo
- **Frontend/Node.js**: Check this project's issues
- **Integration**: See this guide or open an issue