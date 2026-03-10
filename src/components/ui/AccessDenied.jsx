import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AccessDenied = ({ reason = 'default' }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Configuration for different denial reasons
    const config = {
        default: {
            title: 'Access Denied',
            message: "You don't have permission to access this page. This area is restricted to administrators only.",
            iconColor: 'bg-red-100',
            iconTextColor: 'text-red-600',
            showDashboardButton: true
        },
        terminated: {
            title: 'Account Terminated',
            message: 'Your account has been terminated. You no longer have access to the EMS system. Please contact the system administrator if you believe this is an error.',
            iconColor: 'bg-red-100',
            iconTextColor: 'text-red-600',
            showDashboardButton: false
        }
    };

    const currentConfig = config[reason] || config.default;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-6">
                    <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${currentConfig.iconColor}`}>
                        <svg className={`h-6 w-6 ${currentConfig.iconTextColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {currentConfig.title}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    {currentConfig.message}
                </p>
                <div className="space-y-3">
                    {currentConfig.showDashboardButton ? (
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Go to Dashboard
                        </button>
                    ) : (
                        <button
                            onClick={handleLogout}
                            className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                        >
                            Logout
                        </button>
                    )}
                    
                    <p className="text-xs text-gray-400">
                        Logged in as: {user?.name} ({user?.role})
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;