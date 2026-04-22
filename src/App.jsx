import { useState, useCallback, useRef } from "react";

// ── Sound ──────────────────────────────────────────────────────────────────
class SoundService {
  ctx = null;
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
  beep(freq, dur, type = "sine") {
    this.init(); if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    g.gain.setValueAtTime(0.13, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + dur);
  }
  go()         { this.beep(660, 0.04); }  // same as tick
  falseStart() { this.beep(100, 0.55, "sawtooth"); }
  tick()       { this.beep(660, 0.04); }
}
const snd = new SoundService();

// ── Palette ────────────────────────────────────────────────────────────────
const BLUE  = "#3B82C4";
const PINK  = "#F4A0B0";
const CORAL = "#F05C6E";
const SAND  = "#F0C87A";
const INK   = "#1A1020";
const WHITE = "#FFF8F0";

// P4 changed from mint green → warm lavender to stay in the pink/coral/blue/sand family
const P = [
  { accent: "#F05C6E", text: WHITE, shade: "#C03050", name: "Player 1" }, // coral
  { accent: "#3B82C4", text: WHITE, shade: "#1A5090", name: "Player 2" }, // blue
  { accent: "#F0C87A", text: INK,   shade: "#C09020", name: "Player 3" }, // sand
  { accent: "#D4A0E8", text: INK,   shade: "#9050B8", name: "Player 4" }, // lavender — warm, fits palette
];

// ── Tooltip info ───────────────────────────────────────────────────────────
const INFO = {
  trickPlays:      "Randomly flashes the zones mid-round with a fake word to fool players into lifting too early. Lift too early and you're out that round with a +1000ms penalty.",
  lastManStanding: "Each round, the slowest player gets eliminated. Last one standing wins. Requires 3+ players.",
  timeMode:        "Race the clock instead of chasing points. Every player's reaction times are added up across all rounds. The player with the lowest total time wins. False starts add 1000ms penalty to your total.",
};

// ── Inject CSS ─────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById("rg-css")) return;
  const s = document.createElement("style");
  s.id = "rg-css";
  s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Nunito:wght@400;700;800;900&family=Ranchers&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:${BLUE};font-family:'Nunito',sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;height:100dvh;width:100vw;-webkit-touch-callout:none;}
