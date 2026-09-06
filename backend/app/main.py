from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .logic import assess
from .models import Assessment, User
from .schemas import AssessmentInput, AssessmentResponse, DashboardResponse

Base.metadata.create_all(bind=engine)
app = FastAPI(title="PulseCheck Stress API", version="1.0.0")
frontend_origins = [origin.strip() for origin in os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serialize(assessment: Assessment) -> dict:
    result = {key: getattr(assessment, key) for key in (
        "id", "stress_score", "stress_level", "summary", "created_at",
        "sleep_duration", "work_hours", "mood_level", "screen_time",
        "physical_activity", "heart_rate", "blood_oxygen"
    )}
    import json
    result["factors"] = json.loads(assessment.factors)
    result["recommendations"] = json.loads(assessment.recommendations)
    return result


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/users/{email}/dashboard", response_model=DashboardResponse)
def dashboard(email: str, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    assessments = db.scalars(
        select(Assessment).where(Assessment.user_id == user.id).order_by(Assessment.created_at.desc())
    ).all()
    return {"user": user, "latest": serialize(assessments[0]) if assessments else None,
            "history": [serialize(item) for item in assessments]}


@app.post("/api/assessments", response_model=AssessmentResponse)
def create_assessment(payload: AssessmentInput, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user:
        user = User(name=payload.name, email=payload.email)
        db.add(user)
        db.flush()
    else:
        user.name = payload.name
    result = assess(payload.model_dump())
    assessment = Assessment(user_id=user.id, **payload.model_dump(exclude={"name", "email"}), **result)
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return serialize(assessment)
