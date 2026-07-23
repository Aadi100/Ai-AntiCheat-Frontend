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
    <div className="splash-body" style={{
      margin: 0,
      padding: 0,
      width: '100vw',
      height: '100vh',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      background: 'radial-gradient(120% 90% at 88% 92%, #b39dff 0%, transparent 55%), radial-gradient(90% 70% at 8% 10%, #5b7cfa 0%, transparent 55%), linear-gradient(135deg, #4f6df5 0%, #7c6cf0 45%, #9b7ff2 75%, #b79cf5 100%)',
      backgroundColor: '#5b6ef5',
      color: '#ffffff',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      boxSizing: 'border-box'
    }}>
      <style>{`
        /* Futuristic HUD Dressing (decorative layers) */
        .hud-grid {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px);
          background-size: 46px 46px;
          -webkit-mask-image: radial-gradient(ellipse 85% 65% at 50% 45%, #000 0%, transparent 78%);
          mask-image: radial-gradient(ellipse 85% 65% at 50% 45%, #000 0%, transparent 78%);
        }
        .scan-sweep {
          position: absolute; left: 0; right: 0; height: 180px; z-index: 1; pointer-events: none;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,.10), transparent);
          animation: sweep 6s linear infinite;
        }
        @keyframes sweep {
          0% { top: -180px; }
          100% { top: 100%; }
        }

        /* HUD Corners */
        .corner { position: absolute; width: 34px; height: 34px; z-index: 2; pointer-events: none; opacity: .55; }
        .corner::before, .corner::after { content: ''; position: absolute; background: rgba(255,255,255,.8); }
        .corner::before { width: 100%; height: 2px; top: 0; left: 0; }
        .corner::after { width: 2px; height: 100%; top: 0; left: 0; }
        .corner-tl { top: 26px; left: 26px; }
        .corner-tr { top: 26px; right: 26px; transform: scaleX(-1); }
        .corner-bl { bottom: 26px; left: 26px; transform: scaleY(-1); }
        .corner-br { bottom: 26px; right: 26px; transform: scale(-1,-1); }

        /* Floating particles */
        .particles { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
        .particle {
          position: absolute; border-radius: 50%; background: #fff;
          animation: particleFloat linear infinite;
        }
        @keyframes particleFloat {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: .9; }
          90% { opacity: .6; }
          100% { transform: translateY(-90px) translateX(14px); opacity: 0; }
        }

        /* Onboarding content above layers */
        .splash-content {
          position: relative; z-index: 3;
          display: flex; flex-direction: column; align-items: center;
          padding: 24px;
        }

        /* Logo badge */
        .lockup {
          display: flex; align-items: center; gap: 14px;
          animation: markIn .7s cubic-bezier(.2,.8,.2,1) both;
        }
        @keyframes markIn {
          from { opacity: 0; transform: translateY(8px) scale(.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .badge-orbit { position: relative; width: clamp(44px, 4.4vw, 68px); height: clamp(44px, 4.4vw, 68px); flex: none; }
        .badge-orbit::before, .badge-orbit::after {
          content: ''; position: absolute; border-radius: 50%;
          border: 1.5px dashed rgba(255,255,255,.55);
        }
        .badge-orbit::before { inset: -10px; animation: spin 7s linear infinite; }
        .badge-orbit::after { inset: -20px; border-color: rgba(255,255,255,.28); animation: spinRev 11s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spinRev { to { transform: rotate(-360deg); } }

        .logo-badge {
          width: clamp(44px, 4.4vw, 68px); height: clamp(44px, 4.4vw, 68px); border-radius: 16px; background: #fff; position: relative;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 22px -6px rgba(0,0,0,.3);
          animation: float 3.6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .logo-badge::before {
          content: ''; position: absolute; inset: -14px; border-radius: 50%; z-index: -1;
          background: radial-gradient(circle, rgba(255,255,255,.45), transparent 70%);
          animation: glowPulse 3.6s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { opacity: .4; transform: scale(.9); }
          50% { opacity: .9; transform: scale(1.12); }
        }

        .wordmark { font-size: clamp(18px, 1.8vw, 28px); font-weight: 700; letter-spacing: -.005em; color: #fff; }

        /* Eyebrow badge */
        .eyebrow {
          margin-top: clamp(28px, 4vw, 56px); display: inline-flex; align-items: center; gap: 8px;
          color: rgba(255,255,255,.78); font-size: clamp(11px, .95vw, 14px); font-weight: 700;
          letter-spacing: .16em; text-transform: uppercase;
          animation: fadeUp .6s ease .15s both;
        }
        .eyebrow .dot {
          width: 6px; height: 6px; border-radius: 50%; background: #fff;
          box-shadow: 0 0 10px 2px rgba(255,255,255,.9); animation: blink 1.4s ease-in-out infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
        @keyframes sheen { 0% { background-position: 120% 0; } 100% { background-position: -20% 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* Headline sliding carousel */
        .slides {
          position: relative; margin-top: 18px; width: min(960px, 90vw); min-height: clamp(160px, 17vw, 250px);
          animation: fadeUp .6s ease .28s both;
        }
        .slide {
          position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
          opacity: 0; transform: translateY(14px); pointer-events: none;
          transition: opacity .7s ease, transform .7s ease;
        }
        .slide.active { opacity: 1; transform: translateY(0); pointer-events: auto; z-index: 2; }
        .slide .headline {
          font-size: clamp(28px, 4.4vw, 66px); line-height: 1.14; font-weight: 800; letter-spacing: -.015em;
          max-width: min(880px, 88vw);
          background: linear-gradient(100deg, #fff 40%, #ffffffcc 48%, #fff 56%);
          background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: sheen 3.2s ease-in-out infinite;
        }
        .slide .subtext {
          margin-top: clamp(10px, 1.2vw, 18px); color: rgba(255,255,255,.85); font-size: clamp(14.5px, 1.35vw, 19px);
          line-height: 1.55; max-width: min(700px, 80vw);
        }
        .slide-dots { display: flex; gap: 8px; justify-content: center; margin-top: clamp(16px, 1.6vw, 26px); }
        .slide-dot {
          width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.35);
          cursor: pointer; transition: background .3s ease, transform .3s ease;
        }
        .slide-dot.active { background: #fff; transform: scale(1.3); }

        /* Call To Action Get Started button */
        .cta-wrap { margin-top: clamp(30px, 2.8vw, 50px); animation: fadeUp .6s ease .52s both; }
        .cta-btn {
          position: relative; display: inline-flex; align-items: center; gap: 10px;
          background: #fff; color: #4f3fd6; font-size: clamp(14px, 1vw, 17px); font-weight: 700;
          letter-spacing: .01em; padding: clamp(13px, 1.2vw, 18px) clamp(22px, 2.2vw, 34px);
          border-radius: 999px; border: none;
          cursor: pointer; text-decoration: none;
          box-shadow: 0 10px 30px -8px rgba(0,0,0,.35), 0 0 0 0 rgba(255,255,255,.6);
          transition: transform .18s ease, box-shadow .25s ease;
          animation: ctaPulse 2.6s ease-in-out infinite;
        }
        .cta-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 14px 34px -6px rgba(0,0,0,.4), 0 0 0 6px rgba(255,255,255,.18);
        }
        .cta-btn:active { transform: translateY(0) scale(.98); }
        .cta-btn svg { width: 18px; height: 18px; transition: transform .2s ease; }
        .cta-btn:hover svg { transform: translateX(3px); }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 10px 30px -8px rgba(0,0,0,.35), 0 0 0 0 rgba(255,255,255,.45); }
          50% { box-shadow: 0 10px 30px -8px rgba(0,0,0,.35), 0 0 0 8px rgba(255,255,255,0); }
        }

        .splash-footer {
          position: absolute; bottom: clamp(16px, 2vw, 30px); left: 0; right: 0; z-index: 3;
          color: rgba(255,255,255,.6); font-size: clamp(10px, .85vw, 12px); letter-spacing: .08em;
          animation: fadeUp .6s ease .6s both;
        }

        @media (max-width: 640px) {
          .corner { display: none; }
        }
      `}</style>

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

      <div className="splash-content">
        
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

      <div className="splash-footer">&copy; 2026 FITNESS MARVEL</div>
    </div>
  );
};

export default Splash;
