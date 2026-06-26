from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.db.session import get_db
from app.db.models import Task, User
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.api.dependencies.dependencies import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = Task(
        title=payload.title,
        project_id=payload.project_id,
        user_id=current_user.id,
        status=payload.status or "todo",
        energy_cost=payload.energy_cost,
        deadline_at=payload.deadline_at.replace(tzinfo=None) if payload.deadline_at else None,
        assigned_to=payload.assigned_to,
        project_link=payload.project_link,
        assigned_date=payload.assigned_date.replace(tzinfo=None) if payload.assigned_date else None,
        reminder_email=payload.reminder_email,
        reminder_at=payload.reminder_at.replace(tzinfo=None) if payload.reminder_at else None,
        location=payload.location,
        is_online=payload.is_online if payload.is_online is not None else False,
        additional_info=payload.additional_info,
        type=payload.type or "chore"
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Task).filter(Task.user_id == current_user.id).order_by(Task.deadline_at.asc())
    )
    tasks = result.scalars().all()
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Task).filter(Task.id == task_id, Task.user_id == current_user.id)
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Task).filter(Task.id == task_id, Task.user_id == current_user.id)
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if payload.title is not None:
        task.title = payload.title
    if payload.status is not None:
        task.status = payload.status
    if payload.energy_cost is not None:
        task.energy_cost = payload.energy_cost
    if payload.deadline_at is not None:
        task.deadline_at = payload.deadline_at.replace(tzinfo=None) if payload.deadline_at else None
    if payload.project_id is not None:
        task.project_id = payload.project_id
        
    if payload.assigned_to is not None:
        task.assigned_to = payload.assigned_to
    if payload.project_link is not None:
        task.project_link = payload.project_link
    if payload.assigned_date is not None:
        task.assigned_date = payload.assigned_date.replace(tzinfo=None) if payload.assigned_date else None
    if payload.reminder_email is not None:
        task.reminder_email = payload.reminder_email
    if payload.reminder_at is not None:
        task.reminder_at = payload.reminder_at.replace(tzinfo=None) if payload.reminder_at else None
        
    if payload.location is not None:
        task.location = payload.location
    if payload.is_online is not None:
        task.is_online = payload.is_online
    if payload.additional_info is not None:
        task.additional_info = payload.additional_info
    if payload.type is not None:
        task.type = payload.type
        
    await db.commit()
    await db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Task).filter(Task.id == task_id, Task.user_id == current_user.id)
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    await db.delete(task)
    await db.commit()
    return None
