# CI/CD Pipeline Setup Guide

This document explains how to configure the GitHub Actions CI/CD pipeline for automatic deployment to Vercel and Render.

## Overview

The ZIGD Gateway Platform uses GitHub Actions for continuous integration and deployment. The pipeline includes:

1. **Build and Test** - Runs on every push and pull request
2. **Code Quality Checks** - TypeScript type checking and formatting
3. **Vercel Deployment** - Automatic deployment to Vercel (production and preview)
4. **Render Deployment** - Automatic deployment to Render on main branch pushes

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
   - Select your static site
   - Go to Settings → Deploy Hook
   - Copy the deploy hook URL
   - Add to GitHub Secrets

## Adding Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value
5. Click **Add secret**

## Vercel Setup

### Initial Setup

1. **Install Vercel CLI** (if not already installed):
   ```bash
   pnpm add -g vercel
   ```

2. **Link your project**:
   ```bash
   cd /path/to/zigd-platform
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

1. **Create Static Site on Render**:
   - Go to https://dashboard.render.com
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Configure:
     - Build Command: `pnpm install && pnpm build`
     - Publish Directory: `dist/public`

2. **Get Deploy Hook**:
   - Go to your site's Settings
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
4. Preview URL posted in PR comments

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
- Select your site
- Click "Manual Deploy" → "Deploy latest commit"

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Render Documentation](https://render.com/docs)
- [pnpm Documentation](https://pnpm.io/motivation)
