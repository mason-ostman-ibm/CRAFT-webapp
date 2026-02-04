# Excel AI Processor

AI-powered Excel processing application for ATLs and MDs using IBM Carbon Design System and WatsonX.ai.

## Overview

Excel AI Processor is a modern web application designed to help business leaders streamline their Excel questionnaire workflow. The application leverages IBM WatsonX.ai to automatically generate professional answers for Excel-based questionnaires, reducing manual effort and improving consistency.

## Features

- **📊 Excel File Processing**: Upload and process .xlsx and .xls files
- **🤖 AI-Powered Answers**: Leverage IBM WatsonX.ai to generate professional responses
- **✅ Validation Tool**: Review and validate AI-generated answers before finalizing
- **📥 Download Results**: Export processed files with completed answers
- **🎨 IBM Carbon Design**: Modern, accessible UI following IBM design standards
- **📈 Instana Monitoring**: Comprehensive observability and user journey tracking
- **🔐 SSO Integration**: Secure authentication via OAuth2 proxy

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **IBM Carbon Design System** for UI components
- **Vite** for fast development and building
- **React Router** for navigation
- **TanStack Query** for data fetching

### Backend
- **Node.js** with Express.js
- **IBM WatsonX.ai** for AI processing
- **Instana** for monitoring and observability
- **Multer** for file uploads
- **xlsx** for Excel file processing

### Infrastructure
- **OpenShift/Kubernetes** for container orchestration
- **OAuth2 Proxy** for authentication
- **IBM Cloud** for hosting

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- IBM Cloud account with WatsonX.ai access
- Instana account (optional, for monitoring)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd excel-ai-processor
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - WatsonX.ai credentials
   - Instana configuration (optional)
   - Other application settings

### Development

**⚠️ IMPORTANT**: Always use `npm run dev:all` to start both services!

```bash
# ✅ CORRECT - Start both frontend and backend
npm run dev:all
```

This starts:
- ✅ Frontend: http://localhost:5173
- ✅ Backend API: http://localhost:3000

**Common Error**: Running `npm run dev` alone will cause `ECONNREFUSED` errors because the backend won't be running.

For separate terminals:
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run dev
```

**Troubleshooting**: If you see connection errors, see [STARTUP_TROUBLESHOOTING.md](./STARTUP_TROUBLESHOOTING.md)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
excel-ai-processor/
├── api/                      # Backend API
│   ├── server.js            # Main server file
│   ├── instana.js           # Instana initialization
│   └── instana-middleware.js # Instana tracking middleware
├── src/                      # Frontend source
│   ├── components/          # Reusable components
│   ├── pages/               # Page components
│   │   ├── HomePage.tsx
│   │   ├── ProcessPage.tsx
│   │   ├── ValidationPage.tsx
│   │   └── NotFound.tsx
│   ├── layout/              # Layout components
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── k8s/                      # Kubernetes configs
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── route.yaml
│   └── configmap.yaml
├── public/                   # Static assets
├── .goldenpath.yml          # Golden path configuration
└── package.json             # Dependencies

```

## Usage

### 1. Upload Excel File

Navigate to the "Process Files" page and upload your Excel file. The file should have:
- Questions in the first column
- Answers in the second column (can be empty)

### 2. Add Context (Optional)

Provide additional context to help the AI generate more relevant answers:
- Project background
- Target audience
- Specific requirements

### 3. Process with AI

Click "Process with AI" to generate answers using IBM WatsonX.ai. The AI will:
- Analyze each question
- Generate professional, contextually appropriate answers
- Fill in the answer column

### 4. Validate Results

Review the generated answers on the Validation page:
- Check answer quality
- View completion statistics
- Identify any issues

### 5. Download

Download your completed Excel file with all answers filled in.

## API Endpoints

### Health Check
```
GET /api/health
```

### Upload File
```
POST /api/upload
Content-Type: multipart/form-data
Body: file (Excel file)
```

### Process with AI
```
POST /api/process
Content-Type: application/json
Body: {
  filePath: string,
  questions: Question[],
  context?: string
}
```

### Generate File
```
POST /api/generate
Content-Type: application/json
Body: {
  originalFilePath: string,
  questions: Question[],
  answers: Answer[]
}
```

### Download File
```
GET /api/download/:filename
```

### Validate Answers
```
POST /api/validate
Content-Type: application/json
Body: {
  questions: Question[],
  answers: Answer[]
}
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

Quick deploy to OpenShift:

```bash
# Apply Kubernetes configs
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/route.yaml
```

## Monitoring

The application includes comprehensive Instana monitoring:

- **User Journey Tracking**: Track user interactions and workflows
- **API Performance**: Monitor endpoint response times
- **Error Tracking**: Capture and analyze errors
- **File Operations**: Track upload, process, and download operations
- **AI Processing**: Monitor WatsonX.ai integration performance

## Security

- OAuth2 authentication via IBM w3id
- Secure file upload with size and type validation
- Environment-based secret management
- HTTPS/TLS encryption in production

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Submit pull requests for review

## Support

For issues or questions:
- Create an issue in the repository
- Contact the development team
- Check the [QUICK_START.md](./QUICK_START.md) guide

## License

IBM Internal Use Only

## Acknowledgments

- Built with IBM Carbon Design System
- Powered by IBM WatsonX.ai
- Monitored with Instana
- Inspired by financial-news-aggregator and your-projects templates