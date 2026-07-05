import React, { useRef } from 'react';

interface InmersiveCarrouselProps {
  caption: string;
  category: string;
  description?: string;
  src: string;
  index: number;
}

const InmersiveCarrousel: React.FC<InmersiveCarrouselProps> = ({ caption, category, description, src, index }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className={`js-card work-card-3d card-${index}`}>
      <div className="work-card-inner">
        <div className="work-video-wrapper">
          <video ref={videoRef} src={src} loop muted playsInline autoPlay/>
          <div className="work-overlay-tech" />
        </div>
        <div className="work-card-content">
          <div className="work-meta">
            <span className="work-category">{category}</span>
            <span className="work-id">/0{index + 1}</span>
          </div>
          <h3 className="work-title">{caption}</h3>
          {description && <p className="work-description">{description}</p>}
        </div>
      </div>
    </div>
  );
};

export default InmersiveCarrousel;