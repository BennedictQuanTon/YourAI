import React, { useState } from 'react';
import { 
  Sparkles, Mail, CheckCircle2, Send, Briefcase, 
  Calendar, Check, Loader2, Plus, Info, UserCheck, Clock
} from 'lucide-react';
import network from '../core/network';

function AiExecutiveAgent({
  chatLog,
  chatLoading,
  userInput,
  setUserInput,
  handleSendMessage,
  projects = [],
  tasks = [],
  fetchTasks,
  fetchProjects,
  showToast,
  user
}) {
  // Custom conversational interface states
  const [activeConsole, setActiveConsole] = useState(null); // 'email' | 'task' | 'project'
  
  // 1. Email Console States
  const [emailProject, setEmailProject] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailRecipientName, setEmailRecipientName] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailPreview, setEmailPreview] = useState(null);
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  // 2. Task Console States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState('chore'); // chore / lịch học / dự án
  const [taskLocation, setTaskLocation] = useState('');
  const [taskIsOnline, setTaskIsOnline] = useState(false);
  const [taskAdditionalInfo, setTaskAdditionalInfo] = useState('');
  const [taskStart, setTaskStart] = useState('');
  const [taskEnd, setTaskEnd] = useState('');
  const [taskReminderEmail, setTaskReminderEmail] = useState('');
  const [taskReminderAt, setTaskReminderAt] = useState('');
  const [taskCreating, setTaskCreating] = useState(false);

  // 3. Project Console States
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDuration, setProjectDuration] = useState('30');
  const [projectCreating, setProjectCreating] = useState(false);

  // Timezone-safe date helper
  const toLocalISOString = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Trigger Live Email Draft Preview using backend Gemini
  const handleGenerateEmailPreview = async () => {
    if (!emailRecipient.trim() || !emailMessage.trim()) {
      alert('Vui lòng nhập Email người nhận và Nội dung thông báo.');
      return;
    }
    
    // Find project name
    const selectedProj = projects.find(p => p.id === emailProject);
    const projectTitleText = selectedProj ? selectedProj.title : 'Dự án học thuật';

    setEmailPreviewLoading(true);
    try {
      const res = await network.post('/agent/preview_email', {
        raw_content: emailMessage,
        member_name: emailRecipientName.trim() || emailRecipient.split('@')[0],
        project_title: projectTitleText
      });
      setEmailPreview(res.data);
      showToast('Đã phác thảo Email Thượng Lưu bằng Gemini AI.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tạo bản xem trước email!', 'error');
    } finally {
      setEmailPreviewLoading(false);
    }
  };

  // SMTP Email Dispatch through background worker & Audit Log creation
  const handleSendCustomEmail = async () => {
    if (!emailPreview) return;
    setEmailSending(true);
    try {
      // 1. Send the email via background workers
      await network.post('/agent/send_email', {
        email_to: emailRecipient.trim(),
        subject: emailPreview.subject,
        html_content: emailPreview.html_content
      });

      // 2. Write a finished log task to the database to preserve history
      const selectedProj = projects.find(p => p.id === emailProject);
      const projectTitleText = selectedProj ? selectedProj.title : 'Chung';
      await network.post('/tasks/', {
        title: `✓ AI: Gửi email nhắc hẹn cho ${emailRecipientName || emailRecipient}`,
        status: 'done',
        type: 'chore',
        additional_info: `Người nhận: ${emailRecipient}\nTiêu đề: ${emailPreview.subject}\nNội dung nhắc hẹn: ${emailMessage}\nDự án liên kết: ${projectTitleText}`,
        assigned_date: toLocalISOString(new Date()),
        deadline_at: toLocalISOString(new Date()),
        is_online: false,
        energy_cost: 2
      });

      showToast(`Đã gửi thư điện tử thành công tới ${emailRecipient}.`, 'success');
      
      // Clean inputs
      setEmailRecipient('');
      setEmailRecipientName('');
      setEmailMessage('');
      setEmailPreview(null);
      setActiveConsole(null);
      
      // Refresh database items
      await fetchTasks();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi gửi email nhắc hẹn!', 'error');
    } finally {
      setEmailSending(false);
    }
  };

  // Submit Task directly via API & write Audit Log
  const handleCreateTaskDirect = async () => {
    if (!taskTitle.trim()) {
      alert('Vui lòng nhập tên công việc.');
      return;
    }
    setTaskCreating(true);
    try {
      const nowStr = toLocalISOString(new Date());
      await network.post('/tasks/', {
        title: taskTitle,
        type: taskType,
        location: taskLocation,
        is_online: taskIsOnline,
        additional_info: taskAdditionalInfo,
        assigned_date: taskStart || nowStr,
        deadline_at: taskEnd || nowStr,
        reminder_email: taskReminderEmail.trim() || null,
        reminder_at: taskReminderAt || null,
        status: 'todo',
        energy_cost: 5
      });

      // Audit Log finished task
      await network.post('/tasks/', {
        title: `✓ AI: Khởi tạo thành công lịch trình '${taskTitle}'`,
        status: 'done',
        type: 'chore',
        assigned_date: nowStr,
        deadline_at: nowStr,
        is_online: false,
        energy_cost: 1,
        additional_info: `Đã tự động lên lịch công việc: ${taskTitle}\nPhân loại: ${taskType}\nĐịa điểm: ${taskLocation || 'Không ghi nhận'}\nNhắc hẹn qua Email: ${taskReminderEmail || 'Không có'}`
      });

      showToast(`Đã hoạch định lịch trình công việc thành công!`, 'success');
      
      // Clean inputs
      setTaskTitle('');
      setTaskLocation('');
      setTaskAdditionalInfo('');
      setTaskReminderEmail('');
      setTaskReminderAt('');
      setTaskStart('');
      setTaskEnd('');
      setActiveConsole(null);

      await fetchTasks();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi hoạch định lịch trình!', 'error');
    } finally {
      setTaskCreating(false);
    }
  };

  // Submit Project directly via API & write Audit Log
  const handleCreateProjectDirect = async () => {
    if (!projectTitle.trim()) {
      alert('Vui lòng nhập tên dự án.');
      return;
    }
    setProjectCreating(true);
    try {
      const durationNum = parseInt(projectDuration) || 30;
      
      // Create Project
      const response = await network.post('/projects/', {
        title: projectTitle,
        description: `Dự án được khởi tạo và cấu trúc bởi AI Executive Agent.`,
        timeline_start: new Date().toISOString(),
        timeline_end: new Date(Date.now() + durationNum * 24 * 60 * 60 * 1000).toISOString()
      });

      const newProj = response.data;

      // Add Creator as Manager/Active member in Project
      await network.post(`/projects/${newProj.id}/invite`, {
        email: 'manager@yourai.com', // fallback mock email if active user doesn't have one
        role: 'PM'
      });

      // Audit Log finished task
      const nowStr = toLocalISOString(new Date());
      await network.post('/tasks/', {
        title: `✓ AI: Thiết lập và cơ cấu thành công dự án '${projectTitle}'`,
        status: 'done',
        type: 'chore',
        assigned_date: nowStr,
        deadline_at: nowStr,
        is_online: false,
        energy_cost: 1,
        additional_info: `Thiết lập dự án: ${projectTitle}\nThời gian triển khai: ${durationNum} ngày.\nID dự án: ${newProj.id}`
      });

      showToast(`Đã thiết lập dự án học thuật thành công!`, 'success');
      
      // Clean inputs
      setProjectTitle('');
      setProjectDuration('30');
      setActiveConsole(null);

      await fetchProjects();
      await fetchTasks();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi thiết lập dự án!', 'error');
    } finally {
      setProjectCreating(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '80vh', width: '100%' }}>
      {/* Premium Luxury Greeting & Header */}
      <div style={{
        background: 'linear-gradient(135deg, #FAF6EE, #FFFFFF)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '16px',
        padding: '24px 35px',
        boxShadow: '0 4px 30px rgba(212, 175, 55, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <span style={{ fontSize: '10px', color: '#B8860B', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>YourAI Premium Executive Suite</span>
        <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-title)', fontWeight: '600', color: 'var(--charcoal)' }}>AI Executive Agent</h2>
        <p style={{ color: '#555555', fontSize: '13.5px', maxWidth: '80%', lineHeight: '1.5' }}>
          Trợ lý Cố vấn & Điều hành Cao cấp sử dụng Trí tuệ Nhân tạo Gemini flash-1.5. Hệ thống sẵn sàng tiếp nhận chỉ thị trực tiếp bằng ngôn ngữ tự nhiên để tự động hoạch định, phân phối thông tin và gửi Email Thượng Lưu.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Side: Premium Glass Concierge Terminal (LIGHT STYLE) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '520px',
          boxShadow: '0 8px 32px rgba(212, 175, 55, 0.03)'
        }}>
          {/* Chat Logs Window */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px', paddingRight: '5px' }}>
            
            {/* Elegant default welcome card from AI */}
            <div style={{
              alignSelf: 'flex-start',
              maxWidth: '85%',
              background: '#FAF9F5',
              border: '1px solid rgba(212, 175, 55, 0.15)',
              borderRadius: '16px 16px 16px 2px',
              padding: '16px 20px',
              color: 'var(--charcoal)',
              fontSize: '13.5px',
              lineHeight: '1.6',
              boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Sparkles size={13} color="#D4AF37" />
                <span style={{ fontSize: '10px', color: '#B8860B', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>YourAI Premium Executive</span>
              </div>
              <div>
                Kính chào ngài <strong>{user?.full_name || 'Long Quân Tôn'}</strong>. Tôi là <strong>YourAI Executive Agent</strong> — Cố vấn Điều hành Thượng lưu của ngài.<br />
                Tôi có thể giúp ngài hoạch định nhanh một <strong>dự án học thuật</strong> mới, lên lịch trình cho các <strong>tác vụ chuyên sâu</strong>, hoặc soạn thảo và gửi <strong>email nhắc hẹn</strong> cao cấp tới các thành viên nhóm.<br /><br />
                Hãy chỉ thị trực tiếp cho tôi bằng hộp thoại bên dưới, hoặc bấm nhanh các nút chức năng để tôi phục vụ ngài chu đáo nhất.
              </div>
            </div>

            {/* Chat History */}
            {chatLog.map((log, index) => (
              <div key={index} style={{
                alignSelf: log.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: log.sender === 'user' ? '#FAF6EE' : '#FAF9F5',
                border: log.sender === 'user' ? '1.5px solid #D4AF37' : '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: log.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                padding: '16px 20px',
                color: 'var(--charcoal)',
                fontSize: '13.5px',
                lineHeight: '1.6',
                boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Sparkles size={12} color="#D4AF37" />
                  <span style={{ fontSize: '10px', color: log.sender === 'user' ? '#D4AF37' : '#B8860B', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {log.sender === 'user' ? 'Chủ nhân (Long Quân Tôn)' : 'YourAI Executive'}
                  </span>
                </div>
                <div>{log.text}</div>
                
                {log.action && log.action !== 'chat' && (
                  <div style={{
                    marginTop: '12px',
                    background: '#FAF6EE',
                    borderLeft: '4px solid #D4AF37',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    fontSize: '12.5px',
                    color: 'var(--charcoal)'
                  }}>
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: '#B8860B' }}>
                      <CheckCircle2 size={13} color="#D4AF37" />
                      ĐÃ LOG HỆ THỐNG: {log.action.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '6px', color: '#555555' }}>
                      {log.action === 'create_task' && 'Tác vụ đã được tự động lên lịch trình hoàn chỉnh trên Scheduler.'}
                      {log.action === 'create_project' && 'Dự án mới đã được khởi tạo và cơ cấu trên hệ thống.'}
                      {log.action === 'send_bulk_mail' && 'Email nhắc nhở team đã được kích hoạt gửi thành công.'}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', color: '#7A7A7A', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px' }}>
                <Loader2 size={14} className="animate-spin" color="#D4AF37" />
                Đang nhận dạng lệnh học thuật và đúc kết cấu trúc dữ liệu...
              </div>
            )}
          </div>

          {/* Chat Quick Prompts */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted-gray)', display: 'flex', alignItems: 'center' }}>Đề xuất nhanh:</span>
            <button 
              onClick={() => handleSendMessage("Thêm task review PR hệ thống ngày mai, mức độ quan trọng")}
              className="lux-btn" 
              style={{ padding: '6px 12px', fontSize: '11px', background: 'transparent', border: '1px solid rgba(212,175,55,0.25)', color: '#B8860B' }}
            >
              "Hoạch định task review ngày mai"
            </button>
            <button 
              onClick={() => handleSendMessage("Gửi email nhắc nhở team")}
              className="lux-btn" 
              style={{ padding: '6px 12px', fontSize: '11px', background: 'transparent', border: '1px solid rgba(212,175,55,0.25)', color: '#B8860B' }}
            >
              "Soạn email nhắc hẹn"
            </button>
          </div>

          {/* Chat Input Field */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Giao lệnh cho AI: e.g., 'Hoạch định task nộp bài', 'Tạo dự án UTS'..." 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="lux-input"
              style={{
                flex: 1,
                background: '#FAF9F5',
                border: '1.5px solid rgba(212, 175, 55, 0.25)',
                padding: '12px 18px',
                color: 'var(--charcoal)',
                fontSize: '13.5px'
              }}
            />
            <button onClick={() => handleSendMessage()} className="lux-btn lux-btn-gold" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={14} /> Gửi Lệnh
            </button>
          </div>
        </div>

        {/* Right Side: Interactive AI Operations panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Executive Direct Actions Buttons */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--charcoal)' }}>
              <Sparkles size={16} color="#D4AF37" /> Lệnh Chức Năng Trực Tiếp
            </h3>
            <p style={{ fontSize: '11.5px', color: '#7A7A7A', margin: 0 }}>
              Kích hoạt ngay bảng điều khiển chuyên dụng để AI đúc kết cấu trúc dữ liệu tối ưu nhất cho ngài.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
              <button 
                onClick={() => {
                  setActiveConsole('email');
                  setEmailPreview(null);
                }}
                className={`lux-btn ${activeConsole === 'email' ? 'lux-btn-gold' : ''}`}
                style={{
                  padding: '10px 15px',
                  fontSize: '12.5px',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  background: activeConsole === 'email' ? '#D4AF37' : 'transparent',
                  border: '1.5px solid #D4AF37',
                  color: activeConsole === 'email' ? '#FFFFFF' : '#D4AF37',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Mail size={14} /> Soạn & Gửi Email Nhắc Hẹn
              </button>

              <button 
                onClick={() => setActiveConsole('task')}
                className={`lux-btn ${activeConsole === 'task' ? 'lux-btn-gold' : ''}`}
                style={{
                  padding: '10px 15px',
                  fontSize: '12.5px',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  background: activeConsole === 'task' ? '#D4AF37' : 'transparent',
                  border: '1.5px solid #D4AF37',
                  color: activeConsole === 'task' ? '#FFFFFF' : '#D4AF37',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Calendar size={14} /> Lập Lịch Trình Công Việc (Task)
              </button>

              <button 
                onClick={() => setActiveConsole('project')}
                className={`lux-btn ${activeConsole === 'project' ? 'lux-btn-gold' : ''}`}
                style={{
                  padding: '10px 15px',
                  fontSize: '12.5px',
                  justifyContent: 'flex-start',
                  gap: '10px',
                  background: activeConsole === 'project' ? '#D4AF37' : 'transparent',
                  border: '1.5px solid #D4AF37',
                  color: activeConsole === 'project' ? '#FFFFFF' : '#D4AF37',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Briefcase size={14} /> Cơ Cấu Dự Án Học Thuật Mới
              </button>
            </div>
          </div>

          {/* 1. Dynamic Email Dispatch Console */}
          {activeConsole === 'email' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1.5px solid #D4AF37' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#D4AF37" /> Soạn Email Nhắc Hẹn
                </h4>
                <button onClick={() => setActiveConsole(null)} style={{ background: 'transparent', border: 'none', color: '#7A7A7A', fontSize: '11px', cursor: 'pointer' }}>Đóng</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Liên kết Dự án (Xác nhận)</label>
                <select 
                  className="lux-input" 
                  value={emailProject} 
                  onChange={(e) => setEmailProject(e.target.value)}
                  style={{ fontSize: '12px' }}
                >
                  <option value="">-- Chọn dự án (Yêu cầu bắt buộc) --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Tên người nhận</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Anh Nam" 
                    value={emailRecipientName} 
                    onChange={(e) => setEmailRecipientName(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Email</label>
                  <input 
                    type="email" 
                    placeholder="nam@yourai.com" 
                    value={emailRecipient} 
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Nội dung thông báo (Thô)</label>
                <textarea 
                  placeholder="Ví dụ: Nhắc nộp file slide thuyết trình Assignment 2 trước 20h tối nay nhé." 
                  value={emailMessage} 
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="lux-input"
                  style={{ fontSize: '12px', minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <button 
                onClick={handleGenerateEmailPreview}
                disabled={emailPreviewLoading}
                className="lux-btn lux-btn-gold"
                style={{ width: '100%', fontSize: '12px', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                {emailPreviewLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                Gemini Soạn Bản Xem Trước
              </button>

              {/* Email Live HTML Preview Window */}
              {emailPreview && (
                <div style={{
                  background: '#FAF9F5',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '5px',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <div style={{ fontSize: '11px', color: '#B8860B', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Info size={11} /> BẢN XEM TRƯỚC EMAIL THƯỢNG LƯU:
                  </div>
                  <div style={{ fontSize: '12px', borderBottom: '1px solid #EAE6DF', paddingBottom: '6px', marginBottom: '8px' }}>
                    <strong>Tiêu đề:</strong> {emailPreview.subject}
                  </div>
                  <div 
                    style={{ 
                      fontSize: '11px', 
                      background: '#FFFFFF', 
                      padding: '10px', 
                      borderRadius: '4px', 
                      border: '1px solid #EAE6DF',
                      maxHeight: '140px',
                      overflowY: 'auto'
                    }}
                    dangerouslySetInnerHTML={{ __html: emailPreview.html_content }}
                  />
                  
                  <button 
                    onClick={handleSendCustomEmail}
                    disabled={emailSending}
                    className="lux-btn lux-btn-gold"
                    style={{ width: '100%', fontSize: '12px', padding: '10px', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: '#2E7D32', border: '1px solid #2E7D32' }}
                  >
                    {emailSending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    Xác nhận & Gửi Email Thượng Lưu
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. Dynamic Task Hoạch Định Console */}
          {activeConsole === 'task' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1.5px solid #D4AF37' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="#D4AF37" /> Lập Lịch Trình Công Việc
                </h4>
                <button onClick={() => setActiveConsole(null)} style={{ background: 'transparent', border: 'none', color: '#7A7A7A', fontSize: '11px', cursor: 'pointer' }}>Đóng</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Tên công việc (Yêu cầu)</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Ôn tập đề thi giữa kỳ" 
                  value={taskTitle} 
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="lux-input"
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Phân loại & Màu sắc</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['chore', 'lịch học', 'dự án'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTaskType(t)}
                      className="lux-btn"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'capitalize',
                        background: taskType === t ? (t === 'chore' ? '#D4AF37' : t === 'lịch học' ? '#800020' : '#1A365D') : 'transparent',
                        border: `1.5px solid ${t === 'chore' ? '#D4AF37' : t === 'lịch học' ? '#800020' : '#1A365D'}`,
                        color: taskType === t ? '#FFFFFF' : (t === 'chore' ? '#D4AF37' : t === 'lịch học' ? '#800020' : '#1A365D')
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời gian bắt đầu</label>
                  <input 
                    type="datetime-local" 
                    value={taskStart} 
                    onChange={(e) => setTaskStart(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '11px', padding: '6px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời gian kết thúc</label>
                  <input 
                    type="datetime-local" 
                    value={taskEnd} 
                    onChange={(e) => setTaskEnd(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '11px', padding: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Địa điểm / Zoom</label>
                  <input 
                    type="text" 
                    placeholder="H.302 / Zoom..." 
                    value={taskLocation} 
                    onChange={(e) => setTaskLocation(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Hình thức</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setTaskIsOnline(true)}
                      className={`lux-btn ${taskIsOnline ? 'lux-btn-gold' : ''}`}
                      style={{ flex: 1, padding: '6px', fontSize: '11px', background: taskIsOnline ? '' : 'transparent', border: '1px solid #EAE6DF', color: taskIsOnline ? '' : 'var(--charcoal)' }}
                    >
                      Online
                    </button>
                    <button
                      onClick={() => setTaskIsOnline(false)}
                      className={`lux-btn ${!taskIsOnline ? 'lux-btn-gold' : ''}`}
                      style={{ flex: 1, padding: '6px', fontSize: '11px', background: !taskIsOnline ? '' : 'transparent', border: '1px solid #EAE6DF', color: !taskIsOnline ? '' : 'var(--charcoal)' }}
                    >
                      Offline
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Email nhắc hẹn tự động</label>
                  <input 
                    type="email" 
                    placeholder="tudong@yourai.com" 
                    value={taskReminderEmail} 
                    onChange={(e) => setTaskReminderEmail(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '11px', padding: '6px 10px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời gian nhắc</label>
                  <input 
                    type="datetime-local" 
                    value={taskReminderAt} 
                    onChange={(e) => setTaskReminderAt(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '11px', padding: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Mô tả thêm</label>
                <textarea 
                  placeholder="Ghi chú chi tiết..." 
                  value={taskAdditionalInfo} 
                  onChange={(e) => setTaskAdditionalInfo(e.target.value)}
                  className="lux-input"
                  style={{ fontSize: '11px', minHeight: '40px', resize: 'vertical' }}
                />
              </div>

              <button 
                onClick={handleCreateTaskDirect}
                disabled={taskCreating}
                className="lux-btn lux-btn-gold"
                style={{ width: '100%', fontSize: '12px', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                {taskCreating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Xác nhận & Lập Lịch Trình
              </button>
            </div>
          )}

          {/* 3. Dynamic Project Khởi Tạo Console */}
          {activeConsole === 'project' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1.5px solid #D4AF37' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} color="#D4AF37" /> Khởi Tạo Dự Án Mới
                </h4>
                <button onClick={() => setActiveConsole(null)} style={{ background: 'transparent', border: 'none', color: '#7A7A7A', fontSize: '11px', cursor: 'pointer' }}>Đóng</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Tên dự án (Yêu cầu)</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Dự án Nghiên cứu Khoa học UTS" 
                  value={projectTitle} 
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="lux-input"
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời hạn dự án (Số ngày)</label>
                <input 
                  type="number" 
                  value={projectDuration} 
                  onChange={(e) => setProjectDuration(e.target.value)}
                  className="lux-input"
                  style={{ fontSize: '12px', padding: '8px 12px' }}
                />
              </div>

              <button 
                onClick={handleCreateProjectDirect}
                disabled={projectCreating}
                className="lux-btn lux-btn-gold"
                style={{ width: '100%', fontSize: '12px', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
              >
                {projectCreating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Xác nhận & Khởi Tạo Dự Án
              </button>
            </div>
          )}

          {/* Premium Audit History Log panel */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--charcoal)' }}>
              <Clock size={16} color="#D4AF37" /> Lịch Sử Lệnh AI & Audit Log
            </h3>
            
            {(() => {
              const aiHistory = tasks.filter(t => t.title.startsWith('✓ AI:') && t.status === 'done').slice(0, 3);
              
              if (aiHistory.length === 0) {
                return (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#7A7A7A', fontSize: '12px' }}>
                    Chưa có lịch sử lệnh AI được ghi nhận hôm nay.
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {aiHistory.map(t => (
                    <div key={t.id} style={{
                      background: '#FAF9F5',
                      border: '1px solid rgba(212,175,55,0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#2E7D32', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#555555', marginTop: '4px', whiteSpace: 'pre-line' }}>
                        {t.additional_info}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

        </div>

      </div>
    </div>
  );
}

export default AiExecutiveAgent;
