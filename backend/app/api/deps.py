from typing import Annotated
from fastapi import Depends, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.core.config import settings
from backend.app.core.errors import UnauthorizedError, ForbiddenError, NotFoundError
from backend.app.core.security import decode_access_token
from backend.app.models.base import get_db
from backend.app.models.user import User
from backend.app.models.workspace import Workspace, WorkspaceMember


async def get_current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and authenticate the user from cookie or Authorization header."""
    token = None
    
    # Resolve token from secure cookie
    cookie_token = request.cookies.get(settings.COOKIE_NAME)
    if cookie_token:
        token = cookie_token
    # Fallback to Authorization bearer header
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        raise UnauthorizedError("No session cookie or authentication token found.")

    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid token payload: missing subject.")

    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("User account associated with this session no longer exists.")
    if not user.is_active:
        raise UnauthorizedError("User account has been deactivated.")

    return user


async def verify_workspace_access(
    workspace_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    """Verifies that the current user owns or is a member of the workspace."""
    # Verify workspace ownership
    query = select(Workspace).where(Workspace.id == workspace_id)
    result = await db.execute(query)
    workspace = result.scalar_one_or_none()

    if not workspace:
        raise NotFoundError("Workspace not found.")

    if workspace.owner_id == user.id:
        return workspace

    # Verify shared workspace membership
    mem_query = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
    )
    mem_res = await db.execute(mem_query)
    if not mem_res.scalar_one_or_none():
        raise ForbiddenError("You do not have permission to access this workspace.")

    return workspace
