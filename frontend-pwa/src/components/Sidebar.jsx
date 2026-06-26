import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Calendar, 
  FolderGit2, 
  GraduationCap, 
  Settings, 
  LogOut 
} from 'lucide-react';

function Sidebar({ 
  activeTab, 
  setActiveTab, 
  sidebarHovered, 
  setSidebarHovered, 
  user, 
  handleLogout 
}) {
  return (
    <aside 
      onMouseEnter={() => setSidebarHovered(true)}
      onMouseLeave={() => setSidebarHovered(false)}
      style={{
        width: sidebarHovered ? '280px' : '80px',
        height: '100vh',
        background: 'rgba(17, 17, 17, 0.94)',
        backdropFilter: 'blur(20px) saturate(120%)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        borderRight: '1px solid rgba(212, 175, 55, 0.15)',
        padding: sidebarHovered ? '30px 20px' : '30px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#FFFFFF',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        overflow: 'hidden',
        zIndex: 100
      }}
    >
      <div>
        {/* Brand Logo & Image */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '40px',
          cursor: 'pointer',
          overflow: 'hidden'
        }} onClick={() => setActiveTab('dashboard')}>
          <img src="/logo.png" alt="YourAI Logo" style={{ width: '44px', height: '44px', borderRadius: '8px', border: '1.5px solid #D4AF37', flexShrink: 0, boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)' }} />
          <div style={{ 
            opacity: sidebarHovered ? 1 : 0,
            visibility: sidebarHovered ? 'visible' : 'hidden',
            transition: 'opacity 0.2s ease, visibility 0.2s ease',
            whiteSpace: 'nowrap'
          }}>
            <h1 style={{ fontFamily: 'var(--font-title)', color: '#D4AF37', fontSize: '22px', fontWeight: '600', letterSpacing: '0.5px' }}>YourAI</h1>
            <span style={{ fontSize: '9px', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '1px' }}>v4.0 Enterprise</span>
          </div>
        </div>
        
        {/* User profile */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(212, 175, 55, 0.1)',
          borderRadius: '12px',
          padding: sidebarHovered ? '15px' : '10px 0',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarHovered ? 'flex-start' : 'center',
          gap: '12px',
          transition: 'padding 0.3s ease, justify-content 0.3s ease',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '50%', 
            background: (user.avatar && user.avatar.length > 300) ? 'transparent' : 'linear-gradient(135deg, #D4AF37, #B8860B)', 
            display: 'flex', 
            alignItems: 'center', 
            color: '#FFFFFF', 
            fontWeight: 'bold', 
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(212, 175, 55, 0.2)',
            overflow: 'hidden'
          }}>
            {(user.avatar && user.avatar.length > 300) ? (
              <img src={user.avatar} alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'LQ'
            )}
          </div>
          {sidebarHovered && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#FFFFFF' }}>{user.full_name || 'Long Quan Ton'}</div>
              <div style={{ fontSize: '10px', color: '#7A7A7A' }}>{user.email === 'developer@yourai.com' ? 'Senior AI Engineer' : 'Member'}</div>
            </div>
          )}
        </div>
        
        {/* Menu items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarHovered ? 'flex-start' : 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'dashboard' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeTab === 'dashboard' ? '#D4AF37' : '#CCCCCC',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            <LayoutDashboard size={18} style={{ flexShrink: 0 }} />
            {sidebarHovered && <span>Dashboard</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('agent')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarHovered ? 'flex-start' : 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'agent' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeTab === 'agent' ? '#D4AF37' : '#CCCCCC',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            <MessageSquare size={18} style={{ flexShrink: 0 }} />
            {sidebarHovered && <span>AI Executive Agent</span>}
          </button>

          <button 
            onClick={() => setActiveTab('scheduler')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarHovered ? 'flex-start' : 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'scheduler' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeTab === 'scheduler' ? '#D4AF37' : '#CCCCCC',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            <Calendar size={18} style={{ flexShrink: 0 }} />
            {sidebarHovered && <span>Lịch Biểu (Scheduler)</span>}
          </button>

          <button 
            onClick={() => setActiveTab('projects')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarHovered ? 'flex-start' : 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'projects' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeTab === 'projects' ? '#D4AF37' : '#CCCCCC',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            <FolderGit2 size={18} style={{ flexShrink: 0 }} />
            {sidebarHovered && <span>Projects</span>}
          </button>

          <button 
            onClick={() => setActiveTab('gpa')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarHovered ? 'flex-start' : 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'gpa' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeTab === 'gpa' ? '#D4AF37' : '#CCCCCC',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            <GraduationCap size={18} style={{ flexShrink: 0 }} />
            {sidebarHovered && <span>GPA Intelligence</span>}
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarHovered ? 'flex-start' : 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === 'settings' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: activeTab === 'settings' ? '#D4AF37' : '#CCCCCC',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            <Settings size={18} style={{ flexShrink: 0 }} />
            {sidebarHovered && <span>Thiết Lập</span>}
          </button>
        </nav>
      </div>

      <button 
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarHovered ? 'flex-start' : 'center',
          gap: '12px',
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          borderRadius: '8px',
          background: 'transparent',
          color: '#FF8A80',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.3s',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 138, 128, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <LogOut size={18} style={{ flexShrink: 0 }} />
        {sidebarHovered && <span>Đăng Xuất</span>}
      </button>
    </aside>
  );
}

export default Sidebar;
