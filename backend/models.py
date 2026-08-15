from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    organization_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CreateClientRequest(BaseModel):
    company_name: str
    contact_name: str
    contact_email: EmailStr
    plan: str = "growth"
    logo: Optional[str] = None
    admin_password: str = "Client@2026"


class CreateApplicationRequest(BaseModel):
    organization_id: Optional[str] = None
    name: str
    package_id: Optional[str] = None
    app_store_id: Optional[str] = None
    platform: str = "both"  # google_play | app_store | both
    country: str = "India"
    category: str = "Finance"
    logo: Optional[str] = None


class CreateCompetitorRequest(BaseModel):
    application_id: str
    name: str
    package_id: Optional[str] = None
    platform: str = "google_play"
    country: str = "India"


class InviteMemberRequest(BaseModel):
    name: str
    email: EmailStr
    role: str = "client_member"
    password: str = "Member@2026"


class GenerateReplyRequest(BaseModel):
    review_id: str
    mode: str = "Professional"
    custom_instruction: Optional[str] = None


class BulkReplyRequest(BaseModel):
    review_ids: List[str]
    mode: str = "Professional"


class RefineReplyRequest(BaseModel):
    review_id: str
    current_reply: str
    action: str  # shorten | more_empathetic | more_professional | translate
    target_language: Optional[str] = "Hindi"


class PublishReplyRequest(BaseModel):
    review_id: str
    reply_text: str


class BrandVoiceRequest(BaseModel):
    application_id: str
    personality: Optional[str] = "Friendly and professional"
    tone: Optional[str] = "Empathetic, concise, solution-oriented"
    words_to_use: Optional[List[str]] = []
    words_to_avoid: Optional[List[str]] = []
    support_url: Optional[str] = ""
    support_email: Optional[str] = ""
    guidelines: Optional[str] = "Never promise refunds or compensation unless explicitly approved."


class AISearchRequest(BaseModel):
    question: str
    application_id: Optional[str] = None


class AlertConfigRequest(BaseModel):
    application_id: str
    alert_type: str
    threshold: float
    frequency: str = "instant"
    enabled: bool = True


class CreateReportRequest(BaseModel):
    application_id: str
    report_type: str = "weekly"  # daily|weekly|monthly|custom
    title: Optional[str] = None


class UpdateReviewTopicRequest(BaseModel):
    review_id: str
    topic: str
