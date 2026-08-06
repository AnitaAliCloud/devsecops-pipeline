# DevSecOps Pipeline — Jenkins, SonarCloud, Trivy & Docker Hub

A multi-stage CI/CD pipeline built with Jenkins Declarative Pipelines, demonstrating a "shift-left" DevSecOps workflow: code quality and security are checked *before* an image is ever built or shipped, not after.

## What this project does

A minimal Node.js/Express app is used as the subject of the pipeline — the real focus of this project is the **pipeline itself**, not the app. On every push, Jenkins automatically:

1. **Checks out** the latest code from this repository
2. **Installs dependencies and runs automated tests** (Jest + Supertest)
3. **Runs a SonarCloud code quality scan** — checking for bugs, code smells, and test coverage on the code
4. **Waits for the Quality Gate result** and halts the pipeline if the code doesn't meet the required standard
5. **Scans dependencies for known vulnerabilities** using Trivy (filesystem scan)
6. **Builds a Docker image** from the app
7. **Scans the built image** with Trivy again, this time checking the OS/base image layers too
8. **Pushes the image to Docker Hub** — but only if every step above passed

If any stage fails, the pipeline stops immediately and nothing insecure or low-quality gets built or shipped.

## Pipeline stages

| Stage | Tool | Purpose |
|---|---|---|
| Checkout | Git | Pull latest source code |
| Install & Test | npm, Jest | Install dependencies, run unit tests |
| Code Quality | SonarCloud | Static analysis for bugs, code smells, coverage |
| Quality Gate | SonarCloud API (polling) | Block the pipeline if quality standards aren't met |
| Security Scan | Trivy | Scan dependencies for known CVEs |
| Build Docker Image | Docker | Build the container image |
| Scan Docker Image | Trivy | Scan the built image, including OS packages |
| Push to Docker Hub | Docker | Publish the image, only if all checks passed |

## Tech stack

- **Jenkins** — pipeline orchestration (Declarative Pipeline syntax)
- **SonarCloud** — static code analysis and quality gate
- **Trivy** — vulnerability scanning (filesystem + container image)
- **Docker / Docker Hub** — containerization and image registry
- **Node.js / Express** — sample application
- **Jest / Supertest** — automated testing

## Notable implementation detail

SonarCloud's free/OSS plan doesn't support webhooks, so the standard `waitForQualityGate()` approach (which relies on SonarCloud calling back into Jenkins) doesn't work on this plan. Instead, this pipeline **polls** the SonarCloud API directly after analysis completes, checking the task status and quality gate result until a definitive answer is returned — see the `Quality Gate` stage in the `Jenkinsfile`.

## Security fixes applied during development

Static analysis surfaced several real findings that were fixed as part of building this pipeline:
- Disabled npm lifecycle scripts during install (`--ignore-scripts`) to prevent arbitrary code execution from dependencies
- Locked dependency versions with `package-lock.json` and switched to `npm ci` for reproducible builds
- Container now runs as a non-root user (`USER node`) instead of the image's default root user
- Disabled Express's `X-Powered-By` header to avoid disclosing framework/version information

## Running locally

```bash
npm install
npm test        # run tests with coverage
npm start        # run the app on port 3000
```

## Project structure

```
.
├── Jenkinsfile          # the full CI/CD pipeline definition
├── Dockerfile            # multi-stage build, runs as non-root
├── index.js               # Express app
├── index.test.js          # Jest/Supertest tests
├── package.json
├── package-lock.json
└── .gitignore
```