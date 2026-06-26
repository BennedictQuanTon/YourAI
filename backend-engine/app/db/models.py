import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Table, text, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

# To make primary keys compatible between SQLite (which doesn't have a native UUID type)
# and PostgreSQL, we'll use GUID/UUID custom handling or a standard String/UUID representation.
# Standard SQLAlchemy String(36) or UUID works perfectly.

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    avatar = Column(Text, nullable=True)
    bio = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Password & Security Upgrade (US-04)
    hashed_password = Column(String(255), nullable=True)
    reset_code = Column(String(10), nullable=True)
    reset_code_expires_at = Column(DateTime, nullable=True)
    last_password_reset_at = Column(DateTime, nullable=True)
    
    settings = relationship("UserSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="manager", foreign_keys="[Project.manager_id]", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    gpa_years = relationship("GpaYear", back_populates="user", cascade="all, delete-orphan")

    @property
    def gpa_scale(self) -> str:
        return self.settings.gpa_scale if self.settings else "VN"

class UserSetting(Base):
    __tablename__ = "user_settings"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    primary_color_hex = Column(String(7), default="#D4AF37")
    border_radius_pt = Column(Integer, default=12)
    app_border_style = Column(String(50), default="solid")
    gpa_scale = Column(String(10), default="VN")
    
    user = relationship("User", back_populates="settings")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    manager_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=False)
    timeline_start = Column(DateTime, nullable=True)
    timeline_end = Column(DateTime, nullable=True)
    status = Column(String(50), default="active") # active / completed / on_hold
    
    manager = relationship("User", back_populates="projects", foreign_keys=[manager_id])
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project")

class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    status = Column(String(50), default="pending") # pending / active
    role = Column(String(100), nullable=True, default="Member") # Member / Lead / Manager / etc.
    
    project = relationship("Project", back_populates="members")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="todo") # todo / done
    energy_cost = Column(Integer, default=5) # 1 - 10
    deadline_at = Column(DateTime, nullable=True)
    
    assigned_to = Column(String(255), nullable=True) # assignee email/name
    project_link = Column(String(255), nullable=True) # link to project files/resources
    assigned_date = Column(DateTime, default=datetime.utcnow) # date assigned
    reminder_email = Column(String(255), nullable=True) # email to trigger alert reminders
    reminder_at = Column(DateTime, nullable=True) # custom date time for email/alert reminder
    
    location = Column(String(255), nullable=True)
    is_online = Column(Boolean, default=False)
    additional_info = Column(Text, nullable=True)
    type = Column(String(50), default="chore") # chore / lịch học / dự án
    
    user = relationship("User", back_populates="tasks")
    project = relationship("Project", back_populates="tasks")
    gpa_component = relationship("GpaComponent", back_populates="task", uselist=False)

class GpaYear(Base):
    __tablename__ = "gpa_years"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    year_name = Column(String(100), nullable=False) # e.g., Năm 1, Năm 2
    
    user = relationship("User", back_populates="gpa_years")
    terms = relationship("GpaTerm", back_populates="year", cascade="all, delete-orphan")

class GpaTerm(Base):
    __tablename__ = "gpa_terms"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    year_id = Column(String(36), ForeignKey("gpa_years.id", ondelete="CASCADE"), nullable=False)
    term_name = Column(String(100), nullable=False) # e.g., Học kỳ 1, Học kỳ 2
    start_date = Column(String(50), nullable=True) # e.g. 2026-02-01
    end_date = Column(String(50), nullable=True) # e.g. 2026-06-30
    
    year = relationship("GpaYear", back_populates="terms")
    subjects = relationship("GpaSubject", back_populates="term", cascade="all, delete-orphan")

class GpaSubject(Base):
    __tablename__ = "gpa_subjects"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    term_id = Column(String(36), ForeignKey("gpa_terms.id", ondelete="CASCADE"), nullable=False)
    subject_name = Column(String(255), nullable=False)
    credits = Column(Integer, default=3)
    final_score_vn = Column(Numeric(5, 2), default=0.0) # 10-scale final score
    final_score_au = Column(Numeric(3, 1), default=0.0) # 7-scale final score
    
    term = relationship("GpaTerm", back_populates="subjects")
    components = relationship("GpaComponent", back_populates="subject", cascade="all, delete-orphan")

class GpaComponent(Base):
    __tablename__ = "gpa_components"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    subject_id = Column(String(36), ForeignKey("gpa_subjects.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    component_name = Column(String(255), nullable=False)
    weight = Column(Numeric(5, 2), nullable=False) # Percentage e.g. 30.00%
    score_achieved = Column(Numeric(5, 2), default=0.0) # 10-scale component score achieved
    
    subject = relationship("GpaSubject", back_populates="components")
    task = relationship("Task", back_populates="gpa_component")
