// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { LogOut } from 'lucide-react';
import { statsAPI } from '../api/stats';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalOrders: 0,
    revenue: 0,
    pendingOrders: 0,
    todayOrders: 0,
    lowStockCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    logout();
  };

  // Fetch dashboard data from comprehensive stats API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the comprehensive stats API endpoint
        const response = await statsAPI.getComprehensiveStats();
        
        if (response.data.success) {
          // Map the comprehensive stats data to our dashboard format
          const stats = response.data.data;
          setDashboardData({
            totalUsers: stats.overview?.totalUsers || 0,
            totalOrders: stats.overview?.totalOrders || 0,
            revenue: stats.financial?.totalRevenue || 0,
            pendingOrders: stats.shipping?.statusBreakdown?.pending || 0,
            todayOrders: stats.overview?.todayRevenue || 0,
            lowStockCount: stats.products?.lowStockCount || 0
          });
        } else {
          throw new Error(response.data.message || 'Failed to fetch dashboard data');
        }
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard data from server');
        
        // Fallback to zeros if API fails
        setDashboardData({
          totalUsers: 0,
          totalOrders: 0,
          revenue: 0,
          pendingOrders: 0,
          todayOrders: 0,
          lowStockCount: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-[#336600] mx-auto"></div>
            <p className="mt-4 text-slate-600 text-sm sm:text-base">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 w-full">
        {/* Header - Matching the style from Categories, Products, Customer, and Orders pages */}
        <header className="bg-white shadow">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left side: Title */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>

            {/* Right side: Logout button */}
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
                title="Logout"
              >
                <span className="hidden sm:inline mr-2">Logout</span>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 sm:p-6">
          {/* Welcome Message */}
          <div className="mb-6">
            <p className="text-gray-600 text-sm sm:text-base">Welcome back, {user?.name} 👋</p>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <p className="text-red-800 text-sm sm:text-base">{error}</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {/* Total Users Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-slate-200/50 transform hover:scale-105 transition-all duration-300 hover:border-[#336600]/50">
              <div className="px-3 py-4 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-[#336600]/10 mr-3 sm:mr-4 border border-[#336600]/20">
                    <span className="text-lg sm:text-xl lg:text-2xl">👥</span>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm font-medium text-slate-600">Total Users</dt>
                    <dd className="mt-1 text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                      {dashboardData.totalUsers.toLocaleString()}
                    </dd>
                  </div>
                </div>
                <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm">
                  <span className="text-slate-500">Registered users in system</span>
                </div>
              </div>
            </div>

            {/* Total Orders Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-slate-200/50 transform hover:scale-105 transition-all duration-300 hover:border-[#336600]/50">
              <div className="px-3 py-4 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-[#336600]/10 mr-3 sm:mr-4 border border-[#336600]/20">
                    <span className="text-lg sm:text-xl lg:text-2xl">📦</span>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm font-medium text-slate-600">Total Orders</dt>
                    <dd className="mt-1 text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                      {dashboardData.totalOrders.toLocaleString()}
                    </dd>
                  </div>
                </div>
                <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm">
                  <span className="text-slate-500">All time orders</span>
                </div>
              </div>
            </div>

            {/* Pending Orders Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-slate-200/50 transform hover:scale-105 transition-all duration-300 hover:border-[#336600]/50">
              <div className="px-3 py-4 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-[#336600]/10 mr-3 sm:mr-4 border border-[#336600]/20">
                    <span className="text-lg sm:text-xl lg:text-2xl">⏳</span>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm font-medium text-slate-600">Pending Orders</dt>
                    <dd className="mt-1 text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                      {dashboardData.pendingOrders.toLocaleString()}
                    </dd>
                  </div>
                </div>
                <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm">
                  <span className="text-slate-500">Need attention</span>
                </div>
              </div>
            </div>

            {/* Low Stock Items Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-slate-200/50 transform hover:scale-105 transition-all duration-300 hover:border-[#336600]/50">
              <div className="px-3 py-4 sm:p-4 lg:p-5">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-[#336600]/10 mr-3 sm:mr-4 border border-[#336600]/20">
                    <span className="text-lg sm:text-xl lg:text-2xl">⚠️</span>
                  </div>
                  <div>
                    <dt className="text-xs sm:text-sm font-medium text-slate-600">Low Stock Items</dt>
                    <dd className="mt-1 text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                      {dashboardData.lowStockCount.toLocaleString()}
                    </dd>
                  </div>
                </div>
                <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm">
                  <span className="text-slate-500">Items with stock &lt; 10</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;