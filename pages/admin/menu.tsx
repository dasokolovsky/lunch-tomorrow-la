import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

type MenuItem = {
  id: number;
  menu_id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  position: number;
  menus: { date: string };
};

const emptyForm = {
  id: null as number | null,
  menu_date: "",
  name: "",
  description: "",
  price_cents: "",
  image_url: "",
};

export default function AdminMenuTablePage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch all menu items with their menu date
  async function fetchItems() {
    setLoading(true);
    setError(null);
    let query = supabase
      .from("menu_items")
      .select("id,menu_id,name,description,price_cents,image_url,position,menus(date)");
    if (filterDate) {
      query = query.eq("menus.date", filterDate);
    }
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
      setError("Error loading menu items: " + error.message);
      setItems([]);
    } else {
      // Sort by date descending (latest first), then by position ascending
      const sorted = (data ?? [])
        .sort((a, b) => {
          const dateDiff = b.menus.date.localeCompare(a.menus.date);
          if (dateDiff !== 0) return dateDiff;
          return (a.position ?? 0) - (b.position ?? 0);
        });
      setItems(sorted);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line
  }, [filterDate, search]);

  // Open modal for new item
  function openAddModal() {
    setForm({ ...emptyForm });
    setModalOpen(true);
    setEditRowId(null);
    setError(null);
  }

  // Open modal for editing item
  function openEditModal(item: MenuItem) {
    setForm({
      id: item.id,
      menu_date: item.menus.date,
      name: item.name,
      description: item.description,
      price_cents: String(item.price_cents),
      image_url: item.image_url ?? "",
    });
    setModalOpen(true);
    setEditRowId(item.id);
    setError(null);
  }

  // Handle save (add or update)
  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    // Validation
    if (!form.menu_date || !form.name || !form.price_cents) {
      setError("Menu date, name, and price are required.");
      setSaving(false);
      return;
    }
    if (!/^\d+$/.test(form.price_cents)) {
      setError("Price must be a number of cents (e.g., 500 for $5.00).");
      setSaving(false);
      return;
    }
    // Find or create menu for date
    let menuId: number | null = null;
    const { data: foundMenus, error: findMenuErr } = await supabase
      .from("menus")
      .select("id")
      .eq("date", form.menu_date)
      .limit(1);
    if (findMenuErr) {
      setError("Error finding menu: " + findMenuErr.message);
      setSaving(false);
      return;
    }
    if (foundMenus && foundMenus.length > 0) {
      menuId = foundMenus[0].id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("menus")
        .insert([{ date: form.menu_date }])
        .select("id");
      if (createErr) {
        setError("Error creating menu for date: " + createErr.message);
        setSaving(false);
        return;
      }
      menuId = created?.[0]?.id ?? null;
    }
    if (!menuId) {
      setError("Could not find or create menu for that date.");
      setSaving(false);
      return;
    }

    // Find next position for this menu_id
    let nextPosition = 1;
    if (!form.id) {
      const { data: maxPosData, error: posErr } = await supabase
        .from("menu_items")
        .select("position")
        .eq("menu_id", menuId)
        .order("position", { ascending: false })
        .limit(1);
      if (!posErr && maxPosData && maxPosData.length > 0) {
        nextPosition = (maxPosData[0].position ?? 0) + 1;
      }
    }

    // Insert or update menu item
    if (!form.id) {
      const { error: insertErr } = await supabase.from("menu_items").insert([{
        menu_id: menuId,
        name: form.name,
        description: form.description,
        price_cents: Number(form.price_cents),
        image_url: form.image_url,
        position: nextPosition, // Always set position for new item
      }]);
      if (insertErr) {
        setError("Error adding item: " + insertErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: updateErr } = await supabase
        .from("menu_items")
        .update({
          menu_id: menuId,
          name: form.name,
          description: form.description,
          price_cents: Number(form.price_cents),
          image_url: form.image_url,
        })
        .eq("id", form.id);
      if (updateErr) {
        setError("Error updating item: " + updateErr.message);
        setSaving(false);
        return;
      }
    }
    setModalOpen(false);
    setEditRowId(null);
    setForm({ ...emptyForm });
    setSaving(false);
    fetchItems();
  }

  // Delete an item
  async function handleDelete(id: number) {
    if (!window.confirm("Delete this menu item?")) return;
    const { error: delErr } = await supabase.from("menu_items").delete().eq("id", id);
    if (delErr) {
      setError("Error deleting item: " + delErr.message);
      return;
    }
    fetchItems();
  }

  // Table render helpers
  function renderRow(item: MenuItem) {
    return (
      <tr key={item.id}>
        <td style={{ fontFamily: "monospace", fontSize: 15 }}>{item.menus.date}</td>
        <td>{item.name}</td>
        <td>{item.description}</td>
        <td style={{ textAlign: "right" }}>${(item.price_cents / 100).toFixed(2)}</td>
        <td>
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 4, border: "1px solid #eee" }}
              onError={e => (e.currentTarget.style.display = "none")}
            />
          ) : null}
        </td>
        <td>
          <button
            style={{ marginRight: 6 }}
            title="Edit"
            onClick={() => openEditModal(item)}
          >✏️</button>
          <button
            title="Delete"
            style={{ color: "#c00" }}
            onClick={() => handleDelete(item.id)}
          >🗑️</button>
        </td>
      </tr>
    );
  }

  // Modal form for add/edit
  function renderModal() {
    if (!modalOpen) return null;
    return (
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
            onClick={() => setModalOpen(false)}
            style={{
              position: "absolute", right: 16, top: 10, fontSize: 18, background: "none", border: "none", cursor: "pointer"
            }}
          >×</button>
          <h3 style={{ marginTop: 0, marginBottom: 18 }}>
            {form.id ? "Edit Menu Item" : "Add Menu Item"}
          </h3>
          <form onSubmit={handleSave} autoComplete="off">
            <label style={{ display: "block", marginBottom: 10 }}>
              Menu Date:
              <input
                type="date"
                value={form.menu_date}
                onChange={e => setForm(f => ({ ...f, menu_date: e.target.value }))}
                required
                style={{ width: "100%", marginTop: 2, padding: 7, borderRadius: 4, border: "1px solid #ccc" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 10 }}>
              Name:
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                style={{ width: "100%", marginTop: 2, padding: 7, borderRadius: 4, border: "1px solid #ccc" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 10 }}>
              Description:
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: "100%", marginTop: 2, padding: 7, borderRadius: 4, border: "1px solid #ccc" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 10 }}>
              Price (cents):
              <input
                type="number"
                min={0}
                value={form.price_cents}
                onChange={e => setForm(f => ({ ...f, price_cents: e.target.value }))}
                required
                style={{ width: "100%", marginTop: 2, padding: 7, borderRadius: 4, border: "1px solid #ccc" }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 16 }}>
              Image URL:
              <input
                value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                style={{ width: "100%", marginTop: 2, padding: 7, borderRadius: 4, border: "1px solid #ccc" }}
              />
            </label>
            {error && (
              <div style={{ color: "#b00", background: "#ffeaea", padding: 8, borderRadius: 4, marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "#eee", border: "1px solid #ccc", borderRadius: 5, padding: "7px 18px", cursor: "pointer" }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: "#0070f3", color: "#fff", border: "none", borderRadius: 5,
                  padding: "7px 18px", fontWeight: 600, cursor: "pointer"
                }}
                disabled={saving}
              >
                {form.id ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Distinct menu dates for filtering
  const allDates = Array.from(new Set(items.map(i => i.menus.date))).sort((a, b) => b.localeCompare(a));

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
        <span style={{ color: "#0070f3" }}>Admin</span>: Menu Items
      </h1>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        maxWidth: 940, margin: "0 auto 24px auto", flexWrap: "wrap", gap: 14
      }}>
        <button
          style={{
            background: "#0070f3", color: "#fff", border: "none", borderRadius: 6,
            fontWeight: 600, fontSize: 16, padding: "11px 28px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,32,128,0.08)"
          }}
          onClick={openAddModal}
        >
          + Add Menu Item
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label>
            <span style={{ fontSize: 14, color: "#555", marginRight: 5 }}>Filter by Date:</span>
            <select
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={{ padding: "7px 14px", borderRadius: 5, border: "1px solid #ccc" }}
            >
              <option value="">All Dates</option>
              {allDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </label>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "7px 14px", borderRadius: 5, border: "1px solid #ccc", minWidth: 180
            }}
          />
        </div>
      </div>
      <div style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 18px rgba(0,0,0,0.06)",
        padding: "0 0 12px 0",
        maxWidth: 960,
        margin: "0 auto"
      }}>
        <table style={{
          width: "100%", borderCollapse: "collapse", fontSize: 16
        }}>
          <thead>
            <tr style={{ background: "#f4f7fb" }}>
              <th style={{ padding: "12px 10px", borderBottom: "1px solid #e5e5e5", textAlign: "left" }}>Date</th>
              <th style={{ padding: "12px 10px", borderBottom: "1px solid #e5e5e5", textAlign: "left" }}>Name</th>
              <th style={{ padding: "12px 10px", borderBottom: "1px solid #e5e5e5", textAlign: "left" }}>Description</th>
              <th style={{ padding: "12px 10px", borderBottom: "1px solid #e5e5e5", textAlign: "right" }}>Price</th>
              <th style={{ padding: "12px 10px", borderBottom: "1px solid #e5e5e5", textAlign: "center" }}>Image</th>
              <th style={{ padding: "12px 10px", borderBottom: "1px solid #e5e5e5" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#888", padding: 44 }}>
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#aaa", padding: 44 }}>
                  No menu items found.
                </td>
              </tr>
            ) : (
              items.map(renderRow)
            )}
          </tbody>
        </table>
        {error && (
          <div style={{
            color: "#b00", background: "#ffeaea", padding: 12, borderRadius: 6, margin: "20px auto 0 auto", maxWidth: 500, textAlign: "center"
          }}>
            {error}
          </div>
        )}
      </div>
      {renderModal()}
    </div>
  );
}