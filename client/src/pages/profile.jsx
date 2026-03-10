import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar.jsx';

export default function Profile() {
    const [userProfile, setUserProfile] = useState({
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    // Order management state
    const [userOrders, setUserOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'orders'

    // Fetch user profile and orders on component mount
    useEffect(() => {
        fetchUserProfile();
    }, []);
    
    // Fetch orders when user profile is loaded and tab is orders
    useEffect(() => {
        if (userProfile.email && activeTab === 'orders') {
            fetchUserOrders();
        }
    }, [userProfile.email, activeTab]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axios.get(
                import.meta.env.VITE_BACKEND_URL + '/api/auth/profile',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            setUserProfile({
                firstname: response.data.firstname || '',
                lastname: response.data.lastname || '',
                email: response.data.email || '',
                phone: response.data.phone || '',
             
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            setError('Failed to load profile information');
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchUserOrders = async () => {
        try {
            setOrdersLoading(true);
            const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
            const response = await axios.get(
                `${apiUrl}/api/admin/orders/customer/${encodeURIComponent(userProfile.email)}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            setUserOrders(response.data.data.orders || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setError('Failed to load order history');
        } finally {
            setOrdersLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
            processing: 'bg-purple-100 text-purple-800 border-purple-200',
            shipping: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            delivered: 'bg-green-100 text-green-800 border-green-200',
            cancelled: 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserProfile(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
        setSuccessMessage('');
    };

    const validateForm = () => {
        const { firstname, lastname, email, phone } = userProfile;
        
        if (!firstname || !lastname || !email || !phone) {
            setError('Please fill in all required fields');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return false;
        }

        const phoneRegex = /^\d{10,}$/;
        if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
            setError('Please enter a valid phone number (at least 10 digits)');
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            setError('');
            setSuccessMessage('');

            const response = await axios.put(
                import.meta.env.VITE_BACKEND_URL + '/api/auth/profile', 
                userProfile,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            setSuccessMessage('Profile updated successfully!');
            setIsEditing(false);
            
            // Update profile with response data
            if (response.data.user) {
                setUserProfile({
                    firstname: response.data.user.firstname || '',
                    lastname: response.data.user.lastname || '',
                    email: response.data.user.email || '',
                    phone: response.data.user.phone || '',
                    
                });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setError(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setError('');
        setSuccessMessage('');
        fetchUserProfile(); // Reset to original values
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-48"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              <Navbar />
        
        <div className="h-screen bg-gray-50 py-8 flex items-center justify-center overflow-y-auto scrollbar-hide">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
                        <h1 className="text-3xl font-bold text-white">User Dashboard</h1>
                        <p className="text-white opacity-90 mt-2">Manage your account and view order history</p>
                    </div>
                    
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'profile'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Profile Information
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'orders'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Order History ({userOrders.length})
                            </button>
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {successMessage && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-green-600">{successMessage}</p>
                            </div>
                        )}
                        
                        {/* Tab Content */}
                        {activeTab === 'profile' ? (
                            /* Profile Form */
                            <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* First Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="firstname"
                                        value={userProfile.firstname}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        placeholder="Enter your first name"
                                    />
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="lastname"
                                        value={userProfile.lastname}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        placeholder="Enter your last name"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={userProfile.email}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                    placeholder="Enter your email address"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={userProfile.phone}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                    placeholder="Enter your phone number"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-8 flex justify-end space-x-4">
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                    >
                                        Edit Profile
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleCancel}
                                            disabled={saving}
                                            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Saving...
                                                </span>
                                            ) : (
                                                'Save Changes'
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                            </div>
                        ) : (
                            /* Orders Tab */
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Order History</h2>
                                
                                {ordersLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                        <span className="ml-3 text-gray-600">Loading orders...</span>
                                    </div>
                                ) : userOrders.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                                            <svg fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                                                <path d="M9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                                        <p className="text-gray-600 mb-4">You haven't placed any orders yet. Start shopping to see your order history here!</p>
                                        <button
                                            onClick={() => window.location.href = '/furniture'}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                            Start Shopping
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {userOrders.map((order) => (
                                            <div key={order._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                                {/* Order Header */}
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">Order #{order._id.slice(-8)}</h3>
                                                        <p className="text-sm text-gray-600">Placed on {new Date(order.orderDate).toLocaleDateString()} at {new Date(order.orderDate).toLocaleTimeString()}</p>
                                                    </div>
                                                    <div className="mt-2 sm:mt-0">
                                                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                                                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Room Setup Info */}
                                                <div className="mb-4 p-3 bg-amber-50 rounded-md border border-amber-200">
                                                    <h4 className="text-sm font-medium text-amber-800 mb-2">Room Specifications</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-amber-700">
                                                        <div><span className="font-medium">Size:</span> {order.roomSetup.width}m × {order.roomSetup.length}m × {order.roomSetup.height}m</div>
                                                        <div><span className="font-medium">Wall:</span> <span className="inline-block w-4 h-4 rounded border border-gray-300 ml-1" style={{backgroundColor: order.roomSetup.wallColor}}></span> {order.roomSetup.wallColor}</div>
                                                        <div><span className="font-medium">Floor:</span> <span className="inline-block w-4 h-4 rounded border border-gray-300 ml-1" style={{backgroundColor: order.roomSetup.floorColor}}></span> {order.roomSetup.floorColor}</div>
                                                        <div><span className="font-medium">Items:</span> {order.items.reduce((total, item) => total + item.quantity, 0)} pieces</div>
                                                    </div>
                                                </div>
                                                
                                                {/* Order Items */}
                                                <div className="mb-4">
                                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Items Ordered</h4>
                                                    <div className="space-y-2">
                                                        {order.items.map((item, index) => (
                                                            <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs">
                                                                        🪑
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                                                        <p className="text-xs text-gray-600">{item.category}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                                                                    <p className="text-xs text-gray-600">{item.quantity} × ${item.price.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                {/* Order Total */}
                                                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                                    <div className="text-sm text-gray-600">
                                                        {order.notes && (
                                                            <p><span className="font-medium">Notes:</span> {order.notes}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-gray-900">${order.pricing.total.toFixed(2)}</p>
                                                        <p className="text-xs text-gray-600">Including ${order.pricing.tax.toFixed(2)} tax</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}