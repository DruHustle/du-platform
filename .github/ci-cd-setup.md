# CI/CD Pipeline Setup Guide

This document explains how to configure the GitHub Actions CI/CD pipeline for deployment to Vercel and Render, plus scheduled infrastructure health checks.

## Overview

The Diaspora Unlocked Platform uses GitHub Actions for continuous integration and deployment. The pipeline includes:

1. **Build and Test** - Runs on every push and pull request
2. **Code Quality Checks** - TypeScript type checking and formatting
3. **Vercel Deployment** - Automatic deployment to Vercel (production and preview)
4. **Render Deployment** - Automatic deployment to Render on main branch pushes
5. **Infra Health Check** - Scheduled app + DB health pings for Render service uptime

## Workflow Files

### 1. `ci-cd.yml` - Main CI/CD Pipeline

Handles build, test, and Vercel deployment.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` branch

**Jobs:**
- `build-and-test`: Installs dependencies, type checks, and builds the project
- `deploy-vercel-production`: Deploys to Vercel production (main branch only)
- `deploy-vercel-preview`: Deploys preview for pull requests
- `code-quality`: Runs Prettier and TypeScript checks

### 2. `render-deploy.yml` - Render Deployment

Triggers Render deployment via webhook.

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch

### 3. `infra-health-check.yml` - Scheduled Health Check

Runs scheduled health checks against the Render app endpoint, DB endpoint, and Onesa readiness endpoint, then emails on failure.

**Triggers:**
- Schedule: every 15 minutes (`*/15 * * * *`)
- Manual workflow dispatch

**Jobs:**
- `app-health`: validates `/api/ping` JSON
- `db-health`: validates `/api/health/db` JSON and requires `mode=mysql`
- `onesa-health`: validates `/api/ai/ready` JSON and requires `ready=true`
- `notify-failure`: sends an email alert if any health job fails

## Required GitHub Secrets

To enable the CI/CD pipeline, add these secrets to your GitHub repository:

### Vercel Secrets

1. **VERCEL_TOKEN**
   - Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
   - Create a new token
   - Copy and add to GitHub Secrets

2. **VERCEL_ORG_ID**
   - Run `vercel link` in your project directory
   - Find the value in `.vercel/project.json`
   - Add to GitHub Secrets

3. **VERCEL_PROJECT_ID**
   - Found in the same `.vercel/project.json` file
   - Add to GitHub Secrets

### Render Secrets

1. **RENDER_DEPLOY_HOOK_URL**
   - Go to your Render Dashboard
   - Select your Render service
   - Go to Settings → Deploy Hook
   - Copy the deploy hook URL
   - Add to GitHub Secrets

## Required GitHub Variables

The infra health-check workflow uses repository **variables** (not secrets):

1. **RENDER_KEEPALIVE_URL** (required)
   - Recommended: `https://<your-service>.onrender.com/api/ping`
2. **RENDER_DB_KEEPALIVE_URL** (optional)
   - Recommended: `https://<your-service>.onrender.com/api/health/db`
   - If omitted, workflow derives it from `RENDER_KEEPALIVE_URL` + `/api/health/db`
3. **RENDER_ONESA_READY_URL** (optional)
   - Recommended: `https://<your-service>.onrender.com/api/ai/ready`
   - If omitted, workflow derives it from `RENDER_KEEPALIVE_URL` or `RENDER_DB_KEEPALIVE_URL`
4. **HEALTHCHECK_ALERT_TO** (required for email alerts)
   - Example: `ops@diasporaunlocked.com`
5. **HEALTHCHECK_ALERT_FROM** (required for email alerts)
   - Example: `Diaspora Unlocked Alerts <alerts@diasporaunlocked.com>`

## Additional GitHub Secrets For Health Alert Email

The failure email step uses SMTP credentials stored as repository secrets:

1. **HEALTHCHECK_SMTP_SERVER**
   - Example: `smtp.gmail.com` or your transactional mail host
2. **HEALTHCHECK_SMTP_PORT**
   - Example: `587`
3. **HEALTHCHECK_SMTP_USERNAME**
4. **HEALTHCHECK_SMTP_PASSWORD**

Optional variable:

5. **HEALTHCHECK_SMTP_SECURE**
   - Set to `true` for implicit TLS if your SMTP provider requires it
   - Default: `false`

## Adding Secrets and Variables to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. For secrets, click **New repository secret**
4. For variables, click **Variables** tab then **New repository variable**
5. Add each item with its exact name and value

## Vercel Setup

### Initial Setup

1. **Install Vercel CLI** (if not already installed):
   ```bash
   pnpm add -g vercel
   ```

2. **Link your project**:
   ```bash
   cd /path/to/du-platform
   vercel link
   ```
   - Select your Vercel account
   - Link to existing project or create new one
   - This creates `.vercel/project.json` with your IDs

