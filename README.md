# Requirements
* Nodejs
* sqlite3/MySQL/MariaDB/Postgres

# Installation
## App

1. Download the source code

```
git clone 
```
2. Install the dependence and initialise the database

```
npm install
npx knex migrate:latest
```


3. Set environment variables by copy the dot-sample and change **environment variables**
```
cp dot-env .env
```

4. Start the server
```
npm run start
```

# Environment variables

Please fill the environment variable with the correct value thats unique to this bot

# Docker
```
docker build -t vst/burn-slacker.
```

```
# Create secret from environment variables
kubectl create secret generic wwbot-secrets --from-env-file=.env

# creat secret to pull data from the private repository
kubectl create secret generic regcred \
    --from-file=.dockerconfigjson=<path/to/.docker/config.json> \
    --type=kubernetes.io/dockerconfigjson
```
