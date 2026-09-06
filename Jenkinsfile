pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    environment {
        DOCKERHUB_CREDENTIALS = 'dockerhub-creds'
        DOCKERHUB_NAMESPACE   = 'anitaalicloud'
        IMAGE_NAME            = 'devsecops-pipeline'
        IMAGE_TAG             = "${env.BUILD_NUMBER}"
        SONAR_PROJECT_KEY     = 'AnitaAliCloud_devsecops-pipeline'
        SONAR_ORG             = 'anitaalicloud'
        SCANNER_HOME          = tool 'SonarScanner'
    }

    stages {

        stage('Checkout') {
            steps {
                echo "Pulling source code from Git..."
                checkout scm
            }
        }

        stage('Install & Test') {
            steps {
                echo "Installing dependencies and running tests..."
                sh 'npm ci --ignore-scripts'
                sh 'npm test'
            }
        }

        stage('Code Quality') {
            steps {
                echo "Running SonarCloud static analysis..."
                withSonarQubeEnv('SonarQubeServer') {
                    sh """
                        ${SCANNER_HOME}/bin/sonar-scanner \
                          -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                          -Dsonar.organization=${SONAR_ORG} \
                          -Dsonar.sources=. \
                          -Dsonar.exclusions=node_modules/**,coverage/** \
                          -Dsonar.tests=. \
                          -Dsonar.test.inclusions=**/*.test.js \
                          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                          -Dsonar.host.url=${env.SONAR_HOST_URL} \
                          -Dsonar.login=${env.SONAR_AUTH_TOKEN}
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo "Polling SonarCloud for analysis result..."
                script {
                    def taskFile = readFile('.scannerwork/report-task.txt')
                    def ceTaskId = (taskFile =~ /ceTaskId=(.+)/)[0][1]

                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        timeout(time: 5, unit: 'MINUTES') {
                            waitUntil {
                                def response = sh(
                                    script: "curl -s -u \${SONAR_TOKEN}: https://sonarcloud.io/api/ce/task?id=${ceTaskId}",
                                    returnStdout: true
                                ).trim()
                                def status = (response =~ /"status":"(\w+)"/)[0][1]
                                echo "SonarCloud task status: ${status}"
                                return status == 'SUCCESS' || status == 'FAILED'
                            }
                        }

                        def analysisResponse = sh(
                            script: "curl -s -u \${SONAR_TOKEN}: https://sonarcloud.io/api/ce/task?id=${ceTaskId}",
                            returnStdout: true
                        ).trim()
                        def analysisId = (analysisResponse =~ /"analysisId":"([^"]+)"/)[0][1]

                        def gateResponse = sh(
                            script: "curl -s -u \${SONAR_TOKEN}: https://sonarcloud.io/api/qualitygates/project_status?analysisId=${analysisId}",
                            returnStdout: true
                        ).trim()
                        def gateStatus = (gateResponse =~ /"status":"(\w+)"/)[0][1]
                        echo "Quality Gate status: ${gateStatus}"

                        if (gateStatus != 'OK') {
                            error "Quality Gate failed: ${gateStatus}"
                        }
                    }
                }
            }
        }

        stage('Security Scan') {
            steps {
                echo "Scanning filesystem and dependencies for vulnerabilities with Trivy..."
                sh """
                    trivy fs \
                      --exit-code 1 \
                      --severity HIGH,CRITICAL \
                      --format table \
                      --ignore-unfixed \
                      . | tee trivy-fs-report.txt
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-fs-report.txt', allowEmptyArchive: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "Building Docker image..."
                sh """
                    docker build -t ${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} \
                                 -t ${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:latest .
                """
            }
        }

        stage('Scan Docker Image') {
            steps {
                echo "Scanning the built image with Trivy before pushing..."
                sh """
                    trivy image \
                      --exit-code 1 \
                      --severity HIGH,CRITICAL \
                      --ignore-unfixed \
                      ${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} | tee trivy-image-report.txt
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-image-report.txt', allowEmptyArchive: true
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo "Pushing image to Docker Hub..."
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKERHUB_CREDENTIALS}",
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                        docker push ${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:latest
                        docker logout
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                echo "Deploying the new container..."
                sh """
                    docker rm -f devsecops-pipeline-app || true
                    docker run -d \
                      --name devsecops-pipeline-app \
                      --restart unless-stopped \
                      -p 3000:3000 \
                      ${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
        }
    }

    post {
        success {
            echo "Pipeline completed successfully: ${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} deployed."
        }
        failure {
            echo "Pipeline failed. Check the stage logs above for details."
        }
        always {
            sh """
                docker rmi ${DOCKERHUB_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} || true
            """
            cleanWs()
        }
    }
}