import React, { useState, useEffect } from 'react';
import { 
  Clock as ClockIcon, Award, Briefcase, Users, 
  TrendingUp, Battery, AlertTriangle, Layers, Calendar, CheckSquare
} from 'lucide-react';

function Dashboard({
  user,
  currentTime,
  termGpaVn,
  termGpaAu,
  gpaYears = [],
  tasks = [],
  projects = [],
  toggleTaskStatus,
  deleteTask,
  quickTaskTitle,
  setQuickTaskTitle,
  handleQuickTask,
  setActiveTab
}) {
  // Get Vietnam local timezone UTC+7 strictly
  const getVietnamTime = (date) => {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 7));
  };
  const vnTime = getVietnamTime(currentTime);

  // Get timezone-proof local YYYY-MM-DD string for comparison based on Vietnam Time
  const year = vnTime.getFullYear();
  const month = String(vnTime.getMonth() + 1).padStart(2, '0');
  const day = String(vnTime.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // 1. Filter tasks belonging to today
  const todayTasks = tasks.filter(t => {
    const startStr = t.assigned_date ? t.assigned_date.split('T')[0] : '';
    const endStr = t.deadline_at ? t.deadline_at.split('T')[0] : '';
    return startStr === todayStr || endStr === todayStr;
  });

  // Calculate remaining tasks today (status != 'done' AND not expired)
  const remainingTodayTasks = todayTasks.filter(t => {
    if (t.status === 'done') return false;
    // Check if expired based on deadline_at
    if (t.deadline_at) {
      return new Date(t.deadline_at) >= currentTime;
    }
    return true;
  });

  // 2. Weekly remaining tasks count
  // Get start and end of current week (Monday to Sunday) in Vietnam timezone
  const getWeekDates = () => {
    const current = new Date(currentTime);
    const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(current.setDate(current.getDate() + distanceToMonday));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { monday, sunday };
  };

  const { monday, sunday } = getWeekDates();

  const weeklyTasks = tasks.filter(t => {
    const taskDate = t.assigned_date ? new Date(t.assigned_date) : t.deadline_at ? new Date(t.deadline_at) : null;
    return taskDate && taskDate >= monday && taskDate <= sunday;
  });

  const remainingWeeklyTasks = weeklyTasks.filter(t => t.status !== 'done');

  // Group remaining tasks for today by type
  const todayGroups = remainingTodayTasks.reduce((acc, t) => {
    const type = t.type || 'chore';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Group remaining tasks for the week by type
  const weeklyGroups = remainingWeeklyTasks.reduce((acc, t) => {
    const type = t.type || 'chore';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Task Category Color Map (Burgundy for Lịch học, Navy for Dự án, Gold for Chore)
  const typeColors = {
    'lịch học': '#800020', // Burgundy
    'dự án': '#1A365D',    // Sapphire Navy
    'chore': '#D4AF37',    // Gold
    'learning': '#800020',
    'project': '#1A365D',
    'focus': '#D4AF37',
    'meeting': '#4A37D4',  // Purple
  };

  // Helper function to render a beautiful multi-segmented Donut Pie Chart using native SVG
  const renderPieChart = (groups, radius = 28) => {
    const total = Object.values(groups).reduce((sum, v) => sum + v, 0);
    const circ = 2 * Math.PI * radius;
    
    if (total === 0) {
      return (
        <div style={{ position: 'relative', width: '85px', height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="85" height="85" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r={radius} fill="transparent" stroke="#EAE6DF" strokeWidth="6" strokeDasharray="4, 4" />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <strong style={{ fontSize: '15px', color: '#B8860B', fontWeight: 'bold' }}>0</strong>
            <span style={{ fontSize: '8px', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Done 🎉</span>
          </div>
        </div>
      );
    }

    let accumulatedPercent = 0;
    return (
      <div style={{ position: 'relative', width: '85px', height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="85" height="85" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle cx="45" cy="45" r={radius} fill="transparent" stroke="#F5F2EB" strokeWidth="7" />
          {Object.entries(groups).map(([type, val]) => {
            const percent = val / total;
            const dasharray = `${percent * circ} ${circ}`;
            const dashoffset = -accumulatedPercent * circ;
            accumulatedPercent += percent;
            
            const color = typeColors[type.toLowerCase()] || '#7A7A7A';
            return (
              <circle
                key={type}
                cx="45"
                cy="45"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth="7"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <strong style={{ fontSize: '16px', color: '#1C1A17', fontWeight: 'bold', lineHeight: '1' }}>{total}</strong>
          <span style={{ fontSize: '8px', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Tasks</span>
        </div>
      </div>
    );
  };

  // 3. Weekly Workload Busy Chart (Monday to Sunday)
  const getWeeklyWorkloadData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    
    weeklyTasks.forEach(t => {
      const taskDate = t.assigned_date ? new Date(t.assigned_date) : t.deadline_at ? new Date(t.deadline_at) : null;
      if (taskDate) {
        let dayIndex = taskDate.getDay() - 1; // 0 is Monday, 5 is Saturday...
        if (dayIndex === -1) dayIndex = 6; // Sunday is 6
        if (dayIndex >= 0 && dayIndex < 7) {
          counts[dayIndex]++;
        }
      }
    });

    const maxCount = Math.max(...counts, 1);
    return days.map((dayName, idx) => ({
      name: dayName,
      count: counts[idx],
      percent: (counts[idx] / maxCount) * 100,
      isCurrent: (currentTime.getDay() === 0 ? 6 : currentTime.getDay() - 1) === idx
    }));
  };

  const weeklyWorkload = getWeeklyWorkloadData();

  // Calculate coordinates for the sleek SVG Line Chart
  const linePoints = weeklyWorkload.map((dayData, idx) => {
    const x = 50 + idx * 100;
    const y = 100 - (dayData.percent * 0.7); // scale y between 30 (high) and 100 (low/zero)
    return { x, y, count: dayData.count, isCurrent: dayData.isCurrent, name: dayData.name };
  });

  const pathD = `M ${linePoints.map(p => `${p.x} ${p.y}`).join(' L ')}`;
  const areaD = `M 50 110 L ${linePoints.map(p => `${p.x} ${p.y}`).join(' L ')} L 650 110 Z`;

  // 4. Analog/Digital Deluxe Clock variables
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  
  // Calculate hand rotation angles
  const hourDegrees = ((hours % 12) * 30) + (minutes * 0.5);
  const minuteDegrees = (minutes * 6) + (seconds * 0.1);
  const secondDegrees = seconds * 6;

  // Formatting date in English
  const englishDateString = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // 5. Overall dynamic Energy workload calculation
  // energyPercent = completed tasks today / total tasks today
  const totalTasksTodayCount = todayTasks.length;
  const completedTasksTodayCount = todayTasks.filter(t => t.status === 'done').length;
  const rawEnergyPercent = totalTasksTodayCount > 0 
    ? Math.round((completedTasksTodayCount / totalTasksTodayCount) * 100)
    : 100; // default 100 if no tasks

  // Workload energy color shifting logic
  let energyColor = '#2E7D32'; // Neon green
  let energyLabel = 'Perfect';
  if (rawEnergyPercent < 30) {
    energyColor = '#C62828'; // Crimson Red
    energyLabel = 'Critical';
  } else if (rawEnergyPercent < 80) {
    energyColor = '#D4AF37'; // Amber Gold
    energyLabel = 'Optimal';
  }

  // 6. Project health calculations (Unfinished/Pending tasks count per project)
  const projectHealthList = projects.map(p => {
    const projTasks = tasks.filter(t => t.project_id === p.id);
    const unfinished = projTasks.filter(t => t.status !== 'done').length;
    return {
      ...p,
      unfinishedCount: unfinished,
      totalCount: projTasks.length
    };
  });

  // Flattened team members from all projects for Quadrant 2
  const allTeamWorkloads = [];
  const memberSeen = new Set();
  projects.forEach(p => {
    if (p.members && Array.isArray(p.members)) {
      p.members.forEach(m => {
        const uniqueKey = `${m.email}-${p.id}`;
        if (!memberSeen.has(uniqueKey)) {
          memberSeen.add(uniqueKey);
          
          // Get count of pending tasks assigned to this email in this project
          const pendingTasksCount = tasks.filter(t => t.project_id === p.id && t.status !== 'done' && t.reminder_email === m.email).length;
          
          allTeamWorkloads.push({
            ...m,
            projectName: p.title,
            pendingTasks: pendingTasksCount
          });
        }
      });
    }
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', paddingBottom: '20px' }}>
      
      {/* 1. TOP BANNER: Centered Stoic Greeting Banner inside themed frame */}
      <div style={{
        background: 'url(/theme.png) no-repeat',
        backgroundSize: '104% 108%',
        backgroundPosition: '-2% -4%',
        borderRadius: '16px',
        padding: '50px 30px',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(212, 175, 55, 0.05)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Sleek Golden accent layer */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 80%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />
        
        {/* Luxury Glassmorphic Text Holder to prevent text from drowning on marble veins */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          display: 'inline-block',
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '16px',
          padding: '25px 50px',
          boxShadow: '0 8px 32px rgba(212, 175, 55, 0.04)',
          maxWidth: '90%',
          transition: 'all 0.3s ease'
        }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontFamily: 'var(--font-title)', 
            fontWeight: '700', 
            color: '#1C1A17',
            letterSpacing: '1px',
            margin: 0
          }}>
            Welcome, {user.full_name || 'User'}!
          </h1>
          <p style={{ 
            color: '#5C401B', 
            fontSize: '15px', 
            marginTop: '10px', 
            fontStyle: 'italic', 
            fontWeight: '600',
            letterSpacing: '0.5px',
            margin: '10px 0 0 0',
            textShadow: '0 1px 1px rgba(255, 255, 255, 0.5)'
          }}>
            "Done is better than perfect. Keep shipping."
          </p>
        </div>
      </div>

      {/* 2. MIDDLE ROW: 50/50 Deluxe Clock and Realtime Tasks Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        
        {/* MIDDLE LEFT: Retro Digital Ivory Clock with Cursive Fonts */}
        <div className="glass-card" style={{
          background: '#FCF9F2',
          border: '1.5px solid rgba(212, 175, 55, 0.35)',
          color: 'var(--charcoal)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 35px 35px 35px',
          boxShadow: '0 8px 30px rgba(212, 175, 55, 0.05)',
          position: 'relative'
        }}>
          {/* Metropolis Watchmaker-style Label */}
          <span style={{
            fontSize: '11px',
            color: '#B8860B',
            textTransform: 'uppercase',
            letterSpacing: '4px',
            fontWeight: '700',
            marginBottom: '5px',
            opacity: 0.8,
            fontFamily: 'var(--font-title)'
          }}>
            HO CHI MINH CITY
          </span>

          {/* Giant Digital Time Block with flowing font */}
          <div style={{
            fontSize: '114px',
            fontFamily: '"Dancing Script", cursive, Georgia, serif',
            fontWeight: 'bold',
            color: '#1C1A17',
            letterSpacing: '2px',
            lineHeight: '1',
            marginBottom: '20px',
            width: '100%',
            textAlign: 'center',
            fontFeatureSettings: '"tnum"',
            textShadow: '0 2px 10px rgba(212, 175, 55, 0.05)'
          }}>
            {vnTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          
          {/* Local Date Block */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            width: '100%', 
            borderTop: '1px solid rgba(212, 175, 55, 0.2)',
            paddingTop: '25px'
          }}>
            <div>
              <strong style={{ 
                fontSize: '30px', 
                color: '#1C1A17',
                fontFamily: '"Dancing Script", cursive, Georgia, serif',
                fontWeight: 'bold',
                textTransform: 'capitalize' 
              }}>
                {vnTime.toLocaleDateString('en-US', { weekday: 'long' })}
              </strong>
            </div>

            <div style={{ textAlign: 'right' }}>
              <strong style={{ 
                fontSize: '30px', 
                color: '#1C1A17',
                fontFamily: '"Dancing Script", cursive, Georgia, serif',
                fontWeight: 'bold'
              }}>
                {vnTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </strong>
            </div>
          </div>
        </div>

        {/* MIDDLE RIGHT: Realtime Tasks Pie & Weekly Workload Busy Columns */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
          


          {/* Pie charts for Today vs Weekly remaining tasks side-by-side */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FAF9F6',
            padding: '20px 15px',
            borderRadius: '16px',
            border: '1.5px solid rgba(212, 175, 55, 0.25)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.01)',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', width: '100%', gap: '20px', flexWrap: 'wrap' }}>
              {/* Today Pie Chart */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#B8860B', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800', fontFamily: 'var(--font-title)' }}>
                  Today's Tasks
                </span>
                {renderPieChart(todayGroups)}
              </div>

              {/* Weekly Pie Chart */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#B8860B', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800', fontFamily: 'var(--font-title)' }}>
                  Weekly Tasks
                </span>
                {renderPieChart(weeklyGroups)}
              </div>
            </div>

            {/* Premium Centered Legend */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              flexWrap: 'wrap', 
              gap: '10px 25px', 
              fontSize: '11px', 
              paddingTop: '10px', 
              borderTop: '1px solid rgba(212, 175, 55, 0.1)', 
              width: '90%' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#800020' }} />
                <span style={{ color: '#5C401B', fontWeight: '700' }}>Lịch học</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#1A365D' }} />
                <span style={{ color: '#5C401B', fontWeight: '700' }}>Dự án</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#D4AF37' }} />
                <span style={{ color: '#5C401B', fontWeight: '700' }}>Chore / Khác</span>
              </div>
            </div>
          </div>

          {/* Weekly Workload line chart */}
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>


            <div style={{ 
              background: '#FAF9F6',
              padding: '20px 15px 15px 15px',
              borderRadius: '16px',
              border: '1.5px solid rgba(212, 175, 55, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%'
            }}>
              <div style={{ width: '100%', height: '140px', position: 'relative' }}>
                <svg width="100%" height="100%" viewBox="0 0 700 130" preserveAspectRatio="none">
                  <defs>
                    {/* Linear gradient under the line */}
                    <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.00" />
                    </linearGradient>
                    {/* Gradient for the glowing path */}
                    <linearGradient id="line-glow-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#B8860B" />
                    </linearGradient>
                    {/* Glow filter for the gold line */}
                    <filter id="gold-glow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#D4AF37" floodOpacity="0.3" />
                    </filter>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="50" y1="20" x2="650" y2="20" stroke="rgba(212,175,55,0.1)" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="50" y1="55" x2="650" y2="55" stroke="rgba(212,175,55,0.1)" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="50" y1="90" x2="650" y2="90" stroke="rgba(212,175,55,0.1)" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="50" y1="110" x2="650" y2="110" stroke="rgba(212,175,55,0.2)" strokeWidth="1.5" />

                  {/* Area fill path under line */}
                  <path d={areaD} fill="url(#chart-area-grad)" />

                  {/* Connecting Line path */}
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke="url(#line-glow-grad)" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#gold-glow)"
                  />

                  {/* Data points */}
                  {linePoints.map((pt, idx) => (
                    <g key={idx}>
                      {/* Active outer pulse ring */}
                      {pt.isCurrent && (
                        <circle cx={pt.x} cy={pt.y} r="10" fill="rgba(212,175,55,0.25)" className="pulse-ring" />
                      )}
                      {/* Main point dot */}
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r={pt.isCurrent ? '7' : '5'} 
                        fill={pt.isCurrent ? '#B8860B' : '#FFFFFF'} 
                        stroke="#D4AF37" 
                        strokeWidth="2.5" 
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      />
                    </g>
                  ))}
                </svg>
                
                {/* Floating tooltip/text labels above points */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {linePoints.map((pt, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        position: 'absolute', 
                        left: `${(pt.x / 700) * 100}%`,
                        top: `${(pt.y / 130) * 100 - 20}px`,
                        transform: 'translateX(-50%)',
                        fontSize: '10px', 
                        fontWeight: '800', 
                        color: pt.isCurrent ? '#B8860B' : '#7A7A7A',
                        background: pt.isCurrent ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                        padding: pt.isCurrent ? '2px 6px' : '0',
                        borderRadius: '6px',
                        border: pt.isCurrent ? '1px solid rgba(212,175,55,0.4)' : 'none',
                        boxShadow: pt.isCurrent ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      {pt.count}
                    </span>
                  ))}
                </div>
              </div>

              {/* Centered Horizontal Labels Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '5px 25px 0 25px', borderTop: '1px solid rgba(212,175,55,0.1)', marginTop: '8px' }}>
                {linePoints.map((pt, idx) => (
                  <span 
                    key={idx} 
                    style={{ 
                      fontSize: '10px', 
                      fontWeight: pt.isCurrent ? '800' : '600',
                      color: pt.isCurrent ? '#B8860B' : '#7A7A7A',
                      fontFamily: 'var(--font-title)',
                      textTransform: 'uppercase'
                    }}
                  >
                    {pt.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 3. BOTTOM SECTION: 1/4 GPA and 3/4 Project Quadrants Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '30px', alignItems: 'start' }}>
        
        {/* BOTTOM LEFT (1/4 Column): Academic GPA Display */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '350px' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={18} color="#D4AF37" /> Academic GPA
          </h3>

          {/* Large dynamic rating displaying VN/AU scales */}
          <div style={{ 
            background: 'linear-gradient(135deg, #FAF6EE, #FFFFFF)', 
            border: '1px solid rgba(212,175,55,0.2)', 
            borderRadius: '12px', 
            padding: '20px', 
            textAlign: 'center' 
          }}>
            {user?.gpa_scale === 'AU' ? (
              <>
                <span style={{ fontSize: '10px', color: '#B8860B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>AUSTRALIAN SCALE</span>
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#D4AF37', margin: '4px 0', fontFamily: 'var(--font-title)' }}>
                  {termGpaAu} <span style={{ fontSize: '14px', color: '#7A7A7A' }}>/ 7.0</span>
                </div>
                <span style={{ fontSize: '11px', color: '#7A7A7A' }}>Honor scale equivalency</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '10px', color: '#B8860B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>VIETNAMESE SCALE</span>
                <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'var(--charcoal)', margin: '4px 0', fontFamily: 'var(--font-title)' }}>
                  {termGpaVn} <span style={{ fontSize: '14px', color: '#7A7A7A' }}>/ 10.0</span>
                </div>
                <span style={{ fontSize: '11px', color: '#7A7A7A' }}>National standard credits</span>
              </>
            )}
          </div>

          {/* List of subjects in current term */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted-gray)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
              Current Term Subjects
            </span>

            {/* We find active subjects based on term date selection fallback */}
            {(() => {
              // Flatten all terms and find closest active
              const allTerms = [];
              gpaYears.forEach(y => {
                if (y.terms) y.terms.forEach(t => allTerms.push(t));
              });

              // active or fallback term
              let activeTerm = null;
              const now = currentTime;
              const activeTerms = allTerms.filter(t => {
                if (!t.start_date || !t.end_date) return false;
                return now >= new Date(t.start_date) && now <= new Date(t.end_date);
              });
              if (activeTerms.length > 0) {
                activeTerms.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                activeTerm = activeTerms[0];
              } else {
                const pastTerms = allTerms.filter(t => t.end_date && new Date(t.end_date) < now);
                if (pastTerms.length > 0) {
                  pastTerms.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
                  activeTerm = pastTerms[0];
                } else if (allTerms.length > 0) {
                  activeTerm = allTerms[0];
                }
              }

              const termSubjects = activeTerm?.subjects || [];

              if (termSubjects.length === 0) {
                return (
                  <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                    No subjects registered.
                  </span>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
                  {termSubjects.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF9F6', padding: '8px 10px', borderRadius: '6px', border: '1px solid #EAE6DF' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                        {s.subject_name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#B8860B', fontWeight: 'bold' }}>
                        {user?.gpa_scale === 'AU' ? `${s.final_score_au} HD` : `${s.final_score_vn} pts`}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          
          <button 
            onClick={() => setActiveTab('gpa')}
            className="lux-btn lux-btn-secondary" 
            style={{ fontSize: '12px', padding: '8px', marginTop: 'auto' }}
          >
            Manage GPA →
          </button>
        </div>

        {/* BOTTOM RIGHT (3/4 Column): Project quadrants */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Quadrant 1: Running Projects Health & Task Metrics */}
          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-title)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={18} color="#D4AF37" /> Project Health
            </h3>
            
            {projects.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic', display: 'block', textAlign: 'center', padding: '20px' }}>
                No active projects.
              </span>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
                {projectHealthList.map(p => (
                  <div key={p.id} style={{
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(212,175,55,0.15)',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.01)'
                  }}>
                    <span style={{ fontSize: '10px', color: '#B8860B', textTransform: 'uppercase', fontWeight: 'bold' }}>📁 PROJECT WIDGET</span>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--charcoal)', margin: '4px 0' }}>{p.title}</h4>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '10px', color: '#555' }}>
                      <span>Pending Tasks:</span>
                      <strong style={{ color: p.unfinishedCount > 0 ? '#C62828' : '#2E7D32' }}>{p.unfinishedCount} tasks</strong>
                    </div>

                    <div style={{ width: '100%', height: '6px', background: '#F5F5F5', borderRadius: '4px', marginTop: '10px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${p.totalCount > 0 ? ((p.totalCount - p.unfinishedCount) / p.totalCount) * 100 : 0}%`, 
                        height: '100%', 
                        background: '#D4AF37', 
                        borderRadius: '4px' 
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row split for Quadrant 2 & Quadrant 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', flexWrap: 'wrap' }}>
            
            {/* Quadrant 2: Team task allocation workloads */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#D4AF37" /> Resource Allocation
              </h4>

              {allTeamWorkloads.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                  No team members assigned.
                </span>
              ) : (
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #EAE6DF', paddingBottom: '6px' }}>
                        <th style={{ padding: '6px', color: 'var(--muted-gray)' }}>Member</th>
                        <th style={{ padding: '6px', color: 'var(--muted-gray)' }}>Project</th>
                        <th style={{ padding: '6px', color: 'var(--muted-gray)', textAlign: 'right' }}>Pending Tasks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTeamWorkloads.map((m, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #FAF6EE' }}>
                          <td style={{ padding: '8px 6px', fontWeight: 'bold', color: 'var(--charcoal)' }}>{m.full_name || m.email.split('@')[0]}</td>
                          <td style={{ padding: '8px 6px', color: '#777' }}>{m.projectName}</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 'bold', color: m.pendingTasks > 0 ? '#C62828' : '#2E7D32' }}>
                            {m.pendingTasks} tasks
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quadrant 3: Project statuses overview list */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '16px', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={16} color="#D4AF37" /> Project Status Overview
              </h4>

              {projects.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                  No projects found.
                </span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {projects.map(p => {
                    let statusBg = '#FFF8E1';
                    let statusColor = '#B8860B';
                    if (p.status === 'completed') {
                      statusBg = '#E8F5E9';
                      statusColor = '#2E7D32';
                    } else if (p.status === 'on_hold') {
                      statusBg = '#FFEBEE';
                      statusColor = '#C62828';
                    }

                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', border: '1px solid #EAE6DF', background: '#FFFFFF' }}>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--charcoal)' }}>{p.title}</span>
                        <span style={{
                          fontSize: '9px',
                          textTransform: 'uppercase',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: statusBg,
                          color: statusColor
                        }}>
                          {p.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* 4. FOOTER: Dynamic fluid energy workload bar */}
      <div className="glass-card" style={{ 
        width: '100%', 
        padding: '24px 30px', 
        border: '1.5px solid rgba(212,175,55,0.25)', 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(246,242,233,0.55))',
        boxShadow: '0 8px 24px rgba(212,175,55,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Battery size={20} color={energyColor} style={{ filter: `drop-shadow(0 0 4px ${energyColor})` }} />
            <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-title)', fontWeight: 'bold', color: 'var(--charcoal)' }}>
              Daily Energy Level
            </h3>
          </div>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 'bold', 
            color: energyColor, 
            background: 'rgba(255,255,255,0.8)', 
            padding: '3px 10px', 
            borderRadius: '10px',
            border: `1px solid ${energyColor}`
          }}>
            {energyLabel} ({rawEnergyPercent}%)
          </span>
        </div>

        {/* Fluid custom workload energy bar */}
        <div style={{ 
          width: '100%', 
          height: '24px', 
          background: 'rgba(17, 17, 17, 0.05)', 
          border: '1.5px solid #EAE6DF',
          borderRadius: '12px', 
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
        }}>
          {/* Animated dynamic fill block */}
          <div style={{
            width: `${rawEnergyPercent}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${energyColor} 0%, #D4AF37 100%)`,
            borderRadius: '10px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            boxShadow: `0 0 12px ${energyColor}`
          }}>
            {/* Glossy overlay effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 80%)',
              pointerEvents: 'none'
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7A7A7A', marginTop: '10px' }}>
          <span>Status: <strong>{completedTasksTodayCount} of {totalTasksTodayCount} tasks completed today</strong></span>
          <span>Recommendation: Energy optimized based on current workload</span>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;
