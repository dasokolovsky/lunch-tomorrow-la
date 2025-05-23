import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

const USER_TABLE = "profiles";

// --- Type Definitions ---
interface MenuItemInOrder {
  id: number;
  name: string;
  quantity: number;
  price_cents?: number;
}

interface Order {
  id: number;
  user_id: string;
  menu_items: MenuItemInOrder[];
  order_date: string;
  delivery_window: string;
  address: string;
  tip_amount?: number;
  status: string;
  stripe_payment_id: string;
  created_at: string;
  lat?: string;
  lon?: string;
}

interface User {
  id: string;
  email?: string;
  full_name?: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<{ [id: string]: User }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");

  // Detail modal
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  // For status update
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  // Load orders and users
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      // Fetch orders
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (dateFilter) query = query.eq("order_date", dateFilter);
      if (statusFilter) query = query.eq("status", statusFilter);
      if (userFilter) query = query.eq("user_id", userFilter);

      const { data: ordersData, error: ordersError } = await query;
      if (ordersError) {
        setError(ordersError.message);
        setLoading(false);
        return;
      }
      setOrders((ordersData || []) as Order[]);

      // Fetch users for all unique user_ids
      const userIds = Array.from(new Set((ordersData || []).map((o: Order) => o.user_id)));
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from(USER_TABLE)
          .select("id,email,full_name")
          .in("id", userIds);
        const userMap: { [id: string]: User } = {};
        (usersData || []).forEach((u: User) => { userMap[u.id] = u; });
        setUsers(userMap);
      } else {
        setUsers({});
      }

      setLoading(false);
    }
    fetchData();
    // No need for eslint-disable-next-line here; dependencies are correct
  }, [dateFilter, statusFilter, userFilter]);

  // Unique users for filter dropdown
  const uniqueUsers = Object.values(users);

  // Unique statuses for filter dropdown
  const uniqueStatuses = Array.from(new Set(orders.map(o => o.status))).filter(Boolean);

  // Handle status update
  async function handleStatusChange(orderId: number, newStatus: string) {
    setUpdatingOrderId(orderId);
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    if (!updateError) {
      setOrders(orders => orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
    setUpdatingOrderId(null);
  }

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: 40 }}>
      <h1>Orders Admin</h1>

      {/* Filters */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <div>
          <label>Date:{" "}
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
            {dateFilter && <button onClick={() => setDateFilter("")}>✕</button>}
          </label>
        </div>
        <div>
          <label>Status:{" "}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {statusFilter && <button onClick={() => setStatusFilter("")}>✕</button>}
          </label>
        </div>
        <div>
          <label>User:{" "}
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
            >
              <option value="">All</option>
              {uniqueUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email || user.id}
                </option>
              ))}
            </select>
            {userFilter && <button onClick={() => setUserFilter("")}>✕</button>}
          </label>
        </div>
        <button onClick={() => { setDateFilter(""); setStatusFilter(""); setUserFilter(""); }}>
          Clear All Filters
        </button>
      </div>

      {error && <div style={{ color: "#c00", marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Date</th>
              <th>Delivery Window</th>
              <th>Address</th>
              <th>Tip</th>
              <th>Status</th>
              <th>Stripe Payment ID</th>
              <th>Menu Items</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{order.id}</td>
                <td>
                  {users[order.user_id]?.full_name || users[order.user_id]?.email || order.user_id}
                </td>
                <td>{order.order_date}</td>
                <td>{order.delivery_window}</td>
                <td>
                  {order.address}
                  {order.lat && order.lon && (
                    <span>
                      <br />
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${order.lat}&mlon=${order.lon}#map=18/${order.lat}/${order.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: "#0070f3" }}
                      >
                        Map
                      </a>
                    </span>
                  )}
                </td>
                <td>${order.tip_amount ?? 0}</td>
                <td>
                  {updatingOrderId === order.id
                    ? <span>Saving...</span>
                    : (
                      <select
                        value={order.status}
                        onChange={e => handleStatusChange(order.id, e.target.value)}
                        style={{ minWidth: 90 }}
                      >
                        {["paid", "preparing", "delivering", "delivered", "cancelled"].map(s =>
                          <option key={s} value={s}>{s}</option>
                        )}
                      </select>
                    )
                  }
                </td>
                <td style={{ fontSize: 12 }}>{order.stripe_payment_id}</td>
                <td>
                  <ul>
                    {order.menu_items && order.menu_items.map((item, idx) => (
                      <li key={idx}>
                        {item.name} x {item.quantity}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <button onClick={() => setViewOrder(order)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Order detail modal */}
      {viewOrder && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff", padding: 32, borderRadius: 8, maxWidth: 600, width: "90%"
          }}>
            <h2>Order #{viewOrder.id} Details</h2>
            <p><b>User:</b> {users[viewOrder.user_id]?.full_name || users[viewOrder.user_id]?.email || viewOrder.user_id}</p>
            <p><b>Date:</b> {viewOrder.order_date}</p>
            <p><b>Delivery Window:</b> {viewOrder.delivery_window}</p>
            <p><b>Address:</b> {viewOrder.address}</p>
            {viewOrder.lat && viewOrder.lon && (
              <p>
                <b>Lat/Lon:</b> {viewOrder.lat}, {viewOrder.lon}{" "}
                <a
                  href={`https://www.openstreetmap.org/?mlat=${viewOrder.lat}&mlon=${viewOrder.lon}#map=18/${viewOrder.lat}/${viewOrder.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "#0070f3" }}
                >
                  (Map)
                </a>
              </p>
            )}
            <p><b>Tip:</b> ${viewOrder.tip_amount ?? 0}</p>
            <p><b>Status:</b> {viewOrder.status}</p>
            <p><b>Stripe Payment ID:</b> {viewOrder.stripe_payment_id}</p>
            <div>
              <b>Menu Items:</b>
              <ul>
                {viewOrder.menu_items && viewOrder.menu_items.map((item, idx) => (
                  <li key={idx}>
                    {item.name} x {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
            <p><b>Created At:</b> {viewOrder.created_at}</p>
            <button onClick={() => setViewOrder(null)} style={{ marginTop: 16 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}