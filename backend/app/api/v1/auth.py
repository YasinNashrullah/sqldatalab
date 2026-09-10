import uuid
from fastapi import APIRouter, Depends, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, case
from backend.app.core.config import settings
from backend.app.core.rate_limit import limiter
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
)
from backend.app.core.errors import InvalidCredentialsError, AppException
from backend.app.models.base import get_db
from backend.app.models.user import User
from backend.app.models.workspace import Workspace, WorkspaceMember
from backend.app.models.query import QueryHistory
from backend.app.models.challenge import Challenge, ChallengeAttempt
from backend.app.models.dataset import Dataset, DatasetTable
from backend.app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    ProfileUpdate,
    ChangePasswordRequest,
)
from backend.app.schemas.base import success_envelope
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@limiter.limit("3/minute")
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegister,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_auth")

    # Check if username or email exists
    exist_query = select(User).where(
        or_(User.email == payload.email, User.username == payload.username)
    )
    existing = await db.execute(exist_query)
    if existing.scalar_one_or_none():
        raise AppException(
            code="USER_ALREADY_EXISTS",
            message="A user with this email or username already exists.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Create new user
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=payload.email,
        username=payload.username,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name or payload.username,
    )
    db.add(user)

    # Automatically create a default personal workspace for the new user
    ws_id = str(uuid.uuid4())
    ws_dir = settings.WORKSPACES_DIR / ws_id
    ws_dir.mkdir(parents=True, exist_ok=True)
    duckdb_file = str((ws_dir / "analytics.duckdb").resolve())
    workspace = Workspace(
        id=ws_id,
        owner_id=user_id,
        name=f"{payload.username}'s Lab",
        slug=f"{payload.username.lower()}-lab",
        description="Default personal analytical workspace",
        duckdb_path=duckdb_file,
    )
    db.add(workspace)

    member = WorkspaceMember(
        id=str(uuid.uuid4()),
        workspace_id=ws_id,
        user_id=user_id,
        role="owner",
    )
    db.add(member)

    await db.commit()
    await db.refresh(user)

    # Generate token
    token = create_access_token({"sub": user.id})

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="none",
        secure=True,
    )

    data = {
        "user": UserResponse.model_validate(user).model_dump(),
        "default_workspace_id": ws_id,
    }
    return success_envelope(data, req_id)


@limiter.limit("5/minute")
@router.post("/login")
async def login(
    payload: UserLogin,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_auth")

    query = select(User).where(
        or_(
            User.email == payload.username_or_email,
            User.username == payload.username_or_email,
        )
    )
    res = await db.execute(query)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise InvalidCredentialsError()

    token = create_access_token({"sub": user.id})

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="none",
        secure=True,
    )

    ws_query = select(Workspace).where(Workspace.owner_id == user.id)
    ws_res = await db.execute(ws_query)
    workspaces = ws_res.scalars().all()
    default_ws_id = workspaces[0].id if workspaces else None

    data = {
        "user": UserResponse.model_validate(user).model_dump(),
        "default_workspace_id": default_ws_id,
    }
    return success_envelope(data, req_id)


@router.post("/logout")
async def logout(response: Response, request: Request):
    req_id = getattr(request.state, "request_id", "req_auth")
    response.delete_cookie(settings.COOKIE_NAME)
    return success_envelope({"message": "Successfully logged out."}, req_id)


