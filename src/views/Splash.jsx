import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const Splash = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();
  const [activeIdx, setActiveIdx] = useState(0);

  // Carousel auto-slide timer (every 4.2 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % 4);
    }, 4200);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = (e) => {
    e.preventDefault();
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="hero-body">
      {/* Decorative Grid Sweeper */}
      <div className="hud-grid"></div>
      <div className="scan-sweep"></div>

      {/* Corner Brackets */}
      <div className="corner corner-tl"></div>
      <div className="corner corner-tr"></div>
      <div className="corner corner-bl"></div>
      <div className="corner corner-br"></div>

      {/* Particle HUD Floating Dots */}
      <div className="particles">
        <div className="particle" style={{ left: '12%', bottom: '18%', width: '4px', height: '4px', animationDuration: '6.5s', animationDelay: '.2s' }}></div>
        <div className="particle" style={{ left: '22%', bottom: '8%',  width: '3px', height: '3px', animationDuration: '7.8s', animationDelay: '1.4s' }}></div>
        <div className="particle" style={{ left: '34%', bottom: '22%', width: '5px', height: '5px', animationDuration: '5.6s', animationDelay: '.6s' }}></div>
        <div className="particle" style={{ left: '48%', bottom: '12%', width: '3px', height: '3px', animationDuration: '8.4s', animationDelay: '2.1s' }}></div>
        <div className="particle" style={{ left: '60%', bottom: '26%', width: '4px', height: '4px', animationDuration: '6.2s', animationDelay: '.9s' }}></div>
        <div className="particle" style={{ left: '70%', bottom: '10%', width: '3px', height: '3px', animationDuration: '7.1s', animationDelay: '1.8s' }}></div>
        <div className="particle" style={{ left: '80%', bottom: '20%', width: '5px', height: '5px', animationDuration: '6.9s', animationDelay: '.4s' }}></div>
        <div className="particle" style={{ left: '88%', bottom: '6%',  width: '3px', height: '3px', animationDuration: '8.8s', animationDelay: '2.6s' }}></div>
        <div className="particle" style={{ left: '6%',  bottom: '34%', width: '3px', height: '3px', animationDuration: '7.4s', animationDelay: '1.1s' }}></div>
        <div className="particle" style={{ left: '93%', bottom: '32%', width: '4px', height: '4px', animationDuration: '6.7s', animationDelay: '1.7s' }}></div>
      </div>

      <div className="hero-content">

        {/* Brand Header */}
        <div className="lockup">
          <div className="badge-orbit">
            <div className="logo-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b7cfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
          </div>
          <div className="wordmark">Fitness Marvel</div>
        </div>

        {/* Subhead Tag */}
        <div className="eyebrow"><span className="dot"></span>AI-Powered Anti-Cheat Security</div>

        {/* Auto Carousel Slides */}
        <div className="slides">
          <div className={`slide ${activeIdx === 0 ? 'active' : ''}`}>
            <div className="headline">The AI Powered AntiCheat System.</div>
            <div className="subtext">Free passes, shared keycards, and lax staff are draining your monthly recurring revenue.</div>
          </div>
          <div className={`slide ${activeIdx === 1 ? 'active' : ''}`}>
            <div className="headline">The Leak You Don't See.</div>
            <div className="subtext">Free passes, shared keycards, and lax staff are draining your monthly recurring revenue.</div>
          </div>
          <div className={`slide ${activeIdx === 2 ? 'active' : ''}`}>
            <div className="headline">AI-Powered Revenue Protection.</div>
            <div className="subtext">Our anti-cheat system detects tailgaters and proxy entries the second they happen.</div>
          </div>
          <div className={`slide ${activeIdx === 3 ? 'active' : ''}`}>
            <div className="headline">Caught in 4K.</div>
            <div className="subtext">Get instant photo proof of culprits and compromised staff directly to your dashboard.</div>
          </div>
        </div>

        {/* Indicator dots */}
        <div className="slide-dots">
          <div className={`slide-dot ${activeIdx === 0 ? 'active' : ''}`} onClick={() => setActiveIdx(0)}></div>
          <div className={`slide-dot ${activeIdx === 1 ? 'active' : ''}`} onClick={() => setActiveIdx(1)}></div>
          <div className={`slide-dot ${activeIdx === 2 ? 'active' : ''}`} onClick={() => setActiveIdx(2)}></div>
          <div className={`slide-dot ${activeIdx === 3 ? 'active' : ''}`} onClick={() => setActiveIdx(3)}></div>
        </div>

        {/* CTA Get Started Trigger */}
        <div className="cta-wrap">
          <button type="button" className="cta-btn" onClick={handleGetStarted}>
            Let's Get Started
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>

      <div className="hero-footer">&copy; 2026 FITNESS MARVEL</div>
    </div>
  );
};

export default Splash;
