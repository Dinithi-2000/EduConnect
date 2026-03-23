import React from 'react';

export default function VisionBoard() {
  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="page-header">
        <h1 className="page-title">🎯 Digital Vision Board</h1>
        <p className="page-subtitle">Visualize your goals and dreams</p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        flexDirection: 'column',
        gap: 16,
        color: 'var(--text-muted)',
        border: '2px dashed var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface)',
      }}>
        <span style={{ fontSize: 64 }}>🎯</span>
        <h2 style={{ color: 'var(--text-secondary)' }}>Coming Soon</h2>
        <p style={{ fontSize: 15 }}>Your digital vision board will appear here.</p>
      </div>
    </div>
  );
}