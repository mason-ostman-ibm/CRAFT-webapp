# CRAFT Deployment Guide

This guide covers deploying the CRAFT application with its microservices architecture.

## Architecture Overview

```
┌─────────────────────────────────────┐
│   OpenShift/DINERO Cluster          │
│   - React Frontend                  │
│   - Node.js Backend                 │
└──────────────┬──────────────────────┘
               │ HTTP/REST
               ▼
┌─────────────────────────────────────┐
│   IBM Code Engine                   │
│   - Python Microservice             │
└─────────────────────────────────────┘
```

## Prerequisites

### For Python Microservice (Code Engine)
- IBM Cloud account with Code Engine access
- IBM Cloud CLI installed
- Code Engine plugin installed
- IBM WatsonX.ai credentials
- (Optional) DataStax Astra DB credentials

### For Frontend/Backend (OpenShift)
- Access to OpenShift/DINERO cluster
- OpenShift CLI (oc) installed
- Container registry access
- OAuth2 proxy configuration

## Part 1: Deploy Python Microservice to IBM Code Engine

### Step 1: Prepare the Microservice

1. Navigate to the microservice directory:
   ```bash
   cd CRAFT-python-microservice
   ```

2. Review and update `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials (for local testing)
   ```

3. Test locally (optional):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python flask_api.py
   
   # Test health endpoint
   curl http://localhost:8080/health
   ```

### Step 2: Deploy to Code Engine

#### Option A: Automated Deployment (Recommended)

```bash
./deploy.sh
```

The script will:
- Login to IBM Cloud
- Create/select Code Engine project
- Create ConfigMap and Secrets
- Build and deploy the application
- Output the service URL

#### Option B: Manual Deployment

1. **Login to IBM Cloud**:
   ```bash
   ibmcloud login
   ibmcloud target -r us-south -g Default
   ```

2. **Create Code Engine project**:
   ```bash
   ibmcloud ce project create --name craft-microservice
   ibmcloud ce project select --name craft-microservice
   ```

3. **Create ConfigMap** (non-sensitive config):
   ```bash
   ibmcloud ce configmap create --name craft-config \
     --from-literal WATSON_URL=https://us-south.ml.cloud.ibm.com \
     --from-literal WATSON_TEXT_MODEL=mistralai/mistral-small-3-1-24b-instruct-2503 \
     --from-literal DELTA_SIMILARITY_THRESHOLD=0.85 \
     --from-literal DELTA_ENABLE_LLM_VERIFICATION=true \
     --from-literal FLASK_ENV=production
   ```

4. **Create Secret** (sensitive credentials):
   ```bash
   ibmcloud ce secret create --name craft-secrets \
     --from-literal IBM_WATSONX_API_KEY=your_actual_api_key \
     --from-literal IBM_WATSONX_PROJECT_ID=your_actual_project_id \
     --from-literal CPD_USERNAME=your_username \
     --from-literal ASTRA_DB_API_ENDPOINT=your_astra_endpoint \
     --from-literal ASTRA_DB_APPLICATION_TOKEN=your_astra_token
   ```

5. **Deploy application**:
   ```bash
   ibmcloud ce application create \
     --name craft-python-service \
     --build-source . \
     --strategy dockerfile \
     --port 8080 \
     --min-scale 1 \
     --max-scale 5 \
     --cpu 1 \
     --memory 2G \
     --env-from-configmap craft-config \
     --env-from-secret craft-secrets \
     --wait
   ```

6. **Get the service URL**:
   ```bash
   ibmcloud ce application get --name craft-python-service --output url
   ```

   Example output: `https://craft-python-service.1a2b3c4d5e6f.us-south.codeengine.appdomain.cloud`

### Step 3: Verify Deployment

1. **Check application status**:
   ```bash
   ibmcloud ce application get --name craft-python-service
   ```

2. **Test health endpoint**:
   ```bash
   curl https://your-service-url.appdomain.cloud/health
   ```

   Expected response:
   ```json
   {
     "status": "ok",
     "service": "Python Document Processor",
     "rag_enabled": true
   }
   ```

3. **View logs**:
   ```bash
   ibmcloud ce application logs --name craft-python-service --follow
   ```

### Step 4: Update Secrets (if needed)

To update credentials without redeploying:

