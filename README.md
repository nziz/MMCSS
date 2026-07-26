# MMCSS - Mobile Money Credit Scoring System

AI-powered loan scoring platform built with Django REST API and React.

## Tech Stack
- **Backend:** Django REST Framework, Python 3.x, scikit-learn
- **Frontend:** React (inline styles)
- **Database:** SQLite (development)
- **ML Model:** Random Forest for default risk prediction

## Features
- RESTful API for loan application submission and management
- Real-time credit score prediction via ML endpoint
- Responsive React dashboard for loan officers
- Data visualization of risk metrics

## Project Structure
```
mmcss/
├── backend/          Django project (mmcss_backend + scoring app)
├── frontend/         React dashboard
└── screenshots/      UI previews
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/loans/ | Submit new loan application |
| GET | /api/loans/ | List all applications |
| GET | /api/loans/\<id\>/ | Retrieve specific application |
| POST | /api/score/ | Get ML credit score |
| GET | /api/dashboard/ | Portfolio analytics |

## How to Run

### Backend
```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Server runs at `http://127.0.0.1:8000`

### Frontend
```bash
cd frontend
npm install
npm start
```
App runs at `http://localhost:3000`

## Screenshots
![Dashboard](screenshots/dashboard.png)
![Login Form](screenshots/login.png)


## Author
NZIZA AIME OCTAVE  
[LinkedIn](www.linkedin.com/in/ao-nziza) | [Email](nziza1999@gmail.com )
