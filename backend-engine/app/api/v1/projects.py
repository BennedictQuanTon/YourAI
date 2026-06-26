from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from app.db.session import get_db
from app.db.models import Project, ProjectMember, User
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectMemberInvite, ProjectMemberResponse
from app.api.dependencies.dependencies import get_current_user
from app.core.rate_limit import rate_limiter
from app.worker.trigger import enqueue_background_job
from app.core.config import settings
from pydantic import BaseModel
from typing import Optional
from app.services.llm_parser import LLMParser
from datetime import datetime

class RemindPreviewRequest(BaseModel):
    raw_content: str
    member_email: Optional[str] = None
    member_name: Optional[str] = None
    reminder_time: Optional[str] = None

class CustomRemindSendRequest(BaseModel):
    member_email: str
    member_name: str
    subject: str
    html_content: str

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = Project(
        title=payload.title,
        timeline_start=payload.timeline_start.replace(tzinfo=None) if payload.timeline_start else None,
        timeline_end=payload.timeline_end.replace(tzinfo=None) if payload.timeline_end else None,
        status=payload.status or "active",
        manager_id=current_user.id,
        user_id=current_user.id
    )
    db.add(project)
    await db.flush()
    
    # Auto-add the manager as an active member
    manager_member = ProjectMember(
        project_id=project.id,
        email=current_user.email,
        full_name=current_user.full_name or current_user.email.split('@')[0].capitalize(),
        status="active"
    )
    db.add(manager_member)
    await db.commit()
    
    # Reload with members relationship loaded
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.members))
        .filter(Project.id == project.id)
    )
    return result.scalars().first()

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch projects where the user is either the manager or a member
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.members))
        .outerjoin(ProjectMember, ProjectMember.project_id == Project.id)
        .filter((Project.manager_id == current_user.id) | (ProjectMember.email == current_user.email))
        .distinct()
    )
    projects = result.scalars().all()
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.members))
        .filter(Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Check authorization
    member_emails = [m.email for m in project.members]
    if project.manager_id != current_user.id and current_user.email not in member_emails:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
    return project

@router.post("/{project_id}/members", response_model=ProjectMemberResponse)
async def invite_member(
    project_id: str,
    payload: ProjectMemberInvite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify project exists and user is manager
    result = await db.execute(
        select(Project).filter(Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project managers can invite members")
        
    # Check if already a member
    member_result = await db.execute(
        select(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.email == payload.email)
    )
    existing_member = member_result.scalars().first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already invited or a member of this project")
        
    member = ProjectMember(
        project_id=project_id,
        email=payload.email,
        full_name=payload.full_name or payload.email.split('@')[0].capitalize(),
        role=payload.role or "Member",
        status=payload.status or "active"
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member

from pydantic import BaseModel
from typing import Optional

class ProjectMemberUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

@router.put("/{project_id}/members/{member_id}", response_model=ProjectMemberResponse)
async def update_project_member(
    project_id: str,
    member_id: str,
    payload: ProjectMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).filter(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project managers can manage members")

    member_result = await db.execute(
        select(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.id == member_id)
    )
    member = member_result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if payload.full_name is not None:
        member.full_name = payload.full_name
    if payload.role is not None:
        member.role = payload.role
    if payload.status is not None:
        member.status = payload.status

    await db.commit()
    await db.refresh(member)
    return member

@router.delete("/{project_id}/members/{member_id}")
async def delete_project_member(
    project_id: str,
    member_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).filter(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project managers can manage members")

    member_result = await db.execute(
        select(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.id == member_id)
    )
    member = member_result.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(member)
    await db.commit()
    return {"status": "success", "message": "Member removed successfully"}

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.manager_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not authorized")
        
    if payload.title is not None:
        project.title = payload.title
    if payload.timeline_start is not None:
        project.timeline_start = payload.timeline_start.replace(tzinfo=None) if payload.timeline_start else None
    if payload.timeline_end is not None:
        project.timeline_end = payload.timeline_end.replace(tzinfo=None) if payload.timeline_end else None
    if payload.status is not None:
        project.status = payload.status
        
    await db.commit()
    
    # Reload with members relationship loaded
    stmt = select(Project).options(selectinload(Project.members)).filter(Project.id == project_id)
    res = await db.execute(stmt)
    return res.scalars().first()

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Project).filter(Project.id == project_id, Project.manager_id == current_user.id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not authorized")
        
    await db.delete(project)
    await db.commit()
    return None

@router.post("/{project_id}/bulk-mail")
async def send_bulk_mail(
    project_id: str,
    message_content: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    PM route to dispatch bulk notifications.
    Rate Limit: 1 request per 30 minutes per project.
    """
    # 1. Enforce rate limiter on (bulk, project_id)
    await rate_limiter(request, "bulk", project_id)
    
    # 2. Verify project exists and user is authorized (PM)
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.members))
        .filter(Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project managers can send bulk mails")
        
    # 3. Compile list of active project members
    members = project.members
    if not members:
        return {"status": "success", "message": "No members to send emails to"}
        
    # 4. Trigger background job for each member using the ARQ worker enqueuer
    sent_count = 0
    for member in members:
        # Enqueue background task
        # args: (to_email, subject, template_name, context)
        await enqueue_background_job(
            "send_email_task",
            member.email,
            f"Thông báo quan trọng từ dự án: {project.title}",
            "bulk_mail.html",
            {
                "member_name": member.email.split("@")[0].capitalize(),
                "message_content": message_content,
                "action_url": f"{settings.FRONTEND_URL}/project/{project_id}"
            }
        )
        sent_count += 1
        
    return {
        "status": "success", 
        "message": f"Successfully queued {sent_count} notification emails in ARQ."
    }

@router.post("/{project_id}/remind-preview")
async def remind_preview(
    project_id: str,
    payload: RemindPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate Gemini premium email reminder draft preview.
    """
    result = await db.execute(
        select(Project).filter(Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    preview_dict = LLMParser.generate_email_preview(
        raw_content=payload.raw_content,
        member_name=payload.member_name,
        project_title=project.title
    )
    
    # Inject reminder time if provided to make it look even more premium
    if payload.reminder_time:
        try:
            # Parse localized readable date/time
            dt = datetime.fromisoformat(payload.reminder_time.replace('Z', '+00:00'))
            formatted_time = dt.strftime("%H:%M:%S ngày %d/%m/%Y")
            preview_dict["html_content"] = preview_dict["html_content"].replace(
                "</h4>",
                f"</h4><p style='font-size: 13px; color: #D4AF37; margin-bottom: 8px;'>⏰ <strong>Thời gian nhắc hẹn:</strong> {formatted_time}</p>"
            )
        except Exception:
            pass
            
    return preview_dict

@router.post("/{project_id}/send-custom-remind")
async def send_custom_remind(
    project_id: str,
    payload: CustomRemindSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Directly dispatch a custom Gemini-generated email reminder.
    """
    result = await db.execute(
        select(Project).filter(Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.manager_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project managers can send reminders")

    # Enqueue custom email reminder in background via ARQ
    await enqueue_background_job(
        "send_email_task",
        payload.member_email,
        payload.subject,
        "custom_remind.html",
        {
            "member_name": payload.member_name,
            "custom_html": payload.html_content,
            "action_url": f"{settings.FRONTEND_URL}/project/{project_id}"
        }
    )
    
    return {"status": "success", "message": "Email custom reminder successfully sent"}
