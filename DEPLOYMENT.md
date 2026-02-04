# Deployment Guide - Excel AI Processor

This guide covers deploying the Excel AI Processor application to OpenShift/Kubernetes.

## Prerequisites

- OpenShift CLI (`oc`) or Kubernetes CLI (`kubectl`) installed
- Access to OpenShift cluster
- Docker/Podman for building images
- IBM Cloud account with WatsonX.ai access
- Instana account (optional)

## Environment Setup

### 1. Create Namespace

```bash
oc new-project content-studio-platform
# or
kubectl create namespace content-studio-platform
```

### 2. Create Secrets

#### Instana Secrets
```bash
oc create secret generic instana-secrets \
  --from-literal=agent-key=YOUR_INSTANA_AGENT_KEY \
  -n content-studio-platform
```

#### WatsonX Secrets
```bash
oc create secret generic watsonx-secrets \
  --from-literal=api-key=YOUR_WATSONX_API_KEY \
  --from-literal=project-id=YOUR_WATSONX_PROJECT_ID \
  -n content-studio-platform
```

#### OAuth2 Proxy Secrets
```bash
oc create secret generic excel-ai-processor-secrets \
  --from-literal=OAUTH2_PROXY_CLIENT_ID=YOUR_CLIENT_ID \
  --from-literal=OAUTH2_PROXY_CLIENT_SECRET=YOUR_CLIENT_SECRET \
  --from-literal=OAUTH2_PROXY_COOKIE_SECRET=$(openssl rand -base64 32) \
  -n content-studio-platform
```

## Build and Push Image

### Option 1: Using OpenShift BuildConfig

```bash
# Create build config
oc new-build --name=excel-ai-processor \
  --binary \
  --strategy=docker \
  -n content-studio-platform

# Start build from current directory
oc start-build excel-ai-processor \
  --from-dir=. \
  --follow \
  -n content-studio-platform
```

### Option 2: Using Docker/Podman

```bash
# Build image
docker build -t excel-ai-processor:latest .

# Tag for registry
docker tag excel-ai-processor:latest \
  image-registry.openshift-image-registry.svc:5000/content-studio-platform/excel-ai-processor:latest

# Push to registry
docker push image-registry.openshift-image-registry.svc:5000/content-studio-platform/excel-ai-processor:latest
```

## Deploy Application

### 1. Apply ConfigMap

```bash
kubectl apply -f k8s/configmap.yaml
```

### 2. Deploy Application

```bash
kubectl apply -f k8s/deployment.yaml
```

### 3. Create Service

```bash
kubectl apply -f k8s/service.yaml
```

### 4. Create Route (OpenShift)

```bash
kubectl apply -f k8s/route.yaml
```

Or create route manually:

```bash
oc expose service excel-ai-processor \
  --hostname=excel-ai-processor-np.dinero.techzone.ibm.com \
  -n content-studio-platform
```

## Verify Deployment

### Check Pod Status

```bash
kubectl get pods -n content-studio-platform -l app=excel-ai-processor
```

Expected output:
```
NAME                                  READY   STATUS    RESTARTS   AGE
excel-ai-processor-xxxxxxxxxx-xxxxx   3/3     Running   0          2m
```

### Check Logs

```bash
# Backend logs
kubectl logs -n content-studio-platform \
  -l app=excel-ai-processor \
  -c backend \
  --tail=100

# Frontend logs
kubectl logs -n content-studio-platform \
  -l app=excel-ai-processor \
  -c frontend \
  --tail=100

# OAuth2 Proxy logs
kubectl logs -n content-studio-platform \
  -l app=excel-ai-processor \
  -c oauth2-proxy \
  --tail=100
```

### Test Health Endpoint

```bash
# Port forward to test locally
kubectl port-forward -n content-studio-platform \
  svc/excel-ai-processor 3000:3000

# Test health endpoint
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Excel AI Processor API Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Configuration Updates

### Update ConfigMap

```bash
# Edit configmap
kubectl edit configmap excel-ai-processor-config -n content-studio-platform

