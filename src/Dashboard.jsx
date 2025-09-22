import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faUser, faClock, faPaintRoller, faCheckCircle, faTimesCircle, faArrowLeft, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import './Dashboard.css';

const Dashboard = () => {
    const [waitingOrders, setWaitingOrders] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [role, setRole] = useState('User'); // Default role
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState('User');
    const navigate = useNavigate();

    const API_BASE_URL = 'https://5000-i3mu6m702cub4jvtemj1f-df2635a1.manusvm.computer';
    const BASE_URL = process.env.REACT_APP_API_URL || "https://queue-backendser.onrender.com";

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        setRefreshing(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/orders`);
            const allOrders = response.data;
            setWaitingOrders(allOrders.filter(order => order.status === 'Waiting'));
            setActiveOrders(allOrders.filter(order => order.status !== 'Waiting' && order.status !== 'Completed'));
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { status: newStatus });
            fetchOrders(); // Refresh orders after status update
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const handleLoginAsAdmin = () => {
        setShowRoleModal(true);
    };

    const handleRoleSelect = (e) => {
        setSelectedRole(e.target.value);
    };

    const handleRoleLogin = () => {
        setRole(selectedRole);
        setShowRoleModal(false);
        if (selectedRole === 'Admin') {
            navigate('/admin-orders');
        }
    };

    const handleCancelRoleLogin = () => {
        setShowRoleModal(false);
        setSelectedRole('User'); // Reset selected role
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Mixing': return 'bg-blue-500';
            case 'Spraying': return 'bg-yellow-500';
            case 'Quality Check': return 'bg-purple-500';
            case 'Ready for Collection': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <header className="flex justify-between items-center bg-white shadow p-4 rounded-lg mb-4">
                <div className="flex items-center">
                    <FontAwesomeIcon icon={faPaintRoller} className="text-xl text-gray-700 mr-2" />
                    <h1 className="text-xl font-semibold text-gray-800">Queue System Dashboard</h1>
                </div>
                <div className="flex items-center">
                    <span className="mr-2 text-gray-600">Role: {role}</span>
                    {role === 'User' && (
                        <button
                            onClick={handleLoginAsAdmin}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        >
                            Login as Admin
                        </button>
                    )}
                    {role === 'Admin' && (
                        <button
                            onClick={() => navigate('/admin-report')}
                            className="ml-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                        >
                            View Report
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Waiting Orders */}
                <div className="bg-white shadow rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-blue-700 mb-3">
                        <FontAwesomeIcon icon={faClock} className="mr-2" /> Waiting Orders: {waitingOrders.length}
                    </h2>
                    {waitingOrders.length === 0 ? (
                        <p className="text-gray-500">No waiting orders.</p>
                    ) : (
                        <div className="space-y-3">
                            {waitingOrders.map(order => (
                                <div key={order._id} className="bg-blue-50 border border-blue-200 p-3 rounded-md shadow-sm">
                                    <p className="font-medium">ID: {order.transactionId}</p>
                                    <p className="text-sm text-gray-600">Client: {order.clientName}</p>
                                    <p className="text-sm text-gray-600">Quantity: {order.paintQuantity}</p>
                                    <p className="text-sm text-gray-600">Details: {order.carDetails} - {order.colourCode}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Active Orders */}
                <div className="bg-white shadow rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-green-700 mb-3">
                        <FontAwesomeIcon icon={faCheckCircle} className="mr-2" /> Active Orders: {activeOrders.length}
                    </h2>
                    <div className="flex justify-between items-center mb-3">
                        <button
                            onClick={fetchOrders}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                            disabled={refreshing}
                        >
                            <FontAwesomeIcon icon={faSync} className={refreshing ? 'animate-spin mr-1' : 'mr-1'} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button
                            onClick={() => navigate('/add-order')}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} className="mr-1" /> Back To Add Order
                        </button>
                    </div>
                    {activeOrders.length === 0 ? (
                        <p className="text-gray-500">No active orders.</p>
                    ) : (
                        <div className="space-y-3">
                            {activeOrders.map(order => (
                                <div key={order._id} className="bg-green-50 border border-green-200 p-3 rounded-md shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-medium">ID: {order.transactionId}</p>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(order.status)} text-white`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{order.clientName} ({order.cellNumber})</p>
                                    <p className="text-sm text-gray-600">{order.carDetails} - {order.paintQuantity}</p>
                                    <p className="text-sm text-gray-600">Col Code: {order.colourCode}</p>
                                    <p className="text-sm text-gray-600">PO Type: {order.poOption}</p>
                                    {order.note && <p className="text-sm text-gray-600">Note: {order.note}</p>}
                                    <div className="mt-2 flex items-center">
                                        <label htmlFor={`status-${order._id}`} className="sr-only">Change Status</label>
                                        <select
                                            id={`status-${order._id}`}
                                            value={order.status}
                                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                        >
                                            <option value="Mixing">Mixing</option>
                                            <option value="Spraying">Spraying</option>
                                            <option value="Quality Check">Quality Check</option>
                                            <option value="Ready for Collection">Ready for Collection</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Role Selection Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Select Role</h3>
                        <select
                            onChange={handleRoleSelect}
                            value={selectedRole}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                        </select>
                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                onClick={handleCancelRoleLogin}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRoleLogin}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                            >
                                Login
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



export default Dashboard;


