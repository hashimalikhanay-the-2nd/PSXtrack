import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Syne, DM_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "PSXTrack — Portfolio Tracker",
  description: "Track PSX stocks portfolio (orders + live quotes).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${syne.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#060810]">
        {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
        <section className="hero-section">
          {/* Video background */}
          <video
            className="hero-video"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
          {/* Gradient overlays */}
          <div className="hero-overlay" />
          <div className="hero-overlay-bottom" />

          {/* Navigation */}
          <nav className="hero-nav">
            <div className="nav-inner">
              {/* Logo */}
              <div className="nav-logo">
                <div className="logo-icon">
                  <div className="logo-dot" />
                </div>
                <span className="logo-text">PSX<span className="logo-accent">Track</span></span>
                <span className="logo-sub">COAF36800</span>
              </div>

              {/* Nav links */}
              <div className="nav-links">
                <Link href="/" className="nav-link">Portfolio</Link>
                <Link href="/orders" className="nav-link">Orders</Link>
                <Link href="/portfolio" className="nav-link">Analytics</Link>
              </div>

              {/* Live indicator */}
              <div className="nav-live">
                <span className="live-pulse" />
                <span className="live-label">Live</span>
              </div>
            </div>
          </nav>

          {/* Hero content */}
          <div className="hero-content">
            {/* Top two-column subtext */}
            <div className="hero-top-row">
              <p className="hero-sub-left">
                Real-time PSX equity tracking — positions, P/L, and KSE-100 benchmark in one view.
              </p>
              <p className="hero-sub-right">
                6 Active Positions · PKR-denominated
              </p>
            </div>

            {/* Main headline */}
            <div className="hero-headline-wrap">
              <p className="hero-eyebrow">Live Market Intelligence · KSE-100</p>
              <h1 className="hero-headline">
                <span className="headline-line1">Track Your</span>
                <br />
                <span className="headline-line2 shiny-text">PSX Portfolio.</span>
              </h1>
            </div>

            {/* CTA */}
            <div className="hero-cta-wrap">
              <Link href="/orders" className="hero-cta">
                <span>Add Order</span>
                <svg className="cta-arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════ DASHBOARD ═══════════════════════════ */}
        <main className="site-main">
          {children}
        </main>

        <style>{`
          /* ── Fonts ── */
          :root {
            --font-display: var(--font-syne), 'Syne', sans-serif;
            --font-body: var(--font-inter), 'Inter', sans-serif;
            --font-mono: var(--font-dm-mono), 'DM Mono', monospace;
            --green: #10b981;
            --green-bright: #34d399;
            --blue-shine: #64CEFB;
          }

          /* ── Hero section ── */
          .hero-section {
            position: relative;
            height: 100vh;
            min-height: 600px;
            background: #000;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .hero-video {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.55;
          }

          .hero-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              135deg,
              rgba(6, 8, 16, 0.72) 0%,
              rgba(6, 8, 16, 0.45) 50%,
              rgba(6, 8, 16, 0.68) 100%
            );
          }

          .hero-overlay-bottom {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 35%;
            background: linear-gradient(to bottom, transparent, #060810);
          }

          /* ── Nav ── */
          .hero-nav {
            position: relative;
            z-index: 20;
            padding: 0;
          }

          .nav-inner {
            max-width: 80rem;
            margin: 0 auto;
            padding: 1.25rem 2rem;
            display: flex;
            align-items: center;
            gap: 2rem;
          }

          .nav-logo {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            flex-shrink: 0;
          }

          .logo-icon {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .logo-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #fff;
          }

          .logo-text {
            font-family: var(--font-display);
            font-size: 1rem;
            font-weight: 800;
            color: rgba(255,255,255,0.95);
            letter-spacing: -0.02em;
          }

          .logo-accent { color: var(--green-bright); }

          .logo-sub {
            font-family: var(--font-mono);
            font-size: 0.58rem;
            letter-spacing: 0.12em;
            color: rgba(255,255,255,0.28);
            text-transform: uppercase;
            margin-left: 0.25rem;
          }

          .nav-links {
            display: flex;
            align-items: center;
            gap: 0.15rem;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 9999px;
            padding: 0.25rem 0.4rem;
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
            margin-left: auto;
          }

          .nav-link {
            font-family: var(--font-body);
            font-size: 0.8rem;
            font-weight: 500;
            color: rgba(255,255,255,0.65);
            padding: 0.35rem 0.85rem;
            border-radius: 9999px;
            text-decoration: none;
            transition: color 0.15s, background 0.15s;
            letter-spacing: 0.01em;
            white-space: nowrap;
          }
          .nav-link:hover {
            color: #fff;
            background: rgba(255,255,255,0.08);
          }

          .nav-live {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-shrink: 0;
          }

          .live-pulse {
            display: block;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--green-bright);
            box-shadow: 0 0 8px var(--green-bright);
            animation: pulse-ring 2s infinite;
          }

          @keyframes pulse-ring {
            0%, 100% { box-shadow: 0 0 6px var(--green-bright); }
            50% { box-shadow: 0 0 14px var(--green-bright), 0 0 22px rgba(52,211,153,0.3); }
          }

          .live-label {
            font-family: var(--font-mono);
            font-size: 0.68rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--green-bright);
          }

          /* ── Hero content ── */
          .hero-content {
            position: relative;
            z-index: 10;
            flex: 1;
            max-width: 80rem;
            margin: 0 auto;
            width: 100%;
            padding: 0 2rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding-bottom: 5rem;
          }

          .hero-top-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2rem;
            margin-bottom: 2.5rem;
          }

          .hero-sub-left,
          .hero-sub-right {
            font-family: var(--font-body);
            font-size: 0.82rem;
            color: rgba(255,255,255,0.6);
            line-height: 1.6;
            max-width: 36ch;
          }

          .hero-sub-right {
            text-align: right;
            color: rgba(255,255,255,0.5);
            font-family: var(--font-mono);
            font-size: 0.75rem;
            letter-spacing: 0.04em;
            flex-shrink: 0;
          }

          /* ── Headline ── */
          .hero-headline-wrap {
            margin-bottom: 2.5rem;
          }

          .hero-eyebrow {
            font-family: var(--font-mono);
            font-size: 0.68rem;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.5);
            margin-bottom: 1rem;
          }

          .hero-headline {
            font-family: var(--font-display);
            font-weight: 700;
            line-height: 0.88;
            letter-spacing: -0.03em;
            margin: 0;
            font-size: clamp(3.5rem, 8vw, 7rem);
          }

          .headline-line1 {
            color: rgba(255,255,255,0.92);
            display: block;
          }

          .headline-line2 {
            display: block;
          }

          /* ── Shiny text animation ── */
          .shiny-text {
            background: linear-gradient(
              100deg,
              #64CEFB 0%,
              #64CEFB 20%,
              #ffffff 40%,
              #64CEFB 60%,
              #64CEFB 80%,
              #10b981 100%
            );
            background-size: 300% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
            animation: shine-sweep 3s linear infinite;
          }

          @keyframes shine-sweep {
            0%   { background-position: 200% center; }
            100% { background-position: -100% center; }
          }

          /* ── CTA ── */
          .hero-cta-wrap { display: flex; }

          .hero-cta {
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            font-family: var(--font-body);
            font-size: 0.88rem;
            font-weight: 500;
            color: #fff;
            background: #000;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 9999px;
            padding: 0.8rem 1.75rem;
            text-decoration: none;
            transition: background 0.2s, border-color 0.2s, gap 0.2s;
            letter-spacing: 0.02em;
          }

          .hero-cta:hover {
            background: #111;
            border-color: rgba(255,255,255,0.25);
            gap: 0.9rem;
          }

          .cta-arrow {
            transition: transform 0.2s;
          }
          .hero-cta:hover .cta-arrow {
            transform: translateX(3px);
          }

          /* ── Dashboard shell ── */
          .site-main {
            max-width: 80rem;
            margin: 0 auto;
            width: 100%;
            padding: 2.5rem 2rem 4rem;
            flex: 1;
          }

          /* ── Mobile adjustments ── */
          @media (max-width: 768px) {
            .nav-inner { padding: 1rem 1.25rem; gap: 1rem; }
            .logo-sub { display: none; }
            .hero-content { padding: 0 1.25rem 3rem; }
            .hero-top-row { flex-direction: column; gap: 0.5rem; }
            .hero-sub-right { text-align: left; }
            .hero-headline { font-size: clamp(2.8rem, 12vw, 4.5rem); }
            .site-main { padding: 1.5rem 1.25rem 3rem; }
          }

          @media (max-width: 520px) {
            .nav-links { display: none; }
          }
        `}</style>
      </body>
    </html>
  );
}
