pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.prod.yml'
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

        stage('Build e deploy') {
            steps {
                // Segreto tenuto nello store credenziali di Jenkins (Secret file),
                // non su un path del filesystem host: Jenkins gira nel suo container
                // e non vede /opt/olivia. Stesso pattern del job budget-bot.
                withCredentials([file(credentialsId: 'olivia-env-prod', variable: 'ENV_FILE')]) {
                    sh '''
                        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build
                        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
                    '''
                }
            }
        }

        stage('Healthcheck') {
            steps {
                // Niente curl verso 127.0.0.1: da dentro il container Jenkins quello
                // è il SUO loopback, non quello del VPS host dove backend/frontend
                // sono davvero in ascolto. Si passa dal socket Docker (sempre valido,
                // indipendente dalla rete) invece che da una richiesta di rete.
                sh '''
                    sleep 5
                    for name in olivia-backend olivia-frontend; do
                        status=$(docker inspect --format="{{.State.Status}}" "$name" || echo "missing")
                        echo "$name: $status"
                        if [ "$status" != "running" ]; then
                            echo "ERRORE: $name non e' running"
                            docker logs --tail 50 "$name"
                            exit 1
                        fi
                    done
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
