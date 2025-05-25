import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";
import ImageUpload from "@/components/admin/ImageUpload";


type MenuItem = {
  id: number;
  menu_id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  position: number;
  menus: { date: string }[];
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
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch all menu items with their menu date
  async function fetchItems() {
    setLoading(true);
    setError(null);

    // Fetch menu items and menus separately, then join manually
    const { data: menuItemsData, error: menuItemsError } = await supabase
      .from("menu_items")
      .select("*");

    if (menuItemsError) {
      setError("Error loading menu items: " + menuItemsError.message);
      setItems([]);
      setLoading(false);
      return;
    }

    // Fetch all menus
    const { data: menusData, error: menusError } = await supabase
      .from("menus")
      .select("*");

    if (menusError) {
      setError("Error loading menus: " + menusError.message);
      setItems([]);
      setLoading(false);
      return;
    }

    // Manually join the data
    const itemsWithMenus = (menuItemsData || []).map(item => {
      const menu = menusData?.find(m => m.id === item.menu_id);
      return {
        ...item,
        menus: menu ? [{ date: menu.date }] : []
      };
    });

    // Apply filters
    let filteredItems = itemsWithMenus;
    if (filterDate) {
      filteredItems = filteredItems.filter(item => item.menus[0]?.date === filterDate);
    }
    if (search) {
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort by date descending (latest first), then by position ascending
    const sorted = filteredItems.sort((a, b) => {
      const dateA = a.menus?.[0]?.date || "";
      const dateB = b.menus?.[0]?.date || "";
      const dateDiff = dateB.localeCompare(dateA);
      if (dateDiff !== 0) return dateDiff;
      return (a.position ?? 0) - (b.position ?? 0);
    });

    setItems(sorted as MenuItem[]);
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
    setUploadError(null);
  }

  // Open modal for editing item
  function openEditModal(item: MenuItem) {
    setForm({
      id: item.id,
      menu_date: item.menus[0]?.date || "",
      name: item.name,
      description: item.description,
      price_cents: String(item.price_cents),
      image_url: item.image_url ?? "",
    });
    setModalOpen(true);
    setEditRowId(item.id);
    setError(null);
    setUploadError(null);
  }

  // Handle save (add or update)
  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);

    // Enhanced validation with specific error messages
    const errors: string[] = [];

    if (!form.menu_date.trim()) {
      errors.push("Menu date is required");
    }
    if (!form.name.trim()) {
      errors.push("Item name is required");
    }
    if (!form.price_cents.trim()) {
      errors.push("Price is required");
    } else if (!/^\d+$/.test(form.price_cents)) {
      errors.push("Price must be a whole number in cents (e.g., 500 for $5.00)");
    } else if (parseInt(form.price_cents) <= 0) {
      errors.push("Price must be greater than 0");
    }

    if (errors.length > 0) {
      setError(errors.join(". "));
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
    const menuDate = item.menus?.[0]?.date || "No date";
    return (
      <tr
        key={item.id}
        className={`hover:bg-gray-50 transition-colors ${editRowId === item.id ? 'bg-blue-50' : ''}`}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-sm font-mono text-gray-600">{menuDate}</span>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm font-medium text-gray-900">{item.name}</div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-600 max-w-xs truncate" title={item.description}>
            {item.description || <span className="text-gray-400 italic">No description</span>}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <span className="text-sm font-semibold text-gray-900">
            ${(item.price_cents / 100).toFixed(2)}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          {item.image_url ? (
            <div className="flex justify-center">
              <Image
                src={item.image_url}
                alt={item.name}
                width={40}
                height={40}
                className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                onError={e => (e.currentTarget.style.display = "none")}
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => openEditModal(item)}
              className="inline-flex items-center p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit item"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              className="inline-flex items-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete item"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // Modal form for add/edit
  function renderModal() {
    if (!modalOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {form.id ? "Edit Menu Item" : "Add Menu Item"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
            <form onSubmit={handleSave} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Menu Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.menu_date}
                  onChange={e => setForm(f => ({ ...f, menu_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Grilled Chicken Sandwich"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of the item..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.price_cents}
                  onChange={e => setForm(f => ({ ...f, price_cents: e.target.value }))}
                  placeholder="500"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter price in cents (e.g., 500 = $5.00)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Item Image <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <ImageUpload
                  currentImageUrl={form.image_url}
                  onImageUploaded={(imageUrl) => {
                    setForm(f => ({ ...f, image_url: imageUrl }));
                    setUploadError(null);
                  }}
                  onError={(error) => setUploadError(error)}
                />
                {uploadError && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                    {uploadError}
                  </div>
                )}

                {/* Fallback URL input */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Or enter image URL manually:
                  </label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Please fix the following:</h4>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="menu-item-form"
                disabled={saving}
                onClick={handleSave}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  form.id ? "Save Changes" : "Add Item"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Distinct menu dates for filtering
  const allDates = Array.from(new Set(items.map(i => i.menus?.[0]?.date).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            <span className="text-blue-600">Admin</span> Menu Management
          </h1>
          <p className="mt-2 text-gray-600">Manage your daily menu items and pricing</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Add Button */}
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Menu Item
            </button>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter by Date:</label>
                <select
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Dates</option>
                  {allDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading menu items...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items found</h3>
              <p className="text-gray-600 mb-4">
                {search || filterDate ? "Try adjusting your filters" : "Get started by adding your first menu item"}
              </p>
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Menu Item
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Image</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map(renderRow)}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {items.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      {/* Image */}
                      <div className="flex-shrink-0">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            width={60}
                            height={60}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            onError={e => (e.currentTarget.style.display = "none")}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                            <p className="text-xs text-gray-500 font-mono mt-1">
                              {item.menus?.[0]?.date || "No date"}
                            </p>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                            )}
                            <p className="text-lg font-semibold text-gray-900 mt-2">
                              ${(item.price_cents / 100).toFixed(2)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete item"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && (
            <div className="mx-6 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {renderModal()}
      </div>
    </div>
  );
}