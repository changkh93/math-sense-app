import { useState, useRef } from 'react';

export default function RegionCard({ region, onClick }) {
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (centerY - y) / 10;
    const rotateY = (x - centerX) / 10;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={cardRef}
      className="region-card-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${rotation.x !== 0 ? 1.05 : 1})`,
      }}
    >
      <div className="region-card-inner">
        <div 
          className="region-card-bg"
          style={{ backgroundImage: `url(${region.image})` }}
        ></div>
        <div className="region-card-overlay"></div>
        <div className="region-card-content">
          <div className="region-card-icon">{region.icon}</div>
          <h2 className="region-card-title">{region.title}</h2>
          <p className="region-card-desc">{region.description}</p>
        </div>
      </div>
    </div>
  );
}