@router.get("/me")
async def get_me(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_auth")

    # Get user's workspaces
    ws_query = select(Workspace).where(Workspace.owner_id == user.id)
    ws_res = await db.execute(ws_query)
    workspaces = ws_res.scalars().all()

    ws_data = [
        {"id": w.id, "name": w.name, "slug": w.slug, "description": w.description}
        for w in workspaces
    ]

    data = {
        "user": UserResponse.model_validate(user).model_dump(),
        "workspaces": ws_data,
        "max_workspaces": 1 if user.is_demo else 3,
    }
    return success_envelope(data, req_id)


@router.get("/profile")
async def get_profile(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_profile")

    # Query history aggregation metrics
    hist_stats = await db.execute(
        select(
            func.count(QueryHistory.id).label("total"),
            func.sum(case((QueryHistory.status == "SUCCESS", 1), else_=0)).label(
                "success"
            ),
            func.sum(case((QueryHistory.status == "ERROR", 1), else_=0)).label(
                "errors"
            ),
            func.avg(QueryHistory.duration_ms).label("avg_duration"),
            func.sum(QueryHistory.row_count).label("total_rows"),
        ).where(QueryHistory.user_id == user.id)
    )
    h_row = hist_stats.first()
    total_queries = h_row.total or 0 if h_row else 0
    successful_queries = h_row.success or 0 if h_row else 0
    failed_queries = h_row.errors or 0 if h_row else 0
    avg_duration = round(float(h_row.avg_duration or 0), 2) if h_row else 0.0
    total_rows = int(h_row.total_rows or 0) if h_row else 0
    success_rate = (
        round((successful_queries / total_queries * 100), 1)
        if total_queries > 0
        else 0.0
    )

    # Challenge progress and experience metrics
    passed_challenges_query = (
        select(ChallengeAttempt.challenge_id)
        .where(ChallengeAttempt.user_id == user.id, ChallengeAttempt.is_passed == True)
        .distinct()
    )
    passed_res = await db.execute(passed_challenges_query)
    passed_ids = [r[0] for r in passed_res.all()]
    challenges_passed = len(passed_ids)

    total_xp = 0
    if passed_ids:
        try:
            xp_res = await db.execute(
                select(func.sum(Challenge.points_xp)).where(
                    Challenge.id.in_(passed_ids)
                )
            )
            total_xp = xp_res.scalar() or 0
        except Exception:
            total_xp = challenges_passed * 100

    total_challenges_count_res = await db.execute(select(func.count(Challenge.id)))
    total_challenges = total_challenges_count_res.scalar() or 0

    # Calculate user rank tier based on experience points
    if total_xp >= 1000:
        rank_title = "Query Grandmaster"
    elif total_xp >= 600:
        rank_title = "SQL Expert"
    elif total_xp >= 300:
        rank_title = "SQL Analyst"
    elif total_xp >= 100:
        rank_title = "Data Apprentice"
    else:
        rank_title = "SQL Novice"

    # Aggregate workspace and dataset counts
    ws_res = await db.execute(select(Workspace).where(Workspace.owner_id == user.id))
    workspaces = ws_res.scalars().all()
    workspaces_count = len(workspaces)
    ws_ids = [w.id for w in workspaces]

    datasets_count = 0
    tables_count = 0
    if ws_ids:
        ds_count_res = await db.execute(
            select(func.count(Dataset.id)).where(Dataset.workspace_id.in_(ws_ids))
        )
        datasets_count = ds_count_res.scalar() or 0

        tbl_count_res = await db.execute(
            select(func.count(DatasetTable.id))
            .join(Dataset, Dataset.id == DatasetTable.dataset_id)
            .where(Dataset.workspace_id.in_(ws_ids))
        )
        tables_count = tbl_count_res.scalar() or 0

    return success_envelope(
        {
            "user": UserResponse.model_validate(user).model_dump(),
            "stats": {
                "total_queries": total_queries,
                "successful_queries": successful_queries,
                "failed_queries": failed_queries,
                "success_rate_pct": success_rate,
                "avg_duration_ms": avg_duration,
                "total_rows_processed": total_rows,
                "challenges_passed": challenges_passed,
                "total_challenges": total_challenges,
                "total_xp": total_xp,
                "rank_title": rank_title,
                "workspaces_count": workspaces_count,
                "max_workspaces": 1 if user.is_demo else 3,
                "datasets_count": datasets_count,
                "tables_count": tables_count,
            },
        },
        req_id,
    )


@router.put("/profile")
async def update_profile(
    payload: ProfileUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_profile_update")
    if payload.email is not None and payload.email != user.email:
        # Check if email taken
        exist = await db.execute(select(User).where(User.email == payload.email))
        if exist.scalar_one_or_none():
            raise AppException(
                code="EMAIL_IN_USE",
                message="Email ini sudah digunakan oleh akun lain.",
                status_code=400,
            )
        user.email = payload.email

    if payload.full_name is not None:
        user.full_name = payload.full_name

    await db.commit()
    await db.refresh(user)
    return success_envelope(
        {
            "message": "Profil berhasil diperbarui.",
            "user": UserResponse.model_validate(user).model_dump(),
        },
        req_id,
    )


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_pw")
    if not verify_password(payload.current_password, user.hashed_password):
        raise AppException(
            code="INVALID_PASSWORD",
            message="Password saat ini tidak sesuai.",
            status_code=400,
        )

    if len(payload.new_password) < 6:
        raise AppException(
            code="WEAK_PASSWORD",
            message="Password baru minimal 6 karakter.",
            status_code=400,
        )

    user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()
    return success_envelope({"message": "Password berhasil diperbarui."}, req_id)
