# Quick Start Guide - Excel AI Processor

Get up and running with Excel AI Processor in 5 minutes!

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- IBM WatsonX.ai API credentials

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd excel-ai-processor

# Install dependencies
npm install
```

## Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# WatsonX.ai Configuration (Required)
WATSON_URL=https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29
IBM_WATSONX_API_KEY=your_api_key_here
IBM_WATSONX_PROJECT_ID=your_project_id_here

# Instana Configuration (Optional)
INSTANA_REPORTING_URL=https://ibmdevsandbox-instanaibm.instana.io
INSTANA_AGENT_KEY=your_instana_key_here
```

## Step 3: Start Development Server

```bash
# Start both frontend and backend
npm run dev:all
```

This will start:
- Frontend at http://localhost:5173
- Backend API at http://localhost:3000

## Step 4: Test the Application

1. Open http://localhost:5173 in your browser
2. Navigate to "Process Files"
3. Upload a sample Excel file
4. Click "Process with AI"
5. Review and download the results

## Sample Excel File Format

Create a test Excel file with this structure:

| Question | Answer |
|----------|--------|
| What are the key objectives for Q4? | |
| How will success be measured? | |
| What resources are required? | |

The AI will fill in the "Answer" column automatically.

## Common Commands

```bash
# Development
npm run dev          # Frontend only
npm run server       # Backend only
npm run dev:all      # Both frontend and backend

# Building
npm run build        # Build for production

# Testing
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report

# Linting
npm run lint         # Check code quality
```

## Project Structure Overview

```
excel-ai-processor/
├── api/              # Backend Express.js server
│   ├── server.js    # Main API server
│   └── instana.js   # Monitoring setup
├── src/              # Frontend React app
│   ├── pages/       # Page components
│   ├── components/  # Reusable components
│   └── App.tsx      # Main app component
└── k8s/              # Kubernetes deployment configs
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Upload File
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@your-file.xlsx"
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Change ports in package.json or .env
PORT=3001 npm run server
```

### WatsonX Connection Error

Verify your credentials:
```bash
# Test WatsonX API
curl -X POST "https://iam.cloud.ibm.com/identity/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=YOUR_API_KEY"
```

### Module Not Found

Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Customize the UI**: Edit files in `src/pages/` to match your needs
2. **Add Features**: Extend the API in `api/server.js`
3. **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
4. **Monitor**: Set up Instana for observability

## Getting Help

- Check [README.md](./README.md) for detailed documentation
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment guide
- Open an issue for bugs or feature requests

## Key Features to Try

### 1. File Upload
- Drag and drop Excel files
- Supports .xlsx and .xls formats
- Max file size: 10MB

### 2. AI Processing
- Add context for better results
- Processes multiple questions at once
- Uses IBM WatsonX.ai Llama 3.3 70B model

### 3. Validation
- Review generated answers
- Check completion statistics
- Identify missing or incomplete answers

### 4. Download
- Export processed Excel file
- Maintains original formatting
- Includes all AI-generated answers

## Development Tips

### Hot Reload
Both frontend and backend support hot reload. Changes are reflected immediately.

### Debugging
```bash
# Backend debugging
node --inspect api/server.js

# Frontend debugging
Use browser DevTools (F12)
```

### Environment Variables
- Frontend vars must start with `VITE_`
- Backend vars are accessed via `process.env`

## Production Build

```bash
# Build the application
npm run build

# Test production build locally
npm run preview
```

## Docker Development (Optional)

```bash
# Build Docker image
docker build -t excel-ai-processor .

# Run container
docker run -p 3000:3000 \
  -e IBM_WATSONX_API_KEY=your_key \
  -e IBM_WATSONX_PROJECT_ID=your_project \
  excel-ai-processor
```

## Performance Tips

1. **File Size**: Keep Excel files under 5MB for best performance
2. **Questions**: Process up to 50 questions at a time
3. **Context**: Provide clear, concise context (200-500 words)
4. **Caching**: Responses are not cached; each request is fresh

## Security Notes

- Never commit `.env` file
- Use environment variables for secrets
- Enable OAuth2 in production
- Validate all file uploads

## What's Next?

Now that you're up and running:

1. ✅ Upload your first Excel file
2. ✅ Process it with AI
3. ✅ Review the validation results
4. ✅ Download the completed file
5. 📚 Read the full [README.md](./README.md)
6. 🚀 Deploy to production using [DEPLOYMENT.md](./DEPLOYMENT.md)

Happy processing! 🎉