```bash
# Update a single secret value
ibmcloud ce secret update --name craft-secrets \
  --from-literal IBM_WATSONX_API_KEY=new_api_key

# Or recreate the entire secret
ibmcloud ce secret delete --name craft-secrets
ibmcloud ce secret create --name craft-secrets \
  --from-literal IBM_WATSONX_API_KEY=new_key \
  --from-literal IBM_WATSONX_PROJECT_ID=new_project_id
```

## Part 2: Deploy Frontend/Backend to OpenShift

### Step 1: Configure Environment Variables

1. Navigate to the frontend/backend directory:
   ```bash
   cd CRAFT_web_app/excel-ai-processor
   ```

2. Update `.env` with the Code Engine URL:
   ```bash
   # .env
   NODE_ENV=production
   PORT=3000
   
   # Python microservice URL from Code Engine
   PYTHON_SERVICE_URL=https://craft-python-service.1a2b3c4d5e6f.us-south.codeengine.appdomain.cloud
   
   # Instana monitoring
   INSTANA_AGENT_KEY=your_instana_key
   INSTANA_ENDPOINT_URL=https://your-instana-endpoint.instana.io
   INSTANA_ZONE=your_zone
   
   # File upload settings
   MAX_FILE_SIZE=10485760
   ALLOWED_FILE_TYPES=.xlsx,.xls
   ```

### Step 2: Build the Application

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# This creates a 'dist' folder with the production build
```

### Step 3: Create OpenShift Resources

1. **Create ConfigMap** for environment variables:
   ```yaml
   # k8s/configmap.yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: craft-config
   data:
     NODE_ENV: "production"
     PORT: "3000"
     PYTHON_SERVICE_URL: "https://craft-python-service.appdomain.cloud"
     MAX_FILE_SIZE: "10485760"
     ALLOWED_FILE_TYPES: ".xlsx,.xls"
   ```

2. **Create Secret** for sensitive data:
   ```yaml
   # k8s/secret.yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: craft-secrets
   type: Opaque
   stringData:
     INSTANA_AGENT_KEY: "your_instana_key"
     INSTANA_ENDPOINT_URL: "https://your-instana-endpoint.instana.io"
   ```

3. **Create Deployment**:
   ```yaml
   # k8s/deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: craft-app
   spec:
     replicas: 2
     selector:
       matchLabels:
         app: craft-app
     template:
       metadata:
         labels:
           app: craft-app
       spec:
         containers:
         - name: craft-app
           image: your-registry/craft-app:latest
           ports:
           - containerPort: 3000
           envFrom:
           - configMapRef:
               name: craft-config
           - secretRef:
               name: craft-secrets
           resources:
             requests:
               memory: "512Mi"
               cpu: "250m"
             limits:
               memory: "1Gi"
               cpu: "500m"
           livenessProbe:
             httpGet:
               path: /health
               port: 3000
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /health
               port: 3000
             initialDelaySeconds: 5
             periodSeconds: 5
   ```

4. **Create Service**:
   ```yaml
   # k8s/service.yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: craft-app
   spec:
     selector:
       app: craft-app
     ports:
     - protocol: TCP
       port: 80
       targetPort: 3000
     type: ClusterIP
   ```

5. **Create Route** (OpenShift):
   ```yaml
   # k8s/route.yaml
   apiVersion: route.openshift.io/v1
   kind: Route
   metadata:
     name: craft-app
   spec:
     to:
       kind: Service
       name: craft-app
     port:
       targetPort: 3000
     tls:
       termination: edge
       insecureEdgeTerminationPolicy: Redirect
   ```

### Step 4: Deploy to OpenShift

```bash
# Login to OpenShift
oc login --token=your-token --server=https://your-cluster.com

# Create/select project
oc new-project craft-app || oc project craft-app

# Apply configurations
oc apply -f k8s/configmap.yaml
oc apply -f k8s/secret.yaml
oc apply -f k8s/deployment.yaml
oc apply -f k8s/service.yaml
oc apply -f k8s/route.yaml

