"use client";

// Last resort, for a failure in the root layout itself -- which is why it
// renders its own <html> and <body> and uses no app components or styles.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "12px" }}>
            Whealth is having trouble
          </h1>
          <p style={{ color: "#4b5563", marginBottom: "24px" }}>
            Please try again in a moment.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              background: "#111827",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error?.digest && (
            <p style={{ marginTop: "20px", fontSize: "12px", color: "#6b7280" }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
