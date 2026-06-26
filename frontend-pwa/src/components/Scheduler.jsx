import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus } from 'lucide-react';
import network from '../core/network';

function Scheduler({
  calendarEvents,
  fetchTasks,
  showEventModal,
  setShowEventModal,
  newEventTitle,
  setNewEventTitle,
  newEventStart,
  setNewEventStart,
  newEventEnd,
  setNewEventEnd,
  showToast
}) {
  const [editingEvent, setEditingEvent] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Timezone-safe local ISO string formatting helper
  const toLocalISOString = (dateOrStr) => {
    if (!dateOrStr) return '';
    const d = new Date(dateOrStr);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };
  
  // Custom database persistence state fields
  const [newLocation, setNewLocation] = useState('');
  const [newIsOnline, setNewIsOnline] = useState(false);
  const [newAdditionalInfo, setNewAdditionalInfo] = useState('');
  const [newType, setNewType] = useState('chore'); // chore / lịch học / dự án
  const [newReminderEmail, setNewReminderEmail] = useState('');
  const [newReminderAt, setNewReminderAt] = useState('');
  
  const [editLocation, setEditLocation] = useState('');
  const [editIsOnline, setEditIsOnline] = useState(false);
  const [editAdditionalInfo, setEditAdditionalInfo] = useState('');
  const [editType, setEditType] = useState('chore');
  const [editReminderEmail, setEditReminderEmail] = useState('');
  const [editReminderAt, setEditReminderAt] = useState('');

  const handleCreatePlan = async () => {
    if (!newEventTitle.trim()) {
      alert('Vui lòng nhập tên sự kiện.');
      return;
    }
    try {
      await network.post('/tasks/', {
        title: newEventTitle,
        assigned_date: newEventStart ? newEventStart : toLocalISOString(new Date()),
        deadline_at: newEventEnd ? newEventEnd : toLocalISOString(new Date()),
        location: newLocation,
        is_online: newIsOnline,
        additional_info: newAdditionalInfo,
        status: 'todo',
        energy_cost: 5,
        type: newType,
        reminder_email: newReminderEmail.trim() || null,
        reminder_at: newReminderAt ? newReminderAt : null
      });
      
      // Clean inputs
      setNewEventTitle('');
      setNewLocation('');
      setNewIsOnline(false);
      setNewAdditionalInfo('');
      setNewType('chore');
      setNewReminderEmail('');
      setNewReminderAt('');
      setShowEventModal(false);
      
      // Refresh parent state from PostgreSQL DB
      await fetchTasks();
      showToast('Đã thêm kế hoạch thành công lên máy chủ bảo mật.');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu kế hoạch!', 'error');
    }
  };

  const handleUpdatePlan = async () => {
    if (!editTitle.trim()) {
      alert('Vui lòng nhập tên sự kiện.');
      return;
    }
    try {
      await network.put(`/tasks/${editingEvent}`, {
        title: editTitle,
        assigned_date: editStart ? editStart : null,
        deadline_at: editEnd ? editEnd : null,
        location: editLocation,
        is_online: editIsOnline,
        additional_info: editAdditionalInfo,
        type: editType,
        reminder_email: editReminderEmail.trim() || null,
        reminder_at: editReminderAt ? editReminderAt : null
      });
      
      setEditingEvent(null);
      await fetchTasks();
      showToast('Đã cập nhật thay đổi thành công lên máy chủ.');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi cập nhật kế hoạch!', 'error');
    }
  };

  const handleDeletePlan = async () => {
    try {
      await network.delete(`/tasks/${editingEvent}`);
      setEditingEvent(null);
      await fetchTasks();
      showToast('Đã xoá kế hoạch thành công.');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xoá kế hoạch!', 'error');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-title)', marginBottom: '8px', color: 'var(--charcoal)' }}>Lịch Biểu Học Thuật</h2>
          <p style={{ color: 'var(--muted-gray)', fontSize: '14px' }}>Quản lý thời gian, tác vụ và kế hoạch của ngài trực quan.</p>
        </div>
        <button 
          onClick={() => {
            setNewEventStart(toLocalISOString(new Date()));
            setNewEventEnd(toLocalISOString(new Date(Date.now() + 3600000)));
            setNewLocation('');
            setNewIsOnline(false);
            setNewAdditionalInfo('');
            setShowEventModal(true);
          }}
          className="lux-btn lux-btn-gold"
        >
          <Plus size={16} /> Thêm Kế Hoạch
        </button>
      </div>

      <div className="glass-card" style={{ padding: '25px', background: '#FFFFFF', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          editable={true}
          selectable={true}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          eventDrop={async (info) => {
            try {
              await network.put(`/tasks/${info.event.id}`, {
                assigned_date: toLocalISOString(info.event.start),
                deadline_at: toLocalISOString(info.event.end || info.event.start)
              });
              
              await fetchTasks();
              showToast('Đã di chuyển thời gian sự kiện!');
            } catch (err) {
              console.error(err);
              showToast('Lỗi di chuyển kế hoạch!', 'error');
            }
          }}
          eventResize={async (info) => {
            try {
              await network.put(`/tasks/${info.event.id}`, {
                assigned_date: toLocalISOString(info.event.start),
                deadline_at: toLocalISOString(info.event.end || info.event.start)
              });
              
              await fetchTasks();
              showToast('Đã thay đổi độ dài sự kiện!');
            } catch (err) {
              console.error(err);
              showToast('Lỗi thay đổi thời gian sự kiện!', 'error');
            }
          }}
          eventClick={(info) => {
            const startStr = info.event.start ? toLocalISOString(info.event.start) : '';
            const endStr = info.event.end ? toLocalISOString(info.event.end) : startStr;
            setEditingEvent(info.event.id);
            setEditTitle(info.event.title.replace(/^✓ /, ''));
            setEditStart(startStr);
            setEditEnd(endStr);
            
            const ext = info.event.extendedProps || {};
            setEditLocation(ext.location || '');
            setEditIsOnline(ext.is_online || false);
            setEditAdditionalInfo(ext.additional_info || '');
            setEditType(ext.type || 'chore');
            setEditReminderEmail(ext.reminder_email || '');
            setEditReminderAt(ext.reminder_at ? toLocalISOString(ext.reminder_at) : '');
          }}
          select={(info) => {
            setNewEventStart(toLocalISOString(info.start));
            setNewEventEnd(toLocalISOString(info.end));
            setNewLocation('');
            setNewIsOnline(false);
            setNewAdditionalInfo('');
            setNewType('chore');
            setNewReminderEmail('');
            setNewReminderAt('');
            setShowEventModal(true);
          }}
          locale="vi"
        />
      </div>

      {/* Premium Add Event Modal */}
      {showEventModal && (
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
          <div className="glass-card animate-fade-in" style={{
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
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', color: '#D4AF37', marginBottom: '6px' }}>Thêm Kế Hoạch Mới</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted-gray)' }}>Lập kế hoạch hoàn hảo để nâng cao điểm số của ngài.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Tên kế hoạch</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Họp BKI, Nộp Assignment 2 UTS..." 
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="lux-input"
                  style={{ border: '1px solid #D4AF37' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời gian bắt đầu</label>
                  <input 
                    type="datetime-local" 
                    value={newEventStart}
                    onChange={(e) => setNewEventStart(e.target.value)}
                    className="lux-input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời gian kết thúc</label>
                  <input 
                    type="datetime-local" 
                    value={newEventEnd}
                    onChange={(e) => setNewEventEnd(e.target.value)}
                    className="lux-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Địa điểm / Zoom Link</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Phòng H.302 hoặc Link Zoom..." 
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="lux-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Hình thức</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setNewIsOnline(true)}
                    className={`lux-btn ${newIsOnline ? 'lux-btn-gold' : ''}`}
                    style={{ padding: '6px 16px', fontSize: '12px', background: newIsOnline ? '' : 'transparent', border: newIsOnline ? '' : '1px solid #EAE6DF', color: newIsOnline ? '#FFFFFF' : 'var(--charcoal)' }}
                  >
                    Trực tuyến (Online)
                  </button>
                  <button
                    onClick={() => setNewIsOnline(false)}
                    className={`lux-btn ${!newIsOnline ? 'lux-btn-gold' : ''}`}
                    style={{ padding: '6px 16px', fontSize: '12px', background: !newIsOnline ? '' : 'transparent', border: !newIsOnline ? '' : '1px solid #EAE6DF', color: !newIsOnline ? '#FFFFFF' : 'var(--charcoal)' }}
                  >
                    Gặp mặt (Offline)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thông tin thêm</label>
                <textarea 
                  placeholder="Mô tả chi tiết kế hoạch..." 
                  value={newAdditionalInfo}
                  onChange={(e) => setNewAdditionalInfo(e.target.value)}
                  className="lux-input"
                  style={{ minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Phân loại kế hoạch</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setNewType('chore')}
                    className="lux-btn"
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '12px',
                      background: newType === 'chore' ? '#D4AF37' : 'transparent',
                      border: '1.5px solid #D4AF37',
                      color: newType === 'chore' ? '#FFFFFF' : '#D4AF37',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Chore (Vàng)
                  </button>
                  <button
                    onClick={() => setNewType('lịch học')}
                    className="lux-btn"
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '12px',
                      background: newType === 'lịch học' ? '#800020' : 'transparent',
                      border: '1.5px solid #800020',
                      color: newType === 'lịch học' ? '#FFFFFF' : '#800020',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Lịch học (Đỏ đô)
                  </button>
                  <button
                    onClick={() => setNewType('dự án')}
                    className="lux-btn"
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '12px',
                      background: newType === 'dự án' ? '#1A365D' : 'transparent',
                      border: '1.5px solid #1A365D',
                      color: newType === 'dự án' ? '#FFFFFF' : '#1A365D',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Dự án (Xanh)
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Email nhắc hẹn (AI)</label>
                  <input 
                    type="email" 
                    placeholder="nhacnho@domain.com"
                    value={newReminderEmail}
                    onChange={(e) => setNewReminderEmail(e.target.value)}
                    className="lux-input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời gian nhắc hẹn</label>
                  <input 
                    type="datetime-local" 
                    value={newReminderAt}
                    onChange={(e) => setNewReminderAt(e.target.value)}
                    className="lux-input"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button 
                onClick={() => setShowEventModal(false)}
                className="lux-btn" 
                style={{ border: '1px solid #EAE6DF', color: 'var(--charcoal)', background: 'transparent' }}
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleCreatePlan}
                className="lux-btn lux-btn-gold"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Edit Event Modal */}
      {editingEvent && (
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
          <div className="glass-card animate-fade-in" style={{
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
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', color: '#D4AF37', marginBottom: '6px' }}>Tuỳ Chỉnh Kế Hoạch</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted-gray)' }}>Điều chỉnh hoặc xoá kế hoạch học tập của ngài.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Tên kế hoạch</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="lux-input"
                  style={{ border: '1px solid #D4AF37' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời gian bắt đầu</label>
                  <input 
                    type="datetime-local" 
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="lux-input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời gian kết thúc</label>
                  <input 
                    type="datetime-local" 
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="lux-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Địa điểm / Zoom Link</label>
                <input 
                  type="text" 
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="lux-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Hình thức</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setEditIsOnline(true)}
                    className={`lux-btn ${editIsOnline ? 'lux-btn-gold' : ''}`}
                    style={{ padding: '6px 16px', fontSize: '12px', background: editIsOnline ? '' : 'transparent', border: editIsOnline ? '' : '1px solid #EAE6DF', color: editIsOnline ? '#FFFFFF' : 'var(--charcoal)' }}
                  >
                    Trực tuyến (Online)
                  </button>
                  <button
                    onClick={() => setEditIsOnline(false)}
                    className={`lux-btn ${!editIsOnline ? 'lux-btn-gold' : ''}`}
                    style={{ padding: '6px 16px', fontSize: '12px', background: !editIsOnline ? '' : 'transparent', border: !editIsOnline ? '' : '1px solid #EAE6DF', color: !editIsOnline ? '#FFFFFF' : 'var(--charcoal)' }}
                  >
                    Gặp mặt (Offline)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thông tin thêm</label>
                <textarea 
                  value={editAdditionalInfo}
                  onChange={(e) => setEditAdditionalInfo(e.target.value)}
                  className="lux-input"
                  style={{ minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Phân loại kế hoạch</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setEditType('chore')}
                    className="lux-btn"
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '12px',
                      background: editType === 'chore' ? '#D4AF37' : 'transparent',
                      border: '1.5px solid #D4AF37',
                      color: editType === 'chore' ? '#FFFFFF' : '#D4AF37',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Chore (Vàng)
                  </button>
                  <button
                    onClick={() => setEditType('lịch học')}
                    className="lux-btn"
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '12px',
                      background: editType === 'lịch học' ? '#800020' : 'transparent',
                      border: '1.5px solid #800020',
                      color: editType === 'lịch học' ? '#FFFFFF' : '#800020',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Lịch học (Đỏ đô)
                  </button>
                  <button
                    onClick={() => setEditType('dự án')}
                    className="lux-btn"
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '12px',
                      background: editType === 'dự án' ? '#1A365D' : 'transparent',
                      border: '1.5px solid #1A365D',
                      color: editType === 'dự án' ? '#FFFFFF' : '#1A365D',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Dự án (Xanh)
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Email nhắc hẹn (AI)</label>
                  <input 
                    type="email" 
                    placeholder="nhacnho@domain.com"
                    value={editReminderEmail}
                    onChange={(e) => setEditReminderEmail(e.target.value)}
                    className="lux-input"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Thời gian nhắc hẹn</label>
                  <input 
                    type="datetime-local" 
                    value={editReminderAt}
                    onChange={(e) => setEditReminderAt(e.target.value)}
                    className="lux-input"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '10px' }}>
              <button 
                onClick={handleDeletePlan}
                className="lux-btn" 
                style={{ border: '1px solid #C62828', color: '#C62828', background: 'transparent' }}
              >
                Xóa kế hoạch
              </button>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setEditingEvent(null)}
                  className="lux-btn" 
                  style={{ border: '1px solid #EAE6DF', color: 'var(--charcoal)', background: 'transparent' }}
                >
                  Hủy
                </button>
                <button 
                  onClick={handleUpdatePlan}
                  className="lux-btn lux-btn-gold"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scheduler;
