import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import axios from 'axios';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get('/animals/alerts');
      setAlerts(res.data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px solid var(--panel-border)',
          position: 'relative'
        }}
      >
        <Bell size={20} />
        {alerts.length > 0 && (
          <span 
            style={{ 
              position: 'absolute', 
              top: '-4px', 
              right: '-4px', 
              background: '#ef4444', 
              color: 'white', 
              borderRadius: '50%', 
              fontSize: '10px', 
              fontWeight: 'bold', 
              padding: '2px 6px',
              border: '2px solid var(--bg-color)'
            }}
          >
            {alerts.length}
          </span>
        )}
      </button>
      
      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)} 
            style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
          />
          <div 
            className="premium-card" 
            style={{ 
              position: 'absolute', 
              top: '50px', 
              right: 0, 
              width: '320px',
              maxWidth: '90vw', 
              maxHeight: '360px', 
              overflowY: 'auto', 
              zIndex: 999, 
              padding: '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', marginBottom: '12px', fontSize: '14px', color: 'white' }}>Notificaciones de Parto</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alerts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>No hay alertas de 9 meses</div>
              ) : (
                alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    style={{ 
                      padding: '10px', 
                      background: 'rgba(255, 152, 0, 0.1)', 
                      borderLeft: '4px solid #FF9800', 
                      borderRadius: '8px',
                      fontSize: '12px' 
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#FF9800' }}>Alerta de Gestación</div>
                    <div style={{ color: 'var(--text-main)' }}>{alert.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
