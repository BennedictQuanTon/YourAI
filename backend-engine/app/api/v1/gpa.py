from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from app.db.session import get_db
from app.db.models import User, GpaYear, GpaTerm, GpaSubject, GpaComponent
from app.schemas.schemas import (
    GpaYearCreate, GpaYearResponse,
    GpaTermCreate, GpaTermResponse,
    GpaSubjectCreate, GpaSubjectResponse,
    GpaComponentCreate, GpaComponentResponse
)
from app.api.dependencies.dependencies import get_current_user
from app.services.gpa_math import recalculate_subject_scores, calculate_term_gpa

router = APIRouter(prefix="/gpa", tags=["GPA Intelligence"])

# --- YEARS ---
@router.post("/years", response_model=GpaYearResponse, status_code=status.HTTP_201_CREATED)
async def create_year(
    payload: GpaYearCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    year = GpaYear(
        user_id=current_user.id,
        year_name=payload.year_name
    )
    db.add(year)
    await db.commit()
    
    # Reload with terms loaded to prevent async lazy load issues
    stmt = select(GpaYear).options(selectinload(GpaYear.terms)).filter(GpaYear.id == year.id)
    res = await db.execute(stmt)
    return res.scalars().first()

@router.get("/years", response_model=List[GpaYearResponse])
async def list_years(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GpaYear)
        .options(
            selectinload(GpaYear.terms)
            .selectinload(GpaTerm.subjects)
            .selectinload(GpaSubject.components)
        )
        .filter(GpaYear.user_id == current_user.id)
    )
    return result.scalars().all()

# --- TERMS ---
@router.post("/years/{year_id}/terms", response_model=GpaTermResponse, status_code=status.HTTP_201_CREATED)
async def create_term(
    year_id: str,
    payload: GpaTermCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify year belongs to user
    result = await db.execute(
        select(GpaYear).filter(GpaYear.id == year_id, GpaYear.user_id == current_user.id)
    )
    year = result.scalars().first()
    if not year:
        raise HTTPException(status_code=404, detail="GPA Year not found")
        
    term = GpaTerm(
        year_id=year_id,
        term_name=payload.term_name,
        start_date=payload.start_date,
        end_date=payload.end_date
    )
    db.add(term)
    await db.commit()
    
    # Reload with subjects loaded to prevent async lazy load issues
    stmt = select(GpaTerm).options(selectinload(GpaTerm.subjects)).filter(GpaTerm.id == term.id)
    res = await db.execute(stmt)
    return res.scalars().first()

# --- SUBJECTS ---
@router.post("/terms/{term_id}/subjects", response_model=GpaSubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    term_id: str,
    payload: GpaSubjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify term belongs to user
    result = await db.execute(
        select(GpaTerm)
        .join(GpaYear, GpaYear.id == GpaTerm.year_id)
        .filter(GpaTerm.id == term_id, GpaYear.user_id == current_user.id)
    )
    term = result.scalars().first()
    if not term:
        raise HTTPException(status_code=404, detail="GPA Term not found")
        
    subject = GpaSubject(
        term_id=term_id,
        subject_name=payload.subject_name,
        credits=payload.credits,
        final_score_vn=0.0,
        final_score_au=0.0
    )
    db.add(subject)
    await db.commit()
    
    # Reload with components loaded
    stmt = select(GpaSubject).options(selectinload(GpaSubject.components)).filter(GpaSubject.id == subject.id)
    res = await db.execute(stmt)
    return res.scalars().first()

# --- COMPONENTS (GPA SYNC ENGINE - US-03) ---
@router.post("/subjects/{subject_id}/components", response_model=GpaComponentResponse, status_code=status.HTTP_201_CREATED)
async def create_component(
    subject_id: str,
    payload: GpaComponentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify subject belongs to user
    result = await db.execute(
        select(GpaSubject)
        .options(selectinload(GpaSubject.components))
        .join(GpaTerm, GpaTerm.id == GpaSubject.term_id)
        .join(GpaYear, GpaYear.id == GpaTerm.year_id)
        .filter(GpaSubject.id == subject_id, GpaYear.user_id == current_user.id)
    )
    subject = result.scalars().first()
    if not subject:
        raise HTTPException(status_code=404, detail="GPA Subject not found")
        
    # 2. Add new component
    component = GpaComponent(
        subject_id=subject_id,
        component_name=payload.component_name,
        weight=payload.weight,
        score_achieved=payload.score_achieved,
        task_id=payload.task_id
    )
    db.add(component)
    await db.flush()
    
    # 3. Recalculate subject final score dynamically (Realtime Sync)
    # Fetch all active components of the subject
    comp_res = await db.execute(
        select(GpaComponent).filter(GpaComponent.subject_id == subject_id)
    )
    all_components = comp_res.scalars().all()
    
    recalculate_subject_scores(subject, all_components)
    await db.commit()
    await db.refresh(component)
    
    return component

@router.get("/terms/{term_id}/gpa")
async def get_term_gpa(
    term_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculates dynamic term-wide GPAs for both VN and AU scales.
    """
    result = await db.execute(
        select(GpaSubject)
        .filter(GpaSubject.term_id == term_id)
    )
    subjects = result.scalars().all()
    
    gpa_vn, gpa_au = calculate_term_gpa(subjects)
    return {
        "term_id": term_id,
        "gpa_vn": gpa_vn,
        "gpa_au": gpa_au,
        "total_subjects": len(subjects)
    }

@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GpaSubject)
        .join(GpaTerm, GpaTerm.id == GpaSubject.term_id)
        .join(GpaYear, GpaYear.id == GpaTerm.year_id)
        .filter(GpaSubject.id == subject_id, GpaYear.user_id == current_user.id)
    )
    subject = result.scalars().first()
    if not subject:
        raise HTTPException(status_code=404, detail="GPA Subject not found")
        
    await db.delete(subject)
    await db.commit()
    return None

@router.delete("/components/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_component(
    component_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GpaComponent)
        .join(GpaSubject, GpaSubject.id == GpaComponent.subject_id)
        .join(GpaTerm, GpaTerm.id == GpaSubject.term_id)
        .join(GpaYear, GpaYear.id == GpaTerm.year_id)
        .filter(GpaComponent.id == component_id, GpaYear.user_id == current_user.id)
    )
    component = result.scalars().first()
    if not component:
        raise HTTPException(status_code=404, detail="GPA Component not found")
        
    subject_id = component.subject_id
    await db.delete(component)
    await db.flush()
    
    # Recalculate subject final score
    subject_res = await db.execute(select(GpaSubject).filter(GpaSubject.id == subject_id))
    subject = subject_res.scalars().first()
    
    comp_res = await db.execute(select(GpaComponent).filter(GpaComponent.subject_id == subject_id))
    all_components = comp_res.scalars().all()
    
    recalculate_subject_scores(subject, all_components)
    await db.commit()
    return None

@router.delete("/years/{year_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_year(
    year_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GpaYear).filter(GpaYear.id == year_id, GpaYear.user_id == current_user.id)
    )
    year = result.scalars().first()
    if not year:
        raise HTTPException(status_code=404, detail="GPA Year not found")
    await db.delete(year)
    await db.commit()
    return None

@router.delete("/terms/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_term(
    term_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(GpaTerm)
        .join(GpaYear, GpaYear.id == GpaTerm.year_id)
        .filter(GpaTerm.id == term_id, GpaYear.user_id == current_user.id)
    )
    term = result.scalars().first()
    if not term:
        raise HTTPException(status_code=404, detail="GPA Term not found")
    await db.delete(term)
    await db.commit()
    return None
