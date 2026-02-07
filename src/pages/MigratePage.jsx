import React, { useState } from 'react';
import { seedFirestore } from '../utils/seedFirestore';

const MigratePage = () => {
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);

  const handleMigrate = async () => {
    if (!confirm('Are you sure you want to overwrite Firestore data?')) return;
    
    setLoading(true);
    setStatus('Migrating...');
    try {
      await seedFirestore();
      setStatus('Migration Complete! Check Console.');
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
      <div style={{ margin: '2rem 0' }}>
        Status: <strong>{status}</strong>
      </div>
      <button 
        onClick={handleMigrate} 
        disabled={loading}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          backgroundColor: '#4834d4',
          color: 'white',
          border: 'none',
          borderRadius: '8px'
        }}
      >
        {loading ? 'Processing...' : 'Start Migration'}
      </button>
    </div>
  );
};

export default MigratePage;
