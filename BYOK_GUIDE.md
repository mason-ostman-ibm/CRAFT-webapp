# BYOK (Bring Your Own Key) Guide

## Overview

Excel AI Processor supports BYOK (Bring Your Own Key) for enhanced privacy and control. Users can configure their own API keys for:

- **IBM WatsonX.ai** - Required for AI processing
- **AstraDB** - Optional, for RAG (Retrieval-Augmented Generation)
- **Watson Orchestrate** - Optional, for chatbot assistant

## Benefits of BYOK

✅ **Privacy**: Your API keys never leave your control  
✅ **Cost Control**: Use your own IBM Cloud credits  
✅ **Compliance**: Meet your organization's security requirements  
✅ **Flexibility**: Switch between different accounts/projects  
✅ **Transparency**: Full visibility into API usage

## How It Works

```
User → Settings Page → Encrypted Storage → API Calls with User's Keys
```

1. User enters their API keys in Settings page
2. Keys are encrypted before storage
3. Keys are only accessible by the user's account
4. API calls use the user's keys instead of shared keys

## Setting Up BYOK

### 1. IBM WatsonX.ai (Required)

**Get Your Credentials:**

1. Go to [IBM Cloud](https://cloud.ibm.com)
2. Navigate to **WatsonX.ai** service
3. Create or select a project
4. Go to **Manage** → **Access (IAM)** → **API keys**
5. Create a new API key
6. Copy your **API Key** and **Project ID**

**Configure in App:**

1. Navigate to **Settings** page
2. Under "IBM WatsonX.ai Credentials"
3. Enter your **API Key**
4. Enter your **Project ID**
5. Click **Save WatsonX Credentials**

### 2. AstraDB (Optional - for RAG)

**Get Your Credentials:**

1. Go to [astra.datastax.com](https://astra.datastax.com)
2. Create a free account
3. Create a new database
4. Create a collection named `qa_collection`
5. Go to **Settings** → **Application Tokens**
6. Generate a new token
7. Copy your **API Endpoint** and **Token**

**Configure in App:**

1. Navigate to **Settings** page
2. Under "AstraDB Credentials"
3. Enter your **API Endpoint**
4. Enter your **Application Token**
5. Click **Save AstraDB Credentials**

**Populate Knowledge Base:**

```python
from astrapy import DataAPIClient
from sentence_transformers import SentenceTransformer

# Connect to AstraDB
client = DataAPIClient(token)
db = client.get_database(endpoint)
collection = db.get_collection("qa_collection")

# Initialize embedding model
embedding_model = SentenceTransformer('ibm-granite/granite-embedding-30m-english')

# Add Q&A pairs
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

### 3. Watson Orchestrate (Optional - for Chatbot)

**Get Your Credentials:**

1. Go to [Watson Orchestrate](https://watson-orchestrate.cloud.ibm.com)
2. Navigate to **Settings** → **API details**
3. Generate a new API key
4. Copy your **API Key** and **API URL**

**Configure in App:**

1. Navigate to **Settings** page
2. Under "Watson Orchestrate Credentials"
3. Enter your **API Key**
4. Enter your **Orchestrate URL**
5. Click **Save Orchestrate Credentials**

## Security

### Encryption

All API keys are encrypted using:
- **AES-256** encryption at rest
- **TLS 1.3** encryption in transit
- **Unique encryption keys** per user

### Access Control

- Keys are only accessible by the user who created them
- Keys are never logged or exposed in API responses
- Keys are never shared between users
- Keys can be deleted at any time

### Best Practices

1. **Rotate Keys Regularly**: Update your API keys every 90 days
2. **Use Separate Keys**: Don't reuse keys across applications
3. **Monitor Usage**: Check IBM Cloud usage dashboard regularly
4. **Revoke Unused Keys**: Delete keys you're no longer using
5. **Never Share Keys**: Keep your API keys confidential

## API Endpoints

### Save WatsonX Credentials
```bash
POST /api/settings/watsonx
Content-Type: application/json

{
  "apiKey": "your_api_key",
  "projectId": "your_project_id"
}
```

### Save AstraDB Credentials
```bash
POST /api/settings/astradb
Content-Type: application/json

{
  "endpoint": "https://your-db-id.apps.astra.datastax.com",
  "token": "your_token"
}
```

### Save Orchestrate Credentials
```bash
POST /api/settings/orchestrate
Content-Type: application/json

{
  "apiKey": "your_api_key",
  "url": "https://api.us-south.watson-orchestrate.cloud.ibm.com/..."
}
```

## Troubleshooting

### Invalid API Key
- Verify the key is correct
- Check if the key has expired
- Ensure the key has proper permissions

### Connection Failed
- Check your internet connection
- Verify the endpoint URL is correct
- Ensure firewall isn't blocking requests

### Rate Limiting
- Check your IBM Cloud quota
- Consider upgrading your plan
- Implement request throttling

## Cost Considerations

### WatsonX.ai Pricing
- Charged per token processed
- Varies by model (Llama 3.3 70B is premium)
- Monitor usage in IBM Cloud dashboard

### AstraDB Pricing
- Free tier: 25GB storage, 25M reads/month
- Paid tiers available for higher usage
- No charges for vector searches in free tier

### Watson Orchestrate Pricing
- Charged per conversation
- Free tier available
- Enterprise plans for high volume

## Migration from Shared Keys

If you're currently using shared keys:

1. **Set up BYOK**: Configure your own keys in Settings
2. **Test**: Process a file to verify it works
3. **Monitor**: Check IBM Cloud for usage
4. **Optimize**: Adjust based on your usage patterns

## FAQ

**Q: Are my keys stored securely?**  
A: Yes, all keys are encrypted using AES-256 before storage.

**Q: Can I use different keys for different projects?**  
A: Currently, one set of keys per user. Multi-project support coming soon.

**Q: What happens if I delete my keys?**  
A: The app will fall back to shared keys (if available) or prompt you to add keys.

**Q: Can I export my keys?**  
A: No, for security reasons keys cannot be exported once saved.

**Q: How do I know my keys are being used?**  
A: Check the IBM Cloud usage dashboard for API calls.

## Support

For BYOK-related issues:
- Check this guide first
- Review the [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- Open an issue in the repository
- Contact your IBM representative

## Compliance

BYOK helps meet compliance requirements for:
- **GDPR**: Data sovereignty and control
- **HIPAA**: Secure key management
- **SOC 2**: Access control and encryption
- **ISO 27001**: Information security management

## Future Enhancements

Coming soon:
- [ ] Key rotation automation
- [ ] Multi-project key management
- [ ] Usage analytics dashboard
- [ ] Key sharing for teams
- [ ] Audit logs for key usage