import React, { useState } from 'react';
import { seedFirestore } from '../utils/seedFirestore';

const MigratePage = () => {
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);

  const handleMigrate = async (regionId = null) => {
    const message = regionId 
      ? `Are you sure you want to overwrite '${regionId}' data in Firestore?`
      : 'Are you sure you want to overwrite ALL Firestore data?';
      
    if (!confirm(message)) return;
    
    setLoading(true);
    setStatus(regionId ? `Migrating ${regionId}...` : 'Migrating All...');
    try {
      await seedFirestore(regionId);
      setStatus(regionId ? `Migration for ${regionId} Complete!` : 'Full Migration Complete!');
    } catch (error) {
      console.error(error);
      setStatus('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Data Migration Tool</h1>
      <p>Click below to seed Firestore with the current hardcoded data.</p>
      <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button 
          onClick={() => handleMigrate('addition')} 
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: '#16a085',
            color: 'white',
            border: 'none',
            borderRadius: '8px'
          }}
        >
          {loading ? 'Processing...' : 'Seed Addition Only'}
        </button>
        <button 
          onClick={() => handleMigrate('multiplication')} 
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '8px'
          }}
        >
          {loading ? 'Processing...' : 'Seed Multiplication Only'}
        </button>
        <button 
          onClick={() => handleMigrate(null)} 
          disabled={loading}
          style={{
            padding: '1rem 2rem',
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '8px'
          }}
        >
          {loading ? 'Processing...' : 'Seed ALL Regions'}
        </button>
      </div>
      <div style={{ margin: '2rem 0' }}>
        Status: <strong>{status}</strong>
      </div>
    </div>
  );
};

export default MigratePage;
