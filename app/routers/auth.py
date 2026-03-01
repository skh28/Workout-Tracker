import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.db.database import get_session
from app.db.models import PasswordResetToken, User
from app.schemas.user import ForgotPasswordRequest, ResetPasswordRequest, UserCreate, UserRead, Token


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
def register(user_in: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=user_in.email, hashed_password=hash_password(user_in.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == form.username)).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password")
def forgot_password(
    body: ForgotPasswordRequest,
    session: Session = Depends(get_session),
):
    settings = get_settings()
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user:
        return {"message": "If an account exists with that email, you will receive reset instructions."}
    token_str = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.password_reset_expire_minutes)
    reset_token = PasswordResetToken(token=token_str, user_id=user.id, expires_at=expires_at)
    session.add(reset_token)
    session.commit()
    reset_link = f"{settings.frontend_base_url.rstrip('/')}/?reset_token={token_str}"
    import logging
    logging.getLogger("uvicorn.error").info("Password reset link (dev): %s", reset_link)
    return {
        "message": "If an account exists with that email, you will receive reset instructions.",
        "reset_link": reset_link,
    }


@router.post("/reset-password")
def reset_password(
    body: ResetPasswordRequest,
    session: Session = Depends(get_session),
):
    reset = session.exec(select(PasswordResetToken).where(PasswordResetToken.token == body.token)).first()
    if not reset or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    user = session.get(User, reset.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    user.hashed_password = hash_password(body.new_password)
    session.add(user)
    session.delete(reset)
    session.commit()
    return {"message": "Password has been reset. You can log in with your new password."}
