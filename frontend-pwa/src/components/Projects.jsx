import React, { useState } from 'react';
import { 
  Users, Mail, Plus, Trash2, Edit3, CheckCircle, 
  ExternalLink, Calendar, Info, Clock, CheckCircle2 
} from 'lucide-react';
import network from '../core/network';

function Projects({
  projects,
  activeProject,
  setActiveProject,
  newMemberEmail,
  setNewMemberEmail,
  handleInviteMember,
  bulkMailText,
  setBulkMailText,
  handleSendBulkMail,
  tasks,
  fetchProjects,
  fetchTasks
}) {
  const [showProjModal, setShowProjModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // New Project Fields
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjStart, setNewProjStart] = useState('');
  const [newProjEnd, setNewProjEnd] = useState('');
  const [newProjStatus, setNewProjStatus] = useState('active');

  // New Member Fields (Name & Email!)
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberStatus, setNewMemberStatus] = useState('active');

  // Editing Member States
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState('');
  const [editMemberStatus, setEditMemberStatus] = useState('active');

  // Custom Gemini Reminders States
  const [remindMemberEmail, setRemindMemberEmail] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderRawContent, setReminderRawContent] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  // New Task Fields
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskLink, setNewTaskLink] = useState('');
  const [newTaskAssignedDate, setNewTaskAssignedDate] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskReminderEmail, setNewTaskReminderEmail] = useState('');
  const [newTaskEnergy, setNewTaskEnergy] = useState(5);

  const currentProj = projects.find(p => p.id === activeProject) || projects[0];

  // Helper: Format date elegantly
  const formatDate = (isoString) => {
    if (!isoString) return 'Chưa set';
    const date = new Date(isoString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const handleCreateProjectSubmit = async (e) => {
    e.preventDefault();
    if (!newProjTitle.trim()) return;

    try {
      const response = await network.post('/projects/', {
        title: newProjTitle,
        timeline_start: newProjStart ? newProjStart : null,
        timeline_end: newProjEnd ? newProjEnd : null,
        status: newProjStatus
      });
      setShowProjModal(false);
      setNewProjTitle('');
      setNewProjStart('');
      setNewProjEnd('');
      setNewProjStatus('active');
      await fetchProjects();
      if (response.data && response.data.id) {
        setActiveProject(response.data.id);
      }
    } catch (err) {
      alert('Có lỗi xảy ra khi tạo dự án.');
    }
  };

  const handleUpdateProjectStatus = async (status) => {
    if (!currentProj) return;
    try {
      await network.put(`/projects/${currentProj.id}`, {
        status: status
      });
      await fetchProjects();
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật trạng thái.');
    }
  };

  const handleDeleteActiveProject = async () => {
    if (!currentProj) return;
    if (window.confirm(`Ngài có muốn xóa vĩnh viễn dự án "${currentProj.title}" không?`)) {
      try {
        await network.delete(`/projects/${currentProj.id}`);
        setActiveProject('');
        await fetchProjects();
      } catch (err) {
        alert('Có lỗi xảy ra khi xóa dự án.');
      }
    }
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentProj) return;

    try {
      await network.post('/tasks/', {
        title: newTaskTitle,
        project_id: currentProj.id,
        status: 'todo',
        energy_cost: Number(newTaskEnergy),
        deadline_at: newTaskDeadline ? newTaskDeadline : null,
        assigned_to: newTaskAssignee,
        project_link: newTaskLink,
        assigned_date: newTaskAssignedDate ? newTaskAssignedDate : null,
        reminder_email: newTaskReminderEmail
      });
      setShowTaskModal(false);
      // Clean form fields
      setNewTaskTitle('');
      setNewTaskAssignee('');
      setNewTaskLink('');
      setNewTaskAssignedDate('');
      setNewTaskDeadline('');
      setNewTaskReminderEmail('');
      await fetchTasks();
    } catch (err) {
      alert('Có lỗi xảy ra khi tạo công việc.');
    }
  };

  const handleToggleTask = async (task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await network.put(`/tasks/${task.id}`, {
        status: nextStatus
      });
      await fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Ngài có muốn xóa công việc này?')) {
      try {
        await network.delete(`/tasks/${taskId}`);
        await fetchTasks();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Custom Member Invite Handler including full name, role and custom status
  const handleInviteCustomMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !currentProj) return;
    try {
      await network.post(`/projects/${currentProj.id}/members`, {
        email: newMemberEmail,
        full_name: newMemberName,
        role: newMemberRole,
        status: newMemberStatus
      });
      setNewMemberEmail('');
      setNewMemberName('');
      setNewMemberRole('');
      setNewMemberStatus('active');
      await fetchProjects();
    } catch (err) {
      alert('Có lỗi xảy ra khi mời thành viên.');
    }
  };

  const handleUpdateMember = async (memberId) => {
    if (!currentProj) return;
    try {
      await network.put(`/projects/${currentProj.id}/members/${memberId}`, {
        full_name: editMemberName,
        role: editMemberRole,
        status: editMemberStatus
      });
      setEditingMemberId(null);
      await fetchProjects();
    } catch (err) {
      alert('Có lỗi xảy ra khi cập nhật thành viên.');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!currentProj) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi dự án?')) return;
    try {
      await network.delete(`/projects/${currentProj.id}/members/${memberId}`);
      await fetchProjects();
    } catch (err) {
      alert('Có lỗi xảy ra khi xóa thành viên.');
    }
  };

  const handleGenerateGeminiPreview = async () => {
    if (!reminderRawContent.trim() || !currentProj) {
      alert('Vui lòng nhập nội dung nhắc hẹn thô.');
      return;
    }
    
    setPreviewLoading(true);
    try {
      const targetMember = currentProj.members.find(m => m.email === remindMemberEmail);
      const memberName = targetMember ? (targetMember.full_name || targetMember.email.split('@')[0]) : 'Cả nhóm';
      
      const response = await network.post(`/projects/${currentProj.id}/remind-preview`, {
        raw_content: reminderRawContent,
        member_email: remindMemberEmail || null,
        member_name: memberName,
        reminder_time: reminderTime || null
      });
      
      setPreviewSubject(response.data.subject || '');
      setPreviewHtml(response.data.html_content || '');
    } catch (err) {
      console.error(err);
      alert('Không thể tạo bản nháp bằng Gemini. Đang sử dụng chế độ dự phòng.');
      const memberName = remindMemberEmail ? remindMemberEmail.split('@')[0] : 'Cả nhóm';
      setPreviewSubject(`🔔 [YourAI Remind] Nhắc việc dự án: ${currentProj.title}`);
      setPreviewHtml(`
        <div style="font-family: sans-serif; line-height: 1.6; padding: 15px;">
          <p>Xin chào <strong>${memberName}</strong>,</p>
          <p>Đây là thông báo nhắc nhở tự động từ dự án <strong>${currentProj.title}</strong>.</p>
          <div style="background: #FAF9F5; border-left: 4px solid #D4AF37; padding: 10px; margin: 15px 0;">
            <p><strong>Nội dung:</strong> ${reminderRawContent}</p>
            ${reminderTime ? `<p>⏰ <strong>Thời gian:</strong> ${new Date(reminderTime).toLocaleString('vi-VN')}</p>` : ''}
          </div>
        </div>
      `);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendCustomReminder = async (e) => {
    if (e) e.preventDefault();
    if (!remindMemberEmail) {
      alert('Vui lòng chọn thành viên nhận thông báo.');
      return;
    }
    if (!previewSubject || !previewHtml) {
      alert('Vui lòng bấm nút soạn thảo bản nháp bằng Gemini trước khi gửi.');
      return;
    }
    
    setSendLoading(true);
    try {
      const targetMember = currentProj.members.find(m => m.email === remindMemberEmail);
      const memberName = targetMember ? (targetMember.full_name || targetMember.email.split('@')[0]) : 'Thành viên';
      
      await network.post(`/projects/${currentProj.id}/send-custom-remind`, {
        member_email: remindMemberEmail,
        member_name: memberName,
        subject: previewSubject,
        html_content: previewHtml
      });
      
      alert('🚀 Đã gửi email nhắc việc thành công tới ' + remindMemberEmail + '!');
      setReminderRawContent('');
      setReminderTime('');
      setPreviewSubject('');
      setPreviewHtml('');
    } catch (err) {
      console.error(err);
      alert('Gửi email thất bại. Vui lòng kiểm tra lại cấu hình SMTP hoặc kết nối mạng.');
    } finally {
      setSendLoading(false);
    }
  };

  // Dynamically map naive datetimes to the 30 timeline grid columns
  const getGanttColumn = (dateStr, projStartStr, projEndStr) => {
    if (!dateStr || !projStartStr || !projEndStr) return null;
    try {
      const date = new Date(dateStr.slice(0, 10)).getTime();
      const start = new Date(projStartStr.slice(0, 10)).getTime();
      const end = new Date(projEndStr.slice(0, 10)).getTime();
      if (end <= start) return null;
      
      const pct = (date - start) / (end - start);
      const col = Math.min(30, Math.max(1, Math.round(pct * 30)));
      return col;
    } catch (e) {
      return null;
    }
  };

  // Gantt chart columns (Day 1 to 30)
  const ganttDays = Array.from({ length: 30 }, (_, i) => i + 1);

  // Filter tasks belonging to active project
  const projectTasks = tasks.filter(t => t.project_id === currentProj?.id);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-title)', marginBottom: '8px', color: 'var(--charcoal)' }}>Quản Lý Tiến Độ Dự Án</h2>
          <p style={{ color: 'var(--muted-gray)', fontSize: '14px' }}>Theo dõi trực quan dòng thời gian, phân nhiệm vụ và cảnh báo tiến độ thông minh.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowProjModal(true)}
            className="lux-btn lux-btn-gold"
          >
            <Plus size={16} /> Tạo Dự Án Mới
          </button>
        </div>
      </div>

      {/* Select active project bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {projects.map(p => (
            <button 
              key={p.id}
              onClick={() => setActiveProject(p.id)}
              style={{
                padding: '10px 24px',
                borderRadius: '30px',
                border: activeProject === p.id ? '1.5px solid #D4AF37' : '1px solid #EAE6DF',
                background: activeProject === p.id ? 'var(--soft-gold-bg)' : '#FFFFFF',
                color: activeProject === p.id ? '#B8860B' : 'var(--charcoal)',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.3s',
                boxShadow: activeProject === p.id ? '0 4px 15px rgba(212, 175, 55, 0.15)' : 'none'
              }}
            >
              {p.title}
              <span style={{
                marginLeft: '8px',
                fontSize: '11px',
                background: p.status === 'completed' ? '#E8F5E9' : p.status === 'on_hold' ? '#FFF8E1' : '#E3F2FD',
                color: p.status === 'completed' ? '#2E7D32' : p.status === 'on_hold' ? '#F57F17' : '#1565C0',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {p.status === 'completed' ? 'Done' : p.status === 'on_hold' ? 'Delay' : 'Active'}
              </span>
            </button>
          ))}
        </div>

        {currentProj && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Quick Status Adjustments */}
            <select 
              value={currentProj.status}
              onChange={(e) => handleUpdateProjectStatus(e.target.value)}
              className="lux-input"
              style={{ padding: '6px 14px', width: '160px', height: '36px', fontSize: '12px' }}
            >
              <option value="active">Trạng thái: Hoạt động</option>
              <option value="on_hold">Trạng thái: Tạm dừng</option>
              <option value="completed">Trạng thái: Hoàn thành</option>
            </select>
            <button 
              onClick={handleDeleteActiveProject}
              className="lux-btn"
              style={{ borderColor: '#C62828', color: '#C62828', background: 'transparent', padding: '6px 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <Trash2 size={14} /> Xóa Dự Án
            </button>
          </div>
        )}
      </div>

      {currentProj ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '30px', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Team Members & Invite & Reminders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Team Members card */}
            <div className="glass-card" style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(212, 175, 55, 0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
              <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-title)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--charcoal)', fontWeight: '700' }}>
                <Users size={16} color="#D4AF37" /> Thành Viên Nhóm
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {currentProj.members.map((m, idx) => {
                  const isEditing = editingMemberId === m.id;
                  return (
                    <div key={m.id || idx} style={{
                      display: 'flex',
                      flexDirection: isEditing ? 'column' : 'row',
                      alignItems: isEditing ? 'stretch' : 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      border: '1px solid rgba(234, 230, 223, 0.6)',
                      background: isEditing ? '#FAF6EE' : '#FFFFFF',
                      borderRadius: '8px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)',
                      gap: isEditing ? '10px' : '0'
                    }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#B8860B' }}>CHỈNH SỬA THÀNH VIÊN</div>
                          
                          <input 
                            type="text" 
                            placeholder="Họ và tên..." 
                            value={editMemberName}
                            onChange={(e) => setEditMemberName(e.target.value)}
                            className="lux-input"
                            style={{ height: '30px', fontSize: '11px', padding: '4px 8px', background: '#FFFFFF' }}
                          />
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                            <input 
                              type="text" 
                              placeholder="Chức vụ: PM, Dev..." 
                              value={editMemberRole}
                              onChange={(e) => setEditMemberRole(e.target.value)}
                              className="lux-input"
                              style={{ height: '30px', fontSize: '11px', padding: '4px 8px', background: '#FFFFFF' }}
                            />
                            
                            <select
                              value={editMemberStatus}
                              onChange={(e) => setEditMemberStatus(e.target.value)}
                              className="lux-input"
                              style={{ height: '30px', fontSize: '11px', padding: '4px 8px', background: '#FFFFFF' }}
                            >
                              <option value="active">Active</option>
                              <option value="vacation">Vacation</option>
                              <option value="pending">Pending</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                              onClick={() => setEditingMemberId(null)}
                              className="lux-btn"
                              style={{ height: '28px', padding: '0 10px', fontSize: '11px', background: 'transparent', borderColor: '#EAE6DF', color: 'var(--charcoal)' }}
                            >
                              Hủy
                            </button>
                            <button
                              onClick={() => handleUpdateMember(m.id)}
                              className="lux-btn lux-btn-gold"
                              style={{ height: '28px', padding: '0 10px', fontSize: '11px', color: '#FFFFFF' }}
                            >
                              Lưu
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--charcoal)' }}>
                              {m.full_name || m.email.split('@')[0].toUpperCase()}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--muted-gray)' }}>{m.email}</span>
                            <span style={{ 
                              fontSize: '9px', 
                              color: '#B8860B', 
                              fontWeight: '600', 
                              background: 'rgba(212, 175, 55, 0.08)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              alignSelf: 'flex-start',
                              marginTop: '2px'
                            }}>
                              💼 {m.role || 'Member'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '9px',
                              padding: '2px 8px',
                              borderRadius: '8px',
                              background: m.status === 'active' ? '#E8F5E9' : m.status === 'vacation' ? '#FFF8E1' : '#ECEFF1',
                              color: m.status === 'active' ? '#2E7D32' : m.status === 'vacation' ? '#B8860B' : '#455A64',
                              fontWeight: 'bold',
                              textTransform: 'uppercase'
                            }}>
                              {m.status || 'Active'}
                            </span>
                            
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => {
                                  setEditingMemberId(m.id);
                                  setEditMemberName(m.full_name || '');
                                  setEditMemberRole(m.role || '');
                                  setEditMemberStatus(m.status || 'active');
                                }}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#D4AF37', padding: '4px' }}
                                title="Chỉnh sửa thành viên"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(m.id)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#C62828', padding: '4px' }}
                                title="Xóa thành viên"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Team Member Form */}
              <form onSubmit={handleInviteCustomMember} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(234, 230, 223, 0.7)', paddingTop: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', letterSpacing: '0.5px' }}>THÊM THÀNH VIÊN TRỰC TIẾP</div>
                
                <input 
                  type="text" 
                  placeholder="Họ và tên..." 
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="lux-input"
                  style={{ height: '34px', fontSize: '11px', padding: '6px 10px' }}
                  required
                />
                <input 
                  type="email" 
                  placeholder="Địa chỉ Email..." 
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="lux-input"
                  style={{ height: '34px', fontSize: '11px', padding: '6px 10px' }}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--muted-gray)', fontWeight: 'bold' }}>CHỨC VỤ</label>
                    <input
                      type="text"
                      placeholder="e.g. Lead, PM, Designer..."
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="lux-input"
                      style={{ height: '32px', fontSize: '11px', padding: '4px 8px' }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <label style={{ fontSize: '9px', color: 'var(--muted-gray)', fontWeight: 'bold' }}>TRẠNG THÁI</label>
                    <select
                      value={newMemberStatus}
                      onChange={(e) => setNewMemberStatus(e.target.value)}
                      className="lux-input"
                      style={{ height: '32px', fontSize: '11px', padding: '4px 8px' }}
                    >
                      <option value="active">Active (Hoạt động)</option>
                      <option value="vacation">Vacation (Nghỉ phép)</option>
                      <option value="pending">Pending (Chờ duyệt)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="lux-btn lux-btn-gold" style={{ padding: '8px 15px', fontSize: '11px', height: '34px', display: 'flex', justifySelf: 'center', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                  <Plus size={12} /> Thêm Vào Nhóm
                </button>
              </form>
            </div>

            {/* Email automation Reminder card */}
            <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(46, 125, 50, 0.15)', background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(46, 125, 50, 0.04)' }}>
              <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-title)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#2E7D32', fontWeight: '700' }}>
                <Mail size={16} /> Gửi Email Nhắc Việc
              </h3>
              <p style={{ fontSize: '10px', color: 'var(--muted-gray)', marginBottom: '14px', lineHeight: '1.4' }}>
                Soạn thảo thông báo thô và sử dụng Gemini AI để sinh bản nháp email thượng lưu gửi qua SMTP.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--charcoal)' }}>CHỌN THÀNH VIÊN NHẮC HẸN</label>
                  <select 
                    value={remindMemberEmail}
                    onChange={(e) => setRemindMemberEmail(e.target.value)}
                    className="lux-input"
                    style={{ height: '34px', fontSize: '11px' }}
                  >
                    <option value="">-- Chọn thành viên --</option>
                    {currentProj.members.map(m => (
                      <option key={m.id} value={m.email}>{m.full_name || m.email} ({m.email})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--charcoal)' }}>⏰ THỜI GIAN NHẮC HẸN (TÙY CHỌN)</label>
                  <input 
                    type="datetime-local" 
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="lux-input"
                    style={{ height: '34px', fontSize: '11px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--charcoal)' }}>NỘI DUNG NHẮC HẸN THÔ</label>
                  <textarea 
                    placeholder="Ví dụ: Nhắc Bob hoàn thành báo cáo marketing trước 5h chiều nay nhé..."
                    value={reminderRawContent}
                    onChange={(e) => setReminderRawContent(e.target.value)}
                    rows={3}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #EAE6DF',
                      fontSize: '11px',
                      resize: 'none',
                      fontFamily: 'var(--font-body)',
                      background: '#FFFFFF',
                      lineHeight: '1.4'
                    }}
                  />
                </div>

                <button 
                  type="button" 
                  onClick={handleGenerateGeminiPreview}
                  disabled={previewLoading}
                  className="lux-btn" 
                  style={{ background: 'var(--soft-gold-bg)', border: '1px solid #D4AF37', color: '#B8860B', padding: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '34px' }}
                >
                  {previewLoading ? '✨ Đang Soạn Bản Nháp Gemini...' : '✨ Soạn Bản Nháp Gemini'}
                </button>

                {/* Gemini Live Email HTML Preview Box */}
                {(previewSubject || previewHtml) && (
                  <div style={{
                    marginTop: '12px',
                    border: '1px solid #D4AF37',
                    borderRadius: '8px',
                    background: '#FFFDF9',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(212,175,55,0.05)'
                  }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#B8860B', textTransform: 'uppercase', marginBottom: '6px', borderBottom: '1px solid rgba(212,175,55,0.15)', paddingBottom: '4px', display: 'flex', justifyContent: 'between' }}>
                      <span>Bản Nháp Gemini Preview</span>
                      <span style={{ color: '#2E7D32', marginLeft: 'auto' }}>● SMTP Ready</span>
                    </div>
                    
                    <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                      <strong>Subject:</strong> <span style={{ color: 'var(--charcoal)' }}>{previewSubject}</span>
                    </div>

                    <div 
                      style={{
                        border: '1px solid #EAE6DF',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        padding: '10px',
                        maxHeight: '150px',
                        overflowY: 'auto',
                        fontSize: '11px',
                        color: '#333333'
                      }}
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />

                    <button 
                      type="button"
                      onClick={handleSendCustomReminder}
                      disabled={sendLoading}
                      className="lux-btn"
                      style={{
                        background: '#2E7D32',
                        border: '1px solid #2E7D32',
                        color: '#FFFFFF',
                        width: '100%',
                        marginTop: '8px',
                        padding: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        height: '34px'
                      }}
                    >
                      {sendLoading ? 'Gửi Email...' : '🔔 Xác Nhận & Gửi Email Ngay'}
                    </button>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: The Magnificent Gantt Chart Grid */}
          <div className="glass-card" style={{ padding: '24px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(212, 175, 55, 0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-title)', color: 'var(--charcoal)', fontWeight: '700' }}>Sơ Đồ Gantt Tiến Độ Thực Tế</h3>
                <p style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>Tính toán trực tiếp từ mốc thời gian của từng công việc. Nhấp chọn hộp để cập nhật tiến độ.</p>
              </div>
              <button 
                onClick={() => setShowTaskModal(true)}
                className="lux-btn lux-btn-gold"
                style={{ padding: '6px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', height: '34px' }}
              >
                <Plus size={12} /> Thêm Công Việc
              </button>
            </div>

            {/* Sơ đồ Gantt Layout Container */}
            <div style={{ border: '1.5px solid rgba(234, 230, 223, 0.7)', borderRadius: '12px', overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              
              {/* Gantt Header grid: Left tree column & right timeline columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', borderBottom: '1.5px solid rgba(234, 230, 223, 0.7)', background: '#FAF9F5' }}>
                <div style={{ padding: '12px 16px', fontWeight: 'bold', fontSize: '11px', color: 'var(--charcoal)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>CÔNG VIỆC & NHÂN SỰ</div>
                
                {/* 30 days grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, minmax(20px, 1fr))', padding: '10px 0' }}>
                  {ganttDays.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: '#B8860B' }}>
                      {d}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gantt Body rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* 1. Project Folder Level Bar Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', borderBottom: '1px solid rgba(234, 230, 223, 0.5)', background: '#FFFDF9' }}>
                  
                  {/* Left Side Info */}
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid rgba(234, 230, 223, 0.5)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D4AF37', boxShadow: '0 0 8px #D4AF37' }} />
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--charcoal)' }}>
                      📁 {currentProj.title}
                    </span>
                    <span style={{ fontSize: '9px', background: 'rgba(212, 175, 55, 0.12)', color: '#B8860B', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {projectTasks.length} Tác vụ
                    </span>
                  </div>

                  {/* Right Side Project Timeline Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, minmax(20px, 1fr))', position: 'relative', padding: '10px 0', background: 'rgba(250, 249, 245, 0.2)' }}>
                    {/* Vertical Grid Lines Overlay */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'grid', gridTemplateColumns: 'repeat(30, minmax(20px, 1fr))', pointerEvents: 'none' }}>
                      {ganttDays.map(d => (
                        <div key={d} style={{ borderRight: '1px solid rgba(234, 230, 223, 0.4)', height: '100%' }} />
                      ))}
                    </div>

                    <div style={{
                      gridColumn: '1 / 31',
                      height: '14px',
                      background: 'linear-gradient(90deg, #D4AF37, #B8860B)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '10px',
                      color: '#FFFFFF',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 6px rgba(212, 175, 55, 0.2)',
                      zIndex: 1
                    }}>
                      Dòng thời gian dự án toàn phần (Day 1 - 30)
                    </div>
                  </div>

                </div>

                {/* 2. Tasks Rows */}
                {projectTasks.length === 0 ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted-gray)', fontSize: '12px' }}>
                    Không có công việc nào trong dự án này. Hãy thêm công việc mới!
                  </div>
                ) : (
                  projectTasks.map((t, idx) => {
                    // Map task naive start/end dates to Gantt columns (Day 1 to 30)
                    let startCol = getGanttColumn(t.assigned_date, currentProj.timeline_start, currentProj.timeline_end) || 2;
                    let endCol = getGanttColumn(t.deadline_at, currentProj.timeline_start, currentProj.timeline_end) || 12;
                    
                    if (startCol >= endCol) {
                      endCol = Math.min(30, startCol + 2); // safety minimum duration representation
                    }

                    return (
                      <div key={t.id} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '280px 1fr', 
                        borderBottom: '1px solid rgba(234, 230, 223, 0.4)',
                        transition: 'background 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FAF9F6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        
                        {/* Left Side task tree information */}
                        <div style={{ padding: '10px 16px 10px 24px', display: 'flex', flexDirection: 'column', gap: '3px', borderRight: '1px solid rgba(234, 230, 223, 0.4)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="checkbox" 
                              checked={t.status === 'done'}
                              onChange={() => handleToggleTask(t)}
                              style={{ cursor: 'pointer', accentColor: '#2E7D32', width: '14px', height: '14px' }}
                            />
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: '600', 
                              color: 'var(--charcoal)',
                              textDecoration: t.status === 'done' ? 'line-through' : 'none',
                              opacity: t.status === 'done' ? 0.6 : 1
                            }}>
                              {t.title}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px', paddingLeft: '22px' }}>
                            {t.assigned_to && (
                              <span style={{ fontSize: '9px', background: 'rgba(212, 175, 55, 0.08)', color: '#B8860B', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                👤 {t.assigned_to}
                              </span>
                            )}
                            {t.project_link && (
                              <a href={t.project_link} target="_blank" rel="noreferrer" style={{ fontSize: '9px', color: '#0066CC', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold' }}>
                                🔗 Link dự án
                              </a>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', paddingLeft: '22px', marginTop: '2px', fontSize: '9px', color: 'var(--muted-gray)' }}>
                            <span>📅 Giao: {formatDate(t.assigned_date)}</span>
                            <span>⏰ Hạn: {formatDate(t.deadline_at)}</span>
                          </div>

                          {t.reminder_email && (
                            <div style={{ fontSize: '9px', color: '#2E7D32', paddingLeft: '22px', fontWeight: '600' }}>
                              🔔 Email báo: {t.reminder_email}
                            </div>
                          )}
                        </div>

                        {/* Right Side task colorful progress bar */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, minmax(20px, 1fr))', position: 'relative', padding: '12px 0' }}>
                          {/* Vertical Grid Lines Overlay */}
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'grid', gridTemplateColumns: 'repeat(30, minmax(20px, 1fr))', pointerEvents: 'none' }}>
                            {ganttDays.map(d => (
                              <div key={d} style={{ borderRight: '1px solid rgba(234, 230, 223, 0.3)', height: '100%' }} />
                            ))}
                          </div>

                          <div style={{
                            gridColumn: `${startCol} / ${endCol}`,
                            height: '14px',
                            background: t.status === 'done' 
                              ? 'linear-gradient(90deg, #2E7D32, #4CAF50)' 
                              : 'linear-gradient(90deg, #E65100, #FFB74D)',
                            borderRadius: '8px',
                            boxShadow: t.status === 'done' 
                              ? '0 2px 6px rgba(46,125,50,0.15)' 
                              : '0 2px 6px rgba(230,81,0,0.15)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 8px',
                            color: '#FFFFFF',
                            fontSize: '8px',
                            fontWeight: 'bold',
                            zIndex: 1,
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scaleY(1.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scaleY(1)'}
                          onClick={() => handleToggleTask(t)}
                          >
                            <span>{t.status === 'done' ? 'Hoàn thành' : 'Đang xử lý'}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Ngài có muốn xoá công việc "${t.title}" không?`)) {
                                  handleDeleteTask(t.id);
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 0, fontSize: '9px', fontWeight: 'bold' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}

              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="glass-card" style={{ padding: '50px', textAlign: 'center', border: '1.5px dashed #EAE6DF', borderRadius: '15px' }}>
          <Info size={36} color="#D4AF37" style={{ marginBottom: '15px' }} />
          <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-title)', marginBottom: '8px' }}>Không Tìm Thấy Dự Án</h3>
          <p style={{ color: 'var(--muted-gray)', fontSize: '14px', marginBottom: '20px' }}>Ngài chưa tạo lập dự án nào trên hệ thống. Hãy khởi tạo dự án đầu tiên!</p>
          <button 
            onClick={() => setShowProjModal(true)}
            className="lux-btn lux-btn-gold"
          >
            <Plus size={16} /> Tạo Dự Án Mới
          </button>
        </div>
      )}

      {/* 1. Modal Thêm Dự Án Mới */}
      {showProjModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(17, 17, 17, 0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <form onSubmit={handleCreateProjectSubmit} className="glass-card animate-fade-in" style={{
            width: '480px',
            background: '#FFFFFF',
            border: '1.5px solid #D4AF37',
            padding: '35px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', color: '#D4AF37', marginBottom: '6px' }}>Tạo Dự Án Mới</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted-gray)' }}>Lập kế hoạch và tiến độ cho toàn bộ dự án.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Tên dự án</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Xây dựng Hệ thống AI..." 
                  value={newProjTitle}
                  onChange={(e) => setNewProjTitle(e.target.value)}
                  className="lux-input"
                  style={{ border: '1px solid #D4AF37' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Ngày bắt đầu</label>
                  <input 
                    type="date" 
                    value={newProjStart}
                    onChange={(e) => setNewProjStart(e.target.value)}
                    className="lux-input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Ngày hoàn thành</label>
                  <input 
                    type="date" 
                    value={newProjEnd}
                    onChange={(e) => setNewProjEnd(e.target.value)}
                    className="lux-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Trạng thái ban đầu</label>
                <select 
                  value={newProjStatus}
                  onChange={(e) => setNewProjStatus(e.target.value)}
                  className="lux-input"
                >
                  <option value="active">Đang hoạt động (Active)</option>
                  <option value="on_hold">Tạm dừng (On Hold)</option>
                  <option value="completed">Đã hoàn thành (Completed)</option>
                </select>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button 
                type="button"
                onClick={() => setShowProjModal(false)}
                className="lux-btn" 
                style={{ border: '1px solid #EAE6DF', color: 'var(--charcoal)', background: 'transparent' }}
              >
                Hủy bỏ
              </button>
              <button 
                type="submit"
                className="lux-btn lux-btn-gold"
              >
                Xác nhận tạo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Modal Thêm Công Việc Mới (Task) */}
      {showTaskModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(17, 17, 17, 0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <form onSubmit={handleCreateTaskSubmit} className="glass-card animate-fade-in" style={{
            width: '500px',
            background: '#FFFFFF',
            border: '1.5px solid #D4AF37',
            padding: '35px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', color: '#D4AF37', marginBottom: '6px' }}>Thêm Công Việc Mới</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted-gray)' }}>Phân quyền nhiệm vụ cho thành viên nhóm dự án.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxH: '70vh' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)' }}>TÊN CÔNG VIỆC</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Thiết kế giao diện chính..." 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="lux-input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)' }}>NGƯỜI ĐƯỢC PHÂN (ASSIGNEE)</label>
                  <select 
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="lux-input"
                  >
                    <option value="">-- Chọn thành viên --</option>
                    {currentProj.members.map(m => (
                      <option key={m.id} value={m.full_name || m.email}>{m.full_name || m.email}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)' }}>LINK DỰ ÁN (RESOURCE LINK)</label>
                  <input 
                    type="url" 
                    placeholder="https://figma.com/..." 
                    value={newTaskLink}
                    onChange={(e) => setNewTaskLink(e.target.value)}
                    className="lux-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)' }}>NGÀY ĐƯỢC PHÂN</label>
                  <input 
                    type="date" 
                    value={newTaskAssignedDate}
                    onChange={(e) => setNewTaskAssignedDate(e.target.value)}
                    className="lux-input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)' }}>HẠN CHÓT (DEADLINE)</label>
                  <input 
                    type="date" 
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="lux-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)' }}>EMAIL NHẮC NHỞ TỰ ĐỘNG</label>
                  <input 
                    type="email" 
                    placeholder="member@yourai.com" 
                    value={newTaskReminderEmail}
                    onChange={(e) => setNewTaskReminderEmail(e.target.value)}
                    className="lux-input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--charcoal)' }}>NĂNG LƯỢNG (WH)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="10"
                    value={newTaskEnergy}
                    onChange={(e) => setNewTaskEnergy(e.target.value)}
                    className="lux-input"
                  />
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button 
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="lux-btn" 
                style={{ border: '1px solid #EAE6DF', color: 'var(--charcoal)', background: 'transparent' }}
              >
                Hủy bỏ
              </button>
              <button 
                type="submit"
                className="lux-btn lux-btn-gold"
              >
                Xác nhận phân việc
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

export default Projects;
