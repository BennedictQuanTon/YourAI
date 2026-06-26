import React from 'react';
import Cropper from 'react-easy-crop';
import network from '../core/network';

function Settings({
  user,
  setUser,
  avatarImage,
  setAvatarImage,
  crop,
  setCrop,
  zoom,
  setZoom,
  isCropping,
  setIsCropping,
  onCropComplete,
  createCropPreview,
  showToast
}) {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
      <div>
        <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-title)', marginBottom: '8px', color: 'var(--charcoal)' }}>Thiết Lập Tài Khoản</h2>
        <p style={{ color: 'var(--muted-gray)', fontSize: '14px' }}>Cập nhật thông tin cá nhân và ảnh đại diện đẳng cấp của ngài.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Column - Avatar Editing */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-title)', color: '#D4AF37' }}>Ảnh Đại Diện</h3>
          
          <div style={{
            position: 'relative',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            border: '2px solid #D4AF37',
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.2)',
            background: (user.avatar && user.avatar.length > 300) ? 'transparent' : 'linear-gradient(135deg, #D4AF37, #B8860B)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '36px'
          }}>
            {(user.avatar && user.avatar.length > 300) ? (
              <img src={user.avatar} alt="Cropped Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'LQ'
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <label className="lux-btn lux-btn-gold" style={{ cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
              <span>Chọn Ảnh Mới</span>
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setAvatarImage(reader.result);
                      setIsCropping(true);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            <p style={{ fontSize: '11px', color: 'var(--muted-gray)' }}>Hỗ trợ JPG, PNG. Khuyên dùng ảnh vuông.</p>
          </div>
        </div>

        {/* Right Column - Profile Info fields */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-title)', borderBottom: '1px solid #EAE6DF', paddingBottom: '10px' }}>Thông Tin Hồ Sơ</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Họ Và Tên</label>
                <input 
                  type="text" 
                  value={user.full_name || ''}
                  onChange={(e) => setUser(prev => ({ ...prev, full_name: e.target.value }))}
                  className="lux-input"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Email Tài Khoản</label>
                <input 
                  type="email" 
                  value={user.email || ''}
                  disabled
                  className="lux-input"
                  style={{ background: '#FAF9F6', cursor: 'not-allowed', color: '#7A7A7A' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Tiểu sử / Chức danh</label>
              <textarea 
                value={user.bio || 'Đại công tước và Nhà thiết kế Hệ thống Trí tuệ Nhân tạo Thượng lưu.'}
                onChange={(e) => setUser(prev => ({ ...prev, bio: e.target.value }))}
                className="lux-input"
                style={{ minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--charcoal)', textTransform: 'uppercase' }}>Hệ thống điểm GPA mặc định</label>
              <select
                value={user.gpa_scale || 'VN'}
                onChange={(e) => setUser(prev => ({ ...prev, gpa_scale: e.target.value }))}
                className="lux-input"
                style={{ height: '40px', background: '#FFFFFF' }}
              >
                <option value="VN">Việt Nam (Thang điểm 10.0)</option>
                <option value="AU">Australia / Úc (Thang điểm 7.0)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button 
              onClick={async () => {
                try {
                  const response = await network.put('/auth/profile', {
                    full_name: user.full_name,
                    avatar: user.avatar,
                    bio: user.bio,
                    gpa_scale: user.gpa_scale || 'VN'
                  });
                  setUser(prev => ({
                    ...prev,
                    full_name: response.data.full_name,
                    avatar: response.data.avatar,
                    bio: response.data.bio,
                    gpa_scale: response.data.gpa_scale
                  }));
                  showToast('Lưu thông tin hồ sơ lên máy chủ bảo mật thành công!');
                } catch (err) {
                  showToast('Lỗi lưu thông tin hồ sơ!', 'error');
                }
              }}
              className="lux-btn lux-btn-gold"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </div>

      </div>

      {/* Cropper Modal overlay */}
      {isCropping && avatarImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(17, 17, 17, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div className="glass-card" style={{
            width: '500px',
            height: '550px',
            background: '#FFFFFF',
            border: '1.5px solid #D4AF37',
            padding: '30px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative'
          }}>
            <div style={{ zIndex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '22px', color: '#D4AF37', marginBottom: '6px' }}>Cắt Ảnh Đại Diện</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted-gray)' }}>Kéo và thu phóng để căn giữa khung hình vuông đẳng cấp.</p>
            </div>

            <div style={{ position: 'relative', flex: 1, width: '100%', background: '#000000', borderRadius: '12px', overflow: 'hidden' }}>
              <Cropper
                image={avatarImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={true}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', zIndex: 1 }}>
              <span style={{ fontSize: '11px', color: 'var(--charcoal)', fontWeight: 'bold' }}>Thu phóng</span>
              <input 
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#D4AF37' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', zIndex: 1 }}>
              <button 
                onClick={() => {
                  setIsCropping(false);
                  setAvatarImage(null);
                }}
                className="lux-btn" 
                style={{ border: '1px solid #EAE6DF', color: 'var(--charcoal)', background: 'transparent' }}
              >
                Hủy bỏ
              </button>
              <button 
                onClick={createCropPreview}
                className="lux-btn lux-btn-gold"
              >
                Áp dụng cắt ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
