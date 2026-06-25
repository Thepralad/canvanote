/** First-visit welcome screen. Shown once for new users. */
export default function WelcomeOverlay({ open, onGetStarted }) {
  if (!open) return null;
  return (
    <div className="welcome-backdrop">
      <div className="welcome-card" role="dialog" aria-modal="true">
        <div className="welcome-mark">
            <img src="images/moon.png" width={32}/>
        </div>
        <h1 className="welcome-title">Welcome to Moonote</h1>
        <p className="welcome-sub">
          Thank you for using Moonote. A visual note-taking app for students and
          thinkers. Sketch, connect ideas, and think out loud on an infinite canvas.
        </p>
        <button className="welcome-btn" onClick={onGetStarted}>
          Get started
        </button>
      </div>
    </div>
  );
}