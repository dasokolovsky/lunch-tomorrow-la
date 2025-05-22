import Link from "next/link";

export default function SuccessPage() {
  return (
    <div style={{
      maxWidth: 500,
      margin: "60px auto",
      padding: "36px 24px",
      background: "#f8fff4",
      borderRadius: 12,
      boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
      fontFamily: "system-ui,sans-serif",
      textAlign: "center"
    }}>
      <h1 style={{ color: "#1a9007", fontSize: 40, marginBottom: 12 }}>
        🎉 Order Placed!
      </h1>
      <p style={{ fontSize: 20, marginBottom: 24 }}>
        Thank you for your order.<br />
        You’ll receive a confirmation SMS soon.
      </p>
      <Link href="/menu">
        <button
          style={{
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "14px 38px",
            fontWeight: 600,
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          Back to Menu
        </button>
      </Link>
    </div>
  );
}