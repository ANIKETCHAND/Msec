"""Authentication Endpoints."""

import uuid
import json
import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.db_models import UserModel, AuditLogModel
from app.schemas.auth import LoginRequest, GoogleLoginRequest, TokenResponse, UserResponse
from app.services.auth_service import auth_service
from app.middleware.rbac import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, issuing an HMAC-signed Bearer Token."""
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if not user or not auth_service.verify_password(payload.password, user.password_hash):
        # Audit failed login attempt
        audit_entry = AuditLogModel(
            actor=payload.email,
            role="Unauthenticated",
            action="LOGIN_FAILED",
            entity_type="User",
            entity_id=payload.email,
            details=f"Failed login attempt for {payload.email}.",
            status="failed"
        )
        db.add(audit_entry)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or deactivated."
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)

    # Audit successful login
    audit_entry = AuditLogModel(
        actor=user.email,
        role=user.role,
        action="LOGIN_SUCCESS",
        entity_type="User",
        entity_id=user.id,
        details=f"User {user.full_name} logged in successfully with role {user.role}.",
        status="success"
    )
    db.add(audit_entry)
    db.commit()

    token = auth_service.create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.full_name
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        email=user.email,
        name=user.full_name
    )


@router.post("/google", response_model=TokenResponse)
def login_with_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Authenticate or provision clinical user via Google OAuth."""
    email = payload.email
    name = payload.name
    picture = payload.picture

    # If Google ID Token credential was provided, extract payload claims
    if payload.credential:
        try:
            parts = payload.credential.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                claims = json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))
                email = claims.get("email") or email
                name = claims.get("name") or name
                picture = claims.get("picture") or picture
        except Exception as e:
            print(f"[Auth] Warning: Could not parse Google ID token claims: {e}")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid Google account email is required."
        )

    # 1. Look up existing user by email
    user = db.query(UserModel).filter(UserModel.email == email).first()

    if not user:
        # 2. Provision new Google-authenticated user
        assigned_role = payload.role if payload.role in ["Administrator", "Security Analyst", "Doctor Demo"] else "Security Analyst"
        user = UserModel(
            id=f"usr-goog-{uuid.uuid4().hex[:8]}",
            email=email,
            full_name=name or email.split("@")[0].replace(".", " ").title(),
            role=assigned_role,
            is_active=True,
            password_hash="oauth_google_verified",
            created_at=datetime.now(timezone.utc),
            last_login=datetime.now(timezone.utc)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        audit_entry = AuditLogModel(
            actor=user.email,
            role=user.role,
            action="USER_PROVISIONED_GOOGLE",
            entity_type="User",
            entity_id=user.id,
            details=f"Clinical user {user.full_name} enrolled via Google Sign-In with role {user.role}.",
            status="success"
        )
        db.add(audit_entry)
        db.commit()
    else:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended or deactivated."
            )
        user.last_login = datetime.now(timezone.utc)

    # Audit login success
    audit_entry = AuditLogModel(
        actor=user.email,
        role=user.role,
        action="LOGIN_GOOGLE_SUCCESS",
        entity_type="User",
        entity_id=user.id,
        details=f"User {user.full_name} authenticated via Google OAuth with role {user.role}.",
        status="success"
    )
    db.add(audit_entry)
    db.commit()

    token = auth_service.create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.full_name,
        "picture": picture,
        "auth_provider": "google"
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        email=user.email,
        name=user.full_name
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserModel = Depends(get_current_user)):
    """Returns profile information for the authenticated user session."""
    return current_user


@router.post("/logout")
def logout(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logs out user and records session termination in audit trail."""
    audit_entry = AuditLogModel(
        actor=current_user.email,
        role=current_user.role,
        action="USER_LOGOUT",
        entity_type="User",
        entity_id=current_user.id,
        details=f"User {current_user.email} signed out.",
        status="success"
    )
    db.add(audit_entry)
    db.commit()
    return {"message": "Logged out successfully."}
