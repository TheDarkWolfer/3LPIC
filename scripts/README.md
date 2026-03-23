# Coursero Correction System

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  API Server │────▶│   MongoDB   │
│  (React)    │     │  (Express)  │     │  (Queue)    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   Worker    │
                                        │  (Python)   │
                                        └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Firejail   │
                                        │  (Sandbox)  │
                                        └─────────────┘
```

## Components

### 1. Correction Script (`scripts/correction.py`)
- Executes student code in Firejail sandbox
- Compares output with expected results
- Supports Python and C languages
- Security features:
  - No network access
  - CPU time limit (10s)
  - Memory limit (256MB)
  - Restricted filesystem access
  - Seccomp filtering

### 2. Queue Worker (`scripts/queue_worker.py`)
- Polls MongoDB for pending submissions
- FIFO processing order
- Updates grades and best scores
- Cleans up submission files

### 3. API Server (`server/index.js`)
- File upload endpoint
- Submission status polling
- User grades retrieval
- Queue statistics

### 4. Frontend (`website/src/devoir.tsx`)
- Language selection (Python/C)
- File upload
- Real-time status updates
- Grade display with test details

## Deployment

### Prerequisites
```bash
# On Linux servers
sudo apt update
sudo apt install firejail python3 python3-pip gcc nodejs npm mongodb-org

pip3 install pymongo
```

### Directory Structure
```
/var/www/coursero/
├── scripts/
│   ├── correction.py
│   ├── queue_worker.py
│   └── seed_db.py
├── exercises/
│   └── <course_id>/
│       └── <exercise_id>/
│           └── tests.json
├── submissions/  (temporary files)
└── website/      (built React app)
```

### Installation Steps

1. **Create system user**
```bash
sudo useradd -r -s /bin/false coursero
sudo mkdir -p /var/www/coursero/{scripts,exercises,submissions}
sudo mkdir -p /var/log/coursero
sudo chown -R coursero:coursero /var/www/coursero /var/log/coursero
```

2. **Deploy scripts**
```bash
sudo cp scripts/*.py /var/www/coursero/scripts/
sudo chmod +x /var/www/coursero/scripts/*.py
```

3. **Deploy exercises**
```bash
sudo cp -r exercises/* /var/www/coursero/exercises/
```

4. **Install systemd service**
```bash
sudo cp scripts/coursero-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable coursero-worker
sudo systemctl start coursero-worker
```

5. **Seed database**
```bash
python3 /var/www/coursero/scripts/seed_db.py
```

6. **Deploy API server**
```bash
cd server
npm install
# Configure .env
cp .env.example .env
# Start with PM2 or systemd
pm2 start index.js --name coursero-api
```

7. **Build and deploy frontend**
```bash
cd website
npm install
npm run build
sudo cp -r dist/* /var/www/www.coursero.com/
```

## Test Exercise Format (tests.json)

```json
{
  "exercise_id": "ex1",
  "course_id": "docker",
  "title": "Hello World",
  "tests": [
    {
      "name": "Basic output",
      "args": [],
      "expected_output": "Hello, World!"
    },
    {
      "name": "With argument",
      "args": ["John"],
      "expected_output": "Hello, John!"
    }
  ]
}
```

## Security Considerations

- Firejail sandboxing prevents:
  - Network access
  - File system modifications
  - Process spawning (limited)
  - System calls (seccomp)
- Resource limits prevent DoS
- Files deleted after correction
- No root privileges for execution

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submit` | Submit code for correction |
| GET | `/api/submissions/:id` | Get submission status |
| GET | `/api/users/:email/submissions` | Get user's submissions |
| GET | `/api/users/:email/grades` | Get user's best grades |
| GET | `/api/courses` | List all courses |
| GET | `/api/courses/:id/exercises` | List exercises for course |
| GET | `/api/queue/stats` | Queue statistics |

## Monitoring

Check worker status:
```bash
sudo systemctl status coursero-worker
journalctl -u coursero-worker -f
```

Check queue:
```bash
curl http://localhost:3001/api/queue/stats
```
