// src/pages/OrdersPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ordersAPI } from '../api/orders';
import { paymentsAPI } from '../api/payments';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Search, Filter } from 'lucide-react';
import { FaSyncAlt, FaTag, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';

const OrdersPage = () => {
  const { logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundStatus, setRefundStatus] = useState({});
  const [activeRefundOrderId, setActiveRefundOrderId] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [userRole, setUserRole] = useState('admin');
  const [isMobile, setIsMobile] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, orderId: null, orderNumber: null });
  
  // Filtering States
  const [sortOption, setSortOption] = useState('newest');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Ref to prevent double API calls
  const hasFetched = useRef(false);

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Status', icon: '📋' },
    { value: 'pending', label: 'Pending', icon: '⏳' },
    { value: 'confirmed', label: 'Confirmed', icon: '✅' },
    { value: 'processing', label: 'Processing', icon: '⚙️' },
    { value: 'shipped', label: 'Shipped', icon: '🚚' },
    { value: 'delivered', label: 'Delivered', icon: '📦' },
    { value: 'cancelled', label: 'Cancelled', icon: '❌' }
  ];

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch orders on mount - only once
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchOrders();
    }
  }, []);

  // Use useMemo for filtered orders - NO infinite loop
  const filteredOrders = useMemo(() => {
    if (!orders.length) return [];
    
    let result = [...orders];

    // Apply status filter
    if (selectedStatus !== 'all') {
      result = result.filter(order => order.orderStatus === selectedStatus);
    }

    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => {
        const customer = getCustomerInfo(order);
        const orderId = getOrderId(order);
        return (
          (order.orderId && order.orderId.toLowerCase().includes(term)) ||
          (order.orderNumber && order.orderNumber.toLowerCase().includes(term)) ||
          (customer.name && customer.name.toLowerCase().includes(term)) ||
          (customer.email && customer.email.toLowerCase().includes(term)) ||
          (customer.phone && customer.phone.toLowerCase().includes(term))
        );
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.createdAt || b.orderDate || b.date || 0) - new Date(a.createdAt || a.orderDate || a.date || 0);
        case 'oldest':
          return new Date(a.createdAt || a.orderDate || a.date || 0) - new Date(b.createdAt || b.orderDate || b.date || 0);
        case 'amount-high':
          return (b.finalAmount || b.totalAmount || 0) - (a.finalAmount || a.totalAmount || 0);
        case 'amount-low':
          return (a.finalAmount || a.totalAmount || 0) - (b.finalAmount || b.totalAmount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [orders, sortOption, selectedStatus, searchTerm]);

  const fetchOrders = async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      
      console.log('📡 Calling ordersAPI.getOrders()...');
      
      // Check if token exists
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      if (!token) {
        setError('❌ You are not logged in. Please login again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const response = await ordersAPI.getOrders();
      console.log('✅ API Response received:', response);
      
      // Check if response is unauthorized
      if (response.data && response.data.success === false && response.data.message === 'Not authorized to access this route') {
        setError('❌ Session expired. Please login again.');
        setLoading(false);
        setRefreshing(false);
        // Optionally logout user
        // logout();
        return;
      }
      
      let ordersData = [];
      
      if (Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response.data && Array.isArray(response.data.orders)) {
        ordersData = response.data.orders;
      } else if (response.data && Array.isArray(response.data.data)) {
        ordersData = response.data.data;
      } else if (Array.isArray(response)) {
        ordersData = response;
      } else if (response.data && response.data.success && Array.isArray(response.data.orders)) {
        ordersData = response.data.orders;
      }
      
      console.log(`📊 Setting ${ordersData.length} orders`);
      setOrders(ordersData || []);
      
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      
      // Check for unauthorized error
      if (err.response && err.response.status === 401) {
        setError('❌ Session expired. Please login again.');
        // Optionally logout user
        // logout();
      } else if (err.response && err.response.status === 403) {
        setError('❌ You do not have permission to access orders.');
      } else if (err.response && err.response.data && err.response.data.message) {
        setError(`❌ ${err.response.data.message}`);
      } else if (err.message === 'Network Error') {
        setError('❌ Cannot connect to server. Please check your internet connection.');
      } else {
        setError(`❌ Failed to fetch orders: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchOrders(true);
  };

  // Get sort button label based on current option
  const getSortLabel = () => {
    switch (sortOption) {
      case 'newest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      case 'amount-high': return 'Amount (High to Low)';
      case 'amount-low': return 'Amount (Low to High)';
      default: return 'Sort';
    }
  };

  // Get status display label
  const getStatusLabel = () => {
    const found = statusOptions.find(opt => opt.value === selectedStatus);
    return found ? `${found.icon} ${found.label}` : 'All Status';
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedStatus('all');
    setSortOption('newest');
    setSearchTerm('');
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    if (!orderId) {
      return;
    }

    try {
      setLoading(true);
      const response = await ordersAPI.deleteOrder(orderId);
      
      if (response.data.success) {
        setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
        setDeleteModal({ show: false, orderId: null, orderNumber: null });
        setError('✅ Order deleted successfully!');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('❌ Failed to delete order');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    if (newStatus === 'cancelled') {
      const confirmCancel = window.confirm(
        ' Are you sure you want to cancel this order?\n' +
        'This will:\n' +
        '• Restore product stock\n' +
        '• Cancel ShipRocket shipment (if exists)\n' +
        '• Send cancellation notification'
      );
      if (!confirmCancel) return;
    }

    if (newStatus === 'delivered') {
      const confirmDeliver = window.confirm(
        '✅ Mark this order as delivered?\n' +
        'This will:\n' +
        '• Auto-complete COD payments (if applicable)\n' +
        '• Send delivery confirmation email'
      );
      if (!confirmDeliver) return;
    }

    try {
      setStatusUpdating(prev => ({ ...prev, [orderId]: true }));

      const order = orders.find(o => o._id === orderId);
      if (!order) {
        alert('Order not found');
        return;
      }

      const paymentOrderId = order.orderId || order.razorpayOrderId || order.paymentId;
      
      if (!paymentOrderId) {
        alert('Cannot update status: Order identifier not found');
        return;
      }

      const response = await paymentsAPI.updatePaymentStatus(paymentOrderId, {
        orderStatus: newStatus,
        ...(newStatus === 'cancelled' && {
          cancellationReason: 'Cancelled by admin via dashboard',
          notes: `Order status changed to ${newStatus} by admin`
        }),
        ...(newStatus === 'delivered' && {
          notes: `Order marked as delivered by admin`
        })
      });
      
      if (response.data.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId 
              ? { 
                  ...order, 
                  orderStatus: newStatus, 
                  paymentStatus: response.data.order?.paymentStatus || order.paymentStatus,
                  ...(response.data.order || {})
                }
              : order
          )
        );
        
        alert(`✅ Order status updated to ${newStatus}`);
        setTimeout(() => fetchOrders(), 1000);
      } else {
        alert(`❌ Failed to update status: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert(`❌ Error updating status: ${error.response?.data?.message || error.message}`);
    } finally {
      setStatusUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handlePaymentStatusUpdate = async (orderId, newPaymentStatus) => {
    try {
      setStatusUpdating(prev => ({ ...prev, [orderId]: true }));

      const order = orders.find(o => o._id === orderId);
      if (!order) {
        alert('Order not found');
        return;
      }

      const paymentOrderId = order.orderId || order.razorpayOrderId || order.paymentId;
      
      if (!paymentOrderId) {
        alert('Cannot update payment status: Order identifier not found');
        return;
      }

      const response = await paymentsAPI.updatePaymentStatus(paymentOrderId, {
        paymentStatus: newPaymentStatus,
        notes: `Payment status updated to ${newPaymentStatus} by admin`
      });
      
      if (response.data.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId 
              ? { 
                  ...order, 
                  paymentStatus: newPaymentStatus,
                  orderStatus: response.data.order?.orderStatus || order.orderStatus
                }
              : order
          )
        );
        
        alert(`✅ Payment status updated to ${newPaymentStatus}`);
        setTimeout(() => fetchOrders(), 1000);
      } else {
        alert(`❌ Failed to update payment status: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Payment status update error:', error);
      alert(`❌ Error updating payment status: ${error.response?.data?.message || error.message}`);
    } finally {
      setStatusUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const getStatusOptions = (currentStatus) => {
    const allStatuses = [
      { value: 'pending', label: 'Pending', color: 'yellow' },
      { value: 'confirmed', label: 'Confirmed', color: 'blue' },
      { value: 'processing', label: 'Processing', color: 'indigo' },
      { value: 'shipped', label: 'Shipped', color: 'purple' },
      { value: 'delivered', label: 'Delivered', color: 'green' },
      { value: 'cancelled', label: 'Cancelled', color: 'red' },
    ];

    const statusFlow = {
      pending: ['pending', 'confirmed', 'processing', 'cancelled'],
      confirmed: ['confirmed', 'processing', 'shipped', 'cancelled'],
      processing: ['processing', 'shipped', 'cancelled'],
      shipped: ['shipped', 'delivered', 'cancelled'],
      delivered: ['delivered'],
      cancelled: ['cancelled'],
    };

    const allowedStatuses = statusFlow[currentStatus] || [currentStatus];
    
    return allStatuses.filter(status => allowedStatuses.includes(status.value));
  };

  const getPaymentStatusOptions = (currentPaymentStatus) => {
    const allPaymentStatuses = [
      { value: 'pending', label: 'Pending', color: 'yellow' },
      { value: 'completed', label: 'Completed', color: 'green' },
      { value: 'failed', label: 'Failed', color: 'red' },
      { value: 'refunded', label: 'Refunded', color: 'purple' },
      { value: 'partially_refunded', label: 'Partially Refunded', color: 'indigo' },
    ];

    const paymentStatusFlow = {
      pending: ['pending', 'completed', 'failed'],
      completed: ['completed', 'refunded', 'partially_refunded'],
      failed: ['failed'],
      refunded: ['refunded'],
      partially_refunded: ['partially_refunded'],
    };

    const allowedStatuses = paymentStatusFlow[currentPaymentStatus] || [currentPaymentStatus];
    
    return allPaymentStatuses.filter(status => allowedStatuses.includes(status.value));
  };

  const isRefundable = (order) => {
    if (!order) return false;
    
    const isCancelled = order.orderStatus === 'cancelled';
    const hasPaid = order.paymentStatus === 'completed' || 
                   order.paymentStatus === 'partially_refunded';
    const hasPaymentId = order.paymentId && order.paymentId.trim() !== '';
    const notFullyRefunded = order.paymentStatus !== 'refunded';
    
    return isCancelled && hasPaid && hasPaymentId && notFullyRefunded;
  };

  const processRefund = async (order) => {
    console.log('🔍 Starting refund process for order:', {
      orderId: order.orderId,
      _id: order._id,
      paymentId: order.paymentId,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus
    });

    if (!order) {
      alert('Cannot process refund: Order data is missing');
      return;
    }

    if (!order.paymentId) {
      console.error('Missing paymentId in order:', {
        orderId: order.orderId,
        availableFields: Object.keys(order)
      });
      alert('Cannot process refund: Payment ID not found');
      return;
    }

    if (!isRefundable(order)) {
      alert(`This order cannot be refunded because:
      • Order Status: ${order.orderStatus} ${order.orderStatus !== 'cancelled' ? ' (Must be cancelled)' : ''}
      • Payment Status: ${order.paymentStatus} ${order.paymentStatus !== 'completed' && order.paymentStatus !== 'partially_refunded' ? '❌ (Must be completed or partially refunded)' : '✅'}
      • Payment ID: ${order.paymentId ? 'Exists' : 'Missing'}
      • Already Fully Refunded: ${order.paymentStatus === 'refunded' ? 'Yes' : 'No'}`);
      return;
    }

    const refundAmount = order.finalAmount || order.totalAmount || 0;
    
    if (!confirm(`Are you sure you want to refund ₹${refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} for order ${order.orderId}?`)) {
      return;
    }

    try {
      setRefundLoading(true);
      setActiveRefundOrderId(order._id);
      setRefundStatus(prev => ({
        ...prev,
        [order._id]: { status: 'processing', message: 'Processing refund...' }
      }));
      
      const refundData = {
        refund_amount: refundAmount,
        notes: {
          reason: 'Order cancelled',
          processedBy: 'admin',
          orderId: order.orderId
        }
      };

      console.log('Making refund API call with data:', {
        paymentId: order.paymentId,
        amount: refundAmount,
        orderId: order.orderId,
        url: `/payments/${order.paymentId}/refund`,
        method: 'POST'
      });

      const response = await paymentsAPI.refundPayment(order.paymentId, refundData);
      
      console.log('✅ Refund API Response:', response.data);
      
      if (response.data.success) {
        setRefundStatus(prev => ({
          ...prev,
          [order._id]: { 
            status: 'success', 
            message: `Refunded ₹${(response.data.refund.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            refundId: response.data.refund.id
          }
        }));
        
        alert(`✅ Refund processed successfully!\nRefund ID: ${response.data.refund.id}\nAmount: ₹${(response.data.refund.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        setTimeout(() => fetchOrders(), 1500);
      } else {
        setRefundStatus(prev => ({
          ...prev,
          [order._id]: { 
            status: 'error', 
            message: response.data.message || 'Refund failed'
          }
        }));
        alert(`⚠️ Refund failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('FULL Refund error:', error);
      
      if (!error.response) {
        console.error('Network error - No response from server');
        alert('Network error: Could not connect to server');
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Refund failed due to server error';
      
      setRefundStatus(prev => ({
        ...prev,
        [order._id]: { 
          status: 'error', 
          message: errorMessage
        }
      }));
      
      alert(`Refund failed: ${errorMessage}`);
      
      if (errorMessage.includes('already been fully refunded')) {
        alert('This payment has already been refunded. Check the payment status.');
      } else if (errorMessage.includes('Payment not found')) {
        alert('Payment ID not found in Razorpay. Verify the payment was successful.');
      } else if (errorMessage.includes('Internal server error')) {
        alert('Server error. Check backend logs for details.');
      }
    } finally {
      setRefundLoading(false);
      setTimeout(() => {
        setActiveRefundOrderId(null);
      }, 3000);
    }
  };

  const fetchOrderReceipt = async (orderId) => {
    try {
      console.log('🔍 Fetching receipt for order ID:', orderId);
      
      if (!orderId) {
        alert('Order ID is missing. Please check the order data.');
        return;
      }
      
      setReceiptLoading(true);
    
      console.log('Making API call to printOrderReceipt...');
      
      const response = await ordersAPI.printOrderReceipt(orderId);
      console.log('Order receipt API response:', response);
      
      if (!response) {
        throw new Error('No response received from API');
      }
      
      const orderData = response.data || response;
      console.log('Extracted order data:', orderData);
      
      if (!orderData) {
        throw new Error('No order data received from API');
      }
      
      setSelectedOrder(orderData);
      setShowReceiptModal(true);
      console.log('Receipt modal opened successfully');
      
    } catch (err) {
      console.error('Error fetching order receipt:', err);
      
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to load receipt details';
      
      alert(`Error: ${errorMessage}\n\nCheck console for more details.`);
    } finally {
      setReceiptLoading(false);
    }
  };

  const downloadPDFReceipt = async (orderId) => {
    try {
      console.log('Downloading PDF for order ID:', orderId);
      
      if (!orderId) {
        console.error('Order ID is missing in downloadPDFReceipt');
        setDownloadStatus('Order ID missing');
        alert('Order ID is missing. Please try viewing the receipt first.');
        return;
      }

      setReceiptLoading(true);
      setDownloadStatus('Starting download...');
      
      console.log('Making PDF API call for order:', orderId);
      const response = await ordersAPI.printOrderReceiptPDF(orderId, {
        responseType: 'blob'
      });
      
      console.log('PDF API response received');
      setDownloadStatus('Creating PDF file...');
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order-receipt-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('PDF download completed');
      setDownloadStatus('PDF downloaded successfully!');
      alert('PDF downloaded successfully!');
      
    } catch (err) {
      console.error('Error downloading PDF receipt:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to download PDF receipt';
      setDownloadStatus(`Download failed: ${errorMessage}`);
      alert(`Download failed: ${errorMessage}`);
    } finally {
      setReceiptLoading(false);
      setTimeout(() => setDownloadStatus(''), 3000);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border border-blue-200',
      shipped: 'bg-purple-100 text-purple-800 border border-purple-200',
      delivered: 'bg-green-100 text-green-800 border border-green-200',
      cancelled: 'bg-red-100 text-red-800 border border-red-200',
      completed: 'bg-green-100 text-green-800 border border-green-200',
      processing: 'bg-blue-100 text-blue-800 border border-blue-200',
      refunded: 'bg-purple-100 text-purple-800 border border-purple-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    if (!paymentStatus) return null;
    
    const paymentStatusColors = {
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      completed: 'bg-green-100 text-green-800 border border-green-200',
      failed: 'bg-red-100 text-red-800 border border-red-200',
      refunded: 'bg-purple-100 text-purple-800 border border-purple-200',
      partially_refunded: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      processing: 'bg-blue-100 text-blue-800 border border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border border-red-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusColors[paymentStatus] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
        {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getCustomerInfo = (order) => {
    const name = order.customer?.name || order.user?.name || order.customerName || order.guestUser?.name;
    const email = order.customer?.email || order.user?.email || order.customerEmail || order.guestUser?.email || order.email;
    const phone = order.customer?.phone || order.user?.phone || order.phoneNumber || order.guestUser?.phone;
    const isGuest = !order.customer?.name && !order.user?.name;
    
    return { name, email, phone, isGuest };
  };

  const getOrderId = (order) => {
    if (!order) {
      console.error('getOrderId: order is null or undefined');
      return null;
    }
    
    if (order.receipt) {
      return order.receipt.receiptNumber || order.receipt._id || order.receipt.orderId || order.receipt.id;
    }
    
    return order._id || order.id || order.orderId;
  };

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.orderStatus === 'pending').length;
  const deliveredOrders = orders.filter(order => order.orderStatus === 'delivered' || order.orderStatus === 'completed').length;
  const cancelledOrders = orders.filter(order => order.orderStatus === 'cancelled').length;
  const refundedOrders = orders.filter(order => order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded').length;

  const ReceiptModal = ({ order, onClose, onPrint, onDownloadPDF }) => {
    if (!order) return null;

    const receiptData = order.receipt || order;
    const orderId = receiptData.receiptNumber || receiptData.orderNumber || receiptData.orderId || receiptData._id;
    const customerName = receiptData.customer?.name || receiptData.user?.name || receiptData.guestUser?.name || receiptData.shippingAddress?.fullName || 'N/A';
    const customerEmail = receiptData.customer?.email || receiptData.user?.email || receiptData.guestUser?.email || receiptData.email || 'N/A';
    const customerPhone = receiptData.customer?.phone || receiptData.user?.phone || receiptData.guestUser?.phone || receiptData.shippingAddress?.phone || 'N/A';
    const items = receiptData.products || receiptData.items || [];
    const subtotal = receiptData.pricing?.subtotal || receiptData.totalAmount || receiptData.subtotal || 0;
    const shipping = receiptData.pricing?.shipping || receiptData.shippingFee || receiptData.shippingCharges || 0;
    const tax = receiptData.pricing?.tax || receiptData.taxAmount || receiptData.tax || 0;
    const total = receiptData.pricing?.total || receiptData.finalAmount || receiptData.total || subtotal + shipping + tax;
    const orderDate = receiptData.createdAt || receiptData.orderDate || receiptData.date;
    const paymentStatus = receiptData.payment?.status || receiptData.paymentStatus;
    const paymentMethod = receiptData.payment?.method || receiptData.paymentMethod;
    const paymentId = receiptData.paymentId;
    const razorpayOrderId = receiptData.razorpayOrderId;
    const orderStatus = receiptData.orderStatus;
    const isGuestOrder = receiptData.isGuestOrder;
    const shippingAddress = receiptData.shippingAddress;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
          <div className="bg-gradient-to-r from-[#336600] to-[#2a5200] text-white p-3 sm:p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm">🛒</div>
              <div>
                <h1 className="font-bold text-sm sm:text-base">ORDER RECEIPT</h1>
                <p className="text-white/80 text-xs sm:text-sm">#{orderId?.substring(0, 12)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-2 py-0.5 rounded text-xs ${isGuestOrder ? 'bg-orange-500' : 'bg-green-500'}`}>
                {isGuestOrder ? 'Guest' : 'Reg'}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-500 min-w-[60px]">Date:</span>
                <span className="text-xs sm:text-sm font-medium flex-1 text-right">{formatDate(orderDate)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-500 min-w-[60px]">Payment:</span>
                <div className="flex-1 text-right">
                  {getPaymentStatusBadge(paymentStatus)}
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-500 min-w-[60px]">Status:</span>
                <div className="flex-1 text-right">
                  {getStatusBadge(orderStatus)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-500 min-w-[60px]">Method:</span>
                <span className="text-xs sm:text-sm font-medium capitalize flex-1 text-right">{paymentMethod}</span>
              </div>
            </div>

            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded border">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm sm:text-base truncate">{customerName}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">📧</span>
                  <span className="truncate">{customerEmail}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">📞</span>
                  <span>{customerPhone}</span>
                </div>
              </div>
              {shippingAddress && (
                <div className="mt-2 pt-2 border-t text-xs sm:text-sm">
                  <div className="font-medium text-gray-600">Shipping:</div>
                  <div className="text-gray-500 truncate">
                    {shippingAddress.address}, {shippingAddress.city}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-3 sm:mb-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-sm sm:text-base">Items ({items.length})</h3>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={item._id || index} className="flex justify-between items-center p-1.5 hover:bg-gray-50 rounded border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs sm:text-sm truncate">{item.product?.name || item.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xs sm:text-sm">{formatCurrency((item.price || 0) * (item.quantity || 1))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#336600]/10 p-3 sm:p-4 rounded border border-[#336600]/20">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-700">Shipping:</span>
                  <span className="font-semibold">{formatCurrency(shipping)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-700">Tax:</span>
                  <span className="font-semibold">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#336600]/30 font-bold text-base sm:text-lg">
                  <span>TOTAL:</span>
                  <span className="text-[#336600]">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {(paymentId || razorpayOrderId) && (
              <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded border text-xs sm:text-sm">
                {paymentId && <div className="mb-1"><span className="text-gray-500">Payment ID:</span> <span className="font-medium">{paymentId.substring(0, 16)}...</span></div>}
                {razorpayOrderId && <div><span className="text-gray-500">Razorpay ID:</span> <span className="font-medium">{razorpayOrderId.substring(0, 16)}...</span></div>}
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 border-t bg-gray-50 flex justify-between items-center">
            {downloadStatus ? (
              <div className={`px-2 py-1 rounded text-xs ${
                downloadStatus.includes('✅') ? 'bg-green-100 text-green-800' :
                downloadStatus.includes('❌') ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {downloadStatus.length > 20 ? downloadStatus.substring(0, 20) + '...' : downloadStatus}
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-gray-500">
                {formatDate(orderDate)}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={onDownloadPDF}
                disabled={receiptLoading}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded text-xs sm:text-sm hover:from-red-600 hover:to-red-700 disabled:from-red-300 disabled:to-red-300 flex items-center gap-1 min-w-[60px] sm:min-w-[80px] justify-center"
                title="Download PDF"
              >
                <span>📥</span>
                {receiptLoading ? '...' : 'PDF'}
              </button>
           
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DeleteConfirmationModal = ({ show, onClose, onConfirm, orderNumber }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-center mb-2">Delete Order</h3>
          <p className="text-gray-600 text-center mb-6">
            Are you sure you want to delete order #{orderNumber}? This action cannot be undone.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-4 sm:p-6 bg-gray-50">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-[#336600]"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-4 sm:p-6 bg-gray-50">
          <div className={`p-4 rounded-lg border ${
            error.includes('✅') 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`${
              error.includes('✅') ? 'text-green-800' : 'text-red-800'
            }`}>{error}</p>
            <button 
              onClick={() => fetchOrders(true)}
              className="mt-2 px-4 py-2 bg-gradient-to-r from-[#336600] to-[#2a5200] text-white rounded hover:from-[#2a5200] hover:to-[#1e3d00]"
            >
              Retry
            </button>
            {error.includes('login again') && (
              <button 
                onClick={logout}
                className="mt-2 ml-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded hover:from-red-600 hover:to-red-700"
              >
                Login Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 w-full">
        {/* Header */}
        <header className="bg-white shadow sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">Orders Management</h1>
            </div>

            <div className="flex items-center">
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
                title="Logout"
              >
                <span className="hidden sm:inline mr-2">Logout</span>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <div className="mb-6 flex flex-col space-y-4">
            {/* Top row with title and buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-700 flex items-center">
                <FaTag className="mr-2 text-[#336600]" />
                All Orders ({filteredOrders.length})
              </h2>
              <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex-1 sm:flex-none bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 sm:py-2 rounded-lg flex items-center justify-center transition duration-200 text-sm min-h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh orders"
                >
                  <FaSyncAlt className={`sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </span>
                </button>
              </div>
            </div>

            {/* Filter and Sort Section */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex flex-col space-y-3">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  {/* Search Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search by order ID, customer name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336600] focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Status Filter Dropdown */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm focus:ring-2 focus:ring-[#336600] focus:border-transparent transition-all duration-200"
                    >
                      <span className="truncate">
                        <Filter className="inline mr-2 text-gray-400" size={14} />
                        {getStatusLabel()}
                      </span>
                      <svg className={`w-4 h-4 ml-2 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {statusDropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {statusOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSelectedStatus(option.value);
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedStatus === option.value ? 'bg-[#336600]/10 text-[#336600]' : ''}`}
                          >
                            {option.icon} {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm focus:ring-2 focus:ring-[#336600] focus:border-transparent transition-all duration-200"
                    >
                      <div className="flex items-center">
                        <FaSortAmountDown className="mr-2 text-gray-400" />
                        <span className="truncate">{getSortLabel()}</span>
                      </div>
                      <svg className={`w-4 h-4 ml-2 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {sortDropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSortOption('newest');
                            setSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${sortOption === 'newest' ? 'bg-[#336600]/10 text-[#336600]' : ''}`}
                        >
                          <FaSortAmountDown className="mr-2" /> Newest First
                        </button>
                        <button
                          onClick={() => {
                            setSortOption('oldest');
                            setSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${sortOption === 'oldest' ? 'bg-[#336600]/10 text-[#336600]' : ''}`}
                        >
                          <FaSortAmountUp className="mr-2" /> Oldest First
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => {
                            setSortOption('amount-high');
                            setSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortOption === 'amount-high' ? 'bg-[#336600]/10 text-[#336600]' : ''}`}
                        >
                          Amount (High to Low)
                        </button>
                        <button
                          onClick={() => {
                            setSortOption('amount-low');
                            setSortDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${sortOption === 'amount-low' ? 'bg-[#336600]/10 text-[#336600]' : ''}`}
                        >
                          Amount (Low to High)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Clear Filters Button */}
                  {(selectedStatus !== 'all' || sortOption !== 'newest' || searchTerm) && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200 sm:w-auto"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards - Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Total Orders</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mt-1 sm:mt-2">{totalOrders}</p>
                </div>
                <div className="p-1 sm:p-2 bg-[#336600]/10 rounded-lg">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-[#336600] to-[#2a5200] rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">T</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Pending Orders</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 mt-1 sm:mt-2">{pendingOrders}</p>
                </div>
                <div className="p-1 sm:p-2 bg-yellow-50 rounded-lg">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">P</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Delivered Orders</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 mt-1 sm:mt-2">{deliveredOrders}</p>
                </div>
                <div className="p-1 sm:p-2 bg-green-50 rounded-lg">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">D</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-xs sm:text-sm font-medium">Refunded Orders</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 mt-1 sm:mt-2">{refundedOrders}</p>
                </div>
                <div className="p-1 sm:p-2 bg-purple-50 rounded-lg">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">R</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {!Array.isArray(orders) ? (
              <div className="text-center py-8">
                <p className="text-red-500 text-lg">Data format error</p>
                <p className="text-gray-400 mt-2">Orders data is not in expected format</p>
                <button 
                  onClick={() => fetchOrders(true)}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-[#336600] to-[#2a5200] text-white rounded hover:from-[#2a5200] hover:to-[#1e3d00]"
                >
                  Retry
                </button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {(selectedStatus !== 'all' || searchTerm) 
                    ? 'No orders match your filters' 
                    : 'No orders found'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {(selectedStatus !== 'all' || searchTerm)
                    ? 'Try adjusting your filter criteria'
                    : 'Orders will appear here when customers place them.'}
                </p>
                {(selectedStatus !== 'all' || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-[#336600] to-[#2a5200] text-white rounded-lg hover:from-[#2a5200] hover:to-[#1e3d00] text-sm"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile View - Card Layout */}
                {isMobile ? (
                  <div className="p-2">
                    <div className="space-y-4">
                      {filteredOrders.map((order, index) => {
                        const customer = getCustomerInfo(order);
                        const orderId = getOrderId(order);
                        const isRefundableOrder = isRefundable(order);
                        const currentRefundStatus = refundStatus[order._id];
                        const statusOptions = getStatusOptions(order.orderStatus);
                        const paymentStatusOptions = getPaymentStatusOptions(order.paymentStatus);
                        
                        return (
                          <div key={order._id || order.id} className="bg-white rounded-lg shadow border border-gray-200 p-4">
                            {/* Order Header */}
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="text-sm font-medium text-gray-500">#{index + 1}</div>
                                <div>
                                  <h3 className="text-base font-semibold text-gray-900">
                                    Order: {order.orderId || order.orderNumber || order._id?.substring(-6)}
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatDate(order.createdAt || order.orderDate || order.date)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="mb-1">
                                  {getStatusBadge(order.orderStatus)}
                                </div>
                                <span className="text-sm font-bold text-gray-900">
                                  {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Customer Info */}
                            <div className="mb-3">
                              <div className="flex items-center">
                                <p className="text-sm font-medium text-gray-900">
                                  {customer.name}
                                </p>
                                {customer.isGuest && (
                                  <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                    Guest
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {customer.email}
                              </p>
                            </div>
                            
                            {/* Status & Payment Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <p className="text-xs text-gray-500">Payment</p>
                                <div className="mt-1">
                                  {getPaymentStatusBadge(order.paymentStatus)}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Items</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {order.items ? order.items.length : order.products?.length || 0} items
                                </p>
                              </div>
                            </div>
                            
                            {/* Status Update (Admin Only) */}
                            {userRole === 'admin' && (
                              <>
                                <div className="mb-2">
                                  <p className="text-xs text-gray-500 mb-1">Order Status</p>
                                  <select
                                    value={order.orderStatus}
                                    onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                                    disabled={statusUpdating[order._id]}
                                    className={`w-full text-sm border rounded-lg px-3 py-2 ${
                                      statusUpdating[order._id] 
                                        ? 'bg-gray-100 cursor-not-allowed' 
                                        : 'bg-white cursor-pointer focus:ring-2 focus:ring-[#336600] focus:border-transparent'
                                    }`}
                                  >
                                    {statusOptions.map(option => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="mb-3">
                                  <p className="text-xs text-gray-500 mb-1">Payment Status</p>
                                  <select
                                    value={order.paymentStatus}
                                    onChange={(e) => handlePaymentStatusUpdate(order._id, e.target.value)}
                                    disabled={statusUpdating[order._id]}
                                    className={`w-full text-sm border rounded-lg px-3 py-2 ${
                                      statusUpdating[order._id] 
                                        ? 'bg-gray-100 cursor-not-allowed' 
                                        : 'bg-white cursor-pointer focus:ring-2 focus:ring-[#336600] focus:border-transparent'
                                    }`}
                                  >
                                    {paymentStatusOptions.map(option => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                  {statusUpdating[order._id] && (
                                    <div className="text-xs text-[#336600] mt-1">
                                      Updating...
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            
                            {/* Actions */}
                            <div className="flex space-x-2 pt-2 border-t border-gray-100">
                              <button
                                onClick={() => fetchOrderReceipt(orderId)}
                                className="flex-1 bg-gradient-to-r from-[#336600] to-[#2a5200] hover:from-[#2a5200] hover:to-[#1e3d00] text-white px-3 py-2 rounded-lg text-sm font-medium transition duration-200"
                              >
                                View Receipt
                              </button>
                              
                              {userRole === 'admin' && (
                                <button
                                  onClick={() => setDeleteModal({ 
                                    show: true, 
                                    orderId: order._id, 
                                    orderNumber: order.orderId || order.orderNumber || order._id 
                                  })}
                                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition duration-200"
                                >
                                  Delete
                                </button>
                              )}
                              
                              {isRefundableOrder ? (
                                <button
                                  onClick={() => processRefund(order)}
                                  disabled={refundLoading && activeRefundOrderId === order._id}
                                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                                    refundLoading && activeRefundOrderId === order._id
                                      ? 'bg-gradient-to-r from-red-300 to-red-300 text-white cursor-not-allowed'
                                      : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                                  }`}
                                >
                                  {refundLoading && activeRefundOrderId === order._id ? 'Processing...' : 'Refund'}
                                </button>
                              ) : (
                                <div className="flex-1">
                                  {order.paymentStatus === 'refunded' ? (
                                    <span className="block px-3 py-2 bg-green-100 text-green-800 text-sm rounded-lg border border-green-200 text-center">
                                      Refunded
                                    </span>
                                  ) : order.paymentStatus === 'partially_refunded' ? (
                                    <span className="block px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded-lg border border-blue-200 text-center">
                                      Partial
                                    </span>
                                  ) : (
                                    <span className="block px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg border border-gray-200 text-center">
                                      {order.orderStatus}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Refund Status Message */}
                            {currentRefundStatus && (
                              <div className={`mt-2 px-3 py-2 text-xs rounded-lg text-center ${
                                currentRefundStatus.status === 'success' ? 'bg-green-100 text-green-800' :
                                currentRefundStatus.status === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {currentRefundStatus.message}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Desktop View - Table Layout */
                  <div className="overflow-x-auto">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                      ← Scroll horizontally to see all columns →
                    </div>
                    
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">S.No</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Order ID</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                            Order Status {userRole === 'admin' && '(Update)'}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[160px]">
                            Payment Status {userRole === 'admin' && '(Update)'}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Items</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[200px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.map((order, index) => {
                          const customer = getCustomerInfo(order);
                          const orderId = getOrderId(order);
                          const isRefundableOrder = isRefundable(order);
                          const currentRefundStatus = refundStatus[order._id];
                          const statusOptions = getStatusOptions(order.orderStatus);
                          const paymentStatusOptions = getPaymentStatusOptions(order.paymentStatus);
                          
                          return (
                            <tr key={order._id || order.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 text-center">
                                  {index + 1}
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 font-mono">
                                  {order.orderId || order.orderNumber || order._id?.substring(-6)}
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 flex items-center">
                                  <span className="truncate max-w-[100px] sm:max-w-none">
                                    {customer.name}
                                  </span>
                                  {customer.isGuest && (
                                    <span className="ml-2 px-1 bg-gray-200 text-gray-600 text-xs rounded flex-shrink-0">Guest</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">
                                  {customer.email}
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-xs sm:text-sm text-gray-900">
                                  {formatDate(order.createdAt || order.orderDate || order.date)}
                                </div>
                              </td>
                            
                              <td className="px-3 py-4 whitespace-nowrap">
                                {userRole === 'admin' ? (
                                  <div className="flex flex-col gap-1">
                                    <select
                                      value={order.orderStatus}
                                      onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                                      disabled={statusUpdating[order._id]}
                                      className={`text-xs border rounded px-2 py-1 w-full max-w-[140px] ${
                                        statusUpdating[order._id] 
                                          ? 'bg-gray-100 cursor-not-allowed' 
                                          : 'bg-white cursor-pointer focus:ring-2 focus:ring-[#336600] focus:border-transparent'
                                      }`}
                                    >
                                      {statusOptions.map(option => (
                                        <option 
                                          key={option.value} 
                                          value={option.value}
                                          className={`text-${option.color}-700`}
                                        >
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  getStatusBadge(order.orderStatus)
                                )}
                              </td>
                              
                              <td className="px-3 py-4 whitespace-nowrap">
                                {userRole === 'admin' ? (
                                  <div className="flex flex-col gap-1">
                                    <select
                                      value={order.paymentStatus}
                                      onChange={(e) => handlePaymentStatusUpdate(order._id, e.target.value)}
                                      disabled={statusUpdating[order._id]}
                                      className={`text-xs border rounded px-2 py-1 w-full max-w-[160px] ${
                                        statusUpdating[order._id] 
                                          ? 'bg-gray-100 cursor-not-allowed' 
                                          : 'bg-white cursor-pointer focus:ring-2 focus:ring-[#336600] focus:border-transparent'
                                      }`}
                                    >
                                      {paymentStatusOptions.map(option => (
                                        <option 
                                          key={option.value} 
                                          value={option.value}
                                          className={`text-${option.color}-700`}
                                        >
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    
                                    {statusUpdating[order._id] && (
                                      <div className="flex items-center gap-1 text-xs text-[#336600]">
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Updating...
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  getPaymentStatusBadge(
                                    order.paymentStatus || 
                                    order.payment?.status || 
                                    (order.paymentId ? 'completed' : 'pending')
                                  )
                                )}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {order.items ? order.items.length : order.products?.length || 0} items
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(order.finalAmount || order.totalAmount || 0)}
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                  <button
                                    onClick={() => fetchOrderReceipt(orderId)}
                                    className="px-2 py-1 sm:px-3 sm:py-1 bg-gradient-to-r from-[#336600] to-[#2a5200] text-white text-xs sm:text-sm rounded hover:from-[#2a5200] hover:to-[#1e3d00] transition-colors whitespace-nowrap"
                                  >
                                    View Receipt
                                  </button>
                                  
                                  {userRole === 'admin' && (
                                    <button
                                      onClick={() => setDeleteModal({ 
                                        show: true, 
                                        orderId: order._id, 
                                        orderNumber: order.orderId || order.orderNumber || order._id 
                                      })}
                                      className="px-2 py-1 sm:px-3 sm:py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs sm:text-sm rounded hover:from-red-600 hover:to-red-700 transition-colors whitespace-nowrap"
                                      title="Delete order permanently"
                                    >
                                      Delete
                                    </button>
                                  )}
                                  
                                  {isRefundableOrder ? (
                                    <div className="relative">
                                      <button
                                        onClick={() => processRefund(order)}
                                        disabled={refundLoading && activeRefundOrderId === order._id}
                                        className={`px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm rounded transition-colors whitespace-nowrap flex items-center justify-center gap-1 min-w-[70px] ${
                                          refundLoading && activeRefundOrderId === order._id
                                            ? 'bg-gradient-to-r from-red-300 to-red-300 text-white cursor-not-allowed'
                                            : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                                        }`}
                                        title="Refund cancelled order"
                                      >
                                        {refundLoading && activeRefundOrderId === order._id ? (
                                          <>
                                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing
                                          </>
                                        ) : (
                                          'Refund'
                                        )}
                                      </button>
                                      
                                      {currentRefundStatus && (
                                        <div className={`absolute top-full left-0 mt-1 px-2 py-1 text-xs rounded whitespace-nowrap z-10 ${
                                          currentRefundStatus.status === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                                          currentRefundStatus.status === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                                          'bg-blue-100 text-blue-800 border border-blue-200'
                                        }`}>
                                          {currentRefundStatus.message}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      {order.orderStatus === 'cancelled' && order.paymentStatus === 'completed' && !order.paymentId && (
                                        <span className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-100 text-gray-600 text-xs sm:text-sm rounded border border-gray-200 whitespace-nowrap text-center" title="Cannot refund: Missing payment ID">
                                          No Payment ID
                                        </span>
                                      )}
                                      
                                      {order.orderStatus === 'cancelled' && order.paymentStatus !== 'completed' && order.paymentStatus !== 'partially_refunded' && (
                                        <span className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-100 text-gray-600 text-xs sm:text-sm rounded border border-gray-200 whitespace-nowrap text-center" title={`Cannot refund: Payment status is ${order.paymentStatus}`}>
                                          Not Paid
                                        </span>
                                      )}
                                      
                                      {order.orderStatus !== 'cancelled' && order.paymentStatus === 'completed' && (
                                        <span className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm rounded border border-blue-200 whitespace-nowrap text-center">
                                          {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                                        </span>
                                      )}
                                      
                                      {order.paymentStatus === 'refunded' && (
                                        <span className="px-2 py-1 sm:px-3 sm:py-1 bg-green-100 text-green-800 text-xs sm:text-sm rounded border border-green-200 whitespace-nowrap text-center flex items-center gap-1">
                                          <span>✅</span>
                                          Refunded
                                        </span>
                                      )}
                                      
                                      {order.paymentStatus === 'partially_refunded' && (
                                        <span className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm rounded border border-blue-200 whitespace-nowrap text-center flex items-center gap-1">
                                          <span>↩️</span>
                                          Partial
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                              </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {showReceiptModal && (
        <ReceiptModal
          order={selectedOrder}
          onClose={() => setShowReceiptModal(false)}
          onPrint={printReceipt}
          onDownloadPDF={() => {
            const orderId = selectedOrder?.receipt?.receiptNumber || 
                           selectedOrder?.receipt?._id || 
                           selectedOrder?.receipt?.orderId || 
                           selectedOrder?.receipt?.id ||
                           selectedOrder?._id || 
                           selectedOrder?.id || 
                           selectedOrder?.orderId;
            
            console.log('📋 Download PDF clicked with order ID:', orderId);
            
            if (!orderId) {
              alert('❌ Cannot download PDF: Order ID not found. Please try viewing the receipt first.');
              return;
            }
            
            downloadPDFReceipt(orderId);
          }}
        />
      )}

      <DeleteConfirmationModal
        show={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, orderId: null, orderNumber: null })}
        onConfirm={() => handleDeleteOrder(deleteModal.orderId, deleteModal.orderNumber)}
        orderNumber={deleteModal.orderNumber}
      />
    </div>
  );
};

export default OrdersPage;