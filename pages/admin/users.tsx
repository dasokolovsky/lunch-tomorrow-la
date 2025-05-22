import { useEffect, useState } from "react";

type User = {
  id: string;
  phone: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/list-users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unknown error");
      setUsers((json.users || []).filter((u: User) => !!u.phone));
    } catch (err: any) {
      setError("Error fetching users: " + err.message);
      setUsers([]);
    }
    setLoading(false);
  }

  function handleSelect(id: string, checked: boolean) {
    setSelected(sel =>
      checked ? [...sel, id] : sel.filter(x => x !== id)
    );
  }

  function handleSelectAll(checked: boolean) {
    setSelectAll(checked);
    setSelected(checked ? users.map(u => u.id) : []);
  }

  async function handleSendSMS() {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const selectedUsers = users.filter(u => selected.includes(u.id));
      const phones = selectedUsers.map(u => u.phone).filter(Boolean);
      const res = await fetch("/api/send-sms-blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones, message })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send SMS");
      setSuccess("Messages sent!");
      setSelected([]);
      setSelectAll(false);
      setMessage("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
    setSending(false);
    setConfirmationOpen(false);
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "42px 2vw 80px 2vw",
        fontFamily: "system-ui, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh"
      }}
    >
      <h1 style={{ fontSize: 32, textAlign: "center", marginBottom: 18, letterSpacing: 1 }}>
        <span style={{ color: "#0070f3" }}>Admin</span>: Users
      </h1>
      <div style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 18px rgba(0,0,0,0.06)",
        padding: "0 0 12px 0",
        maxWidth: 600,
        margin: "0 auto"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }}>
          <thead>
            <tr style={{ background: "#f4f7fb" }}>
              <th style={{ padding: 12, borderBottom: "1px solid #e5e5e5" }}>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={e => handleSelectAll(e.target.checked)}
                  disabled={loading || users.length === 0}
                  aria-label="Select all users"
                />
              </th>
              <th style={{ padding: 12, borderBottom: "1px solid #e5e5e5", textAlign: "left" }}>
                Phone Number
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} style={{ textAlign: "center", color: "#888", padding: 44 }}>
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: "center", color: "#aaa", padding: 44 }}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td style={{ textAlign: "center", padding: 8 }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(u.id)}
                      onChange={e => handleSelect(u.id, e.target.checked)}
                    />
                  </td>
                  <td style={{ padding: 8 }}>{u.phone}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* SMS form */}
      <div style={{
        margin: "30px auto 0 auto",
        maxWidth: 600,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 18px rgba(0,0,0,0.06)",
        padding: "24px 24px 16px 24px"
      }}>
        <h2 style={{marginTop: 0, marginBottom: 16, fontSize: 22, color: "#0070f3"}}>Send SMS Blast</h2>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="Enter your message"
          style={{
            width: "100%",
            border: "1px solid #ddd",
            borderRadius: 6,
            padding: 10,
            fontSize: 16,
            marginBottom: 10,
            resize: "vertical"
          }}
        />
        <div style={{display: "flex", gap: 10, alignItems: "center"}}>
          <button
            disabled={selected.length === 0 || !message || sending}
            style={{
              background: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "9px 28px",
              fontWeight: 600,
              fontSize: 16,
              cursor: selected.length === 0 || !message || sending ? "not-allowed" : "pointer",
              opacity: selected.length === 0 || !message || sending ? 0.7 : 1
            }}
            onClick={() => setConfirmationOpen(true)}
          >
            Send SMS
          </button>
          <span style={{color: "#888", fontSize: 14}}>
            {selected.length} user{selected.length === 1 ? "" : "s"} selected
          </span>
        </div>
        {error && <div style={{ color: "#b00", background: "#ffeaea", padding: 10, borderRadius: 6, marginTop: 14 }}>{error}</div>}
        {success && <div style={{ color: "#0a7d26", background: "#eaffea", padding: 10, borderRadius: 6, marginTop: 14 }}>{success}</div>}
      </div>
      {/* Confirmation Dialog */}
      {confirmationOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.13)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#fff", borderRadius: 8, maxWidth: 400, width: "100%",
            padding: 24, boxShadow: "0 8px 48px rgba(0,0,0,0.08)", position: "relative"
          }}>
            <button
              aria-label="Close"
              onClick={() => setConfirmationOpen(false)}
              style={{
                position: "absolute", right: 16, top: 10, fontSize: 18, background: "none", border: "none", cursor: "pointer"
              }}
            >×</button>
            <h3 style={{ marginTop: 0, marginBottom: 18 }}>Confirm SMS Blast</h3>
            <div style={{marginBottom: 16}}>
              Send the following message to <b>{selected.length}</b> user{selected.length === 1 ? "" : "s"}?
              <div style={{
                margin: "18px 0",
                background: "#f6f6f6",
                borderRadius: 5,
                padding: 12,
                fontFamily: "monospace",
                whiteSpace: "pre-wrap"
              }}>
                {message}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmationOpen(false)}
                style={{ background: "#eee", border: "1px solid #ccc", borderRadius: 5, padding: "7px 18px", cursor: "pointer" }}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendSMS}
                style={{
                  background: "#0070f3", color: "#fff", border: "none", borderRadius: 5,
                  padding: "7px 18px", fontWeight: 600, cursor: "pointer"
                }}
                disabled={sending}
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}