.anton{font-family:'Anton',sans-serif;}
@keyframes float{0%,100%{transform:translateY(0) rotate(-1deg);}50%{transform:translateY(-10px) rotate(1deg);}}
@keyframes spin-slow{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes pop{0%{transform:scale(0.5) rotate(-8deg);opacity:0;}70%{transform:scale(1.12) rotate(2deg);}100%{transform:scale(1) rotate(0deg);opacity:1;}}
@keyframes shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-12px) rotate(-3deg);}40%{transform:translateX(12px) rotate(3deg);}60%{transform:translateX(-8px);}80%{transform:translateX(8px);}}
@keyframes ripple{0%{transform:scale(0.8);opacity:0.8;}100%{transform:scale(2.8);opacity:0;}}
@keyframes slide-up{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse-dot{0%,100%{transform:scale(1);}50%{transform:scale(1.2);}}
@keyframes flash-go{0%{opacity:0.5;}100%{opacity:0;}}
@keyframes starburst-in{0%{transform:rotate(-20deg) scale(0.6);opacity:0;}70%{transform:rotate(5deg) scale(1.08);}100%{transform:rotate(0deg) scale(1);opacity:1;}}
@keyframes tooltip-in{from{opacity:0;transform:translateY(-6px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);}}
@keyframes circle-breathe-a{0%,100%{transform:scale(1);}50%{transform:scale(1.15);}}
@keyframes circle-breathe-b{0%,100%{transform:scale(1.08);}50%{transform:scale(0.93);}}
`;
  document.head.appendChild(s);
}

// ── SVG Starburst ──────────────────────────────────────────────────────────
function Starburst({ size = 80, color = SAND, children, style = {}, spin = false }) {
  // Build points with inner radius ratio 0.45 so tips stay well within viewBox
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8;
    const r = i % 2 === 0 ? 44 : 28; // outer 44, inner 28 — stays inside 0-100 box
    return `${50 + r * Math.cos(a - Math.PI / 2)},${50 + r * Math.sin(a - Math.PI / 2)}`;
  }).join(" ");
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, ...style }}>
      <svg viewBox="0 0 100 100" width={size} height={size}
        style={{
          position: "absolute", inset: 0, overflow: "visible",
          transformOrigin: "center",
          animation: spin ? "spin-slow 8s linear infinite" : "none"
        }}>
        <polygon points={pts} fill={color} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}


function InfoIcon({ text, label }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div onClick={e => { e.stopPropagation(); setOpen(v => !v); }} style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        border: `1.5px solid rgba(255,248,240,0.3)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: 11, fontWeight: 900,
        color: "rgba(255,248,240,0.4)", lineHeight: 1,
      }}>i</div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9998,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 32px",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 320,
            background: "rgba(30,18,44,0.98)", borderRadius: 18,
            border: `1.5px solid rgba(255,248,240,0.14)`,
            padding: "20px 22px", lineHeight: 1.6,
            animation: "tooltip-in 0.18s ease both",
            boxShadow: `4px 4px 0 rgba(0,0,0,0.5)`
          }}>
            {label && (
              <div style={{
                fontFamily: "'Ranchers', sans-serif", fontWeight: 400,
                fontSize: 22, color: PINK,
                WebkitTextStroke: `1px ${CORAL}`,
                marginBottom: 10, letterSpacing: "0.01em"
              }}>{label}</div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,248,240,0.8)" }}>{text}</div>
            <div onClick={() => setOpen(false)} style={{
              marginTop: 16, textAlign: "center", fontSize: 11,
              fontWeight: 900, color: "rgba(255,248,240,0.3)",
              cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase"
            }}>Tap to close</div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────
function Toggle({ label, active, onToggle, infoText, disabled = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "7px 0",
      opacity: disabled ? 0.35 : 1,
      pointerEvents: disabled ? "none" : "auto"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: active ? WHITE : "rgba(255,248,240,0.4)", transition: "color .2s", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </span>
        <InfoIcon text={infoText} label={label} />
      </div>
      <div onClick={onToggle} style={{ cursor: "pointer", flexShrink: 0 }}>
        <div style={{
          width: 52, height: 28, borderRadius: 14,
          background: active ? PINK : "#1E2F40",
          border: `2.5px solid ${active ? CORAL : INK}`,
          boxShadow: active ? `3px 3px 0 ${CORAL}` : `3px 3px 0 ${INK}`,
          position: "relative", transition: "all .18s",
          transform: active ? "translate(-1px,-1px)" : "none"
        }}>
          <div style={{
            position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
            background: WHITE, transition: "left .18s", left: active ? 28 : 4,
            boxShadow: "0 2px 4px rgba(0,0,0,0.35)"
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Menu ───────────────────────────────────────────────────────────────────
function Menu({ settings, setSettings, onStart }) {
  const lmsDisabled = settings.playerCount < 3;
  const [showHowTo, setShowHowTo] = useState(false);

  return (
    <div style={{
      height: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 22px", gap: 20, position: "relative", overflow: "hidden"
    }}>
      <Starburst size={140} color={SAND} style={{ position: "absolute", top: -40, right: -40, opacity: 0.15, animation: "spin-slow 14s linear infinite" }} />
      <Starburst size={90} color={WHITE} style={{ position: "absolute", bottom: 60, left: -25, opacity: 0.06, animation: "spin-slow 20s linear infinite reverse" }} />
      <div style={{ position: "absolute", bottom: -80, right: -80, width: 220, height: 220, borderRadius: "50%", border: "16px solid rgba(255,248,240,0.06)", animation: "circle-breathe-a 7s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: 40, left: -60, width: 160, height: 160, borderRadius: "50%", border: "10px solid rgba(255,248,240,0.05)", animation: "circle-breathe-b 9s ease-in-out infinite" }} />

      {/* Logo */}
      <div style={{ textAlign: "center", animation: "float 3s ease-in-out infinite" }}>
        <div style={{
          fontSize: 78, lineHeight: 0.88, color: PINK,
          fontFamily: "'Ranchers', sans-serif",
          fontWeight: 400,
          WebkitTextStroke: `3px ${CORAL}`,
          letterSpacing: "-2px", textShadow: `6px 6px 0 ${INK}`,
        }}>REACT<span style={{ fontSize: 100 }}>!</span></div>
        <div style={{ fontSize: 10, letterSpacing: "0.28em", color: "rgba(255,248,240,0.3)", marginTop: 10, fontWeight: 900, textTransform: "uppercase" }}>
          ✦ Test Your Reflexes ✦
        </div>
      </div>

      {/* Settings card — bold 3D style */}
      <div style={{
        width: "100%", maxWidth: 400,
        background: "#2A3F56",
        borderRadius: 24,
        border: `3px solid ${INK}`,
        boxShadow: `5px 5px 0 ${INK}`,
        padding: "20px 20px 18px",
        display: "flex", flexDirection: "column", gap: 16
      }}>

        {/* Players row */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: SAND, textTransform: "uppercase" }}>Players</span>
            <InfoIcon text="Choose how many players join this match. Solo mode lets you train your own reaction time." label="Players" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4].map(n => {
              const active = settings.playerCount === n;
              return (
                <button key={n} onClick={() => setSettings(s => ({ ...s, playerCount: n, lastManStanding: n < 3 ? false : s.lastManStanding }))} style={{
                  flex: 1, height: 52, borderRadius: 14,
                  border: `3px solid ${active ? CORAL : INK}`,
                  background: active ? PINK : "#1E2F40",
                  color: active ? INK : "rgba(255,248,240,0.4)",
                  fontFamily: "'Anton', sans-serif", fontSize: 22, cursor: "pointer",
                  transition: "all .12s",
                  boxShadow: active ? `3px 3px 0 ${CORAL}` : `3px 3px 0 ${INK}`,
                  transform: active ? "translate(-1px,-1px)" : "none"
                }}>{n}</button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,248,240,0.08)" }} />

        {/* Rounds row */}
        <div style={{ opacity: settings.lastManStanding ? 0.35 : 1, pointerEvents: settings.lastManStanding ? "none" : "auto", transition: "opacity .2s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: SAND, textTransform: "uppercase" }}>Rounds</span>
            <InfoIcon text="Number of rounds to play. Each round awards points based on placement." label="Rounds" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 3, 5, 10].map(n => {
              const active = settings.rounds === n;
              return (
                <button key={n} onClick={() => setSettings(s => ({ ...s, rounds: n }))} style={{
                  flex: 1, height: 52, borderRadius: 14,
                  border: `3px solid ${active ? "#C09020" : INK}`,
                  background: active ? SAND : "#1E2F40",
                  color: active ? INK : "rgba(255,248,240,0.4)",
                  fontFamily: "'Anton', sans-serif", fontSize: 20, cursor: "pointer",
                  transition: "all .12s",
                  boxShadow: active ? `3px 3px 0 #C09020` : `3px 3px 0 ${INK}`,
                  transform: active ? "translate(-1px,-1px)" : "none"
                }}>{n}</button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,248,240,0.08)" }} />

        {/* Toggles — no dividers, tight */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Toggle label="Trick Plays" active={settings.trickPlays} onToggle={() => setSettings(s => ({ ...s, trickPlays: !s.trickPlays }))} infoText={INFO.trickPlays} />
          <Toggle label="Race the Clock" active={settings.timeMode} onToggle={() => setSettings(s => ({ ...s, timeMode: !s.timeMode, lastManStanding: !s.timeMode ? false : s.lastManStanding }))} infoText={INFO.timeMode} />
          <Toggle label="Last Man Standing" active={settings.lastManStanding} onToggle={() => !lmsDisabled && !settings.timeMode && setSettings(s => ({ ...s, lastManStanding: !s.lastManStanding }))} infoText={settings.timeMode ? "Not available in Race the Clock mode." : lmsDisabled ? "Requires 3 or more players." : INFO.lastManStanding} disabled={lmsDisabled || settings.timeMode} />
        </div>
      </div>

      {/* CTA */}
      <button onClick={onStart} style={{
        width: "100%", maxWidth: 400, padding: "20px 0", borderRadius: 20,
        border: `3px solid ${INK}`, background: PINK, color: INK,
        fontFamily: "'Anton', sans-serif", fontSize: 26, letterSpacing: "0.04em",
        cursor: "pointer", boxShadow: `5px 5px 0 ${INK}`, transition: "transform .1s, box-shadow .1s"
      }}
        onMouseDown={e => { e.currentTarget.style.transform = "translate(3px,3px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${INK}`; }}
        onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `5px 5px 0 ${INK}`; }}
        onTouchStart={e => { e.currentTarget.style.transform = "translate(3px,3px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${INK}`; }}
        onTouchEnd={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `5px 5px 0 ${INK}`; }}
      >LET'S PLAY! ✦</button>

      {/* How to play link */}
      <div onClick={() => setShowHowTo(true)} style={{
        fontSize: 10, letterSpacing: "0.28em", color: "rgba(255,248,240,0.35)",
        fontWeight: 900, textTransform: "uppercase", cursor: "pointer",
        transition: "color .15s", marginTop: -4,
      }}
        onMouseEnter={e => e.currentTarget.style.color = "rgba(255,248,240,0.7)"}
        onMouseLeave={e => e.currentTarget.style.color = "rgba(255,248,240,0.35)"}
      >How to play</div>

      {/* How to play modal */}
      {showHowTo && (
        <div onClick={() => setShowHowTo(false)} style={{
          position: "fixed", inset: 0, background: "rgba(26,16,32,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px", zIndex: 500, backdropFilter: "blur(8px)",
          animation: "tooltip-in 0.2s ease both"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 380,
            background: "rgba(30,18,44,0.98)", borderRadius: 28,
            border: `2.5px solid rgba(255,248,240,0.12)`,
            padding: "28px 26px 24px",
            boxShadow: `6px 6px 0 ${INK}`
          }}>
            {/* Modal header */}
            <div style={{ marginBottom: 22, textAlign: "center" }}>
              <div style={{
                fontFamily: "'Ranchers', sans-serif", fontWeight: 400,
                fontSize: 32, color: PINK,
                WebkitTextStroke: `1.5px ${CORAL}`,
                textShadow: `3px 3px 0 ${INK}`, letterSpacing: "-0.5px"
              }}>How To Play<span style={{ fontSize: 42 }}>!</span></div>
            </div>

            {/* Steps */}
            {[
              { num: "1", title: "Everyone holds", body: "All players place a finger on their zone. The round starts once everyone is holding." },
              { num: "2", title: "Wait for GO!", body: "The screen stays red — don't lift your finger! After a random 3–8 second delay the zone flashes green." },
              { num: "3", title: "Lift fast", body: "The moment you see GO!, lift your finger as fast as possible. Your reaction time is shown in milliseconds." },
              { num: "4", title: "Watch for tricks", body: "With Trick Plays on, the zones may flash orange to fool you. Lift too early = false start — you're out that round!" },
              { num: "5", title: "Win rounds", body: "The fastest player wins the round. Play across multiple rounds and the one with the most wins takes the match." },
            ].map(({ num, title, body }) => (
              <div key={num} style={{ display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" }}>
                <div className="anton" style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: CORAL, color: WHITE,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, border: `2px solid #C03050`,
                  boxShadow: `2px 2px 0 #C03050`, marginTop: 1
                }}>{num}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, color: WHITE, marginBottom: 3, letterSpacing: "0.02em" }}>{title}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,248,240,0.45)", lineHeight: 1.55 }}>{body}</div>
                </div>
              </div>
            ))}

            {/* Close button */}
            <button onClick={() => setShowHowTo(false)} style={{
              width: "100%", marginTop: 8, padding: "14px 0", borderRadius: 16,
              border: `2.5px solid ${INK}`, background: SAND, color: INK,
              fontFamily: "'Anton', sans-serif", fontSize: 18, letterSpacing: "0.04em",
              cursor: "pointer", boxShadow: `3px 3px 0 ${INK}`
            }}>GOT IT ✦</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Player Zone ────────────────────────────────────────────────────────────
function PlayerZone({ player, idx, total, isTrickFlashing, trickText, onPress, onRelease, round, rounds, roundRank, isLMS }) {
  const col = P[idx % P.length];

  const isGo    = player.status === "go";
  const isWait  = player.status === "waiting";
  const isFalse = player.status === "false-start";
  const isDone  = player.status === "finished";
  const isIdle  = player.status === "idle";
  const isOut   = player.status === "eliminated";
  const isTrick = isTrickFlashing && isWait;

  const zoneBg = isOut   ? "#100818"
               : isFalse ? "#2D0010"
               : isGo    ? "#4DC83A"
               : isTrick ? "#2D1000"
               : isWait  ? "#1A0A00"
               : BLUE;

  const hasTrickText = isWait && trickText && trickText !== "WAIT";

  const bigText  = isDone       ? `${player.lastTime} ms`
                 : isFalse      ? "OOPS!"
                 : isGo         ? "GO!"
                 : hasTrickText ? trickText
                 : isWait       ? "WAIT"
                 : isOut        ? "OUT"
                 : "HOLD";

  const bigColor = isGo         ? WHITE
                 : isFalse      ? CORAL
                 : isDone       ? SAND
                 : hasTrickText ? "#F97316"
                 : isTrick      ? "#F97316"
                 : isWait       ? PINK
                 : "rgba(255,248,240,0.15)";

  const rotate = total === 1 ? "none"
               : (total === 2 && idx === 0) || (total > 2 && idx < 2) ? "rotate(180deg)" : "none";

  return (
    <div
      onMouseDown={onPress} onMouseUp={onRelease}
      onTouchStart={e => { e.preventDefault(); onPress(); }}
      onTouchEnd={e => { e.preventDefault(); onRelease(); }}
      style={{
        position: "relative", width: "100%", height: "100%", overflow: "hidden",
        background: zoneBg, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "background 0.05s",
        animation: isFalse ? "shake 0.45s ease" : "none"
      }}
    >
      {/* Dim overlay when holding in idle — shows finger is placed */}
      {player.isHolding && isIdle && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.22)",
          pointerEvents: "none", transition: "opacity 0.15s"
        }} />
      )}
      {isGo && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(10,58,16,0.25)",
          animation: "flash-go 0.6s ease forwards", pointerEvents: "none"
        }} />
      )}

      {/* Trick flash overlay */}
      {isTrick && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(249,115,22,0.15)", pointerEvents: "none" }} />
      )}

      {/* Decorative starburst (idle) */}
      {(isIdle || isOut) && (
        <Starburst size={100} color={`${col.accent}1A`}
          style={{ position: "absolute", top: -25, right: -25, transform: rotate === "none" ? "none" : "rotate(180deg)" }}
          spin />
      )}

      {/* Content — rotated per player, fills full zone */}
      <div style={{ transform: rotate, position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 2, pointerEvents: "none", padding: "0 12px" }}>

        {/* Round rank — top 14% in rotated coordinate space = near player's own top */}
        {roundRank !== null && (
          <div className="anton" style={{
            position: "absolute", top: "14%", left: 0, right: 0, textAlign: "center",
            fontSize: "clamp(32px,10vw,64px)", lineHeight: 1,
            color: roundRank === 1 ? SAND : "rgba(255,248,240,0.4)",
            textShadow: roundRank === 1 ? `3px 3px 0 ${INK}` : "none",
            animation: "pop 0.35s cubic-bezier(.34,1.56,.64,1) both",
            letterSpacing: "-1px"
          }}>#{roundRank}</div>
        )}

        {/* Player name badge */}
        <div style={{
          background: col.accent, color: col.text,
          fontFamily: "'Anton', sans-serif", fontSize: 11, letterSpacing: "0.18em",
          padding: "4px 18px", borderRadius: 20,
          border: `2px solid ${col.shade}`,
          boxShadow: `2px 2px 0 ${col.shade}`
        }}>
          {player.name.toUpperCase()}
        </div>

        {/* Big status text */}
        <div className="anton" style={{
          fontSize: isDone ? "clamp(30px,8vw,56px)" : "clamp(44px,13vw,82px)",
          lineHeight: 1, color: bigColor, letterSpacing: "-1px",
          WebkitTextStroke: (isGo || isDone) ? `2px ${col.shade}` : "none",
          textShadow: isGo ? `4px 4px 0 rgba(0,0,0,0.35)` : isDone ? `3px 3px 0 rgba(0,0,0,0.25)` : "none",
          animation: isDone ? "pop 0.38s cubic-bezier(.34,1.56,.64,1) both" : "none",
          transition: "color 0.1s", textAlign: "center"
        }}>
          {bigText}
        </div>

        {/* Sub hint */}
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,248,240,0.28)", textAlign: "center" }}>
          {isWait  ? "Don't you dare..." :
           isGo    ? "↑  LIFT  ↑" :
           isDone  ? "Nice reaction!" :
           isFalse ? "Too early! ✗" :
           isOut   ? "Eliminated" :
           "Place finger here"}
        </div>

        {/* Hold circle with ripples AROUND it */}
        {!isOut && !isDone && !isFalse && (
          <div style={{ position: "relative", width: 72, height: 72, marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Ripple rings — use WHITE so they're always visible regardless of player color or bg */}
            {player.isHolding && (
              <>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: `2.5px solid rgba(255,248,240,0.6)`,
                  animation: "ripple 1.3s ease-out infinite"
                }} />
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: `2.5px solid rgba(255,248,240,0.4)`,
                  animation: "ripple 1.3s ease-out 0.45s infinite"
                }} />
              </>
            )}
            {/* Outer ring — always white-ish border so it shows on any bg */}
            <div style={{
              width: 62, height: 62, borderRadius: "50%",
              border: `3px solid rgba(255,248,240,0.25)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.2s",
              boxShadow: player.isHolding ? `0 0 0 2px ${col.accent}` : "none"
            }}>
              {/* Inner dot — white when idle so it shows on blue bg, accent when holding */}
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: player.isHolding ? col.accent : "rgba(255,248,240,0.25)",
                transition: "background 0.2s, box-shadow 0.2s",
                animation: player.isHolding ? "pulse-dot 0.9s ease-in-out infinite" : "none",
                boxShadow: player.isHolding ? `0 0 18px ${col.accent}, 0 0 4px rgba(255,248,240,0.5)` : "none",
                border: player.isHolding ? `2px solid ${col.shade}` : "2px solid rgba(255,248,240,0.15)"
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Round pill — hidden in Last Man Standing */}
      {!isLMS && (
      <div style={{
        position: "absolute",
        ...(rotate === "none" ? { bottom: 14, right: 14 } : { top: 14, right: 14, transform: "rotate(180deg)" }),
        background: "rgba(26,16,32,0.55)", borderRadius: 20, padding: "4px 12px",
        fontSize: 9, fontWeight: 900, letterSpacing: "0.18em",
        color: "rgba(255,248,240,0.28)", textTransform: "uppercase"
      }}>
        {`${round} / ${rounds}`}
      </div>
      )}

      {/* Huge ghost X on false start */}
      {isFalse && (
        <div className="anton" style={{
          position: "absolute", fontSize: 200, color: "rgba(240,92,110,0.07)",
          lineHeight: 1, pointerEvents: "none", userSelect: "none", zIndex: 0
        }}>✗</div>
      )}
    </div>
  );
}

// ── Results Screen ─────────────────────────────────────────────────────────
function Results({ players, settings, onPlayAgain, onMenu }) {
  const isTimeMode = settings?.timeMode;

  const sorted = [...players].sort((a, b) => {
    if (isTimeMode) return (a.totalTime || 99999) - (b.totalTime || 99999);
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return (a.totalTime || 99999) - (b.totalTime || 99999);
  });
  const winner = sorted[0];

  // Find players with fastest and slowest valid times
  const validPlayers  = players.filter(p => p.lastTime !== null && p.status !== "false-start");
  const allTimes      = validPlayers.map(p => p.lastTime);
  const fastest       = allTimes.length ? Math.min(...allTimes) : null;
  const slowest       = allTimes.length ? Math.max(...allTimes) : null;
  const avg           = allTimes.length ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length) : null;
  const fastestPlayer = validPlayers.find(p => p.lastTime === fastest);
  const slowestPlayer = validPlayers.find(p => p.lastTime === slowest);

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 22px", gap: 14, position: "relative",
      overflowY: "auto", overflowX: "hidden",
    }}>
      <Starburst size={150} color={SAND} style={{ position: "absolute", top: -45, right: -45, opacity: 0.12, animation: "spin-slow 10s linear infinite" }} />
      <Starburst size={100} color={PINK} style={{ position: "absolute", bottom: 50, left: -30, opacity: 0.18, animation: "spin-slow 16s linear infinite reverse" }} />

      {/* Header */}
      <div style={{ textAlign: "center", animation: "starburst-in 0.5s ease both" }}>
        <div style={{
          fontSize: 56, color: PINK,
          fontFamily: "'Ranchers', sans-serif",
          fontWeight: 400,
          WebkitTextStroke: `2.5px ${CORAL}`,
          textShadow: `5px 5px 0 ${INK}`, letterSpacing: "-1px", lineHeight: 1
        }}>RESULTS<span style={{ fontSize: 72 }}>!</span></div>
        {winner && (winner.totalPoints > 0 || isTimeMode) && (
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 900, color: SAND, letterSpacing: "0.1em" }}>
            {winner.name.toUpperCase()} {isTimeMode ? "IS FASTEST" : "WINS"}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((p, i) => {
          const col = P[p.id - 1];
          const isFirst = i === 0;
          const isLMS = settings?.lastManStanding;
          const showTime = isTimeMode;
          const showPoints = !isTimeMode && !isLMS;
          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: isFirst ? `${SAND}22` : "rgba(255,248,240,0.05)",
              border: `2.5px solid ${isFirst ? SAND : "rgba(255,248,240,0.09)"}`,
              borderRadius: 16, padding: "12px 16px",
              boxShadow: isFirst ? `4px 4px 0 #C09020` : "none",
              animation: `slide-up 0.4s ${i * 0.09}s both`
            }}>
              {/* Rank circle — gold for 1st, white for rest */}
              <div className="anton" style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: isFirst ? SAND : WHITE,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: INK,
                border: `2px solid ${isFirst ? "#C09020" : "rgba(255,248,240,0.3)"}`
              }}>{i + 1}</div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 17, color: WHITE }}>{p.name}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,248,240,0.38)", letterSpacing: "0.06em", marginTop: 1 }}>
                  {isTimeMode
                    ? (i === 0 ? "Fastest overall" : `+${p.totalTime - (sorted[0].totalTime || 0)} ms`)
                    : (p.totalTime > 0 ? `${p.totalTime} ms total` : "—")}
                </div>
              </div>

              {/* Right column — hidden for LMS */}
              {showTime && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="anton" style={{ fontSize: 22, color: isFirst ? SAND : WHITE, lineHeight: 1 }}>
                    {p.totalTime || 0} <span style={{ fontSize: 12 }}>ms</span>
                  </div>
                </div>
              )}
              {showPoints && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="anton" style={{ fontSize: 26, color: isFirst ? SAND : WHITE, lineHeight: 1 }}>
                    {p.totalPoints}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,248,240,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>pts</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats cards */}
      {fastest !== null && (
        <div style={{
          width: "100%", maxWidth: 400,
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
          animation: "slide-up 0.5s 0.35s both",
          flexShrink: 0
        }}>
          {[
            { label: "Fastest", ms: fastest, sub: fastestPlayer?.name },
            { label: "Slowest", ms: slowest, sub: slowestPlayer?.name },
            { label: "Average", ms: avg,     sub: "All players" },
          ].map(({ label, ms, sub }) => (
            <div key={label} style={{
              background: "rgba(255,248,240,0.06)",
              border: "1.5px solid rgba(255,248,240,0.1)",
              borderRadius: 14, padding: "12px 10px", textAlign: "center"
            }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,248,240,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
              <div className="anton" style={{ fontSize: 22, color: SAND, lineHeight: 1 }}>{ms} <span style={{ fontSize: 14 }}>ms</span></div>
              {sub && <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,248,240,0.25)", marginTop: 4, letterSpacing: "0.04em" }}>{sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Buttons */}
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={onPlayAgain} style={{
          width: "100%", padding: "18px 0", borderRadius: 18,
          border: `3px solid ${INK}`, background: PINK, color: INK,
          fontFamily: "'Anton', sans-serif", fontSize: 22, cursor: "pointer",
          boxShadow: `5px 5px 0 ${INK}`, transition: "transform .1s, box-shadow .1s"
        }}
          onMouseDown={e => { e.currentTarget.style.transform = "translate(3px,3px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${INK}`; }}
          onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `5px 5px 0 ${INK}`; }}
        >PLAY AGAIN ✦</button>
        <button onClick={onMenu} style={{
          width: "100%", padding: "15px 0", borderRadius: 18,
          border: "2px solid rgba(255,248,240,0.16)", background: "transparent",
          color: "rgba(255,248,240,0.4)", fontFamily: "'Anton', sans-serif",
          fontSize: 17, cursor: "pointer", letterSpacing: "0.04em"
        }}>MENU</button>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  injectCSS();

  const [screen, setScreen]       = useState("menu");
  const [settings, setSettings]   = useState({ playerCount: 1, rounds: 5, trickPlays: true, sound: true, lastManStanding: false, timeMode: false });
  const [players, setPlayers]     = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [goTime, setGoTime]       = useState(null);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [isTrickFlashing, setIsTrickFlashing] = useState(false);
  const [trickText, setTrickText] = useState("WAIT");
  const [roundRanks, setRoundRanks] = useState({});
  const [showConfirmQuit, setShowConfirmQuit] = useState(false);
  const [showResultsBtn, setShowResultsBtn]   = useState(false);
  const [showRoundStart, setShowRoundStart]   = useState(false);
  const timerRef  = useRef(null);
  const trickRefs = useRef([]);
  const roundStartTime = useRef(null);

  const makePlayers = (count) =>
    Array.from({ length: count }, (_, i) => ({
      id: i + 1, name: `Player ${i + 1}`,
      status: "idle", lastTime: null, totalPoints: 0, totalTime: 0, isHolding: false
    }));

  const startGame = () => {
    clearTimeout(timerRef.current);
    trickRefs.current.forEach(clearTimeout);
    setPlayers(makePlayers(settings.playerCount));
    setCurrentRound(1);
    setIsRoundActive(false);
    setGoTime(null);
    setIsTrickFlashing(false);
    setRoundRanks({});
    setShowResultsBtn(false);
    setShowConfirmQuit(false);
    setShowRoundStart(false);
    setTrickText("WAIT");
    setScreen("playing");
  };

  const startRound = useCallback(() => {
    trickRefs.current.forEach(clearTimeout);
    trickRefs.current = [];
    setGoTime(null);
    setIsTrickFlashing(false);
    setTrickText("WAIT");
    setIsRoundActive(true);
    roundStartTime.current = Date.now();

    setPlayers(prev => prev.map(p =>
      p.status === "eliminated" ? p : { ...p, status: "waiting", lastTime: null }
    ));

    const delay = 3000 + Math.random() * 5000; // 3–8 seconds

    if (settings.trickPlays) {
      // 50% chance of NO tricks this round — keeps players guessing
      const willTrick = Math.random() < 0.5;
      if (willTrick) {
        const n = 1 + Math.floor(Math.random() * 3); // 1–3 tricks when they happen
        const usedSlots = new Set();
        for (let i = 0; i < n; i++) {
          let td;
          let tries = 0;
          do {
            td = Math.round(600 + Math.random() * (delay - 1200));
            tries++;
          } while ([...usedSlots].some(t => Math.abs(t - td) < 500) && tries < 10);
          usedSlots.add(td);
          const trickWords = ["NO!", "NOW!", "GO!", "LIFT!", "YES!"];
          const flashDur = 60 + Math.random() * 160;
          const t = setTimeout(() => {
            const word = trickWords[Math.floor(Math.random() * trickWords.length)];
            setTrickText(word);
            setIsTrickFlashing(true);
            if (settings.sound) snd.tick();
            // Only stop the flash overlay — keep the trick text until next trick or GO
            setTimeout(() => { setIsTrickFlashing(false); }, flashDur);
          }, td);
          trickRefs.current.push(t);
        }
      }
    }

    timerRef.current = setTimeout(() => {
      const now = Date.now();
      setGoTime(now);
      setPlayers(prev => prev.map(p => p.status === "waiting" ? { ...p, status: "go" } : p));
      if (settings.sound) snd.go();
    }, delay);
  }, [settings]);

  const handlePress = useCallback((id) => {
    if (screen !== "playing") return;
    setPlayers(prev => {
      const next = prev.map(p =>
        p.id === id && !["eliminated", "finished", "false-start"].includes(p.status)
          ? { ...p, isHolding: true }
          : p
      );
      const active = next.filter(p => p.status !== "eliminated");
      if (active.every(p => p.isHolding) && !isRoundActive) {
        setShowRoundStart(true);
        setTimeout(() => {
          setShowRoundStart(false);
          startRound();
        }, 1000);
      }
      return next;
    });
  }, [screen, isRoundActive, startRound]);

  const handleRelease = useCallback((id) => {
    if (screen !== "playing" || !isRoundActive) return;
    const now = Date.now();

    setPlayers(prev => {
      const next = [...prev];
      const p = next.find(pl => pl.id === id);
      if (!p || ["eliminated", "finished", "false-start"].includes(p.status)) return prev;

      p.isHolding = false;

      if (!goTime) {
        // False start — out this round, +1000ms penalty
        p.status = "false-start";
        p.lastTime = 1000;
        p.falseStartAt = now;
        p.totalTime = (p.totalTime || 0) + 1000;
        if (settings.sound) snd.falseStart();
      } else {
        p.status = "finished";
        p.lastTime = now - goTime;
        p.totalTime = (p.totalTime || 0) + p.lastTime;
      }

      // Count both finished AND false-start (and eliminated) as "done"
      const active = next.filter(pl => pl.status !== "eliminated");
      const allDone = active.every(pl => ["finished", "false-start"].includes(pl.status));

      if (allDone) {
        setIsRoundActive(false);
        clearTimeout(timerRef.current);

        // Compute round rankings: finished sorted by time, false-starts sorted by who did it earliest (last place)
        const finishedSorted = [...active]
          .filter(pl => pl.status === "finished")
          .sort((a, b) => a.lastTime - b.lastTime);
        // False starters: earliest false start = last place (they jumped first = worst)
        const falseStartersSorted = [...active]
          .filter(pl => pl.status === "false-start")
          .sort((a, b) => (b.falseStartAt || 0) - (a.falseStartAt || 0)); // latest first = better rank
        const rankMap = {};
        finishedSorted.forEach((pl, idx) => { rankMap[pl.id] = idx + 1; });
        falseStartersSorted.forEach((pl, idx) => { rankMap[pl.id] = finishedSorted.length + 1 + idx; });
        setRoundRanks(rankMap);

        // Award points: 1st = N pts, 2nd = N-1 pts, ..., last = 1 pt
        // false-starts share the last rank and get 1 pt (or 0 if all false-started)
        const totalActivePlayers = next.filter(pl => pl.status !== "eliminated").length + next.filter(pl => pl.status === "eliminated").length;
        const allPlayerCount = next.length; // use total player count for max points
        finishedSorted.forEach((pl, idx) => {
          const points = Math.max(1, allPlayerCount - idx);
          next.find(p => p.id === pl.id).totalPoints += points;
        });
        falseStartersSorted.forEach(pl => {
          // false-starters get 0 points
          // totalPoints unchanged
        });

        if (settings.lastManStanding && active.length > 1) {
          const sorted = [...active].sort((a, b) => {
            const aT = a.status === "false-start" ? 99999 : (a.lastTime || 99999);
            const bT = b.status === "false-start" ? 99999 : (b.lastTime || 99999);
            return aT - bT;
          });
          next.find(pl => pl.id === sorted[sorted.length - 1].id).status = "eliminated";
        }

        const stillIn = next.filter(pl => pl.status !== "eliminated");
        const lmsElimEnd = settings.lastManStanding && stillIn.length <= 1;
        const gameOver = currentRound >= settings.rounds || lmsElimEnd;

        if (gameOver) {
          if (settings.rounds > 1) {
            setTimeout(() => setShowResultsBtn(true), 1800);
          } else {
            setTimeout(() => setScreen("results"), 1800);
          }
        } else {
          setTimeout(() => {
            setCurrentRound(r => r + 1);
            setRoundRanks({});
            setPlayers(ps => ps.map(p =>
              p.status === "eliminated" ? p : { ...p, status: "idle", lastTime: null, falseStartAt: null, isHolding: false }
            ));
            setGoTime(null);
            setIsRoundActive(false);
          }, 2300);
        }
      }
      return next;
    });
  }, [screen, isRoundActive, goTime, settings, currentRound]);

  if (screen === "menu")    return <Menu settings={settings} setSettings={setSettings} onStart={startGame} />;
  if (screen === "results") return <Results players={players} settings={settings} onPlayAgain={startGame} onMenu={() => setScreen("menu")} />;

  const cols = settings.playerCount <= 2 ? 1 : 2;
  const rows = settings.playerCount === 1 ? 1 : 2;

  // Derive separator line + button border color from current game state
  const anyGo   = players.some(p => p.status === "go");
  const anyWait = players.some(p => p.status === "waiting" || p.status === "false-start");
  const gapColor      = anyGo   ? "#F0EDE8"
                      : anyWait ? "#F0EDE8"
                      : "#1A3A5C";
  const btnBorder     = anyGo   ? "#1A5C20"
                      : anyWait ? "rgba(255,255,255,0.5)"
                      : "#1A3A5C";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      height: "100dvh", width: "100vw",
      gap: 3, background: gapColor,
      transition: "background 0.15s"
    }}>
      {players.map((player, idx) => (
        <div key={player.id} style={settings.playerCount === 3 && idx === 2 ? { gridColumn: "1 / -1" } : {}}>
          <PlayerZone
            player={player} idx={idx} total={settings.playerCount}
            isTrickFlashing={isTrickFlashing}
            trickText={trickText}
            onPress={() => handlePress(player.id)}
            onRelease={() => handleRelease(player.id)}
            round={currentRound} rounds={settings.rounds}
            roundRank={roundRanks[player.id] ?? null}
            isLMS={settings.lastManStanding}
          />
        </div>
      ))}

      {!isRoundActive && !showResultsBtn && (
        <button onClick={() => { setShowConfirmQuit(true); }} style={{
          position: "fixed",
          ...(settings.playerCount === 1
            ? { top: 16, right: 16, transform: "none" }
            : { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }
          ),
          width: 42, height: 42, borderRadius: "50%",
          background: anyGo ? "#1A1020" : anyWait ? "#1A1020" : BLUE, border: `3px solid ${btnBorder}`,
          color: "rgba(255,248,240,0.45)", fontSize: 16, cursor: "pointer", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "border-color 0.15s"
        }}>✕</button>
      )}

      {/* Round start flash */}
      {showRoundStart && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 150,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none", animation: "tooltip-in 0.15s ease both"
        }}>
          <div style={{
            textAlign: "center",
            animation: "pop 0.3s cubic-bezier(.34,1.56,.64,1) both"
          }}>
            <div style={{
              fontFamily: "'Ranchers', sans-serif", fontWeight: 400,
              fontSize: "clamp(32px,8vw,52px)", color: PINK,
              WebkitTextStroke: `2px ${CORAL}`,
              textShadow: `4px 4px 0 ${INK}`,
              letterSpacing: "0.02em", lineHeight: 1
            }}>
              Round {currentRound}<span style={{ fontSize: "clamp(40px,10vw,64px)" }}>!</span>
            </div>
            <div style={{
              marginTop: 6, fontSize: 11, fontWeight: 900,
              letterSpacing: "0.25em", textTransform: "uppercase",
              color: "rgba(255,248,240,0.5)"
            }}>Get ready</div>
          </div>
        </div>
      )}
      {showResultsBtn && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none"
        }}>
          <button onClick={() => setScreen("results")} style={{
            pointerEvents: "auto",
            padding: "20px 40px", borderRadius: 20,
            border: `3px solid ${INK}`, background: PINK, color: INK,
            fontFamily: "'Anton', sans-serif", fontSize: 24, letterSpacing: "0.04em",
            cursor: "pointer", boxShadow: `5px 5px 0 ${INK}`,
            transition: "transform .1s, box-shadow .1s",
            animation: "pop 0.4s cubic-bezier(.34,1.56,.64,1) both"
          }}
            onMouseDown={e => { e.currentTarget.style.transform = "translate(3px,3px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${INK}`; }}
            onMouseUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `5px 5px 0 ${INK}`; }}
            onTouchStart={e => { e.currentTarget.style.transform = "translate(3px,3px)"; e.currentTarget.style.boxShadow = `2px 2px 0 ${INK}`; }}
            onTouchEnd={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `5px 5px 0 ${INK}`; }}
          >SHOW RESULTS ✦</button>
        </div>
      )}

      {/* Quit confirmation dialog */}
      {showConfirmQuit && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 32px", background: "rgba(10,6,20,0.6)",
          backdropFilter: "blur(8px)"
        }}>
          <div style={{
            width: "100%", maxWidth: 320,
            background: "#2A3F56", borderRadius: 24,
            border: `3px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`,
            padding: "28px 24px", textAlign: "center"
          }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,248,240,0.5)", lineHeight: 1.5 }}>
                Quit game? Your progress will be lost.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => {
                clearTimeout(timerRef.current);
                trickRefs.current.forEach(clearTimeout);
                setShowConfirmQuit(false);
                setScreen("menu");
              }} style={{
                width: "100%", padding: "16px 0", borderRadius: 16,
                border: `3px solid ${INK}`, background: PINK, color: INK,
                fontFamily: "'Anton', sans-serif", fontSize: 18, cursor: "pointer",
                boxShadow: `4px 4px 0 ${INK}`, letterSpacing: "0.04em"
              }}>YES, QUIT</button>
              <button onClick={() => setShowConfirmQuit(false)} style={{
                width: "100%", padding: "14px 0", borderRadius: 16,
                border: `2px solid rgba(255,248,240,0.2)`, background: "transparent",
                color: "rgba(255,248,240,0.45)", fontFamily: "'Anton', sans-serif",
                fontSize: 16, cursor: "pointer", letterSpacing: "0.04em"
              }}>KEEP PLAYING</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
