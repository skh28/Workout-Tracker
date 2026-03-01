from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class WorkoutCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workout_type: str
    started_at: datetime
    duration_minutes: int
    avg_heart_rate_bpm: Optional[int] = None
    active_calories: Optional[int] = None
    total_calories: Optional[int] = None


class WorkoutRead(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    workout_type: str
    started_at: datetime
    duration_minutes: int
    avg_heart_rate_bpm: Optional[int] = None
    active_calories: Optional[int] = None
    total_calories: Optional[int] = None

    class Config:
        from_attributes = True


class WorkoutUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    workout_type: Optional[str] = None
    started_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    avg_heart_rate_bpm: Optional[int] = None
    active_calories: Optional[int] = None
    total_calories: Optional[int] = None
