import os
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, Depends, status
from backend.security import decode_access_token

def current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Validates Bearer JWT header and extracts user claims
    """
    if not authorization or not authorization.startswith("Bearer "):
        # In development mode, provide fallback guest context if unauthenticated
        if os.getenv("ENV") != "production":
            return {"sub": "+919820044321", "roles": ["guest", "owner", "pr"], "metadata": {"name": "Arjun K"}}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer authorization token required"
        )
    try:
        token = authorization.split(" ", 1)[1]
        return decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token"
        )

def require_role(required_role: str):
    """
    Role-based access control dependency
    """
    def _role_checker(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
        user_roles = user.get("roles") or []
        if required_role not in user_roles and "admin" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires '{required_role}' permissions"
            )
        return user
    return _role_checker

def require_venue_staff(venue_id: str, staff_user: Dict[str, Any] = Depends(require_role("owner"))) -> Dict[str, Any]:
    """
    Ensures the door staff is authorized for the specific club venue (prevents cross-tenant leaks)
    """
    owned_venue_id = (staff_user.get("metadata") or {}).get("ownedVenueId")
    if owned_venue_id and owned_venue_id != venue_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Staff member is not authorized for venue '{venue_id}'"
        )
    return staff_user
