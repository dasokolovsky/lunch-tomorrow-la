import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { cleanAddressForDisplay } from "@/utils/addressDisplay";

const USER_TABLE = "profiles";

type OrderStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

type Order = {
  id: number;
  user_id: string;
  menu_items: any[];
  order_date: string;
  delivery_window: string;
  address: string;
  tip_amount?: number;
  delivery_fee?: number;
  service_fee?: number;
  tax_amount?: number;
  total_amount?: number;
  status: OrderStatus;
  stripe_payment_id: string;
  created_at: string;
  updated_at?: string;
  lat?: string;
  lon?: string;
  delivery_notes?: string;
  [key: string]: any;
};

type User = {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  [key: string]: any;
};

type SortField = 'id' | 'created_at' | 'order_date' | 'status' | 'total_amount' | 'user_name';
type SortDirection = 'asc' | 'desc';

const ORDER_STATUSES: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  { value: 'paid', label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  { value: 'preparing', label: 'Preparing', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ready', label: 'Ready', color: 'bg-purple-100 text-purple-800' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'refunded', label: 'Refunded', color: 'bg-orange-100 text-orange-800' },
];

export default function AdminOrdersPage() {
  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<{[id: string]: User}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNewOrders, setHasNewOrders] = useState(false);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [quickFilter, setQuickFilter] = useState<string>("");

  // Sorting and pagination
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('ordersPageSize') || '25');
    }
    return 25;
  });

  // Modals and selections
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  // const [showBulkActions, setShowBulkActions] = useState(false);
  const [showOrderLabel, setShowOrderLabel] = useState<Order | null>(null);

  // Status updates
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Save page size preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ordersPageSize', pageSize.toString());
    }
  }, [pageSize]);

  // Fetch orders with all filters applied
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query with filters
      let query = supabase
        .from("orders")
        .select("*")
        .order(sortField === 'user_name' ? 'created_at' : sortField, {
          ascending: sortDirection === 'asc'
        });

      // Apply filters
      if (dateFromFilter) query = query.gte("order_date", dateFromFilter);
      if (dateToFilter) query = query.lte("order_date", dateToFilter);
      if (statusFilter) query = query.eq("status", statusFilter);

      // Quick filters
      if (quickFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq("order_date", today);
      } else if (quickFilter === 'pending') {
        query = query.in("status", ['pending', 'paid', 'confirmed']);
      } else if (quickFilter === 'active') {
        query = query.in("status", ['preparing', 'ready', 'out_for_delivery']);
      }

      const { data: ordersData, error: ordersError } = await query;
      if (ordersError) throw ordersError;

      setOrders(ordersData || []);

      // Fetch users for all unique user_ids
      const userIds = Array.from(new Set((ordersData || []).map((o: Order) => o.user_id)));
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from(USER_TABLE)
          .select("id,email,full_name,phone")
          .in("id", userIds);
        const userMap: {[id: string]: User} = {};
        (usersData || []).forEach((u: User) => { userMap[u.id] = u; });
        setUsers(userMap);
      } else {
        setUsers({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDirection, dateFromFilter, dateToFilter, statusFilter, quickFilter]);

  // Load data on mount and filter changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const user = users[order.user_id];
        const userName = user?.full_name || user?.email || '';
        const orderItems = order.menu_items?.map(item => item.name).join(' ') || '';

        return (
          order.id.toString().includes(query) ||
          userName.toLowerCase().includes(query) ||
          order.address.toLowerCase().includes(query) ||
          order.stripe_payment_id.toLowerCase().includes(query) ||
          orderItems.toLowerCase().includes(query)
        );
      });
    }

    // Sort orders
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'user_name':
          aValue = users[a.user_id]?.full_name || users[a.user_id]?.email || '';
          bValue = users[b.user_id]?.full_name || users[b.user_id]?.email || '';
          break;
        case 'total_amount':
          aValue = calculateOrderTotal(a);
          bValue = calculateOrderTotal(b);
          break;
        default:
          aValue = a[sortField];
          bValue = b[sortField];
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orders, users, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate order total
  const calculateOrderTotal = (order: Order): number => {
    const itemsTotal = order.menu_items?.reduce((sum, item) =>
      sum + (item.price_cents * item.quantity), 0) || 0;
    const tip = (order.tip_amount || 0) * 100;
    const deliveryFee = (order.delivery_fee || 0) * 100;
    const serviceFee = (order.service_fee || 0) * 100;
    const tax = (order.tax_amount || 0) * 100;

    return (itemsTotal + tip + deliveryFee + serviceFee + tax) / 100;
  };

  // Handle status update
  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (!error) {
        setOrders(orders => orders.map(o =>
          o.id === orderId ? {...o, status: newStatus} : o
        ));
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Additional handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(paginatedOrders.map(o => o.id)));
    } else {
      setSelectedOrders(new Set());
    }
  };

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    const newSelected = new Set(selectedOrders);
    if (checked) {
      newSelected.add(orderId);
    } else {
      newSelected.delete(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFromFilter("");
    setDateToFilter("");
    setStatusFilter("");
    setQuickFilter("");
    setCurrentPage(1);
  };

  const getStatusConfig = (status: OrderStatus) => {
    return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                <span className="text-blue-600">Orders</span> Management
              </h1>
              <p className="mt-2 text-gray-600">
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* New Orders Notification */}
            {hasNewOrders && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">New orders available</span>
                  <button
                    onClick={() => {
                      fetchOrders();
                      setHasNewOrders(false);
                    }}
                    className="text-green-600 hover:text-green-800 text-sm underline"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Quick Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { key: '', label: 'All Orders' },
            { key: 'today', label: "Today's Deliveries" },
            { key: 'pending', label: 'Pending Orders' },
            { key: 'active', label: 'Active Orders' },
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setQuickFilter(filter.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                quickFilter === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders, customers, addresses..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Delivery Date</label>
              <input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Delivery Date</label>
              <input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                {ORDER_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {/* Page Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Per Page</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end space-x-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={() => {
                  const csvData = filteredOrders.map(order => {
                    const user = users[order.user_id];
                    const items = order.menu_items?.map(item => `${item.name} (${item.quantity})`).join('; ') || '';
                    return [
                      order.id,
                      user?.full_name || '',
                      user?.phone || '',
                      user?.email || '',
                      order.order_date, // Delivery date
                      order.delivery_window,
                      cleanAddressForDisplay(order.address),
                      items,
                      `$${calculateOrderTotal(order).toFixed(2)}`,
                      order.status,
                      order.stripe_payment_id,
                      new Date(order.created_at).toLocaleDateString() // Actual order creation date
                    ];
                  });

                  const headers = ['Order ID', 'Customer', 'Phone', 'Email', 'Delivery Date', 'Delivery Window', 'Address', 'Items', 'Total', 'Status', 'Payment ID', 'Order Created'];
                  const csvContent = [headers, ...csvData]
                    .map(row => row.map(field => `"${field}"`).join(','))
                    .join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading orders...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Bulk Actions Bar */}
              {selectedOrders.size > 0 && (
                <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700 font-medium">
                      {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex space-x-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setBulkUpdating(true);
                            Promise.all(
                              Array.from(selectedOrders).map(orderId =>
                                handleStatusChange(orderId, e.target.value as OrderStatus)
                              )
                            ).finally(() => {
                              setBulkUpdating(false);
                              setSelectedOrders(new Set());
                            });
                          }
                        }}
                        className="px-3 py-1 text-sm border border-blue-300 rounded-lg"
                        disabled={bulkUpdating}
                      >
                        <option value="">Update Status...</option>
                        {ORDER_STATUSES.map(status => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setSelectedOrders(new Set())}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('id')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Order ID</span>
                          {sortField === 'id' && (
                            <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('user_name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Customer</span>
                          {sortField === 'user_name' && (
                            <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('order_date')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Delivery Date</span>
                          {sortField === 'order_date' && (
                            <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('total_amount')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Total</span>
                          {sortField === 'total_amount' && (
                            <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          {sortField === 'status' && (
                            <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-lg font-medium">No orders found</p>
                            <p className="text-sm">Try adjusting your search or filter criteria</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map((order) => {
                        const user = users[order.user_id];
                        const statusConfig = getStatusConfig(order.status);
                        const total = calculateOrderTotal(order);

                        return (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedOrders.has(order.id)}
                                onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{order.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {user?.full_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user?.email}
                              </div>
                              {user?.phone && (
                                <div className="text-sm text-gray-500">
                                  {user.phone}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{order.order_date}</div>
                              <div className="text-sm text-gray-500">{order.delivery_window}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {order.menu_items?.slice(0, 2).map((item, idx) => (
                                  <div key={idx}>
                                    {item.name} × {item.quantity}
                                  </div>
                                ))}
                                {order.menu_items?.length > 2 && (
                                  <div className="text-gray-500">
                                    +{order.menu_items.length - 2} more
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${total.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {updatingOrderId === order.id ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                  <span className="text-sm text-gray-500">Updating...</span>
                                </div>
                              ) : (
                                <select
                                  value={order.status}
                                  onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                  className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${statusConfig.color}`}
                                >
                                  {ORDER_STATUSES.map(status => (
                                    <option key={status.value} value={status.value}>{status.label}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setViewOrder(order)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => setShowOrderLabel(order)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Label
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {paginatedOrders.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-lg font-medium">No orders found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  </div>
                ) : (
                  paginatedOrders.map((order) => {
                    const user = users[order.user_id];
                    const statusConfig = getStatusConfig(order.status);
                    const total = calculateOrderTotal(order);

                    return (
                      <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.id)}
                              onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">Order #{order.id}</h3>
                              <p className="text-xs text-gray-500">{user?.full_name || 'Unknown'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">${total.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{order.order_date}</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Delivery:</span>
                            <span className="text-gray-900">{order.delivery_window}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Items:</span>
                            <span className="text-gray-900">
                              {order.menu_items?.slice(0, 1).map(item => item.name).join(', ')}
                              {order.menu_items?.length > 1 && ` +${order.menu_items.length - 1} more`}
                            </span>
                          </div>
                          {user?.phone && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Phone:</span>
                              <span className="text-gray-900">{user.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {updatingOrderId === order.id ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                <span className="text-sm text-gray-500">Updating...</span>
                              </div>
                            ) : (
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${statusConfig.color}`}
                              >
                                {ORDER_STATUSES.map(status => (
                                  <option key={status.value} value={status.value}>{status.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setViewOrder(order)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => setShowOrderLabel(order)}
                              className="text-green-600 hover:text-green-900 text-sm font-medium"
                            >
                              Label
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-6 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>

                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm border rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Order Detail Modal */}
        {viewOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{viewOrder.id} Details
                  </h3>
                  <button
                    onClick={() => setViewOrder(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Customer Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div><span className="font-medium">Name:</span> {users[viewOrder.user_id]?.full_name || 'Unknown'}</div>
                    <div><span className="font-medium">Email:</span> {users[viewOrder.user_id]?.email || 'N/A'}</div>
                    {users[viewOrder.user_id]?.phone && (
                      <div><span className="font-medium">Phone:</span> {users[viewOrder.user_id].phone}</div>
                    )}
                  </div>
                </div>

                {/* Order Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div><span className="font-medium">Delivery Date:</span> {viewOrder.order_date}</div>
                    <div><span className="font-medium">Delivery Window:</span> {viewOrder.delivery_window}</div>
                    <div><span className="font-medium">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusConfig(viewOrder.status).color}`}>
                        {getStatusConfig(viewOrder.status).label}
                      </span>
                    </div>
                    <div><span className="font-medium">Created:</span> {new Date(viewOrder.created_at).toLocaleString()}</div>
                  </div>
                </div>

                {/* Delivery Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Delivery Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div><span className="font-medium">Address:</span> {cleanAddressForDisplay(viewOrder.address)}</div>
                    {viewOrder.lat && viewOrder.lon && (
                      <div>
                        <span className="font-medium">Location:</span> {viewOrder.lat}, {viewOrder.lon}
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${viewOrder.lat}&mlon=${viewOrder.lon}#map=18/${viewOrder.lat}/${viewOrder.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Map
                        </a>
                      </div>
                    )}
                    {viewOrder.delivery_notes && (
                      <div><span className="font-medium">Notes:</span> {viewOrder.delivery_notes}</div>
                    )}
                  </div>
                </div>

                {/* Menu Items */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Menu Items</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {viewOrder.menu_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                        </div>
                        <div className="font-medium">${((item.price_cents * item.quantity) / 100).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Payment Information</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${((viewOrder.menu_items?.reduce((sum, item) => sum + (item.price_cents * item.quantity), 0) || 0) / 100).toFixed(2)}</span>
                    </div>
                    {viewOrder.tip_amount && (
                      <div className="flex justify-between">
                        <span>Tip:</span>
                        <span>${viewOrder.tip_amount.toFixed(2)}</span>
                      </div>
                    )}
                    {viewOrder.delivery_fee && (
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span>${viewOrder.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {viewOrder.service_fee && (
                      <div className="flex justify-between">
                        <span>Service Fee:</span>
                        <span>${viewOrder.service_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {viewOrder.tax_amount && (
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>${viewOrder.tax_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                      <span>Total:</span>
                      <span>${calculateOrderTotal(viewOrder).toFixed(2)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Payment ID:</span> {viewOrder.stripe_payment_id}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Label Modal */}
        {showOrderLabel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order Label #{showOrderLabel.id}
                  </h3>
                  <button
                    onClick={() => setShowOrderLabel(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white" style={{ fontFamily: 'monospace' }}>
                  <div className="text-2xl font-bold mb-2">ORDER #{showOrderLabel.id}</div>
                  <div className="text-lg font-semibold mb-4">{users[showOrderLabel.user_id]?.full_name || 'Unknown Customer'}</div>
                  <div className="text-sm space-y-1 mb-4">
                    <div><strong>Delivery:</strong> {showOrderLabel.order_date}</div>
                    <div><strong>Window:</strong> {showOrderLabel.delivery_window}</div>
                    <div><strong>Phone:</strong> {users[showOrderLabel.user_id]?.phone || 'N/A'}</div>
                  </div>
                  <div className="text-sm border-t border-gray-300 pt-4">
                    <div className="font-semibold mb-2">ITEMS:</div>
                    {showOrderLabel.menu_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.name}</span>
                        <span>x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm border-t border-gray-300 pt-4 mt-4">
                    <div><strong>Address:</strong></div>
                    <div className="text-xs">{cleanAddressForDisplay(showOrderLabel.address)}</div>
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Print Label
                  </button>
                  <button
                    onClick={() => setShowOrderLabel(null)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
