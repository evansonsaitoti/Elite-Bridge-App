# Vercel MCP Connector - Complete Guide & Capabilities

## Overview

The **Vercel MCP (Model Context Protocol) connector** provides programmatic access to your Vercel account and projects through a set of powerful tools. This enables automation, monitoring, debugging, and management of your deployments directly through AI-assisted workflows.

---

## Key Capabilities

### 1. **Project Management**
- **List Projects**: Retrieve all projects in your Vercel account (up to 50)
- **Get Project Details**: Access comprehensive project information including:
  - Project ID and name
  - Framework configuration
  - Node.js version
  - Latest deployment status
  - Associated domains
  - Creation and update timestamps

### 2. **Deployment Management**
- **List Deployments**: View deployment history with pagination support
- **Get Deployment Details**: Access specific deployment information
- **Deployment Metadata**: Includes:
  - Deployment ID and URL
  - Creation timestamp
  - Deployment state (READY, BUILDING, ERROR, etc.)
  - Target environment (production, preview)
  - Creator information
  - Git metadata (commit SHA, branch, message, author)

### 3. **Build & Runtime Diagnostics**
- **Build Logs**: Retrieve detailed build logs for debugging deployment failures
  - Build machine configuration
  - Repository cloning status
  - Build process output
  - Cache management
  - Deployment completion status
- **Runtime Logs**: Monitor application output from serverless functions
  - Console logs (console.log, errors)
  - Filtering by environment, log level, status code
  - Full-text search capability
  - Time range filtering

### 4. **Documentation & Learning**
- **Search Vercel Documentation**: Query Vercel's comprehensive docs covering:
  - Core concepts (Projects, Deployments, Git Integration)
  - Frontend frameworks (Next.js, SvelteKit, Nuxt, Astro, Remix)
  - APIs (REST API, Vercel SDK)
  - Compute features (Functions, Routing, Cron Jobs)
  - AI integration (Vercel AI SDK, AI Gateway)
  - Performance & delivery optimization
  - Security features
  - Pricing and billing

### 5. **Domain Management**
- **Check Domain Availability**: Verify domain availability and get pricing
- **Domain Configuration**: Manage domains associated with projects

### 6. **Collaboration & Feedback**
- **Toolbar Threads**: Manage deployment comments and feedback
  - List toolbar comment threads
  - Get specific thread details
  - Reply to threads
  - Edit messages
  - Add emoji reactions
  - Change thread resolution status

### 7. **Advanced Features**
- **Deploy to Vercel**: Programmatically trigger deployments
- **Web Fetch**: Fetch and test Vercel deployment URLs
- **Temporary Access Links**: Create shareable links for protected deployments
- **Design Import**: Import designs from URLs into Vercel

---

## Real-World Usage Examples

### Example 1: Monitor Your Project Status

**Data Fetched:**
```json
{
  "id": "prj_mk4WbfZvpf3PVtUzFsyKkIS3qrcJ",
  "name": "elite-bridge-app",
  "accountId": "team_5zSYrLwON3b1ooU9bikc8Z1G",
  "createdAt": 1781041846929,
  "updatedAt": 1781565878073,
  "nodeVersion": "24.x",
  "live": false,
  "latestDeployment": {
    "id": "dpl_GGALAnMerUg76rpUok8Y1qXBRCe7",
    "url": "elite-bridge-mg6czxk3u-evanson-saitoti-s-projects.vercel.app",
    "createdAt": 1781565874069,
    "readyState": "READY",
    "target": "production"
  },
  "domains": [
    "elite-bridge-app.vercel.app",
    "elite-bridge-app-evanson-saitoti-s-projects.vercel.app"
  ]
}
```

**What This Tells You:**
- Project is live and ready
- Latest deployment completed successfully (READY state)
- Running Node.js 24.x
- Multiple domains configured for the project
- Last updated just now

### Example 2: Deployment History Tracking

**Data Fetched (Recent Deployments):**
```json
{
  "deployments": [
    {
      "id": "dpl_GGALAnMerUg76rpUok8Y1qXBRCe7",
      "name": "elite-bridge-app",
      "url": "elite-bridge-mg6czxk3u-evanson-saitoti-s-projects.vercel.app",
      "created": 1781565874069,
      "state": "READY",
      "target": "production",
      "creator": {
        "username": "evansonsaitoti",
        "email": "evansonsaitoti@gmail.com"
      },
      "meta": {
        "githubCommitMessage": "Update HTML with working button functionality and add cache busting",
        "githubCommitSha": "24afa46938da0874b00baf2273fc22972b580636",
        "githubCommitRef": "main"
      }
    },
    {
      "id": "dpl_9sLA6EUGQhAPaPyXL3XAFngnZSHn",
      "created": 1781565466665,
      "state": "READY",
      "meta": {
        "githubCommitMessage": "Add smooth animations and transitions throughout the web app"
      }
    }
  ]
}
```

