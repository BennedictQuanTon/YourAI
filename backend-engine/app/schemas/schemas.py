from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- AUTH SCHEMAS ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    gpa_scale: Optional[str] = None
    
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    gpa_scale: Optional[str] = None

# --- USER SETTINGS SCHEMAS ---
class UserSettingUpdate(BaseModel):
    primary_color_hex: Optional[str] = Field(None, max_length=7)
    border_radius_pt: Optional[int] = Field(None, ge=0, le=30)
    app_border_style: Optional[str] = Field(None, max_length=50)
    gpa_scale: Optional[str] = Field(None, max_length=10)

class UserSettingResponse(BaseModel):
    user_id: str
    primary_color_hex: str
    border_radius_pt: int
    app_border_style: str
    gpa_scale: str

    class Config:
        from_attributes = True

# --- TASK SCHEMAS ---
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    project_id: Optional[str] = None
    energy_cost: Optional[int] = Field(5, ge=1, le=10)
    deadline_at: Optional[datetime] = None
    status: Optional[str] = "todo"
    
    assigned_to: Optional[str] = None
    project_link: Optional[str] = None
    assigned_date: Optional[datetime] = None
    reminder_email: Optional[str] = None
    reminder_at: Optional[datetime] = None
    
    location: Optional[str] = None
    is_online: Optional[bool] = False
    additional_info: Optional[str] = None
    type: Optional[str] = "chore"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    energy_cost: Optional[int] = Field(None, ge=1, le=10)
    deadline_at: Optional[datetime] = None
    project_id: Optional[str] = None
    
    assigned_to: Optional[str] = None
    project_link: Optional[str] = None
    assigned_date: Optional[datetime] = None
    reminder_email: Optional[str] = None
    reminder_at: Optional[datetime] = None
    
    location: Optional[str] = None
    is_online: Optional[bool] = None
    additional_info: Optional[str] = None
    type: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    status: str
    energy_cost: int
    deadline_at: Optional[datetime] = None
    project_id: Optional[str] = None
    user_id: str
    
    assigned_to: Optional[str] = None
    project_link: Optional[str] = None
    assigned_date: Optional[datetime] = None
    reminder_email: Optional[str] = None
    reminder_at: Optional[datetime] = None
    
    location: Optional[str] = None
    is_online: bool
    additional_info: Optional[str] = None
    type: Optional[str] = "chore"

    class Config:
        from_attributes = True

# --- PROJECT SCHEMAS ---
class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    timeline_start: Optional[datetime] = None
    timeline_end: Optional[datetime] = None
    status: Optional[str] = "active"

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    timeline_start: Optional[datetime] = None
    timeline_end: Optional[datetime] = None
    status: Optional[str] = None

class ProjectMemberInvite(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "Member"
    status: Optional[str] = "active"

class ProjectMemberResponse(BaseModel):
    id: str
    project_id: str
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "Member"
    status: str

    class Config:
        from_attributes = True

class ProjectResponse(BaseModel):
    id: str
    title: str
    timeline_start: Optional[datetime] = None
    timeline_end: Optional[datetime] = None
    status: str
    manager_id: str
    members: List[ProjectMemberResponse] = []

    class Config:
        from_attributes = True

# --- GPA SCHEMAS ---
class GpaComponentCreate(BaseModel):
    component_name: str
    weight: float = Field(..., ge=0, le=100) # Weight in percentage e.g., 30.0
    score_achieved: float = Field(..., ge=0, le=100) # 100-scale score
    task_id: Optional[str] = None

class GpaComponentResponse(BaseModel):
    id: str
    subject_id: str
    task_id: Optional[str] = None
    component_name: str
    weight: float
    score_achieved: float

    class Config:
        from_attributes = True

class GpaSubjectCreate(BaseModel):
    subject_name: str
    credits: int = Field(3, ge=1, le=10)

class GpaSubjectResponse(BaseModel):
    id: str
    term_id: str
    subject_name: str
    credits: int
    final_score_vn: float
    final_score_au: float
    components: List[GpaComponentResponse] = []

    class Config:
        from_attributes = True

class GpaTermCreate(BaseModel):
    term_name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class GpaTermResponse(BaseModel):
    id: str
    year_id: str
    term_name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    subjects: List[GpaSubjectResponse] = []

    class Config:
        from_attributes = True

class GpaYearCreate(BaseModel):
    year_name: str

class GpaYearResponse(BaseModel):
    id: str
    user_id: str
    year_name: str
    terms: List[GpaTermResponse] = []

    class Config:
        from_attributes = True

# --- AI AGENT SCHEMAS ---
class AgentChatRequest(BaseModel):
    text: str
    project_id: Optional[str] = None

class AgentChatResponse(BaseModel):
    response: str
    action_taken: Optional[str] = None # e.g., create_task, send_bulk_mail
    data: Optional[dict] = None

# --- FORGOT & RESET PASSWORD SCHEMAS ---
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str  # this will be the 4-digit reset code
    new_password: str

class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    token: str
