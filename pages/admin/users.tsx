import { useEffect, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  PhoneIcon,
  // EnvelopeIcon,
  MapPinIcon,
  ShoppingBagIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { getBestAddressForDisplay } from '@/utils/addressDisplay';

type User = {
  id: string;
  phone: string | null;
  email?: string | null;
  full_name?: string | null;
  created_at?: string;
  last_sign_in_at?: string;
  profile?: {
    full_name?: string;
    email?: string;
    phone?: string;
    created_at?: string;
  };
  stats?: {
    order_count: number;
    total_spent: number;
    last_order_date?: string;
    address_count: number;
  };
  recent_orders?: Array<{
    id: number;
    order_date: string;
    total_amount: number;
    status: string;
    delivery_window: string;
  }>;
  addresses?: Array<{
    id: string;
    display_name: string;
    is_primary: boolean;
    created_at: string;
  }>;
};

type UserAnalytics = {
  total_users: number;
  new_users_this_month: number;
  active_users: number;
  vip_users: number;
  growth_rate: number;
  avg_orders_per_user: number;
  avg_spent_per_user: number;
  conversion_rate?: number;
};

type SMSTemplate = {
  id: string;
  name: string;
  message: string;
  category: 'welcome' | 'reminder' | 'promotion' | 'reengagement' | 'announcement';
};

export default function AdminUsersPage() {
  // Core state
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'sms'>('overview');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'active' | 'new' | 'vip' | 'inactive'>('all');

  // SMS state
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [smsTemplates, setSmsTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [smsTarget, setSmsTarget] = useState<'selected' | 'filtered' | 'all'>('selected');

  // Analytics state
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAnalytics();
    loadSmsTemplates();
    loadUserPreferences();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, filterType, applyFilters]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users-comprehensive");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unknown error");
      setUsers(json.users || []);
    } catch (err) {
      setError("Error fetching users: " + (err instanceof Error ? err.message : String(err)));
      setUsers([]);
    }
    setLoading(false);
  }

  async function fetchAnalytics() {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/admin/user-analytics");
      const json = await res.json();
      if (res.ok) {
        setAnalytics(json);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    }
    setAnalyticsLoading(false);
  }

  async function loadSmsTemplates() {
    try {
      const res = await fetch("/api/admin/sms-templates");
      const json = await res.json();
      if (res.ok) {
        setSmsTemplates(json.templates || []);
      }
    } catch (err) {
      console.error("Error loading SMS templates:", err);
    }
  }

  function loadUserPreferences() {
    const savedUsersPerPage = localStorage.getItem('admin-users-per-page');
    if (savedUsersPerPage) {
      setUsersPerPage(parseInt(savedUsersPerPage));
    }
  }

  function applyFilters() {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.phone?.includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.full_name?.toLowerCase().includes(term) ||
        user.profile?.full_name?.toLowerCase().includes(term) ||
        user.profile?.email?.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

    switch (filterType) {
      case 'active':
        filtered = filtered.filter(user =>
          user.stats?.last_order_date &&
          new Date(user.stats.last_order_date) > fortyFiveDaysAgo
        );
        break;
      case 'new':
        filtered = filtered.filter(user =>
          user.created_at &&
          new Date(user.created_at) > thirtyDaysAgo
        );
        break;
      case 'vip':
        filtered = filtered.filter(user =>
          (user.stats?.total_spent || 0) >= 300 ||
          (user.stats?.order_count || 0) >= 8
        );
        break;
      case 'inactive':
        filtered = filtered.filter(user =>
          !user.stats?.last_order_date ||
          new Date(user.stats.last_order_date) <= fortyFiveDaysAgo
        );
        break;
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }

  function handleSelect(id: string, checked: boolean) {
    setSelected(sel =>
      checked ? [...sel, id] : sel.filter(x => x !== id)
    );
  }

  function handleSelectAll(checked: boolean) {
    setSelectAll(checked);
    const currentPageUsers = getCurrentPageUsers();
    setSelected(checked ? currentPageUsers.map(u => u.id) : []);
  }

  function toggleExpandRow(userId: string) {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      // Load detailed user data if not already loaded
      loadUserDetails(userId);
    }
    setExpandedRows(newExpanded);
  }

  async function loadUserDetails(userId: string) {
    try {
      const res = await fetch(`/api/admin/user-details/${userId}`);
      const json = await res.json();
      if (res.ok) {
        // Update the user in the users array with detailed data
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId
              ? { ...user, recent_orders: json.recent_orders, addresses: json.addresses }
              : user
          )
        );
      }
    } catch (err) {
      console.error("Error loading user details:", err);
    }
  }

  function getCurrentPageUsers() {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }

  function getTotalPages() {
    return Math.ceil(filteredUsers.length / usersPerPage);
  }

  function handleUsersPerPageChange(newValue: number) {
    setUsersPerPage(newValue);
    setCurrentPage(1);
    localStorage.setItem('admin-users-per-page', newValue.toString());
  }

  function getUserTier(user: User): 'VIP' | 'Regular' | 'New' {
    if ((user.stats?.total_spent || 0) >= 300 || (user.stats?.order_count || 0) >= 8) {
      return 'VIP';
    }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (user.created_at && new Date(user.created_at) > thirtyDaysAgo) {
      return 'New';
    }
    return 'Regular';
  }

  function formatDate(dateString?: string) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatCurrency(amount?: number) {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  async function handleSendSMS() {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      let targetUsers: User[] = [];

      switch (smsTarget) {
        case 'selected':
          targetUsers = users.filter(u => selected.includes(u.id));
          break;
        case 'filtered':
          targetUsers = filteredUsers;
          break;
        case 'all':
          targetUsers = users;
          break;
      }

      const phones = targetUsers.map(u => u.phone).filter(Boolean);
      const res = await fetch("/api/send-sms-blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones, message })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send SMS");
      setSuccess(`Messages sent to ${phones.length} users!`);
      setSelected([]);
      setSelectAll(false);
      setMessage("");
      setSelectedTemplate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setSending(false);
    setConfirmationOpen(false);
  }

  function handleTemplateSelect(templateId: string) {
    const template = smsTemplates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.message);
      setSelectedTemplate(templateId);
    }
  }

  function getTargetUserCount(): number {
    switch (smsTarget) {
      case 'selected':
        return selected.length;
      case 'filtered':
        return filteredUsers.length;
      case 'all':
        return users.length;
      default:
        return 0;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">Manage customers, analytics, and communications</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          {/* Desktop Tab Navigation */}
          <nav className="hidden sm:flex -mb-px space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: UserIcon },
              { id: 'users', name: 'User Management', icon: UserIcon },
              { id: 'analytics', name: 'Analytics', icon: CurrencyDollarIcon },
              { id: 'sms', name: 'SMS Center', icon: PhoneIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>

          {/* Mobile Tab Navigation */}
          <div className="sm:hidden -mb-px">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="overview">Overview</option>
              <option value="users">User Management</option>
              <option value="analytics">Analytics</option>
              <option value="sms">SMS Center</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.total_users || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CalendarIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">New This Month</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.new_users_this_month || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShoppingBagIcon className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.active_users || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">VIP Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.vip_users || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Users</h3>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading users...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <UserIcon className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="mt-2 text-gray-500">No users found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.slice(0, 5).map(user => (
                      <div key={user.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.profile?.full_name || user.phone}
                            </p>
                            <p className="text-xs text-gray-500">
                              Joined {formatDate(user.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            getUserTier(user) === 'VIP'
                              ? 'bg-purple-100 text-purple-800'
                              : getUserTier(user) === 'New'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {getUserTier(user)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Users
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, phone, or email..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active (45 days)</option>
                    <option value="new">New (30 days)</option>
                    <option value="vip">VIP Users</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Users per page
                  </label>
                  <select
                    value={usersPerPage}
                    onChange={(e) => handleUsersPerPageChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {filteredUsers.length} of {users.length} users
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    Select all on page ({selected.length} selected)
                  </span>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                          <p className="mt-2 text-gray-500">Loading users...</p>
                        </td>
                      </tr>
                    ) : getCurrentPageUsers().length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <UserIcon className="h-12 w-12 text-gray-400 mx-auto" />
                          <p className="mt-2 text-gray-500">No users found</p>
                        </td>
                      </tr>
                    ) : (
                      getCurrentPageUsers().map((user) => (
                        <>
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selected.includes(user.id)}
                                onChange={(e) => handleSelect(user.id, e.target.checked)}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <UserIcon className="h-5 w-5 text-gray-500" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.profile?.full_name || 'No name'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Joined {formatDate(user.created_at)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{user.phone}</div>
                              <div className="text-sm text-gray-500">{user.email || user.profile?.email || 'No email'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{user.stats?.order_count || 0}</div>
                              <div className="text-sm text-gray-500">
                                Last: {formatDate(user.stats?.last_order_date)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatCurrency(user.stats?.total_spent)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                getUserTier(user) === 'VIP'
                                  ? 'bg-purple-100 text-purple-800'
                                  : getUserTier(user) === 'New'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {getUserTier(user)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => toggleExpandRow(user.id)}
                                className="text-orange-600 hover:text-orange-900 mr-3"
                              >
                                {expandedRows.has(user.id) ? (
                                  <ChevronUpIcon className="h-5 w-5" />
                                ) : (
                                  <ChevronDownIcon className="h-5 w-5" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Row Content */}
                          {expandedRows.has(user.id) && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Recent Orders */}
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                      <ShoppingBagIcon className="h-4 w-4 mr-2" />
                                      Recent Orders
                                    </h4>
                                    {user.recent_orders && user.recent_orders.length > 0 ? (
                                      <div className="space-y-2">
                                        {user.recent_orders.slice(0, 3).map((order) => (
                                          <div key={order.id} className="bg-white p-3 rounded border">
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <p className="text-sm font-medium">Order #{order.id}</p>
                                                <p className="text-xs text-gray-500">{formatDate(order.order_date)}</p>
                                              </div>
                                              <div className="text-right">
                                                <p className="text-sm font-medium">{formatCurrency(order.total_amount)}</p>
                                                <p className="text-xs text-gray-500">{order.status}</p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500">No orders yet</p>
                                    )}
                                  </div>

                                  {/* Saved Addresses */}
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                                      <MapPinIcon className="h-4 w-4 mr-2" />
                                      Saved Addresses ({user.stats?.address_count || 0})
                                    </h4>
                                    {user.addresses && user.addresses.length > 0 ? (
                                      <div className="space-y-2">
                                        {user.addresses.slice(0, 2).map((address) => (
                                          <div key={address.id} className="bg-white p-3 rounded border">
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <p className="text-sm font-medium">{getBestAddressForDisplay(address)}</p>
                                                {address.is_primary && (
                                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Primary</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500">No saved addresses</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {getTotalPages() > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                    disabled={currentPage === getTotalPages()}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">{(currentPage - 1) * usersPerPage + 1}</span>
                      {' '}to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * usersPerPage, filteredUsers.length)}
                      </span>
                      {' '}of{' '}
                      <span className="font-medium">{filteredUsers.length}</span>
                      {' '}results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>

                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(getTotalPages() - 4, currentPage - 2)) + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                        disabled={currentPage === getTotalPages()}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Detailed Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.total_users || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      Growth: {analyticsLoading ? '...' : `${analytics?.growth_rate || 0}%`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CalendarIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">New This Month</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.new_users_this_month || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      {analyticsLoading ? '...' : `${((analytics?.new_users_this_month || 0) / (analytics?.total_users || 1) * 100).toFixed(1)}%`} of total
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShoppingBagIcon className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.active_users || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      Last 45 days
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">VIP Users</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.vip_users || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      $300+ spent or 8+ orders
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShoppingBagIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Orders/User</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : analytics?.avg_orders_per_user || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      Per customer
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Spent/User</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {analyticsLoading ? '...' : formatCurrency(analytics?.avg_spent_per_user)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Customer lifetime value
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Types Breakdown */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">User Types</h3>
                </div>
                <div className="p-6">
                  {analyticsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading analytics...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                          <span className="text-sm font-medium text-gray-900">VIP Users</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">{analytics?.vip_users || 0}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({analytics?.total_users ? ((analytics.vip_users / analytics.total_users) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <span className="text-sm font-medium text-gray-900">New Users</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">{analytics?.new_users_this_month || 0}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({analytics?.total_users ? ((analytics.new_users_this_month / analytics.total_users) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                          <span className="text-sm font-medium text-gray-900">Active Users</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">{analytics?.active_users || 0}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({analytics?.total_users ? ((analytics.active_users / analytics.total_users) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                          <span className="text-sm font-medium text-gray-900">Regular Users</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {analytics ? (analytics.total_users - analytics.vip_users - analytics.new_users_this_month) : 0}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({analytics?.total_users ? (((analytics.total_users - analytics.vip_users - analytics.new_users_this_month) / analytics.total_users) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Engagement Metrics */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Engagement Metrics</h3>
                </div>
                <div className="p-6">
                  {analyticsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading metrics...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-900">Conversion Rate</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {analytics?.conversion_rate || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, analytics?.conversion_rate || 0)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Users who have placed orders</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-900">Active Rate</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {analytics?.total_users ? ((analytics.active_users / analytics.total_users) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${analytics?.total_users ? Math.min(100, (analytics.active_users / analytics.total_users) * 100) : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Users active in last 45 days</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-900">VIP Rate</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {analytics?.total_users ? ((analytics.vip_users / analytics.total_users) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${analytics?.total_users ? Math.min(100, (analytics.vip_users / analytics.total_users) * 100) : 0}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">High-value customers</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMS Center Tab */}
        {activeTab === 'sms' && (
          <div className="space-y-6">
            {/* SMS Targeting */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">SMS Targeting</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <select
                    value={smsTarget}
                    onChange={(e) => setSmsTarget(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="selected">Selected Users ({selected.length})</option>
                    <option value="filtered">Filtered Users ({filteredUsers.length})</option>
                    <option value="all">All Users ({users.length})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Template
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Choose a template...</option>
                    {smsTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">
                      {getTargetUserCount()} users
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Composer */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Compose Message</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Content
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Enter your SMS message here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    maxLength={160}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      SMS messages are limited to 160 characters
                    </p>
                    <p className="text-xs text-gray-500">
                      {message.length}/160 characters
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setMessage("")}
                      disabled={!message}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear
                    </button>
                    <span className="text-sm text-gray-500">
                      Preview: &quot;{message.substring(0, 50)}{message.length > 50 ? '...' : ''}&quot;
                    </span>
                  </div>
                  <button
                    onClick={() => setConfirmationOpen(true)}
                    disabled={!message || getTargetUserCount() === 0 || sending}
                    className="px-6 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <PhoneIcon className="h-4 w-4" />
                        <span>Send SMS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* SMS Templates */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Message Templates</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {smsTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 cursor-pointer transition-colors"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          template.category === 'welcome' ? 'bg-blue-100 text-blue-800' :
                          template.category === 'reminder' ? 'bg-yellow-100 text-yellow-800' :
                          template.category === 'promotion' ? 'bg-green-100 text-green-800' :
                          template.category === 'reengagement' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{template.message}</p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {template.message.length}/160 characters
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTemplateSelect(template.id);
                          }}
                          className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Use Template
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMS Confirmation Modal */}
        {confirmationOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <PhoneIcon className="mx-auto h-12 w-12 text-orange-600" />
                <h3 className="text-lg font-medium text-gray-900 mt-4">Confirm SMS Blast</h3>
                <div className="mt-4 text-left">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Recipients:</strong> {getTargetUserCount()} users
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Target:</strong> {
                      smsTarget === 'selected' ? 'Selected users' :
                      smsTarget === 'filtered' ? 'Filtered users' :
                      'All users'
                    }
                  </p>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-sm text-gray-900">
                      <strong>Message:</strong>
                    </p>
                    <p className="text-sm text-gray-700 mt-1">&quot;{message}&quot;</p>
                  </div>
                </div>
                <div className="flex justify-center space-x-3 mt-6">
                  <button
                    onClick={() => setConfirmationOpen(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendSMS}
                    disabled={sending}
                    className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <PhoneIcon className="h-4 w-4" />
                        <span>Send Now</span>
                      </>
                    )}
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