3. **Get Organization and Project IDs**:
   ```bash
   cat .vercel/project.json
   ```
   Copy the `orgId` and `projectId` values

4. **Create Vercel Token**:
   - Visit https://vercel.com/account/tokens
   - Click "Create Token"
   - Give it a name (e.g., "GitHub Actions")
   - Copy the token immediately (it won't be shown again)

### Manual Deployment Test

Test Vercel deployment locally:

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## Render Setup

### Initial Setup

1. **Create Render Service**:
   - Go to https://dashboard.render.com
   - Click "New +" and choose the service type you use (`Web Service` or `Static Site`)
   - Connect your GitHub repository
   - Configure build/start settings based on service type

2. **Get Deploy Hook**:
   - Go to your service's Settings
   - Scroll to "Deploy Hook"
   - Click "Create Deploy Hook"
   - Copy the URL
   - Add to GitHub Secrets as `RENDER_DEPLOY_HOOK_URL`

### Auto-Deploy from GitHub

Render can also auto-deploy directly from GitHub:
- Enable "Auto-Deploy" in Render settings
- Choose the `main` branch
- Render will deploy automatically on every push

## Workflow Behavior

### On Push to `main`:
1. Runs build and test
2. Runs code quality checks
3. Deploys to Vercel production
4. Triggers Render deployment

### On Push to `develop`:
1. Runs build and test
2. Runs code quality checks
3. No deployment (develop branch)

### On Pull Request:
1. Runs build and test
2. Runs code quality checks
3. Deploys Vercel preview

### On Schedule (every 15 minutes):
1. Runs infra health check workflow
2. Validates app endpoint (`RENDER_KEEPALIVE_URL`)
3. Validates DB health endpoint (`RENDER_DB_KEEPALIVE_URL` or derived URL)
4. Validates Onesa readiness (`RENDER_ONESA_READY_URL` or derived URL)
5. Sends an email alert if any check fails

## Monitoring Deployments

### Vercel
- View deployments: https://vercel.com/dashboard
- Check logs for each deployment
- Access preview URLs for PRs

### Render
- View deployments: https://dashboard.render.com
- Check build logs
- Monitor site health

### GitHub Actions
- View workflow runs: Repository → Actions tab
- Check logs for each job
- Debug failures

## Troubleshooting

### Build Failures

**Issue**: Build fails with dependency errors
**Solution**: 
- Ensure `pnpm-lock.yaml` is committed
- Check Node.js version matches (22.x)
- Run `pnpm install` locally to verify

**Issue**: Type check errors
**Solution**:
- Run `pnpm check` locally
- Fix TypeScript errors
- Commit and push fixes

### Deployment Failures

**Issue**: Vercel deployment fails
**Solution**:
- Verify secrets are correctly set
- Check Vercel dashboard for detailed logs
- Ensure `.vercel/project.json` IDs match secrets

**Issue**: Render deployment doesn't trigger
**Solution**:
- Verify deploy hook URL is correct
- Check Render dashboard for webhook logs
- Manually trigger deployment from Render dashboard

**Issue**: Infra health check fails with missing variable
**Solution**:
- Set `RENDER_KEEPALIVE_URL` in GitHub repository variables
- Optionally set `RENDER_DB_KEEPALIVE_URL` explicitly
- Optionally set `RENDER_ONESA_READY_URL` explicitly
- Configure `HEALTHCHECK_ALERT_TO`, `HEALTHCHECK_ALERT_FROM`, and SMTP secrets
- Re-run `infra-health-check.yml` manually from Actions tab

### Secret Issues

**Issue**: "Invalid token" or "Unauthorized" errors
**Solution**:
- Regenerate tokens
- Update GitHub secrets
- Ensure no extra spaces in secret values

## Best Practices

1. **Branch Protection**:
   - Require PR reviews before merging to `main`
   - Require status checks to pass
   - Enable automatic branch deletion

2. **Testing**:
   - Test locally before pushing
   - Review preview deployments
   - Monitor production after deployment

3. **Secrets Management**:
   - Rotate tokens periodically
   - Use separate tokens for different environments
   - Never commit secrets to repository

4. **Monitoring**:
   - Set up Vercel/Render notifications
   - Monitor GitHub Actions for failures
   - Check deployment logs regularly

## Manual Deployment

If automated deployment fails, you can deploy manually:

### Vercel
```bash
vercel --prod --token=YOUR_VERCEL_TOKEN
```

### Render
- Go to Render Dashboard
- Select your service
- Click "Manual Deploy" → "Deploy latest commit"

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Render Documentation](https://render.com/docs)
- [pnpm Documentation](https://pnpm.io/motivation)