# Check deployment status
oc get pods
oc get route
```

### Step 5: Verify Deployment

1. **Get the route URL**:
   ```bash
   oc get route craft-app -o jsonpath='{.spec.host}'
   ```

2. **Test the application**:
   ```bash
   curl https://your-app-route.apps.cluster.com
   ```

3. **Check logs**:
   ```bash
   oc logs -f deployment/craft-app
   ```

## Part 3: Post-Deployment Configuration

### Configure OAuth2 Proxy (Production)

If using OAuth2 for authentication:

1. Create OAuth2 proxy deployment
2. Configure redirect URLs
3. Update route to use OAuth2 proxy

See your organization's OAuth2 documentation for specific configuration.

### Configure Monitoring

1. **Instana**: Verify agent is reporting
2. **OpenShift Monitoring**: Check metrics in console
3. **Code Engine Monitoring**: View metrics in IBM Cloud console

### Set Up Alerts

Configure alerts for:
- High error rates
- Slow response times
- Service unavailability
- High memory/CPU usage

## Updating Deployments

### Update Python Microservice

```bash
cd CRAFT-python-microservice

# Make your changes, then:
ibmcloud ce application update \
  --name craft-python-service \
  --build-source .
```

### Update Frontend/Backend

```bash
cd CRAFT_web_app/excel-ai-processor

# Build new version
npm run build

# Build and push new container image
docker build -t your-registry/craft-app:v2 .
docker push your-registry/craft-app:v2

# Update deployment
oc set image deployment/craft-app craft-app=your-registry/craft-app:v2

# Or use rolling update
oc rollout restart deployment/craft-app
```

## Rollback Procedures

### Rollback Python Microservice

```bash
# View revisions
ibmcloud ce application get --name craft-python-service

# Rollback to previous version
ibmcloud ce application update \
  --name craft-python-service \
  --image previous-image-tag
```

### Rollback Frontend/Backend

```bash
# View rollout history
oc rollout history deployment/craft-app

# Rollback to previous version
oc rollout undo deployment/craft-app

# Rollback to specific revision
oc rollout undo deployment/craft-app --to-revision=2
```

## Troubleshooting

### Python Microservice Issues

1. **Service not responding**:
   ```bash
   ibmcloud ce application get --name craft-python-service
   ibmcloud ce application logs --name craft-python-service
   ```

2. **Out of memory**:
   ```bash
   ibmcloud ce application update \
     --name craft-python-service \
     --memory 4G
   ```

3. **Slow startup**:
   ```bash
   ibmcloud ce application update \
     --name craft-python-service \
     --cpu 2
   ```

### Frontend/Backend Issues

1. **Pods not starting**:
   ```bash
   oc describe pod <pod-name>
   oc logs <pod-name>
   ```

2. **Can't connect to Python service**:
   - Verify `PYTHON_SERVICE_URL` is correct
   - Check network policies
   - Test connectivity: `oc exec <pod-name> -- curl https://python-service-url/health`

3. **High memory usage**:
   ```bash
   oc set resources deployment/craft-app \
     --limits=memory=2Gi \
     --requests=memory=1Gi
   ```

## Scaling

### Scale Python Microservice

```bash
# Adjust min/max instances
ibmcloud ce application update \
  --name craft-python-service \
  --min-scale 2 \
  --max-scale 10
```

### Scale Frontend/Backend

```bash
# Manual scaling
oc scale deployment/craft-app --replicas=5

# Auto-scaling
oc autoscale deployment/craft-app \
  --min=2 \
  --max=10 \
  --cpu-percent=70
```

## Security Checklist

- [ ] All secrets stored in Secret Manager / Kubernetes Secrets
- [ ] HTTPS enabled on all routes
- [ ] OAuth2 authentication configured
- [ ] Network policies in place
- [ ] Resource limits set
- [ ] Security scanning enabled
- [ ] Audit logging enabled
- [ ] Regular security updates applied

## Monitoring Checklist

- [ ] Instana agent configured
- [ ] Health checks working
- [ ] Logs aggregated
- [ ] Alerts configured
- [ ] Dashboards created
- [ ] SLOs defined
- [ ] On-call rotation set up

## Support

For deployment issues:
1. Check logs first
2. Review this guide
3. Consult [ARCHITECTURE.md](./ARCHITECTURE.md)
4. Contact DevOps team
5. Open support ticket

## Additional Resources

- [IBM Code Engine Documentation](https://cloud.ibm.com/docs/codeengine)
- [OpenShift Documentation](https://docs.openshift.com/)
- [CRAFT Architecture](./ARCHITECTURE.md)
- [Python Microservice README](../../CRAFT-python-microservice/README.md)