**What This Tells You:**
- Complete deployment history with timestamps
- Git integration showing commit messages and authors
- Deployment states for each version
- Ability to track changes over time

### Example 3: Build Log Analysis

**Data Fetched (Build Logs):**
```json
{
  "events": [
    {
      "created": 1781565875717,
      "text": "Running build in Washington, D.C., USA (East) – iad1",
      "type": "stdout"
    },
    {
      "created": 1781565875718,
      "text": "Build machine configuration: 2 cores, 8 GB",
      "type": "stdout"
    },
    {
      "created": 1781565875823,
      "text": "Cloning github.com/evansonsaitoti/Elite-Bridge-App (Branch: main, Commit: 24afa46)",
      "type": "stdout"
    },
    {
      "created": 1781565876166,
      "text": "Cloning completed: 343.000ms",
      "type": "stdout"
    },
    {
      "created": 1781565876725,
      "text": "Build Completed in /vercel/output [17ms]",
      "type": "stderr"
    },
    {
      "created": 1781565877967,
      "text": "Deployment completed",
      "type": "stdout"
    }
  ]
}
```

**What This Tells You:**
- Build location and machine specs
- Repository cloning status and duration
- Build process timing (17ms - very fast!)
- Deployment completion confirmation
- No errors or warnings in this build

---

## How to Use the Vercel MCP Connector

### Step 1: List Your Teams
```bash
manus-mcp-cli tool call list_teams --server vercel --input '{}'
```

### Step 2: Get Your Team ID
From the response, extract the `id` field (starts with `team_`)

### Step 3: List Your Projects
```bash
manus-mcp-cli tool call list_projects --server vercel --input '{"teamId":"team_5zSYrLwON3b1ooU9bikc8Z1G"}'
```

### Step 4: Get Project Details
```bash
manus-mcp-cli tool call get_project --server vercel --input '{"projectId":"prj_mk4WbfZvpf3PVtUzFsyKkIS3qrcJ","teamId":"team_5zSYrLwON3b1ooU9bikc8Z1G"}'
```

### Step 5: View Deployments
```bash
manus-mcp-cli tool call list_deployments --server vercel --input '{"projectId":"prj_mk4WbfZvpf3PVtUzFsyKkIS3qrcJ","teamId":"team_5zSYrLwON3b1ooU9bikc8Z1G"}'
```

### Step 6: Check Build Logs
```bash
manus-mcp-cli tool call get_deployment_build_logs --server vercel --input '{"idOrUrl":"dpl_GGALAnMerUg76rpUok8Y1qXBRCe7","teamId":"team_5zSYrLwON3b1ooU9bikc8Z1G"}'
```

---

## Use Cases

### 1. **Automated Deployment Monitoring**
- Track deployment status automatically
- Alert on failed builds
- Monitor build times and performance

### 2. **Debugging Production Issues**
- Access runtime logs to troubleshoot errors
- Review build logs to identify compilation issues
- Check deployment metadata for configuration problems

### 3. **CI/CD Integration**
- Programmatically trigger deployments
- Verify deployment success
- Rollback to previous versions if needed

### 4. **Documentation & Learning**
- Search Vercel docs for best practices
- Learn about new features
- Understand framework-specific configurations

### 5. **Domain & Infrastructure Management**
- Check domain availability
- Manage multiple domains per project
- Track project configuration

### 6. **Team Collaboration**
- Review deployment feedback threads
- Respond to comments on deployments
- Track deployment discussions

---

## Benefits

✅ **Automation**: Reduce manual deployment management  
✅ **Visibility**: Real-time project and deployment status  
✅ **Debugging**: Quick access to build and runtime logs  
✅ **Integration**: Seamless integration with AI workflows  
✅ **Efficiency**: Programmatic access to all Vercel features  
✅ **Monitoring**: Track deployments and performance metrics  

---

## Summary

The Vercel MCP connector is a powerful tool for managing, monitoring, and debugging your Vercel deployments. It provides complete visibility into your projects, deployments, and infrastructure, enabling both manual inspection and automated workflows. Whether you're debugging a failed deployment, monitoring project status, or integrating Vercel into a larger automation system, this connector provides all the necessary tools.
