import json
import os
import re
from datetime import datetime, timedelta
from typing import Optional, Any, Dict
import google.generativeai as genai
from app.core.config import settings

class LLMParser:
    _configured = False

    @classmethod
    def _configure_gemini(cls):
        if not cls._configured:
            api_key = settings.GEMINI_API_KEY
            if api_key and api_key != "AIzaSyD_Your_Actual_Gemini_API_Key_Here":
                genai.configure(api_key=api_key)
                cls._configured = True
            else:
                cls._configured = False

    @classmethod
    def parse_natural_language(cls, user_prompt: str, context_project_id: Optional[str] = None) -> dict:
        """
        Parses a natural language prompt from the user using Google Gemini Function Calling.
        If Gemini is not configured, falls back to a highly robust rule-based extractor
        to ensure full operational stability at all times.
        """
        cls._configure_gemini()
        
        if cls._configured:
            try:
                # Define Gemini Tools / Function calling schemas
                model = genai.GenerativeModel('gemini-1.5-flash')
                
                # We can specify tools for function calling
                # In google-generativeai, we can pass functions directly or define standard structures.
                # To make this ultra-robust, we can prompt Gemini to return a clean JSON object 
                # adhering to our schema, which is more reliable across models.
                system_instruction = """
                Bạn là Trợ lý Điều hành AI (Gemini AI Executive Agent) của hệ thống quản lý công việc và học tập YourAI v4.0.
                Nhiệm vụ của bạn là phân tích prompt tiếng Việt tự nhiên của người dùng và chuyển đổi nó thành một cấu trúc JSON gọi hàm (Function Calling).
                Các hàm bạn có thể gọi là:
                1. create_task: Khi người dùng muốn thêm hoặc lên lịch một công việc/task mới.
                   Args: {
                      "title": "Tên công việc",
                      "energy_cost": 1-10 (mức độ tốn năng lượng, mặc định 5),
                      "deadline_days_delta": Số ngày từ hôm nay đến deadline (ví dụ: ngày mai = 1, tuần sau = 7),
                      "status": "todo" (mặc định)
                   }
                2. send_bulk_mail: Khi người dùng/PM muốn gửi email thông báo/nhắc nhở cả nhóm/team.
                   Args: {
                      "message_content": "Nội dung thông báo cần gửi chi tiết",
                      "project_id": "ID dự án được truyền vào (nếu có)"
                   }
                3. create_project: Khi người dùng muốn tạo một dự án mới.
                   Args: {
                      "title": "Tên dự án",
                      "duration_days": Số ngày thời hạn dự án
                   }

                HÃY TRẢ VỀ ĐÚNG MỘT ĐỐI TƯỢNG JSON DUY NHẤT. KHÔNG ĐƯỢC GIẢI THÍCH, KHÔNG ĐƯỢC BỎ VÀO FENCED CODE BLOCK, KHÔNG DÙNG ```json.
                Định dạng trả về:
                {
                   "action": "create_task" | "send_bulk_mail" | "create_project" | "chat",
                   "args": { ... },
                   "response_message": "Lời thoại phản hồi lịch lãm, sang trọng chuẩn thượng lưu bằng tiếng Việt"
                }
                """
                
                prompt = f"{system_instruction}\n\nPrompt người dùng: '{user_prompt}'\nContext Project ID: '{context_project_id or ''}'"
                
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                # Clean up any potential markdown wraps
                if response_text.startswith("```"):
                    response_text = re.sub(r"^```(?:json)?\n", "", response_text)
                    response_text = re.sub(r"\n```$", "", response_text)
                
                parsed_json = json.loads(response_text)
                return parsed_json
                
            except Exception as e:
                print(f"[GEMINI PARSER ERROR] Fallback to heuristics: {e}")
                # Fallback to local rule-based extractor
                
        # Rule-based fallback extractor (Heuristics)
        return cls._rule_based_fallback(user_prompt, context_project_id)

    @classmethod
    def _rule_based_fallback(cls, prompt: str, project_id: Optional[str] = None) -> dict:
        """
        Advanced heuristic parser supporting offline operations.
        Analyzes grammar and keywords in Vietnamese.
        """
        prompt_lower = prompt.lower()
        
        # 1. Detect Bulk Mail intent
        if any(w in prompt_lower for w in ["gửi mail", "gởi mail", "nhắc nhở team", "nhắc nhở cả nhóm", "thông báo team", "gửi email"]):
            clean_message = prompt
            # Extract content from inside quotes or direct string
            quotes = re.findall(r'["\'“](.*?)["\'”]', prompt)
            if quotes:
                clean_message = quotes[0]
            else:
                clean_message = prompt.replace("gửi mail", "").replace("gửi email", "").replace("nhắc nhở team", "").strip()
                
            return {
                "action": "send_bulk_mail",
                "args": {
                    "message_content": clean_message or "Nhắc nhở nộp báo cáo đúng tiến độ dự án.",
                    "project_id": project_id
                },
                "response_message": "Tôi đã tiếp nhận yêu cầu gửi mail thông báo cho các thành viên trong nhóm. Hàng đợi thư đang được xử lý."
            }
            
        # 2. Detect Project creation intent
        elif any(w in prompt_lower for w in ["tạo dự án", "tạo project", "thêm dự án", "create project"]):
            title = "Dự án mới"
            quotes = re.findall(r'["\'“](.*?)["\'”]', prompt)
            if quotes:
                title = quotes[0]
            else:
                title = prompt.replace("tạo dự án", "").replace("tạo project", "").strip() or "Dự án mới"
                
            return {
                "action": "create_project",
                "args": {
                    "title": title,
                    "duration_days": 30
                },
                "response_message": f"Dự án '{title}' đã được khởi tạo thành công trên hệ thống YourAI."
            }
            
        # 3. Default or Task creation intent
        else:
            # Parse deadline delta
            delta = 0
            if "ngày mai" in prompt_lower or "ngay mai" in prompt_lower:
                delta = 1
            elif "tuần sau" in prompt_lower or "tuan sau" in prompt_lower:
                delta = 7
            elif "hôm nay" in prompt_lower or "hom nay" in prompt_lower:
                delta = 0
                
            # Parse energy cost (1-10)
            energy = 5
            energy_match = re.search(r'(?:năng lượng|mức độ|energy|scale|cost)\s*(\d+)', prompt_lower)
            if energy_match:
                val = int(energy_match.group(1))
                energy = max(1, min(10, val))
            elif "quan trọng" in prompt_lower or "khẩn cấp" in prompt_lower:
                energy = 8
            elif "nhẹ nhàng" in prompt_lower or "dễ" in prompt_lower:
                energy = 2
                
            # Clean title
            title = prompt
            # Remove indicators
            for word in ["thêm task", "thêm công việc", "tạo task", "lên lịch", "nhắc lịch"]:
                title = re.sub(rf"(?i){word}", "", title)
            title = re.sub(r"(?i)(ngày mai|ngay mai|tuần sau|tuan sau|quan trọng|khẩn cấp)", "", title)
            title = title.strip().strip('"').strip("'").strip("“").strip("”")
            if not title:
                title = "Công việc mới từ AI Agent"
                
            return {
                "action": "create_task",
                "args": {
                    "title": title,
                    "energy_cost": energy,
                    "deadline_days_delta": delta,
                    "status": "todo"
                },
                "response_message": f"Tôi đã lập lịch công việc '{title}' cho bạn với mức tiêu hao năng lượng {energy}/10."
            }

    @classmethod
    def generate_email_preview(cls, raw_content: str, member_name: Optional[str] = None, project_title: str = "Dự án") -> dict:
        """
        Drafts a high-end, premium-looking academic & professional email template using Google Gemini.
        Falls back to a gorgeous localized Stoic template if offline.
        """
        cls._configure_gemini()
        
        member_display = member_name or "Thành viên nhóm"
        
        if cls._configured:
            try:
                model = genai.GenerativeModel('gemini-1.5-flash')
                system_instruction = """
                Bạn là Trợ lý Điều hành AI Thượng lưu (YourAI Premium Executive Assistant).
                Nhiệm vụ của bạn là soạn thảo một Email Nhắc Việc (Task Reminder Email) lộng lẫy, tinh xảo, lịch thiệp và vô cùng chuyên nghiệp.
                Email được viết bằng tiếng Việt, hướng tới đối tượng học thuật cao cấp và làm việc nhóm thông minh.
                Hãy trả về duy nhất một đối tượng JSON có định dạng:
                {
                   "subject": "Tiêu đề email sang trọng, thu hút, ngắn gọn",
                   "html_content": "Nội dung email dạng HTML đã được format đẹp mắt (sử dụng các thẻ p, strong, ul, li, div, br để tạo cấu trúc gọn gàng, tinh tế, không bao gồm các thẻ html/head/body toàn trang, chỉ phần nội dung thân bài)."
                }
                HÃY TRẢ VỀ ĐÚNG MỘT ĐỐI TƯỢNG JSON DUY NHẤT. KHÔNG ĐƯỢC GIẢI THÍCH, KHÔNG DÙNG ```json.
                """
                prompt = f"{system_instruction}\n\nThông tin thô người dùng nhập: '{raw_content}'\nGửi tới thành viên: '{member_display}'\nTên dự án: '{project_title}'"
                
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                if response_text.startswith("```"):
                    response_text = re.sub(r"^```(?:json)?\n", "", response_text)
                    response_text = re.sub(r"\n```$", "", response_text)
                
                parsed_json = json.loads(response_text)
                return parsed_json
            except Exception as e:
                print(f"[GEMINI EMAIL PREVIEW ERROR] Fallback to hardcoded elegant template: {e}")
                
        # High-end Stoic fallback template
        fallback_subject = f"🔔 [YourAI Remind] Nhiệm vụ học thuật & Nhắc hẹn dự án: {project_title}"
        fallback_html = f"""
        <div style="font-family: 'Outfit', sans-serif; line-height: 1.6; color: #333333;">
            <p>Xin chào <strong>{member_display}</strong>,</p>
            <p>Đây là thông báo nhắc nhở tự động từ Hệ thống Quản trị & Điều hành Học thuật <strong>YourAI Premium</strong> dành cho dự án <em>{project_title}</em>.</p>
            <div style="background: #FAF9F5; border-left: 4px solid #D4AF37; padding: 15px; margin: 18px 0; border-radius: 4px;">
                <h4 style="margin-top: 0; color: #B8860B; font-family: 'Outfit', sans-serif;">NỘI DUNG NHẮC HẸN</h4>
                <p style="margin-bottom: 0; font-size: 13.5px; color: #4A4A4A;">{raw_content}</p>
            </div>
            <p>Kính đề nghị bạn xem xét, sắp xếp quỹ thời gian hợp lý để hoàn thành đúng mốc tiến độ đặt ra.</p>
            <p style="margin-top: 25px; border-top: 1px solid #EEEEEE; padding-top: 15px; font-size: 12px; color: #777777;">
                Trân trọng,<br>
                <strong>AI Executive Assistant</strong><br>
                Hệ điều hành học thuật & Quản lý tiến độ YourAI v4.0
            </p>
        </div>
        """
        return {"subject": fallback_subject, "html_content": fallback_html}
