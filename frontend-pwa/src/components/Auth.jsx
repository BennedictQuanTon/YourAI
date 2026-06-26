import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Shield, Key, Check, Eye, EyeOff } from 'lucide-react';

const checkPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, hasMinLength: false, hasNumber: false, hasSpecial: false };
  const hasMinLength = pwd.length >= 8;
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  
  let score = 0;
  if (hasMinLength) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;
  
  return { score, hasMinLength, hasNumber, hasSpecial };
};

const PasswordStrengthIndicator = ({ password }) => {
  const { score, hasMinLength, hasNumber, hasSpecial } = checkPasswordStrength(password);
  
  if (!password) return null;

  let color = '#EAE6DF';
  let label = 'Chưa nhập';
  if (score === 1) {
    color = '#C62828'; // Weak
    label = 'Yếu';
  } else if (score === 2) {
    color = '#EF6C00'; // Medium
    label = 'Tạm ổn';
  } else if (score === 3) {
    color = '#D4AF37'; // Secure gold
    label = 'Đạt chuẩn bảo mật';
  }

  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Visual Bar */}
      <div style={{ display: 'flex', gap: '4px', height: '4px', width: '100%' }}>
        <div style={{ flex: 1, background: score >= 1 ? color : '#EAE6DF', transition: 'all 0.3s', borderRadius: '2px' }} />
        <div style={{ flex: 1, background: score >= 2 ? color : '#EAE6DF', transition: 'all 0.3s', borderRadius: '2px' }} />
        <div style={{ flex: 1, background: score >= 3 ? color : '#EAE6DF', transition: 'all 0.3s', borderRadius: '2px' }} />
      </div>

      {/* Label and Checklist */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#7A7A7A' }}>
        <span>Mức độ bảo mật: <strong style={{ color: score > 0 ? color : '#7A7A7A' }}>{label}</strong></span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', padding: '8px 10px', background: '#FAF9F6', borderRadius: '4px', border: '1px solid #EAE6DF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: hasMinLength ? '#D4AF37' : '#7A7A7A', fontWeight: hasMinLength ? '600' : 'normal' }}>
          <span style={{ fontSize: '10px' }}>{hasMinLength ? '●' : '○'}</span>
          <span>Ít nhất 8 ký tự</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: hasNumber ? '#D4AF37' : '#7A7A7A', fontWeight: hasNumber ? '600' : 'normal' }}>
          <span style={{ fontSize: '10px' }}>{hasNumber ? '●' : '○'}</span>
          <span>Chứa ít nhất 1 chữ số (0-9)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: hasSpecial ? '#D4AF37' : '#7A7A7A', fontWeight: hasSpecial ? '600' : 'normal' }}>
          <span style={{ fontSize: '10px' }}>{hasSpecial ? '●' : '○'}</span>
          <span>Chứa ít nhất 1 ký tự đặc biệt (@, #, $,...)</span>
        </div>
      </div>
    </div>
  );
};

