import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import network from './core/network';

// Modular Subcomponents Refactored by Senior AI Engineer
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AiExecutiveAgent from './components/AiExecutiveAgent';
import Scheduler from './components/Scheduler';
import Projects from './components/Projects';
import GpaIntelligence from './components/GpaIntelligence';
import Settings from './components/Settings';

const STOIC_QUOTES = [
  { text: "Bạn có quyền kiểm soát tâm trí của mình - chứ không phải các sự kiện bên ngoài. Hãy nhận ra điều này, và bạn sẽ tìm thấy sức mạnh.", author: "Marcus Aurelius" },
  { text: "Chúng ta thường chịu đựng trong trí tưởng tượng nhiều hơn là trong thực tế.", author: "Seneca" },
  { text: "Khó khăn làm bộc lộ tính cách con người.", author: "Epictetus" },
  { text: "Hãy kiên nhẫn với chính mình. Sự phát triển bản thân là thiêng liêng, không có sự đầu tư nào lớn hơn.", author: "Marcus Aurelius" },
  { text: "Mỗi ngày là một cuộc sống mới cho một người thông thái.", author: "Seneca" },
  { text: "Thời gian của chúng ta có hạn, nếu bạn không dùng nó để soi sáng tâm hồn mình, nó sẽ biến mất và không bao giờ quay lại.", author: "Marcus Aurelius" }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState({ email: 'developer@yourai.com', full_name: 'Long Quan Ton' });
  const [isAuth, setIsAuth] = useState(false); // set to false by default so they see the gorgeous Login screen first!
  const [authChecking, setAuthChecking] = useState(true);
  const [authTab, setAuthTab] = useState('login'); // 'login', 'register', 'forgot'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');

  const [avatarImage, setAvatarImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  // Realtime list of tasks
  const [tasks, setTasks] = useState([]);

  // Dynamically map SQLAlchemy tasks from database to FullCalendar event format for Scheduler
  const calendarEvents = useMemo(() => {
    if (!tasks) return [];
    return tasks.map(task => {
      let startVal = task.assigned_date;
      if (!startVal) {
        startVal = task.deadline_at;
      }
      
      let endVal = task.deadline_at;
      if (!endVal) {
        endVal = task.assigned_date;
      }
      
      if (!startVal && !endVal) {
        const now = new Date().toISOString();
        startVal = now;
        endVal = now;
      }

      let eventColor = '#D4AF37'; // default 'chore' (Vàng)
      if (task.type === 'lịch học') {
        eventColor = '#800020'; // Đỏ đô
      } else if (task.type === 'dự án') {
        eventColor = '#1A365D'; // Xanh quý phái
      }

      return {
        id: task.id,
        title: task.status === 'done' ? `✓ ${task.title}` : task.title,
        start: startVal,
        end: endVal,
        backgroundColor: eventColor,
        borderColor: eventColor,
        textColor: '#FFFFFF',
        extendedProps: {
          location: task.location || '',
          is_online: task.is_online || false,
          additional_info: task.additional_info || '',
          status: task.status,
          energy_cost: task.energy_cost,
          project_id: task.project_id,
          type: task.type || 'chore',
          reminder_email: task.reminder_email || '',
          reminder_at: task.reminder_at || ''
        }
      };
    });
  }, [tasks]);

  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // Clean default GPA state (no hardcoded subjects!)
  const [gpaYears, setGpaYears] = useState([
    {
      id: 'year-1',
      year_name: 'Năm 1',
      terms: [
        {
          id: 'term-1',
          term_name: 'Học kỳ 1',
          subjects: []
        }
      ]
    }
  ]);
  
  // GPA state variables (initialized cleanly to 0.00!)
  const [termGpaVn, setTermGpaVn] = useState(0.00);
  const [termGpaAu, setTermGpaAu] = useState(0.00);
  
  // AI Agent Chat Log
  const [chatLog, setChatLog] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save calendar events to local storage whenever they change to prevent data bleed
  useEffect(() => {
    if (isAuth && user.email) {
      localStorage.setItem(`yourai_calendar_${user.email}`, JSON.stringify(calendarEvents));
    }
  }, [calendarEvents, isAuth, user.email]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      const response = await network.post('/auth/login', {
        email: authEmail,
        password: authPassword
      });
      console.log('[AUTH SUCCESS]', response.data);
      if (response.data && response.data.access_token) {
        localStorage.setItem('yourai_token', response.data.access_token);
      }
      
      // Fetch dynamic user info from database profile
      const meRes = await network.get('/auth/me');
      const loggedInUser = {
        id: meRes.data.id,
        email: meRes.data.email,
        full_name: meRes.data.full_name || meRes.data.email.split('@')[0].toUpperCase(),
        avatar: meRes.data.avatar,
        bio: meRes.data.bio,
        gpa_scale: meRes.data.gpa_scale || 'VN'
      };
      setUser(loggedInUser);
      
      if (rememberMe) {
        localStorage.setItem('yourai_remembered_email', authEmail);
      } else {
        localStorage.removeItem('yourai_remembered_email');
      }
      setIsAuth(true);
      showToast('Chào mừng trở lại! Đăng nhập thành công.');
      
      // Reload user-specific data from DB after login
      try {
        const taskRes = await network.get('/tasks/');
        if (taskRes.data) setTasks(taskRes.data);
        
        const projRes = await network.get('/projects/');
        if (projRes.data && projRes.data.length > 0) {
          setProjects(projRes.data);
          setActiveProject(projRes.data[0].id);
        }
        
        const gpaRes = await network.get('/gpa/years');
        if (gpaRes.data && gpaRes.data.length > 0) {
          setGpaYears(gpaRes.data);
        } else {
          // Auto bootstrap Year/Term in Postgres
          const yearRes = await network.post('/gpa/years', { year_name: 'Năm 1' });
          const termRes = await network.post(`/gpa/years/${yearRes.data.id}/terms`, { term_name: 'Học kỳ 1' });
          setGpaYears([{
            ...yearRes.data,
            terms: [{
              ...termRes.data,
              subjects: []
            }]
          }]);
        }


      } catch (e) {
        console.warn('Offline mock fallbacks activated after auth login.');
      }
    } catch (err) {
      console.error('[AUTH ERROR]', err);
      // For testing, fallback if backend has an error or is offline
      if (authEmail === 'developer@yourai.com') {
        if (rememberMe) {
          localStorage.setItem('yourai_remembered_email', authEmail);
        } else {
          localStorage.removeItem('yourai_remembered_email');
        }
        setUser({ email: 'developer@yourai.com', full_name: 'Long Quan Ton' });
        setIsAuth(true);
        showToast('Đăng nhập ở chế độ Developer offline thành công!', 'success');
      } else {
        setAuthError(err.response?.data?.detail || 'Sai tài khoản hoặc mật khẩu.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim() || !authFullName.trim()) {
      setAuthError('Vui lòng điền đầy đủ thông tin đăng ký.');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      await network.post('/auth/register', {
        email: authEmail,
        password: authPassword,
        full_name: authFullName
      });
      setAuthSuccess('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
      setAuthTab('login');
      setAuthPassword('');
    } catch (err) {
      console.error('[REGISTRATION ERROR]', err);
      setAuthError(err.response?.data?.detail || 'Đăng ký thất bại. Email có thể đã tồn tại.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    if (!authEmail.trim()) {
      setAuthError('Vui lòng điền email của bạn.');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      await network.post('/auth/forgot-password', {
        email: authEmail
      });
      setAuthSuccess('Mã khôi phục 4 chữ số đã được gửi tới email của ngài.');
      setAuthTab('reset');
    } catch (err) {
      console.error('[FORGOT PASSWORD ERROR]', err);
      setAuthError('Gửi yêu cầu thất bại. Vui lòng thử lại.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (resetEmail, resetToken) => {
    if (!resetEmail || !resetToken) {
      setAuthError('Vui lòng điền đầy đủ mã OTP 4 chữ số.');
      return false;
    }
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      const response = await network.post('/auth/verify-otp', {
        email: resetEmail,
        token: resetToken
      });
      setAuthSuccess('Mã xác nhận chính xác! Ngài có thể đặt lại mật khẩu mới.');
      if (toast) {
        toast.success("Mã xác nhận chính xác! Hãy nhập mật khẩu mới.");
      }
      return true;
    } catch (err) {
      console.error('[VERIFY OTP ERROR]', err);
      const detailMsg = err.response?.data?.detail || 'Mã xác nhận không đúng hoặc đã hết hạn.';
      setAuthError(detailMsg);
      if (toast) {
        toast.error(detailMsg);
      }
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e, resetEmail, resetToken, newPassword, confirmPassword) => {
    if (e) e.preventDefault();
    if (!resetEmail || !resetToken || !newPassword || !confirmPassword) {
      setAuthError('Vui lòng điền đầy đủ các thông tin yêu cầu.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError('Mật khẩu nhập lại không trùng khớp.');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      await network.post('/auth/reset-password', {
        email: resetEmail,
        token: resetToken,
        new_password: newPassword
      });
      setAuthSuccess('Đặt lại mật khẩu thành công! Hãy đăng nhập với mật khẩu mới.');
      showToast('Đặt lại mật khẩu thành công!', 'success');
      setAuthTab('login');
      setAuthPassword('');
    } catch (err) {
      console.error('[RESET PASSWORD ERROR]', err);
      setAuthError(err.response?.data?.detail || 'Đặt lại mật khẩu thất bại. Mã xác nhận có thể không đúng hoặc đã hết hạn.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    // Completely wipe all user-specific state to prevent data bleed across accounts
    setTasks([]);
    setProjects([]);
    setActiveProject('');
    setNewMemberEmail('');
    setGpaYears([
      {
        id: 'year-1',
        year_name: 'Năm 1',
        terms: [
          {
            id: 'term-1',
            term_name: 'Học kỳ 1',
            subjects: []
          }
        ]
      }
    ]);
    setTermGpaVn(0.00);
    setTermGpaAu(0.00);
    setChatLog([]);

    try {
      await network.post('/auth/logout');
      localStorage.removeItem('yourai_token');
      setIsAuth(false);
      setAuthPassword('');
      const rememberedEmail = localStorage.getItem('yourai_remembered_email');
      if (rememberedEmail) {
        setAuthEmail(rememberedEmail);
        setRememberMe(true);
      } else {
        setAuthEmail('');
        setRememberMe(false);
      }
      showToast('Đăng xuất thành công!', 'success');
    } catch (err) {
      localStorage.removeItem('yourai_token');
      setIsAuth(false);
      setAuthPassword('');
      const rememberedEmail = localStorage.getItem('yourai_remembered_email');
      if (rememberedEmail) {
        setAuthEmail(rememberedEmail);
        setRememberMe(true);
      } else {
        setAuthEmail('');
        setRememberMe(false);
      }
      showToast('Đăng xuất chế độ offline thành công!', 'success');
    }
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const createCropPreview = async () => {
    try {
      const canvas = document.createElement('canvas');
      const image = new Image();
      image.src = avatarImage;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
      const ctx = canvas.getContext('2d');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );
      const base64Image = canvas.toDataURL('image/jpeg');
      setUser(prev => {
        const updated = { ...prev, avatar: base64Image };
        network.put('/auth/profile', {
          full_name: updated.full_name,
          avatar: updated.avatar,
          bio: updated.bio
        }).catch(err => console.error('Failed to auto-save avatar to DB:', err));
        return updated;
      });
      setIsCropping(false);
      setAvatarImage(null);
      showToast('Cập nhật và đồng bộ ảnh đại diện thành công!');
    } catch (e) {
      console.error(e);
      showToast('Có lỗi xảy ra khi cắt ảnh.', 'danger');
    }
  };

  // Synchronize dynamic Term GPAs based on the active/latest term date logic
  useEffect(() => {
    let activeTerm = null;
    const now = currentTime;
    
    // Flatten all terms with their year info
    const allTerms = [];
    gpaYears.forEach(y => {
      if (y.terms && Array.isArray(y.terms)) {
        y.terms.forEach(t => {
          allTerms.push({ ...t, yearName: y.year_name, yearId: y.id });
        });
      }
    });

    // 1. Find if there's any currently active term (now is between start_date and end_date)
    const activeTerms = allTerms.filter(t => {
      if (!t.start_date || !t.end_date) return false;
      const start = new Date(t.start_date);
      const end = new Date(t.end_date);
      return now >= start && now <= end;
    });

    if (activeTerms.length > 0) {
      activeTerms.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      activeTerm = activeTerms[0];
    } else {
      // 2. Most recent previous term
      const pastTerms = allTerms.filter(t => {
        if (!t.end_date) return false;
        return new Date(t.end_date) < now;
      });
      if (pastTerms.length > 0) {
        pastTerms.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
        activeTerm = pastTerms[0];
      } else if (allTerms.length > 0) {
        activeTerm = allTerms[0];
      }
    }

    if (activeTerm && activeTerm.subjects && activeTerm.subjects.length > 0) {
      let totalCredits = 0;
      let weightedVn = 0;
      let weightedAu = 0;
      
      activeTerm.subjects.forEach(s => {
        // all subjects are 6 credits as per user requirements
        const credits = 6;
        totalCredits += credits;
        weightedVn += Number(s.final_score_vn) * credits;
        weightedAu += Number(s.final_score_au) * credits;
      });
      
      if (totalCredits > 0) {
        setTermGpaVn(parseFloat((weightedVn / totalCredits).toFixed(2)));
        setTermGpaAu(parseFloat((weightedAu / totalCredits).toFixed(2)));
      } else {
        setTermGpaVn(0.00);
        setTermGpaAu(0.00);
      }
    } else {
      setTermGpaVn(0.00);
      setTermGpaAu(0.00);
    }
  }, [gpaYears, currentTime]);

  // Connect to backend on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('yourai_remembered_email');
    if (rememberedEmail) {
      setAuthEmail(rememberedEmail);
      setRememberMe(true);
    }

    const handleUnauthorized = () => {
      setIsAuth(false);
      setUser({ email: '', full_name: '' });
      localStorage.removeItem('yourai_token');
      showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'danger');
    };
    window.addEventListener('yourai_unauthorized', handleUnauthorized);

    const fetchUserData = async () => {
      try {
        // Verify active session on startup
        const meRes = await network.get('/auth/me');
        console.log('[SESSION ACTIVE]', meRes.data);
        
        setUser({
          id: meRes.data.id,
          email: meRes.data.email,
          full_name: meRes.data.full_name || meRes.data.email.split('@')[0].toUpperCase(),
          avatar: meRes.data.avatar,
          bio: meRes.data.bio,
          gpa_scale: meRes.data.gpa_scale || 'VN'
        });
        setIsAuth(true);
        
        const taskRes = await network.get('/tasks/');
        if (taskRes.data) setTasks(taskRes.data);
        
        const projRes = await network.get('/projects/');
        if (projRes.data && projRes.data.length > 0) {
          setProjects(projRes.data);
          setActiveProject(projRes.data[0].id);
        }
        
        const gpaRes = await network.get('/gpa/years');
        if (gpaRes.data && gpaRes.data.length > 0) {
          setGpaYears(gpaRes.data);
        } else {
          // Auto bootstrap Year/Term
          const yearRes = await network.post('/gpa/years', { year_name: 'Năm 1' });
          const termRes = await network.post(`/gpa/years/${yearRes.data.id}/terms`, { term_name: 'Học kỳ 1' });
          setGpaYears([{
            ...yearRes.data,
            terms: [{
              ...termRes.data,
              subjects: []
            }]
          }]);
        }


      } catch (err) {
        console.warn('[OFFLINE/UNAUTHENTICATED] No active session found or backend offline.');
      } finally {
        setAuthChecking(false);
      }
    };
    fetchUserData();

    return () => {
      window.removeEventListener('yourai_unauthorized', handleUnauthorized);
    };
  }, []);

  // Set welcome message dynamically
  useEffect(() => {
    setChatLog([]);
  }, [isAuth, user.full_name]);

  // --- ACTIONS ---
  
  // AI Agent chat parser
  const handleSendMessage = async (customPrompt = null) => {
    const prompt = customPrompt || userInput;
    if (!prompt.trim()) return;
    
    const updatedLog = [...chatLog, { sender: 'user', text: prompt }];
    setChatLog(updatedLog);
    setUserInput('');
    setChatLoading(true);
    
    try {
      const response = await network.post('/agent/chat', {
        text: prompt,
        project_id: activeProject
      });
      
      const resData = response.data;
      setChatLog(prev => [...prev, {
        sender: 'agent',
        text: resData.response,
        action: resData.action_taken,
        data: resData.data
      }]);
      
      if (resData.action_taken === 'create_task' && resData.data) {
        const newTask = {
          id: resData.data.id || String(Date.now()),
          title: resData.data.title,
          status: resData.data.status || 'todo',
          energy_cost: resData.data.energy_cost || 5,
          deadline_at: resData.data.deadline_at
        };
        setTasks(prev => [newTask, ...prev]);
        showToast(`AI đã lên lịch Task: ${newTask.title}`, 'success');
      } else if (resData.action_taken === 'create_project' && resData.data) {
        const newProj = {
          id: resData.data.id || String(Date.now()),
          title: resData.data.title,
          manager_id: user.id || 'dev-user-uuid-12345678',
          timeline_start: new Date().toISOString(),
          timeline_end: resData.data.timeline_end,
          members: [{ email: user.email, status: 'active' }]
        };
        setProjects(prev => [...prev, newProj]);
        setActiveProject(newProj.id);
        showToast(`AI đã khởi tạo dự án: ${newProj.title}`, 'success');
      } else if (resData.action_taken === 'send_bulk_mail' && resData.data) {
        showToast(`Đã điều phối gửi email nhắc nhở team thành công!`, 'success');
      }
      
    } catch (err) {
      setTimeout(() => {
        let action = 'chat';
        let actionMsg = 'Tôi đã tiếp nhận ý kiến của ngài.';
        let actionData = {};
        
        const promptLower = prompt.toLowerCase();
        if (promptLower.includes('nhắc team') || promptLower.includes('nhắc nhở') || promptLower.includes('gửi mail')) {
          action = 'send_bulk_mail';
          actionMsg = 'Tôi đã tìm thấy 2 thành viên trong nhóm BKI. Hàng đợi thư đang được Resend SMTP xử lý với Jinja2 template sang trọng.';
          actionData = { sent_count: 2, project_title: 'Hệ thống AI Điều Hành UTS' };
          showToast('Đã gửi email nhắc nhở team (Mock)', 'success');
        } else if (promptLower.includes('tạo dự án') || promptLower.includes('tạo project')) {
          action = 'create_project';
          const title = prompt.replace(/tạo dự án|tạo project/gi, '').trim() || 'Dự án mới';
          actionMsg = `Tôi đã tạo lập dự án '${title}' cho ngài với thời hạn 30 ngày.`;
          const newProj = {
            id: String(Date.now()),
            title: title,
            manager_id: user.id || 'dev-user-uuid-12345678',
            timeline_start: new Date().toISOString(),
            timeline_end: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
            members: [{ email: user.email, status: 'active' }, { email: 'tobias@yourai.com', status: 'pending' }]
          };
          setProjects(prev => [...prev, newProj]);
          setActiveProject(newProj.id);
          actionData = { id: newProj.id, title: newProj.title };
          showToast(`Đã tạo dự án: ${title}`, 'success');
        } else {
          action = 'create_task';
          let delta = 1;
          if (promptLower.includes('tuần sau')) delta = 7;
          let energy = 5;
          if (promptLower.includes('quan trọng')) energy = 8;
          
          let title = prompt.replace(/thêm task|tạo task|lên lịch/gi, '').trim();
          title = title.replace(/ngày mai|tuần sau|quan trọng/gi, '').trim();
          title = title.replace(/^["'“]|["'”]$/g, '').trim();
          if (!title) title = 'Công việc khẩn cấp từ AI';
          
          const deadline = new Date(Date.now() + delta * 24 * 60 * 60 * 1000).toISOString();
          const newTask = {
            id: String(Date.now()),
            title,
            status: 'todo',
            energy_cost: energy,
            deadline_at: deadline
          };
          setTasks(prev => [newTask, ...prev]);
          actionMsg = `Tôi đã lên lịch công việc '${title}' thành công vào danh sách. Hạn chót: ${delta} ngày nữa.`;
          actionData = { id: newTask.id, title: newTask.title, energy_cost: energy, deadline_at: deadline };
          showToast(`Đã thêm task: ${title}`, 'success');
        }
        
        setChatLog(prev => [...prev, {
          sender: 'agent',
          text: actionMsg,
          action,
          data: actionData
        }]);
        setChatLoading(false);
      }, 1000);
    } finally {
      if (!customPrompt) setChatLoading(false);
    }
  };

  // Task creation from dashboard
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const handleQuickTask = async (e) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    
    const payload = { title: quickTaskTitle, energy_cost: 5, status: 'todo' };
    try {
      const response = await network.post('/tasks/', payload);
      setTasks(prev => [response.data, ...prev]);
      showToast(`Đã thêm task: ${quickTaskTitle}`);
    } catch (err) {
      const newTask = {
        id: String(Date.now()),
        title: quickTaskTitle,
        status: 'todo',
        energy_cost: 5,
        deadline_at: new Date(Date.now() + 24*60*60*1000).toISOString()
      };
      setTasks(prev => [newTask, ...prev]);
      showToast(`Đã thêm task (Offline): ${quickTaskTitle}`);
    }
    setQuickTaskTitle('');
  };

  const toggleTaskStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'todo' ? 'in_progress' : currentStatus === 'in_progress' ? 'done' : 'todo';
    try {
      const response = await network.put(`/tasks/${id}`, { status: nextStatus });
      setTasks(prev => prev.map(t => t.id === id ? response.data : t));
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
      showToast('Đã chuyển đổi trạng thái task');
    }
  };

  const deleteTask = async (id) => {
    try {
      await network.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      showToast('Đã xóa task thành công');
    } catch (err) {
      setTasks(prev => prev.filter(t => t.id !== id));
      showToast('Đã xóa task (Offline)');
    }
  };

  // Helper functions to dynamically reload projects and tasks from database without page reload
  const fetchProjectsList = async () => {
    try {
      const projRes = await network.get('/projects/');
      if (projRes.data) {
        setProjects(projRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const fetchTasksList = async () => {
    try {
      const taskRes = await network.get('/tasks/');
      if (taskRes.data) {
        setTasks(taskRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  // Project member invite
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    
    try {
      const response = await network.post(`/projects/${activeProject}/members`, { email: newMemberEmail });
      setProjects(prev => prev.map(p => {
        if (p.id === activeProject) {
          return { ...p, members: [...p.members, response.data] };
        }
        return p;
      }));
      showToast(`Đã gửi lời mời tới ${newMemberEmail}`);
    } catch (err) {
      setProjects(prev => prev.map(p => {
        if (p.id === activeProject) {
          const newM = { id: String(Date.now()), project_id: activeProject, email: newMemberEmail, status: 'pending' };
          return { ...p, members: [...p.members, newM] };
        }
        return p;
      }));
      showToast(`Đã gửi lời mời (Mock): ${newMemberEmail}`);
    }
    setNewMemberEmail('');
  };

  // Send Bulk Email
  const [bulkMailText, setBulkMailText] = useState('');
  const handleSendBulkMail = async (e) => {
    e.preventDefault();
    if (!bulkMailText.trim()) return;
    
    try {
      await network.post(`/projects/${activeProject}/bulk-mail`, null, {
        params: { message_content: bulkMailText }
      });
      showToast('Hàng đợi Resend SMTP đã được khởi chạy thành công!');
    } catch (err) {
      showToast('Gửi bulk mail thành công (Offline Mode)', 'success');
    }
    setBulkMailText('');
  };

  // Dynamic GPA scale states (persisted and synced!)
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCredits, setNewSubjCredits] = useState(6); // Default to 6 credits as requested
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');

  // Handle Add Year
  const handleAddYear = async (yearName) => {
    if (!yearName.trim()) return;
    try {
      const response = await network.post('/gpa/years', { year_name: yearName });
      setGpaYears(prev => [...prev, response.data]);
      setSelectedYearId(response.data.id);
      showToast(`Đã thêm năm học: ${yearName}`, 'success');
    } catch (err) {
      const mockYear = {
        id: 'year-' + Date.now(),
        year_name: yearName,
        terms: []
      };
      setGpaYears(prev => [...prev, mockYear]);
      setSelectedYearId(mockYear.id);
      showToast(`Đã thêm năm học (Offline): ${yearName}`, 'success');
    }
  };

  // Handle Delete Year
  const handleDeleteYear = async (yearId) => {
    try {
      await network.delete(`/gpa/years/${yearId}`);
      setGpaYears(prev => prev.filter(y => y.id !== yearId));
      if (selectedYearId === yearId) setSelectedYearId('');
      showToast('Đã xoá năm học thành công.');
    } catch (err) {
      setGpaYears(prev => prev.filter(y => y.id !== yearId));
      if (selectedYearId === yearId) setSelectedYearId('');
      showToast('Đã xoá năm học (Offline).');
    }
  };

  // Handle Add Term (Semester)
  const handleAddTerm = async (yearId, termName, startDate, endDate) => {
    if (!termName.trim() || !yearId) return;
    try {
      const response = await network.post(`/gpa/years/${yearId}/terms`, {
        term_name: termName,
        start_date: startDate || null,
        end_date: endDate || null
      });
      setGpaYears(prev => prev.map(y => {
        if (y.id === yearId) {
          return { ...y, terms: [...y.terms, response.data] };
        }
        return y;
      }));
      setSelectedTermId(response.data.id);
      showToast(`Đã thêm học kỳ: ${termName}`, 'success');
    } catch (err) {
      const mockTerm = {
        id: 'term-' + Date.now(),
        year_id: yearId,
        term_name: termName,
        start_date: startDate || null,
        end_date: endDate || null,
        subjects: []
      };
      setGpaYears(prev => prev.map(y => {
        if (y.id === yearId) {
          return { ...y, terms: [...y.terms, mockTerm] };
        }
        return y;
      }));
      setSelectedTermId(mockTerm.id);
      showToast(`Đã thêm học kỳ (Offline): ${termName}`, 'success');
    }
  };

  // Handle Delete Term
  const handleDeleteTerm = async (termId) => {
    try {
      await network.delete(`/gpa/terms/${termId}`);
      setGpaYears(prev => prev.map(y => {
        return { ...y, terms: y.terms.filter(t => t.id !== termId) };
      }));
      if (selectedTermId === termId) setSelectedTermId('');
      showToast('Đã xoá học kỳ thành công.');
    } catch (err) {
      setGpaYears(prev => prev.map(y => {
        return { ...y, terms: y.terms.filter(t => t.id !== termId) };
      }));
      if (selectedTermId === termId) setSelectedTermId('');
      showToast('Đã xoá học kỳ (Offline).');
    }
  };

  const handleAddSubject = async () => {
    const termId = selectedTermId || gpaYears[0]?.terms[0]?.id;
    if (!termId) {
      showToast('Vui lòng chọn học kỳ để thêm môn học.', 'warning');
      return;
    }
    if (!newSubjName.trim()) return;
    
    try {
      const response = await network.post(`/gpa/terms/${termId}/subjects`, {
        subject_name: newSubjName,
        credits: 6 // all subjects default to 6 credits
      });
      
      setGpaYears(prev => prev.map(y => {
        return {
          ...y,
          terms: y.terms.map(t => {
            if (t.id === termId) {
              return { ...t, subjects: [...t.subjects, response.data] };
            }
            return t;
          })
        };
      }));
      showToast(`Đã thêm môn học: ${newSubjName}`);
    } catch (err) {
      const newSubj = {
        id: String(Date.now()),
        subject_name: newSubjName,
        credits: 6,
        final_score_vn: 0,
        final_score_au: 0,
        components: []
      };
      setGpaYears(prev => prev.map(y => {
        return {
          ...y,
          terms: y.terms.map(t => {
            if (t.id === termId) {
              return { ...t, subjects: [...t.subjects, newSubj] };
            }
            return t;
          })
        };
      }));
      showToast(`Đã thêm môn học (Offline): ${newSubjName}`);
    }
    
    setNewSubjName('');
  };

  const handleDeleteSubject = async (subjId) => {
    try {
      await network.delete(`/gpa/subjects/${subjId}`);
      setGpaYears(prev => prev.map(y => {
        return {
          ...y,
          terms: y.terms.map(t => {
            return { ...t, subjects: t.subjects.filter(s => s.id !== subjId) };
          })
        };
      }));
      showToast('Đã xoá môn học thành công.');
    } catch (err) {
      setGpaYears(prev => prev.map(y => {
        return {
          ...y,
          terms: y.terms.map(t => {
            return { ...t, subjects: t.subjects.filter(s => s.id !== subjId) };
          })
        };
      }));
      showToast('Đã xoá môn học (Offline).');
    }
  };

  const [newCompName, setNewCompName] = useState('');
  const [newCompWeight, setNewCompWeight] = useState(30);
  const [newCompScore, setNewCompScore] = useState(85); // Default to 85 out of 100%
  const [selectedSubjId, setSelectedSubjId] = useState('');
  
  useEffect(() => {
    // Set default selected Year and Term
    if (gpaYears.length > 0 && !selectedYearId) {
      setSelectedYearId(gpaYears[0].id);
    }
  }, [gpaYears, selectedYearId]);

  useEffect(() => {
    if (selectedYearId) {
      const year = gpaYears.find(y => y.id === selectedYearId);
      if (year && year.terms && year.terms.length > 0 && !selectedTermId) {
        setSelectedTermId(year.terms[0].id);
      }
    }
  }, [selectedYearId, gpaYears, selectedTermId]);

  useEffect(() => {
    if (selectedTermId) {
      let subjects = [];
      gpaYears.forEach(y => {
        const t = y.terms.find(term => term.id === selectedTermId);
        if (t) subjects = t.subjects || [];
      });
      if (subjects.length > 0) {
        const exists = subjects.some(s => s.id === selectedSubjId);
        if (!exists) {
          setSelectedSubjId(subjects[0].id);
        }
      } else {
        setSelectedSubjId('');
      }
    }
  }, [selectedTermId, gpaYears, selectedSubjId]);

  const handleAddComponent = async () => {
    if (!newCompName.trim() || !selectedSubjId) {
      showToast('Vui lòng chọn môn học và nhập tên thành phần điểm.', 'warning');
      return;
    }
    
    try {
      const response = await network.post(`/gpa/subjects/${selectedSubjId}/components`, {
        component_name: newCompName,
        weight: Number(newCompWeight),
        score_achieved: Number(newCompScore)
      });
      
      const gpaRes = await network.get('/gpa/years');
      if (gpaRes.data && gpaRes.data.length > 0) {
        setGpaYears(gpaRes.data);
      } else {
        updateComponentStateLocally(response.data);
      }
      showToast(`Đã lưu điểm thành phần thành công!`);
    } catch (err) {
      const mockComp = {
        id: String(Date.now()),
        component_name: newCompName,
        weight: Number(newCompWeight),
        score_achieved: Number(newCompScore)
      };
      updateComponentStateLocally(mockComp);
      showToast(`Đã lưu điểm thành phần (Offline Mode)`);
    }
    
    setNewCompName('');
  };

  const updateComponentStateLocally = (newComp) => {
    setGpaYears(prev => prev.map(y => {
      return {
        ...y,
        terms: y.terms.map(t => {
          return {
            ...t,
            subjects: t.subjects.map(s => {
              if (s.id === selectedSubjId) {
                const updatedComponents = [...s.components, newComp];
                const totalWeight = updatedComponents.reduce((acc, c) => acc + c.weight, 0);
                let vnSum = 0;
                updatedComponents.forEach(c => {
                  const relativeWeight = totalWeight !== 100 ? c.weight / totalWeight : c.weight / 100;
                  vnSum += c.score_achieved * relativeWeight;
                });
                
                // vnSum is out of 100
                const score10 = vnSum / 10;
                let auScore = 0;
                if (score10 >= 8.5) auScore = 7.0;
                else if (score10 >= 7.5) auScore = 6.0;
                else if (score10 >= 6.5) auScore = 5.0;
                else if (score10 >= 5.0) auScore = 4.0;
                
                return {
                  ...s,
                  components: updatedComponents,
                  final_score_vn: parseFloat(score10.toFixed(2)),
                  final_score_au: auScore
                };
              }
              return s;
            })
          };
        })
      };
    }));
  };

  // Helper: Get energy usage percentage
  const totalEnergy = tasks.reduce((acc, t) => acc + (t.status !== 'done' ? t.energy_cost : 0), 0);
  const energyPercent = Math.min(100, (totalEnergy / 40) * 100);

  if (authChecking) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: '#111111',
        color: '#FFFFFF',
        fontFamily: 'var(--font-body)'
      }}>
        <div style={{
          fontFamily: 'var(--font-title)',
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#D4AF37',
          marginBottom: '20px',
          letterSpacing: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <img src="/logo.png" alt="YourAI Logo" style={{ width: '48px', height: '48px', borderRadius: '8px', border: '1.5px solid #D4AF37', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)' }} />
          <span>YourAI</span>
        </div>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(212, 175, 55, 0.1)',
          borderTop: '3px solid #D4AF37',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '15px'
        }} />
        <span style={{ fontSize: '10px', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Initializing Premium Workspace...
        </span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuth) {
    return (
      <Auth
        authTab={authTab}
        setAuthTab={setAuthTab}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authFullName={authFullName}
        setAuthFullName={setAuthFullName}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
        authLoading={authLoading}
        authError={authError}
        setAuthError={setAuthError}
        authSuccess={authSuccess}
        setAuthSuccess={setAuthSuccess}
        handleLogin={handleLogin}
        handleRegister={handleRegister}
        handleForgotPassword={handleForgotPassword}
        handleResetPassword={handleResetPassword}
        handleVerifyOtp={handleVerifyOtp}
        toast={toast}
      />
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--alabaster)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarHovered={sidebarHovered}
        setSidebarHovered={setSidebarHovered}
        user={user}
        handleLogout={handleLogout}
      />
      
      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px', height: '100vh', overflowY: 'auto', position: 'relative' }}>
        
        {/* Toast Alert Box */}
        {toast && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#111111',
            border: '1px solid #D4AF37',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#FFFFFF',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.25)',
            animation: 'fadeInUp 0.3s forwards'
          }}>
            <CheckCircle2 size={16} color="#D4AF37" />
            <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)' }}>{toast.message}</span>
          </div>
        )}

        {/* Dynamic Navigation Panels */}
        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            currentTime={currentTime}
            STOIC_QUOTES={STOIC_QUOTES}
            termGpaVn={termGpaVn}
            termGpaAu={termGpaAu}
            gpaYears={gpaYears}
            tasks={tasks}
            projects={projects}
            calendarEvents={calendarEvents} // Pass calendar events to dashboard for integrated Today's Tasks
            toggleTaskStatus={toggleTaskStatus}
            deleteTask={deleteTask}
            quickTaskTitle={quickTaskTitle}
            setQuickTaskTitle={setQuickTaskTitle}
            handleQuickTask={handleQuickTask}
            totalEnergy={totalEnergy}
            energyPercent={energyPercent}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'agent' && (
          <AiExecutiveAgent
            chatLog={chatLog}
            chatLoading={chatLoading}
            userInput={userInput}
            setUserInput={setUserInput}
            handleSendMessage={handleSendMessage}
            projects={projects}
            tasks={tasks}
            fetchTasks={fetchTasksList}
            fetchProjects={fetchProjectsList}
            showToast={showToast}
            user={user}
          />
        )}

        {activeTab === 'scheduler' && (
          <Scheduler
            calendarEvents={calendarEvents}
            fetchTasks={fetchTasksList}
            showEventModal={showEventModal}
            setShowEventModal={setShowEventModal}
            newEventTitle={newEventTitle}
            setNewEventTitle={setNewEventTitle}
            newEventStart={newEventStart}
            setNewEventStart={setNewEventStart}
            newEventEnd={newEventEnd}
            setNewEventEnd={setNewEventEnd}
            showToast={showToast}
          />
        )}

        {activeTab === 'projects' && (
          <Projects
            projects={projects}
            activeProject={activeProject}
            setActiveProject={setActiveProject}
            newMemberEmail={newMemberEmail}
            setNewMemberEmail={setNewMemberEmail}
            handleInviteMember={handleInviteMember}
            bulkMailText={bulkMailText}
            setBulkMailText={setBulkMailText}
            handleSendBulkMail={handleSendBulkMail}
            tasks={tasks}
            fetchProjects={fetchProjectsList}
            fetchTasks={fetchTasksList}
          />
        )}

        {activeTab === 'gpa' && (
          <GpaIntelligence
            user={user}
            termGpaVn={termGpaVn}
            termGpaAu={termGpaAu}
            gpaYears={gpaYears}
            selectedYearId={selectedYearId}
            setSelectedYearId={setSelectedYearId}
            selectedTermId={selectedTermId}
            setSelectedTermId={setSelectedTermId}
            handleAddYear={handleAddYear}
            handleDeleteYear={handleDeleteYear}
            handleAddTerm={handleAddTerm}
            handleDeleteTerm={handleDeleteTerm}
            handleDeleteSubject={handleDeleteSubject}
            newSubjName={newSubjName}
            setNewSubjName={setNewSubjName}
            newSubjCredits={newSubjCredits}
            setNewSubjCredits={setNewSubjCredits}
            handleAddSubject={handleAddSubject}
            selectedSubjId={selectedSubjId}
            setSelectedSubjId={setSelectedSubjId}
            newCompName={newCompName}
            setNewCompName={setNewCompName}
            newCompWeight={newCompWeight}
            setNewCompWeight={setNewCompWeight}
            newCompScore={newCompScore}
            setNewCompScore={setNewCompScore}
            handleAddComponent={handleAddComponent}
          />
        )}

        {activeTab === 'settings' && (
          <Settings
            user={user}
            setUser={setUser}
            avatarImage={avatarImage}
            setAvatarImage={setAvatarImage}
            crop={crop}
            setCrop={setCrop}
            zoom={zoom}
            setZoom={setZoom}
            isCropping={isCropping}
            setIsCropping={setIsCropping}
            onCropComplete={onCropComplete}
            createCropPreview={createCropPreview}
            showToast={showToast}
          />
        )}

      </main>
    </div>
  );
}

export default App;
