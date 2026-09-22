// Requires the Allure Jenkins plugin (Manage Jenkins > Tools > Allure Commandline).
// The agent image is built from docker/Dockerfile: Playwright browsers + Node + Java 17.
pipeline {
  agent {
    dockerfile {
      filename 'docker/Dockerfile'
      args '--ipc=host'
    }
  }

  parameters {
    choice(name: 'BROWSERS', choices: ['chromium', 'all'], description: 'Browsers to run')
    choice(name: 'TEST_ENV', choices: ['production', 'staging'], description: 'Target environment')
    booleanParam(name: 'SHOWCASE_FAILURES', defaultValue: false, description: 'Include intentionally failing showcase tests')
  }

  environment {
    CI = 'true'
    BROWSERS = "${params.BROWSERS}"
    TEST_ENV = "${params.TEST_ENV}"
    SHOWCASE_FAILURES = "${params.SHOWCASE_FAILURES}"
  }

  options {
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  stages {
    stage('Install') {
      steps { sh 'npm ci' }
    }
    stage('Type check') {
      steps { sh 'npm run typecheck' }
    }
    stage('Test') {
      steps {
        // Do not fail the stage here; the Allure plugin marks the build UNSTABLE on test failures.
        sh 'npx playwright test || true'
      }
    }
  }

  post {
    always {
      // The Allure Jenkins plugin generates the report, keeps history/trends between builds
      // and writes executor.json automatically.
      allure([
        includeProperties: false,
        jdk: '',
        reportBuildPolicy: 'ALWAYS',
        results: [[path: 'allure-results']]
      ])
      archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
    }
  }
}
