import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Calendar, Award, GraduationCap, Clock, Layers } from 'lucide-react';

function GpaIntelligence({
  user,
  termGpaVn,
  termGpaAu,
  gpaYears = [],
  selectedYearId,
  setSelectedYearId,
  selectedTermId,
  setSelectedTermId,
  handleAddYear,
  handleDeleteYear,
  handleAddTerm,
  handleDeleteTerm,
  handleDeleteSubject,
  newSubjName,
  setNewSubjName,
  newSubjCredits,
  setNewSubjCredits,
  handleAddSubject,
  selectedSubjId,
  setSelectedSubjId,
  newCompName,
  setNewCompName,
  newCompWeight,
  setNewCompWeight,
  newCompScore,
  setNewCompScore,
  handleAddComponent
}) {
  const [yearNameInput, setYearNameInput] = useState('');
  const [termNameInput, setTermNameInput] = useState('');
  const [termStartDate, setTermStartDate] = useState('');
  const [termEndDate, setTermEndDate] = useState('');

  const isAu = user?.gpa_scale === 'AU';

  // Find currently selected year and term objects
  const currentYear = gpaYears.find(y => y.id === selectedYearId) || gpaYears[0];
  const currentTerm = currentYear?.terms?.find(t => t.id === selectedTermId) || currentYear?.terms?.[0];
  const subjects = currentTerm?.subjects || [];

  // Robust default selected subject
  useEffect(() => {
    if (subjects.length > 0) {
      const exists = subjects.some(s => s.id === selectedSubjId);
      if (!exists) {
        setSelectedSubjId(subjects[0].id);
      }
    } else {
      setSelectedSubjId('');
    }
  }, [subjects, selectedSubjId, setSelectedSubjId]);

  // Check if a term is currently active based on dates
  const isTermActiveToday = (term) => {
    if (!term || !term.start_date || !term.end_date) return false;
    const now = new Date();
    const start = new Date(term.start_date);
    const end = new Date(term.end_date);
    return now >= start && now <= end;
  };

  // Internal Form submit actions
  const onAddYearSubmit = (e) => {
    e.preventDefault();
    if (!yearNameInput.trim()) return;
    handleAddYear(yearNameInput);
    setYearNameInput('');
  };

  const onAddTermSubmit = (e) => {
    e.preventDefault();
    if (!termNameInput.trim() || !selectedYearId) return;
    handleAddTerm(selectedYearId, termNameInput, termStartDate, termEndDate);
    setTermNameInput('');
    setTermStartDate('');
    setTermEndDate('');
  };

  // Recalculate dynamic term statistics
  let vnRank = 'Unranked';
  let vnColor = '#7A7A7A';
  if (termGpaVn >= 9.0) { vnRank = 'Excellent'; vnColor = '#2E7D32'; }
  else if (termGpaVn >= 8.0) { vnRank = 'Very Good'; vnColor = '#1B5E20'; }
  else if (termGpaVn >= 6.5) { vnRank = 'Good'; vnColor = '#F57F17'; }
  else if (termGpaVn >= 5.0) { vnRank = 'Pass'; vnColor = '#7A7A7A'; }

  let auRank = 'Unranked';
  let auColor = '#7A7A7A';
  if (termGpaAu >= 6.5) { auRank = 'High Distinction (HD)'; auColor = '#D4AF37'; }
  else if (termGpaAu >= 5.5) { auRank = 'Distinction (D)'; auColor = '#B8860B'; }
  else if (termGpaAu >= 4.5) { auRank = 'Credit (C)'; auColor = '#FAF6EE'; }
  else if (termGpaAu >= 4.0) { auRank = 'Pass (P)'; auColor = '#7A7A7A'; }

  const vnPercent = (termGpaVn / 10) * 100;
  const auPercent = (termGpaAu / 7) * 100;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%' }}>
      
      {/* Header Banner */}
      <div>
        <h2 style={{ fontSize: '26px', marginBottom: '6px', fontFamily: 'var(--font-title)', fontWeight: '600', color: 'var(--charcoal)' }}>
          GPA Intelligence System
        </h2>
        <p style={{ color: 'var(--muted-gray)', fontSize: '13px', margin: 0 }}>
          Academic progress planner & automatic grading system (6 credits per subject fixed limit).
        </p>
      </div>

      {/* Redesigned Premium Active Term GPA Overview Grid (Bo gọn, tinh tế, Modern & Luxury) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        width: '100%'
      }}>
        
        {/* Card 1: Circular GPA Widget */}
        <div className="glass-card" style={{
          background: '#FCF9F2',
          border: '1.5px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          padding: '20px 25px',
          boxShadow: '0 8px 30px rgba(212, 175, 55, 0.04)'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: `conic-gradient(#D4AF37 0% ${isAu ? auPercent : vnPercent}%, #EAE6DF ${isAu ? auPercent : vnPercent}% 100%)`, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxShadow: '0 4px 15px rgba(212,175,55,0.08)'
          }}>
            <div style={{ width: '66px', height: '66px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1C1A17', fontFamily: 'var(--font-title)' }}>
                {isAu ? termGpaAu : termGpaVn}
              </span>
              <span style={{ fontSize: '9px', color: '#7A7A7A', marginTop: '-2px' }}>
                {isAu ? '/ 7.0' : '/ 10.0'}
              </span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '9px', color: '#B8860B', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={10} /> {isAu ? 'Australian Scale' : 'Vietnamese Scale'}
            </span>
            <h4 style={{ fontSize: '15px', fontFamily: 'var(--font-title)', margin: '3px 0 2px 0', color: 'var(--charcoal)', fontWeight: '700' }}>
              Active Term GPA
            </h4>
            <span style={{ fontSize: '11px', color: '#7A7A7A' }}>
              Calculated from current subjects
            </span>
          </div>
        </div>

        {/* Card 2: Academic Standing Rank */}
        <div className="glass-card" style={{
          background: '#FCF9F2',
          border: '1.5px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '20px 25px',
          boxShadow: '0 8px 30px rgba(212, 175, 55, 0.04)'
        }}>
          <span style={{ fontSize: '9px', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>
            Academic Standing
          </span>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: isAu ? '#B8860B' : vnColor, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isAu ? '#D4AF37' : vnColor }} />
            {isAu ? auRank : vnRank}
          </div>
          <span style={{ fontSize: '10px', color: '#999999', marginTop: '4px' }}>
            Auto-calculated on scale
          </span>
        </div>

        {/* Card 3: Selected Semester Details */}
        <div className="glass-card" style={{
          background: '#FCF9F2',
          border: '1.5px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '20px 25px',
          boxShadow: '0 8px 30px rgba(212, 175, 55, 0.04)'
        }}>
          <span style={{ fontSize: '9px', color: '#B8860B', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>
            Active Term
          </span>
          {currentTerm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--charcoal)', fontWeight: 'bold' }}>
                📂 {currentYear?.year_name || 'Year'} — {currentTerm?.term_name}
              </span>
              {currentTerm.start_date && currentTerm.end_date && (
                <span style={{ fontSize: '10px', color: '#7A7A7A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={10} /> {new Date(currentTerm.start_date).toLocaleDateString('en-US')} - {new Date(currentTerm.end_date).toLocaleDateString('en-US')}
                </span>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: '#FF8A80', fontWeight: 'bold', marginTop: '4px' }}>
              No active semester registered.
            </span>
          )}
        </div>

      </div>

      {/* Main Content Workspace Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Left Column: Academic years & terms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Year Management */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '15px', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Layers size={14} color="#D4AF37" /> Manage Years
            </h3>

            {/* Add Year Form */}
            <form onSubmit={onAddYearSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Year name (e.g. Year 1, 2026)..."
                value={yearNameInput}
                onChange={(e) => setYearNameInput(e.target.value)}
                className="lux-input"
                style={{ fontSize: '12px', padding: '8px 12px' }}
                required
              />
              <button type="submit" className="lux-btn lux-btn-gold" style={{ padding: '8px 12px' }}>
                <Plus size={14} />
              </button>
            </form>

            {/* Year List */}
            {gpaYears.length === 0 ? (
              <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '5px 0' }}>No years added.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {gpaYears.map(y => {
                  const isSelected = y.id === selectedYearId;
                  return (
                    <div 
                      key={y.id}
                      onClick={() => {
                        setSelectedYearId(y.id);
                        if (y.terms && y.terms.length > 0) {
                          setSelectedTermId(y.terms[0].id);
                        } else {
                          setSelectedTermId('');
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #D4AF37' : '1px solid #EAE6DF',
                        background: isSelected ? 'rgba(212, 175, 55, 0.04)' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: isSelected ? 'bold' : 'normal', color: 'var(--charcoal)' }}>
                        📅 {y.year_name}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteYear(y.id);
                        }}
                        style={{ border: 'none', background: 'transparent', color: '#C62828', cursor: 'pointer', opacity: 0.6 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Semesters / Terms Panel */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '15px', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Clock size={14} color="#D4AF37" /> Manage Semesters
            </h3>

            {/* Add Semester Form */}
            <form onSubmit={onAddTermSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Semester name (e.g. Semester 1)..."
                value={termNameInput}
                onChange={(e) => setTermNameInput(e.target.value)}
                className="lux-input"
                style={{ fontSize: '12px', padding: '8px 12px' }}
                required
              />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '8px', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Start Date</label>
                  <input 
                    type="date"
                    value={termStartDate}
                    onChange={(e) => setTermStartDate(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '11px', padding: '6px 10px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '8px', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>End Date</label>
                  <input 
                    type="date"
                    value={termEndDate}
                    onChange={(e) => setTermEndDate(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '11px', padding: '6px 10px' }}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="lux-btn lux-btn-gold" 
                style={{ fontSize: '11px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}
                disabled={!selectedYearId}
              >
                <Plus size={12} /> Add Semester
              </button>
            </form>

            {/* Semester List */}
            {!selectedYearId ? (
              <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', textAlign: 'center' }}>Please select or add a Year.</span>
            ) : !currentYear?.terms || currentYear.terms.length === 0 ? (
              <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '5px 0' }}>No semesters registered.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {currentYear.terms.map(t => {
                  const isSelected = t.id === selectedTermId;
                  const isActive = isTermActiveToday(t);
                  return (
                    <div 
                      key={t.id}
                      onClick={() => setSelectedTermId(t.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #D4AF37' : '1px solid #EAE6DF',
                        background: isSelected ? 'rgba(212, 175, 55, 0.04)' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: isSelected ? 'bold' : 'normal', color: 'var(--charcoal)' }}>
                          📖 {t.term_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                          {isActive && (
                            <span style={{ fontSize: '7px', padding: '1px 4px', borderRadius: '3px', background: '#E8F5E9', color: '#2E7D32', fontWeight: 'bold' }}>
                              ACTIVE
                            </span>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTerm(t.id);
                            }}
                            style={{ border: 'none', background: 'transparent', color: '#C62828', cursor: 'pointer', opacity: 0.6 }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      
                      {t.start_date && t.end_date && (
                        <span style={{ fontSize: '9px', color: '#7A7A7A' }}>
                          📅 {new Date(t.start_date).toLocaleDateString('en-US')} - {new Date(t.end_date).toLocaleDateString('en-US')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Subject details and Grade components */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Semester Subject Grid */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-title)', margin: 0, color: 'var(--charcoal)' }}>
              Semester Subject Grid
            </h3>

            {!selectedTermId ? (
              <div style={{ padding: '30px 15px', textAlign: 'center', border: '1px dashed #EAE6DF', borderRadius: '12px', background: '#FFFFFF' }}>
                <p style={{ color: '#7A7A7A', fontSize: '12px', margin: 0 }}>Please select Academic Year and Semester to view subject grades.</p>
              </div>
            ) : subjects.length === 0 ? (
              <div style={{ padding: '30px 15px', textAlign: 'center', border: '1px dashed #EAE6DF', borderRadius: '12px', background: '#FFFFFF' }}>
                <p style={{ color: '#7A7A7A', fontSize: '12px', margin: 0 }}>No subjects registered for this semester. Add one below!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {subjects.map(subj => {
                  const finalPercentage = subj.components.length > 0 
                    ? Math.round(subj.components.reduce((acc, c) => acc + (c.score_achieved * c.weight / 100), 0))
                    : 0;

                  return (
                    <div 
                      key={subj.id}
                      style={{
                        border: '1.5px solid rgba(212, 175, 55, 0.15)',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        background: '#FFFFFF',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.01)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF6EE', paddingBottom: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--charcoal)' }}>{subj.subject_name}</span>
                          <span style={{ fontSize: '9px', background: 'var(--soft-gold-bg)', color: 'var(--dark-gold)', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {subj.credits || 6} Credits
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                            <span style={{ color: '#7A7A7A' }}>Total: <strong style={{ color: 'var(--charcoal)' }}>{finalPercentage}%</strong></span>
                            <span style={{ display: 'inline-block', width: '1px', background: '#EAE6DF', height: '12px' }}></span>
                            {isAu ? (
                              <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>AU Scale: {subj.final_score_au} / 7.0</span>
                            ) : (
                              <span style={{ color: '#2E7D32', fontWeight: 'bold' }}>VN Scale: {subj.final_score_vn} / 10.0</span>
                            )}
                          </div>
                          <button 
                            onClick={() => handleDeleteSubject(subj.id)}
                            style={{ border: 'none', background: 'transparent', color: '#C62828', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Component capsules */}
                      {subj.components.length === 0 ? (
                        <span style={{ fontSize: '10px', color: '#999999', fontStyle: 'italic' }}>No grade components added yet.</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {subj.components.map(comp => (
                            <div key={comp.id} style={{
                              background: '#FAF9F6',
                              border: '1px solid #EAE6DF',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{ color: 'var(--charcoal)' }}><strong>{comp.component_name}</strong> ({comp.weight}%)</span>
                              <span style={{ background: '#D4AF37', color: '#FFFFFF', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>
                                {comp.score_achieved}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick forms grid */}
          {selectedTermId && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              
              {/* Form 1: Add Subject */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 style={{ fontSize: '14px', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                  <GraduationCap size={14} color="#D4AF37" /> Add New Subject
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Subject name (e.g. Mathematics 1)..." 
                    value={newSubjName}
                    onChange={(e) => setNewSubjName(e.target.value)}
                    className="lux-input"
                    style={{ fontSize: '12px' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', padding: '5px 10px', background: 'rgba(212,175,55,0.05)', borderRadius: '6px', border: '1px solid rgba(212,175,55,0.1)' }}>
                    <span style={{ fontSize: '11px', color: '#B8860B' }}>Credits</span>
                    <strong style={{ fontSize: '11px', color: '#B8860B' }}>6 Credits (Fixed)</strong>
                  </div>
                  <button onClick={handleAddSubject} className="lux-btn lux-btn-secondary" style={{ fontSize: '11px', padding: '8px' }}>
                    Add Subject
                  </button>
                </div>
              </div>

              {/* Form 2: Add Component Grade */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h3 style={{ fontSize: '14px', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                  <Award size={14} color="#D4AF37" /> Add Grade Component
                </h3>
                
                {subjects.length === 0 ? (
                  <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '15px 0' }}>
                    No subjects added to enter grades.
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select 
                      value={selectedSubjId}
                      onChange={(e) => setSelectedSubjId(e.target.value)}
                      className="lux-input"
                      style={{ fontSize: '12px' }}
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.subject_name}</option>
                      ))}
                    </select>

                    <input 
                      type="text" 
                      placeholder="Component name (e.g. Midterm, Assignment 1)..." 
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      className="lux-input"
                      style={{ fontSize: '12px' }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '9px', color: '#7A7A7A' }}>Weight (%)</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100"
                          value={newCompWeight}
                          onChange={(e) => setNewCompWeight(e.target.value)}
                          className="lux-input"
                          style={{ fontSize: '12px', padding: '6px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '9px', color: '#7A7A7A' }}>Score Achieved (%)</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100"
                          value={newCompScore}
                          onChange={(e) => setNewCompScore(e.target.value)}
                          className="lux-input"
                          style={{ fontSize: '12px', padding: '6px' }}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleAddComponent} 
                      className="lux-btn lux-btn-gold"
                      style={{ fontSize: '11px', padding: '8px' }}
                    >
                      Save Grade Component
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default GpaIntelligence;
