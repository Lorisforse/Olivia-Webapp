pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.prod.yml'
        // File con i segreti/URL reali, tenuto SOLO sul VPS, mai nel repo.
        // Va creato una volta a mano copiando .env.prod.example.
        ENV_FILE = '/opt/olivia/.env.prod'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timestamps()
    }

    triggers {
        // Un webhook GitHub->Jenkins non funzionerebbe qui: Jenkins sta dietro il
        // firewall IONOS che accetta solo l'IP di casa, i server di GitHub
        // arriverebbero da IP diversi e sarebbero bloccati. Polling invece parte
        // da dentro (Jenkins chiede a GitHub), stesso pattern del job budget-bot.
        pollSCM('H/2 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build immagini') {
            steps {
                sh 'docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d'
            }
        }

        stage('Healthcheck') {
            steps {
                sh '''
                    sleep 5
                    curl -fsS http://127.0.0.1:8001/ > /dev/null || (echo "Backend non risponde" && exit 1)
                    curl -fsS http://127.0.0.1:8082/ > /dev/null || (echo "Frontend non risponde" && exit 1)
                '''
            }
        }

        stage('Pulizia immagini vecchie') {
            steps {
                sh 'docker image prune -f'
            }
        }
    }

    post {
        failure {
            echo 'Deploy fallito: controllare i log dello stage che ha fallito prima di indagare sul VPS.'
        }
    }
}