function Auth({
  authTab,
  setAuthTab,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authFullName,
  setAuthFullName,
  rememberMe,
  setRememberMe,
  authLoading,
  authError,
  setAuthError,
  authSuccess,
  setAuthSuccess,
  handleLogin,
  handleRegister,
  handleForgotPassword,
  handleResetPassword,
  handleVerifyOtp,
  toast
}) {
  // Local states for the reset password step
  const [resetEmail, setResetEmail] = useState(authEmail || '');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);

  const [otpVerified, setOtpVerified] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  // Countdown timer for reset password OTP expiration
  React.useEffect(() => {
    if (authTab !== 'reset') {
      setTimeLeft(60); // Reset timer when switching out
      setOtpVerified(false);
      return;
    }

    if (otpVerified) {
      return; // Stop countdown when OTP is successfully verified!
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (toast) {
            toast.error("Mã OTP đã hết hạn sau 60 giây! Hệ thống sẽ đưa ngài quay lại trang đăng nhập.");
          } else {
            alert("Mã OTP đã hết hạn sau 60 giây! Hệ thống sẽ đưa ngài quay lại trang đăng nhập.");
          }
          setAuthTab('login');
          // Clear all states
          setOtpVal(['', '', '', '']);
          setResetToken('');
          setNewPassword('');
          setConfirmPassword('');
          setOtpVerified(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [authTab, otpVerified]);

  const [otpVal, setOtpVal] = useState(['', '', '', '']);
  const otpRefs = [React.useRef(), React.useRef(), React.useRef(), React.useRef()];

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newOtp = [...otpVal];
      newOtp[index] = '';
      setOtpVal(newOtp);
      setResetToken(newOtp.join(''));
      return;
    }

    const val = cleaned[cleaned.length - 1];
    const newOtp = [...otpVal];
    newOtp[index] = val;
    setOtpVal(newOtp);
    setResetToken(newOtp.join(''));

    // Auto-focus next input
    if (index < 3 && val) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpVal[index] && index > 0) {
        otpRefs[index - 1].current.focus();
        const newOtp = [...otpVal];
        newOtp[index - 1] = '';
        setOtpVal(newOtp);
        setResetToken(newOtp.join(''));
      }
    }
  };

  // Synchronize reset email state if authEmail changes
  React.useEffect(() => {
    if (authEmail && !resetEmail) {
      setResetEmail(authEmail);
    }
  }, [authEmail]);

  const onVerifyOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const success = await handleVerifyOtp(authEmail, resetToken);
    if (success) {
      setOtpVerified(true);
    }
  };

  const onResetSubmit = (e) => {
    e.preventDefault();
    handleResetPassword(e, authEmail, resetToken, newPassword, confirmPassword);
  };

  return (
    <div className="auth-container">
      {/* Left Column (Luxury Gold & Black Panel) */}
      <div className="auth-sidebar">
        {/* Subtle gold glow behind */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div className="auth-sidebar-content">
          {/* Top Logo Image */}
          <img 
            src="/logo.png" 
            alt="YourAI Logo" 
            className="auth-logo-img"
          />

          {/* Typography Heading */}
          <h2 className="auth-slogan-title">
            Elegance in<br />
            <span style={{ color: '#D4AF37' }}>Productivity.</span>
          </h2>

          {/* Subtitle Description */}
          <p className="auth-slogan-sub">
            YourAI is the premier enterprise-grade management tool designed exclusively for those who demand performance wrapped in luxury.
          </p>
        </div>
      </div>

      {/* Right Column (Pure Minimalist White Form Panel) */}
      <div className="auth-form-panel">
        {/* Auth Toast Alert */}
        {toast && (
          <div style={{
            position: 'absolute',
            top: '30px',
            right: '30px',
            background: '#111111',
            border: '1px solid #D4AF37',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#FFFFFF',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.25)',
            animation: 'fadeInUp 0.3s forwards'
          }}>
            <CheckCircle2 size={16} color="#D4AF37" />
            <span style={{ fontSize: '13px' }}>{toast.message}</span>
          </div>
        )}

        <div className="animate-fade-in" style={{
          width: '100%',
          maxWidth: '460px'
        }}>
          {/* Header titles */}
          {authTab === 'login' && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '32px', fontFamily: 'var(--font-title)', fontWeight: 'bold', color: '#111111', marginBottom: '8px' }}>Welcome Back</h3>
            </div>
          )}

          {authTab === 'register' && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '32px', fontFamily: 'var(--font-title)', fontWeight: 'bold', color: '#111111', marginBottom: '8px' }}>Create Account</h3>
            </div>
          )}

          {authTab === 'forgot' && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '32px', fontFamily: 'var(--font-title)', fontWeight: 'bold', color: '#111111', marginBottom: '8px' }}>Recover Password</h3>
              <p style={{ color: '#7A7A7A', fontSize: '13px' }}>Yêu cầu cấp mã xác minh OTP gửi trực tiếp về email.</p>
            </div>
          )}

          {authTab === 'reset' && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '32px', fontFamily: 'var(--font-title)', fontWeight: 'bold', color: '#111111', marginBottom: '8px' }}>Reset Password</h3>
              <p style={{ color: '#7A7A7A', fontSize: '13px' }}>Nhập mã xác nhận 4 chữ số và đặt mật khẩu mới.</p>
            </div>
          )}

          {/* Error / Success banners */}
          {authError && (
            <div style={{
              background: 'rgba(198, 40, 40, 0.05)',
              border: '1px solid rgba(198, 40, 40, 0.15)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#C62828',
              fontSize: '12px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={14} color="#C62828" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && authTab !== 'reset' && (
            <div style={{
              background: 'rgba(46, 125, 50, 0.05)',
              border: '1px solid rgba(46, 125, 50, 0.15)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#2E7D32',
              fontSize: '12px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={14} color="#2E7D32" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* Form Fields */}
          {authTab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{
                    border: 'none',
                    borderBottom: '1px solid #EAE6DF',
                    padding: '14px 0',
                    background: 'transparent',
                    borderRadius: '0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                    width: '100%'
                  }}
                  onFocus={(e) => e.target.style.borderBottomColor = '#D4AF37'}
                  onBlur={(e) => e.target.style.borderBottomColor = '#EAE6DF'}
                  className="lux-input"
                  required
                />
              </div>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  style={{
                    border: 'none',
                    borderBottom: '1px solid #EAE6DF',
                    padding: '14px 40px 14px 0',
                    background: 'transparent',
                    borderRadius: '0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                    width: '100%'
                  }}
                  onFocus={(e) => e.target.style.borderBottomColor = '#D4AF37'}
                  onBlur={(e) => e.target.style.borderBottomColor = '#EAE6DF'}
                  className="lux-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#999999',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px'
                  }}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#7A7A7A' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#D4AF37', cursor: 'pointer' }} 
                  />
                  <span>Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => { setAuthTab('forgot'); setAuthError(''); setAuthSuccess(''); }}
                  style={{ background: 'transparent', border: 'none', color: '#D4AF37', cursor: 'pointer', fontWeight: '500' }}
                >
                  Forgot Password?
                </button>
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="lux-btn" 
                style={{
                  width: '100%',
                  marginTop: '10px',
                  height: '46px',
                  borderRadius: '4px',
                  background: '#D4AF37',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)'
                }}
              >
                {authLoading ? 'VERIFYING...' : 'ENTER WORKSPACE'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#7A7A7A' }}>
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => { setAuthTab('register'); setAuthError(''); setAuthSuccess(''); }}
                  style={{ background: 'transparent', border: 'none', color: '#D4AF37', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Create account
                </button>
              </div>
            </form>
          )}

          {authTab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  style={{
                    border: 'none',
                    borderBottom: '1px solid #EAE6DF',
                    padding: '14px 0',
                    background: 'transparent',
                    borderRadius: '0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                    width: '100%'
                  }}
                  onFocus={(e) => e.target.style.borderBottomColor = '#D4AF37'}
                  onBlur={(e) => e.target.style.borderBottomColor = '#EAE6DF'}
                  className="lux-input"
                  required
                />
              </div>
              <div>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{
                    border: 'none',
                    borderBottom: '1px solid #EAE6DF',
                    padding: '14px 0',
                    background: 'transparent',
                    borderRadius: '0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                    width: '100%'
                  }}
                  onFocus={(e) => e.target.style.borderBottomColor = '#D4AF37'}
                  onBlur={(e) => e.target.style.borderBottomColor = '#EAE6DF'}
                  className="lux-input"
                  required
                />
              </div>
              <div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showRegisterPassword ? "text" : "password"} 
                    placeholder="Create Password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    style={{
                      border: 'none',
                      borderBottom: '1px solid #EAE6DF',
                      padding: '14px 40px 14px 0',
                      background: 'transparent',
                      borderRadius: '0',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.3s',
                      width: '100%'
                    }}
                    onFocus={(e) => e.target.style.borderBottomColor = '#D4AF37'}
                    onBlur={(e) => e.target.style.borderBottomColor = '#EAE6DF'}
                    className="lux-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#999999',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px'
                    }}
                  >
                    {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                
                {/* Realtime Password Strength Bar & Checklist */}
                <PasswordStrengthIndicator password={authPassword} />
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="lux-btn" 
                style={{
                  width: '100%',
                  marginTop: '10px',
                  height: '46px',
                  borderRadius: '4px',
                  background: '#D4AF37',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)'
                }}
              >
                {authLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#7A7A7A' }}>
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
                  style={{ background: 'transparent', border: 'none', color: '#D4AF37', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {authTab === 'forgot' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <p style={{ fontSize: '13px', color: '#7A7A7A', lineHeight: '1.6', marginBottom: '10px' }}>
                Nhập địa chỉ email của ngài. Hệ thống sẽ điều phối mã xác minh OTP 4 chữ số bảo mật thông qua Resend SMTP để khôi phục quyền truy cập.
              </p>
              <div>
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{
                    border: 'none',
                    borderBottom: '1px solid #EAE6DF',
                    padding: '14px 0',
                    background: 'transparent',
                    borderRadius: '0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.3s',
                    width: '100%'
                  }}
                  onFocus={(e) => e.target.style.borderBottomColor = '#D4AF37'}
                  onBlur={(e) => e.target.style.borderBottomColor = '#EAE6DF'}
                  className="lux-input"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="lux-btn" 
                style={{
                  width: '100%',
                  marginTop: '10px',
                  height: '46px',
                  borderRadius: '4px',
                  background: '#D4AF37',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)'
                }}
              >
                {authLoading ? 'SENDING...' : 'SEND INSTRUCTIONS'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#7A7A7A' }}>
                Remembered your password?{' '}
                <button 
                  type="button" 
                  onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
                  style={{ background: 'transparent', border: 'none', color: '#D4AF37', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {authTab === 'reset' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {!otpVerified ? (
                /* STEP A: OTP VERIFICATION STAGE */
                <form onSubmit={onVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Simplified Elegant OTP info card */}
                  <div style={{
                    background: '#FAF9F6',
                    border: '1px solid #EAE6DF',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
                  }}>
                    <p style={{ fontSize: '13px', color: '#7A7A7A', margin: '0', lineHeight: '1.6' }}>
                      Mã OTP 4 chữ số đã gửi đến <strong style={{ color: '#111111' }}>{authEmail}</strong>. Vui lòng kiểm tra hộp thư.
                    </p>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#7A7A7A', display: 'block', marginBottom: '10px', textAlign: 'center', fontWeight: '500', letterSpacing: '0.5px' }}>
                      Validate Code (Nhập mã OTP)
                    </label>
                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '10px' }}>
                      {otpVal.map((digit, idx) => (
                        <input
                           key={idx}
                           ref={otpRefs[idx]}
                           type="text"
                           maxLength={1}
                           value={digit}
                           onChange={(e) => handleOtpChange(idx, e.target.value)}
                           onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                           style={{
                             width: '54px',
                             height: '54px',
                             border: '1.5px solid #EAE6DF',
                             borderRadius: '8px',
                             textAlign: 'center',
                             fontSize: '20px',
                             fontWeight: 'bold',
                             outline: 'none',
                             background: '#FFFFFF',
                             transition: 'all 0.3s',
                             boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                           }}
                           onFocus={(e) => {
                             e.target.style.borderColor = '#D4AF37';
                             e.target.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.15)';
                           }}
                           onBlur={(e) => {
                             e.target.style.borderColor = '#EAE6DF';
                             e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                           }}
                           required
                        />
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={authLoading || resetToken.length < 4}
                    className="lux-btn" 
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      height: '46px',
                      borderRadius: '4px',
                      background: resetToken.length < 4 ? '#CCCCCC' : '#D4AF37',
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      letterSpacing: '1px',
                      boxShadow: resetToken.length < 4 ? 'none' : '0 4px 15px rgba(212, 175, 55, 0.2)',
                      cursor: resetToken.length < 4 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {authLoading ? 'VERIFYING...' : `VERIFY CODE (XÁC MINH) (${timeLeft})`}
                  </button>
                </form>
              ) : (
                /* STEP B: PASSWORD RESET STAGE */
                <form onSubmit={onResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showResetNewPassword ? "text" : "password"} 
                      placeholder="Mật khẩu mới" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        border: 'none',
                        borderBottom: '1px solid #EAE6DF',
                        padding: '14px 40px 14px 0',
                        background: 'transparent',
                        borderRadius: '0',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.3s',
                        width: '100%'
                      }}
                      onFocus={(e) => e.target.style.borderBottomColor = '#D4AF37'}
                      onBlur={(e) => e.target.style.borderBottomColor = '#EAE6DF'}
                      className="lux-input"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#999999',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px'
                      }}
                    >
                      {showResetNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <PasswordStrengthIndicator password={newPassword} />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showResetConfirmPassword ? "text" : "password"} 
                      placeholder="Xác nhận mật khẩu mới" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        border: 'none',
                        borderBottom: '1px solid #EAE6DF',
                        padding: '14px 40px 14px 0',
                        background: 'transparent',
                        borderRadius: '0',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.3s',
                        width: '100%'
                      }}
                      onFocus={(e) => e.target.style.borderBottomColor = '#D4AF37'}
                      onBlur={(e) => e.target.style.borderBottomColor = '#EAE6DF'}
                      className="lux-input"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#999999',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px'
                      }}
                    >
                      {showResetConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    disabled={authLoading}
                    className="lux-btn" 
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      height: '46px',
                      borderRadius: '4px',
                      background: '#D4AF37',
                      color: '#FFFFFF',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      letterSpacing: '1px',
                      boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)'
                    }}
                  >
                    {authLoading ? 'UPDATING...' : 'RESET PASSWORD (ĐẶT LẠI)'}
                  </button>
                </form>
              )}

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#7A7A7A' }}>
                Quay lại trang{' '}
                <button 
                  type="button" 
                  onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}
                  style={{ background: 'transparent', border: 'none', color: '#D4AF37', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Đăng nhập
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;
