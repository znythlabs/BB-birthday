import { eventDetails } from "@/data/eventDetails";

export function WelcomeScene() {
  return (
    <section className="welcome-scene" aria-labelledby="welcome-title">
      <video
        className="welcome-background"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/images/underwater/island.mp4" type="video/mp4" />
      </video>
      <div className="welcome-shade" aria-hidden="true" />
      <div className="welcome-copy">
        <h1 id="welcome-title" aria-label={eventDetails.title}>
          <span>Liliana’s</span>
          <span>First Birthday</span>
        </h1>
        <p>{eventDetails.invitationMessage}</p>
      </div>
      <div className="welcome-scroll-cue" aria-hidden="true">
        <span>Scroll to dive</span>
        <i />
      </div>
    </section>
  );
}
