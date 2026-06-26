from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from app.db.session import get_db
from app.db.models import User, Task, Project, ProjectMember
from app.schemas.schemas import AgentChatRequest, AgentChatResponse
from app.api.dependencies.dependencies import get_current_user
from app.core.rate_limit import rate_limiter
from app.services.llm_parser import LLMParser
from app.worker.trigger import enqueue_background_job
from app.core.config import settings

router = APIRouter(prefix="/agent", tags=["AI Executive Agent"])

@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(
    payload: AgentChatRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    AI Chat Terminal Router.
    Imposes rate limits: 20 requests per 10 minutes per user.
    """
    # 1. Enforce Token Bucket Rate Limiter
    await rate_limiter(request, "ai", current_user.id)
    
    # 2. Parse natural language prompt via Gemini API (or robust offline fallback)
    parsed = LLMParser.parse_natural_language(payload.text, payload.project_id)
    
    action = parsed.get("action", "chat")
    args = parsed.get("args", {})
    response_msg = parsed.get("response_message", "Đã tiếp nhận thông tin.")
    
    action_data = {}
    
    # 3. Dynamic Execution of Actions in DB (Function Calling resolution)
    if action == "create_task":
        # Calculate deadline
        deadline = None
        days_delta = args.get("deadline_days_delta")
        if days_delta is not None:
            deadline = datetime.utcnow() + timedelta(days=int(days_delta))
            
        task = Task(
            title=args.get("title", "Công việc mới"),
            project_id=payload.project_id or args.get("project_id"),
            user_id=current_user.id,
            status=args.get("status", "todo"),
            energy_cost=args.get("energy_cost", 5),
            deadline_at=deadline
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        
        action_data = {
            "id": task.id,
            "title": task.title,
            "status": task.status,
            "energy_cost": task.energy_cost,
            "deadline_at": task.deadline_at.isoformat() if task.deadline_at else None
        }
        
    elif action == "create_project":
        project = Project(
            title=args.get("title", "Dự án mới"),
            manager_id=current_user.id,
            timeline_start=datetime.utcnow(),
            timeline_end=datetime.utcnow() + timedelta(days=int(args.get("duration_days", 30)))
        )
        db.add(project)
        await db.flush()
        
        # Add creator as member
        member = ProjectMember(project_id=project.id, email=current_user.email, status="active")
        db.add(member)
        await db.commit()
        await db.refresh(project)
        
        action_data = {
            "id": project.id,
            "title": project.title,
            "timeline_end": project.timeline_end.isoformat() if project.timeline_end else None
        }
        
    elif action == "send_bulk_mail":
        proj_id = payload.project_id or args.get("project_id")
        if not proj_id:
            # Look for the last project managed by this user
            proj_res = await db.execute(
                select(Project).filter(Project.manager_id == current_user.id).order_by(Project.id.desc())
            )
            project = proj_res.scalars().first()
            if project:
                proj_id = project.id
                
        if proj_id:
            # Query active members
            result = await db.execute(
                select(Project).options(selectinload(Project.members)).filter(Project.id == proj_id)
            )
            project = result.scalars().first()
            if project:
                sent_count = 0
                for member in project.members:
                    # Enqueue email task to background workers
                    await enqueue_background_job(
                        "send_email_task",
                        member.email,
                        f"Thông báo nhắc nhở từ dự án: {project.title}",
                        "bulk_mail.html",
                        {
                            "member_name": member.email.split("@")[0].capitalize(),
                            "message_content": args.get("message_content", "Nhắc nhở nộp báo cáo đúng hạn."),
                            "action_url": f"{settings.FRONTEND_URL}/project/{proj_id}"
                        }
                    )
                    sent_count += 1
                action_data = {"sent_count": sent_count, "project_title": project.title}
            else:
                response_msg = "Không tìm thấy dự án tương ứng để gửi email."
        else:
            response_msg = "Không tìm thấy dự án hợp lệ để gửi email thông báo. Vui lòng tạo dự án trước."
            
    return AgentChatResponse(
        response=response_msg,
        action_taken=action,
        data=action_data
    )

from pydantic import BaseModel

class EmailPreviewRequest(BaseModel):
    raw_content: str
    member_name: str
    project_title: str

class EmailSendRequest(BaseModel):
    email_to: str
    subject: str
    html_content: str

@router.post("/preview_email")
async def preview_email(payload: EmailPreviewRequest, current_user: User = Depends(get_current_user)):
    preview = LLMParser.generate_email_preview(
        raw_content=payload.raw_content,
        member_name=payload.member_name,
        project_title=payload.project_title
    )
    return preview

@router.post("/send_email")
async def send_email(payload: EmailSendRequest, current_user: User = Depends(get_current_user)):
    # Enqueue custom email job to background workers
    await enqueue_background_job(
        "send_email_task",
        payload.email_to,
        payload.subject,
        "custom_template.html",
        {
            "member_name": payload.email_to.split("@")[0].capitalize(),
            "message_content": payload.html_content,
            "action_url": f"{settings.FRONTEND_URL}/"
        }
    )
    return {"status": "success", "message": "Email queued successfully via background worker."}
