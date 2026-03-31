export const dynamic = 'force-dynamic';
import pool from "@/lib/db";
import type { Professor } from "@/lib/constants";
import ProfessorList from "./ProfessorList";

async function getProfessorsWithStats() {
  const result = await pool.query<
    Professor & { avg_quality: string; avg_difficulty: string; review_count: string }
  >(`
    SELECT 
      p.*,
      COALESCE(AVG(r.quality_rating)::numeric(3,1), 0) AS avg_quality,
      COALESCE(AVG(r.difficulty_rating)::numeric(3,1), 0) AS avg_difficulty,
      COUNT(r.id) AS review_count
    FROM professors p
    LEFT JOIN reviews r ON r.professor_id = p.id AND r.is_approved = true
    GROUP BY p.id
    ORDER BY p.name ASC
  `);
  return result.rows;
}

export default async function HomePage() {
  const professors = await getProfessorsWithStats();

  return (
    <main
      className="min-h-screen w-full relative overflow-x-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0f0c29 0%, #302b63 25%, #24243e 50%, #0d324d 75%, #7f5a83 100%)",
        fontFamily: "'DM Sans', 'Sora', 'Nunito Sans', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Ambient orbs for depth */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-10%",
          left: "-5%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "5%",
          right: "-10%",
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(20,184,166,0.22) 0%, transparent 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "40%",
          left: "40%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-12"
      >
        {/* ── Hero ── */}
        <section className="flex flex-col items-center text-center gap-5 pt-6">
          {/* Eyebrow pill */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 18px",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
              color: "rgba(167,243,208,0.9)",
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 8px 2px #34d39980",
                flexShrink: 0,
              }}
            />
            NITK Surathkal · 100% Anonymous
          </span>

          {/* Main title */}
          <h1
            style={{
              fontSize: "clamp(2.8rem, 8vw, 5.5rem)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              background:
                "linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 30%, #38bdf8 60%, #5eead4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              margin: 0,
            }}
          >
            Rate My Professor
            <br />
            <span
              style={{
                fontSize: "clamp(1.8rem, 5vw, 3.2rem)",
                fontWeight: 700,
                background:
                  "linear-gradient(135deg, #c7d2fe 0%, #f0abfc 60%, #fb7185 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              NITK Edition
            </span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              maxWidth: "600px",
              fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
              color: "rgba(226,232,240,0.75)",
              lineHeight: 1.7,
              fontWeight: 400,
              margin: 0,
            }}
          >
            The{" "}
            <strong style={{ color: "rgba(167,243,208,0.9)", fontWeight: 600 }}>
              100% anonymous
            </strong>{" "}
            platform for NITKians to share honest, constructive feedback.
          </p>

          {/* Stats strip */}
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginTop: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              { label: "Professors Listed", value: professors.length },
              { label: "Departments", value: "All" },
              { label: "Identity Stored", value: "None" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    background: "linear-gradient(90deg, #a5b4fc, #5eead4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(203,213,225,0.5)",
                    fontWeight: 500,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Community Guidelines Card ── */}
        <section
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.13)",
            borderRadius: "24px",
            padding: "36px 40px",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#f472b6",
                boxShadow: "0 0 12px 4px #f472b660",
                flexShrink: 0,
              }}
            />
            <h2
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(226,232,240,0.85)",
              }}
            >
              Community Guidelines
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px 40px",
            }}
          >
            {[
              {
                color: "#f87171",
                glow: "#f8717160",
                title: "Full Names Only",
                desc: "Use professors' official names as listed in the NITK directory.",
              },
              {
                color: "#fb923c",
                glow: "#fb923c60",
                title: "Constructive Feedback",
                desc: "Focus on teaching style, grading clarity, and academic support.",
              },
              {
                color: "#a78bfa",
                glow: "#a78bfa60",
                title: "Professionalism",
                desc: "No profanity, personal attacks, or discriminatory language.",
              },
              {
                color: "#34d399",
                glow: "#34d39960",
                title: "Your Anonymity is Sacred",
                desc: "Your identity is never stored, logged, or traceable — ever.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}
              >
                {/* Neon dot */}
                <span
                  style={{
                    marginTop: "5px",
                    flexShrink: 0,
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    background: item.color,
                    boxShadow: `0 0 10px 3px ${item.glow}`,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "rgba(241,245,249,0.95)",
                      marginBottom: "4px",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "rgba(203,213,225,0.65)",
                      lineHeight: 1.55,
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Professor List ── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "18px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "rgba(241,245,249,0.95)",
                letterSpacing: "-0.02em",
              }}
            >
              Browse Professors
            </h2>
            <span
              style={{
                padding: "5px 14px",
                borderRadius: "9999px",
                background: "rgba(99,102,241,0.2)",
                border: "1px solid rgba(99,102,241,0.35)",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#a5b4fc",
                letterSpacing: "0.04em",
              }}
            >
              {professors.length} professors
            </span>
          </div>

          {/* Glass wrapper for the list */}
          <div
            style={{
              background: "rgba(255,255,255,0.055)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.11)",
              borderRadius: "24px",
              padding: "28px",
              boxShadow:
                "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.09)",
            }}
          >
            <ProfessorList professors={professors} />
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          style={{
            textAlign: "center",
            paddingBottom: "24px",
            color: "rgba(148,163,184,0.45)",
            fontSize: "0.8rem",
            letterSpacing: "0.04em",
          }}
        >
          © 2026 NITK RateMyProf &nbsp;•&nbsp; Built by an ECE student
        </footer>
      </div>
    </main>
  );
}
