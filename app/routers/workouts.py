from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.security import get_current_user
from app.db.database import get_session
from app.db.models import User, Workout
from app.schemas.workout import WorkoutCreate, WorkoutRead, WorkoutUpdate


router = APIRouter(prefix="/workouts", tags=["workouts"])


def _ensure_workout_owner(workout: Workout, current_user: User) -> None:
    if workout.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workout not found")


@router.post("", response_model=WorkoutRead)
def create_workout(
    workout_in: WorkoutCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_workout = Workout(
        user_id=current_user.id,
        name=workout_in.name,
        description=workout_in.description,
        workout_type=workout_in.workout_type,
        started_at=workout_in.started_at,
        duration_minutes=workout_in.duration_minutes,
        avg_heart_rate_bpm=workout_in.avg_heart_rate_bpm,
        active_calories=workout_in.active_calories,
        total_calories=workout_in.total_calories,
    )
    session.add(db_workout)
    session.commit()
    session.refresh(db_workout)
    return db_workout


@router.get("", response_model=List[WorkoutRead])
def list_workouts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return session.exec(
        select(Workout)
        .where(Workout.user_id == current_user.id)
        .order_by(Workout.started_at.desc())
    ).all()


@router.get("/{workout_id}", response_model=WorkoutRead)
def read_workout(
    workout_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    workout = session.get(Workout, workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    _ensure_workout_owner(workout, current_user)
    return workout


@router.patch("/{workout_id}", response_model=WorkoutRead)
def update_workout(
    workout_id: int,
    workout_in: WorkoutUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    db_workout = session.get(Workout, workout_id)
    if not db_workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    _ensure_workout_owner(db_workout, current_user)
    data = workout_in.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(db_workout, key, value)
    session.add(db_workout)
    session.commit()
    session.refresh(db_workout)
    return db_workout


@router.delete("/{workout_id}")
def delete_workout(
    workout_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    workout = session.get(Workout, workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    _ensure_workout_owner(workout, current_user)
    session.delete(workout)
    session.commit()
    return {"message": "Deleted"}
