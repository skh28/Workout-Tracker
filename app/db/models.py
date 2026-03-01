from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str


class PasswordResetToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="user.id")
    expires_at: datetime


class WorkoutBase(SQLModel):
    name: str
    description: Optional[str] = None
    workout_type: str
    started_at: datetime
    duration_minutes: int
    avg_heart_rate_bpm: Optional[int] = None
    active_calories: Optional[int] = None
    total_calories: Optional[int] = None


class Workout(WorkoutBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