# Or apply updated file
kubectl apply -f k8s/configmap.yaml

# Restart pods to pick up changes
kubectl rollout restart deployment/excel-ai-processor -n content-studio-platform
```

### Update Secrets

```bash
# Update secret
kubectl create secret generic watsonx-secrets \
  --from-literal=api-key=NEW_API_KEY \
  --from-literal=project-id=NEW_PROJECT_ID \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart deployment
kubectl rollout restart deployment/excel-ai-processor -n content-studio-platform
```

## Scaling

### Manual Scaling

```bash
# Scale to 3 replicas
kubectl scale deployment excel-ai-processor \
  --replicas=3 \
  -n content-studio-platform
```

### Horizontal Pod Autoscaler

```bash
kubectl autoscale deployment excel-ai-processor \
  --min=1 \
  --max=5 \
  --cpu-percent=80 \
  -n content-studio-platform
```

## Monitoring

### View Metrics in Instana

1. Navigate to Instana dashboard
2. Search for "excel-ai-processor"
3. View:
   - Application performance
   - User journeys
   - Error rates
   - API endpoint metrics

### OpenShift Monitoring

```bash
# View resource usage
kubectl top pods -n content-studio-platform -l app=excel-ai-processor

# View events
kubectl get events -n content-studio-platform --sort-by='.lastTimestamp'
```

## Troubleshooting

### Pod Not Starting

```bash
# Describe pod
kubectl describe pod -n content-studio-platform -l app=excel-ai-processor

# Check events
kubectl get events -n content-studio-platform --field-selector involvedObject.name=excel-ai-processor
```

### Image Pull Errors

```bash
# Check image pull secrets
kubectl get secrets -n content-studio-platform

# Verify image exists
oc get imagestream excel-ai-processor -n content-studio-platform
```

### OAuth2 Issues

```bash
# Check OAuth2 proxy logs
kubectl logs -n content-studio-platform \
  -l app=excel-ai-processor \
  -c oauth2-proxy

# Verify secrets
kubectl get secret excel-ai-processor-secrets -n content-studio-platform -o yaml
```

### WatsonX Connection Issues

```bash
# Test WatsonX connectivity from pod
kubectl exec -it -n content-studio-platform \
  $(kubectl get pod -n content-studio-platform -l app=excel-ai-processor -o jsonpath='{.items[0].metadata.name}') \
  -c backend \
  -- curl -v https://us-south.ml.cloud.ibm.com
```

## Rollback

### Rollback to Previous Version

```bash
# View rollout history
kubectl rollout history deployment/excel-ai-processor -n content-studio-platform

# Rollback to previous version
kubectl rollout undo deployment/excel-ai-processor -n content-studio-platform

# Rollback to specific revision
kubectl rollout undo deployment/excel-ai-processor \
  --to-revision=2 \
  -n content-studio-platform
```

## Cleanup

### Delete Application

```bash
kubectl delete -f k8s/route.yaml
kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/deployment.yaml
kubectl delete -f k8s/configmap.yaml
```

### Delete Secrets

```bash
kubectl delete secret instana-secrets -n content-studio-platform
kubectl delete secret watsonx-secrets -n content-studio-platform
kubectl delete secret excel-ai-processor-secrets -n content-studio-platform
```

## Production Checklist

- [ ] Secrets configured correctly
- [ ] Resource limits set appropriately
- [ ] Health checks configured
- [ ] Monitoring enabled (Instana)
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] SSL/TLS certificates valid
- [ ] OAuth2 authentication working
- [ ] WatsonX.ai integration tested
- [ ] Load testing completed
- [ ] Documentation updated

## Support

For deployment issues:
1. Check pod logs
2. Review Instana metrics
3. Verify secrets and configmaps
4. Contact platform team

## Additional Resources

- [OpenShift Documentation](https://docs.openshift.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [IBM Carbon Design System](https://carbondesignsystem.com/)
- [IBM WatsonX.ai Documentation](https://www.ibm.com/products/watsonx-ai)
- [Instana Documentation](https://www.ibm.com/docs/en/instana-observability)