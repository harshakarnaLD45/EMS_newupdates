import React, { useState, useEffect } from 'react';
import { Users, Calendar, AlertTriangle, UserPlus, FileText, RefreshCw, X, Info, DollarSign, Package, CheckCircle, XCircle, Trash2, Clock, Image, Download, Pencil, Plus } from 'lucide-react';
import { Tooltip } from '@mui/material';
import { adminApi, leaveApi, timesheetComplianceApi, employeeApi, reimbursementApi, inventoryApi, supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AddEmployeeForm, ReimbursementRequestForm, InventoryRequestForm } from '../../components';
import './AdminDashboard.css';
import * as Dialog from '@radix-ui/react-dialog';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

const AdminDashboard = () => {
    const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'reimbursements' | 'inventory'
    const [dashboardStats, setDashboardStats] = useState({
        totalEmployees: { count: 0, change: '+0 this month' },
        activeToday: { count: 0, rate: 'Loading...' },
        onLeave: { count: 0, details: 'Loading...' },
        pendingApprovals: { count: 0, details: 'Loading...' }
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [pendingTimesheets, setPendingTimesheets] = useState([]);
    const [timesheetCompliance, setTimesheetCompliance] = useState({ warnings: [], autoLeaves: [] });
    const [dismissedAlerts, setDismissedAlerts] = useState({ warnings: [], autoLeaves: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    // Reimbursement state
    const [reimbursementRequests, setReimbursementRequests] = useState([]);
    const [reimbursementStats, setReimbursementStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0
    });
    const [processingReimbursementIds, setProcessingReimbursementIds] = useState(new Set());

    // Inventory state
    const [inventoryItems, setInventoryItems] = useState([]);
    const [inventoryStats, setInventoryStats] = useState({
        total: 0,
        laptops: 0,
        monitors: 0,
        others: 0
    });
    const [inventoryEmployeeFilter, setInventoryEmployeeFilter] = useState('all');

    // Image preview state
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

    // Receipt preview state
    const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
    const [selectedReimbursement, setSelectedReimbursement] = useState(null);

    // Edit reimbursement state
    const [editReimbursementOpen, setEditReimbursementOpen] = useState(false);
    const [reimbursementToEdit, setReimbursementToEdit] = useState(null);

    // New reimbursement request state
    const [newReimbursementOpen, setNewReimbursementOpen] = useState(false);

    // Inventory dialog state
    const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            //console.log('🚀 Starting to load dashboard data...');

            // Try optimized aggregated stats first (reads directly from employees table)
            try {
                //console.log('📈 Attempting to fetch aggregated dashboard stats...');
                const quickStats = await adminApi.getDashboardStats();
                if (quickStats && typeof quickStats.totalEmployees !== 'undefined') {
                    //console.log('✅ Aggregated dashboard stats received:', quickStats);
                    setDashboardStats({
                        totalEmployees: {
                            count: quickStats.totalEmployees || 0,
                            change: `+${quickStats.newEmployeesThisMonth || 0} this month`
                        },
                        activeToday: {
                            count: quickStats.activeEmployeesToday || 0,
                            rate: quickStats.totalEmployees > 0 ?
                                `${Math.round(((quickStats.activeEmployeesToday || 0) / (quickStats.totalEmployees || 1)) * 100)}% attendance` :
                                '0% attendance'
                        },
                        onLeave: {
                            count: quickStats.employeesOnLeave || 0,
                            details: quickStats.employeesOnLeave > 0 ? `${quickStats.employeesOnLeave} currently on leave` : 'No one on leave today'
                        },
                        pendingApprovals: {
                            count: (quickStats.pendingRequests || 0) + (quickStats.pendingTimesheets || 0),
                            details: quickStats.pendingRequests > 0 || quickStats.pendingTimesheets > 0 ?
                                `${quickStats.pendingRequests} leave requests + ${quickStats.pendingTimesheets} timesheets` :
                                'All items processed'
                        }
                    });
                }
            } catch (quickStatsError) {
                console.warn('⚠️ Could not fetch aggregated dashboard stats (fallback to manual):', quickStatsError?.message || quickStatsError);
            }

            // Debug database connection first
            try {
                const debugResult = await adminApi.debugDatabase();
                //console.log('🔍 Database debug result:', debugResult);
            } catch (debugError) {
                console.error('⚠️ Debug failed:', debugError);
            }

            // Fetch employees data (admins are NOT employees)
            let allStaff, activity, leaveRequests, timesheets;

            try {
                //console.log('👥 Fetching employees only...');
                allStaff = await adminApi.getAllEmployeesAndAdmins();
                //console.log('✅ Employee data loaded:', allStaff?.length || 0);
                //console.log('📋 Sample employee data:', allStaff?.slice(0, 2));

                if (!allStaff || allStaff.length === 0) {
                    console.warn('⚠️ No employee data returned - checking employees table...');

                    // Try fetching employees directly
                    const { employeeApi } = await import('../../utils/supabase');
                    const employees = await employeeApi.getEmployees();
                    //console.log('📊 Direct employees query:', employees?.length || 0);

                    allStaff = employees || [];
                }
            } catch (staffError) {
                console.error('❌ Error loading employee data:', staffError);
                setError(`Employee loading failed: ${staffError.message}`);
                allStaff = [];
            }

            try {
                //console.log('📋 Fetching leave requests...');
                const { supabase } = await import('../../utils/supabase');
                const { data: leaves, error: leaveError } = await supabase
                    .from('leave_requests')
                    .select('*');

                if (leaveError) {
                    console.error('❌ Leave requests error:', leaveError);
                    throw leaveError;
                }

                leaveRequests = leaves || [];
                //console.log('✅ Leave requests loaded:', leaveRequests.length);
                //console.log('📋 Sample leave request:', leaveRequests[0]);
            } catch (leaveError) {
                console.error('❌ Error loading leave requests:', leaveError);
                setError(`Leave requests failed: ${leaveError.message}`);
                leaveRequests = [];
            }

            try {
                //console.log('⏰ Fetching timesheets...');
                const { supabase } = await import('../../utils/supabase');
                const { data: timesheetData, error: timesheetError } = await supabase
                    .from('timesheets')
                    .select('*');

                if (timesheetError) {
                    console.error('❌ Timesheets error:', timesheetError);
                    throw timesheetError;
                }

                timesheets = timesheetData || [];
                //console.log('✅ Timesheets loaded:', timesheets.length);
                //console.log('📋 Sample timesheet:', timesheets[0]);
            } catch (timesheetError) {
                console.error('❌ Error loading timesheets:', timesheetError);
                setError(`Timesheets failed: ${timesheetError.message}`);
                timesheets = [];
            }

            // Calculate stats from the fetched data
            const currentMonth = new Date().toISOString().slice(0, 7);
            const today = new Date().toISOString().slice(0, 10);

            // All staff are employees (no admin filtering needed)
            const employees = allStaff;

            const pendingLeaves = leaveRequests.filter(req =>
                !req.status || req.status === 'pending' || req.status === null
            );
            const approvedLeaves = leaveRequests.filter(req => req.status === 'approved');
            const activeLeaves = approvedLeaves.filter(req =>
                req.start_date <= today && req.end_date >= today
            );

            // Get employee IDs who are currently on leave
            const employeeIdsOnLeave = activeLeaves.map(leave => leave.employee_id || leave.user_id);

            // Calculate employees who are active today (not on leave and with active status)
            const activeEmployeesToday = allStaff.filter(emp => {
                // Must have active status
                const hasActiveStatus = !emp.status ||
                    emp.status === 'active' ||
                    emp.status === 'Active';

                // Must NOT be on leave today
                const isNotOnLeave = !employeeIdsOnLeave.includes(emp.id) &&
                    !employeeIdsOnLeave.includes(emp.employee_id);

                return hasActiveStatus && isNotOnLeave;
            });

            // Also count people with active status from database (for total active count)
            const activeStaff = allStaff.filter(emp =>
                !emp.status || emp.status === 'active' || emp.status === 'Active'
            );
            // Filter pending timesheets - match database query logic
            const pendingTimesheets = timesheets.filter(ts =>
                !ts.status || ts.status === 'pending' || ts.status === 'submitted' || ts.status === null
            );

            // //console.log('🔍 Timesheet status debugging:');
            // console.log('   - Total timesheets fetched:', timesheets.length);
            // console.log('   - All timesheets:', timesheets.map(ts => ({
            //     id: ts.id,
            //     status: ts.status,
            //     status_type: typeof ts.status,
            //     employee_id: ts.employee_id,
            //     date: ts.date,
            //     hours: ts.hours
            // })));
            // console.log('   - Pending timesheets after filter:', pendingTimesheets.length);
            // console.log('   - Pending timesheet details:', pendingTimesheets.map(ts => ({
            //     id: ts.id,
            //     status: ts.status,
            //     employee_id: ts.employee_id,
            //     date: ts.date
            // })));

            const newStaffThisMonth = allStaff.filter(emp =>
                emp.created_at && emp.created_at.startsWith(currentMonth)
            ).length;

            const stats = {
                totalEmployees: allStaff?.length || 0,
                employeesCount: employees?.length || 0,
                activeStaff: activeStaff?.length || 0,
                activeEmployeesToday: activeEmployeesToday?.length || 0,
                newEmployeesThisMonth: newStaffThisMonth || 0,
                pendingRequests: pendingLeaves?.length || 0,
                approvedLeaves: approvedLeaves?.length || 0,
                employeesOnLeave: activeLeaves?.length || 0,
                pendingTimesheets: pendingTimesheets?.length || 0
            };

            //console.log('📊 Final calculated stats:', stats);

            if (stats.totalEmployees === 0) {
                console.error('🚨 No employee data found! This indicates a database connection issue.');
                setError('No employee data found. Please check database connection and tables.');
            }

            // Use the leave requests we already fetched as activity
            activity = leaveRequests.map(req => {
                // Find matching EMPLOYEE by employee_id/id only
                let staffMember = null;

                // First try: exact employee_id match
                if (req.employee_id) {
                    staffMember = employees.find(emp =>
                        emp.employee_id === req.employee_id
                    );
                }

                // Second try: if no match, try id match
                if (!staffMember && req.employee_id) {
                    staffMember = employees.find(emp =>
                        emp.id === req.employee_id
                    );
                }

                // Third try: if still no match, try user_id match
                if (!staffMember && req.user_id) {
                    staffMember = employees.find(emp =>
                        emp.id === req.user_id
                    );
                }

                // Log mismatch for debugging
                if (!staffMember && (req.employee_id || req.user_id)) {
                    console.warn('⚠️ No employee found for leave request:', {
                        request_id: req.id,
                        employee_id: req.employee_id,
                        user_id: req.user_id
                    });
                }

                // Log successful matches for verification
                if (staffMember) {
                    // console.log('✅ Matched leave request to employee:', {
                    //     request_id: req.id,
                    //     employee_name: staffMember.name,
                    //     employee_id: staffMember.employee_id,
                    //     employee_record_id: staffMember.id
                    // });
                }

                return {
                    ...req,
                    employees: staffMember ? {
                        name: staffMember.name,
                        email: staffMember.email,
                        role: staffMember.role
                    } : null
                };
            });

            //console.log('📋 Processed activity with staff info:', activity.length);

            // Process pending timesheets with employee info
            const enrichedTimesheets = pendingTimesheets.map(timesheet => {
                // Enhanced matching logic with more precise criteria
                let staffMember = null;

                // First try: exact employee_id match
                if (timesheet.employee_id) {
                    staffMember = employees.find(emp =>
                        emp.employee_id === timesheet.employee_id
                    );
                }

                // Second try: if no match, try id match
                if (!staffMember && timesheet.employee_id) {
                    staffMember = employees.find(emp =>
                        emp.id === timesheet.employee_id
                    );
                }

                // Third try: if still no match, try user_id match
                if (!staffMember && timesheet.user_id) {
                    staffMember = employees.find(emp =>
                        emp.id === timesheet.user_id
                    );
                }

                // Log mismatch for debugging
                if (!staffMember && timesheet.employee_id) {
                    console.warn('⚠️ No employee found for timesheet:', {
                        timesheet_id: timesheet.id,
                        employee_id: timesheet.employee_id,
                        user_id: timesheet.user_id
                    });
                }

                return {
                    ...timesheet,
                    employee_name: staffMember ? staffMember.name : `Employee ${timesheet.employee_id || timesheet.user_id || 'Unknown'}`
                };
            });

            //console.log('⏰ Processed timesheets with staff info:', enrichedTimesheets.length);
            //console.log('📋 Enriched timesheets data:', enrichedTimesheets);
            setPendingTimesheets(enrichedTimesheets);

            // Final verification - compare stats vs actual state
            //console.log('🏁 Final verification:');
            //console.log('   - Stats pending timesheets:', stats.pendingTimesheets);
            //console.log('   - Actual pending timesheets being set:', enrichedTimesheets.length);

            // Fetch timesheet compliance data for all employees and auto-process leaves
            try {
                const employees = await employeeApi.getEmployees();
                const allWarnings = [];
                const allAutoLeaves = [];
                const processedLeaves = [];

                for (const employee of employees) {
                    try {
                        const employeeId = employee.employee_id || employee.id;
                        const complianceResult = await timesheetComplianceApi.checkMissingTimesheets(employeeId);

                        // Add warnings with employee info
                        if (complianceResult.warnings && complianceResult.warnings.length > 0) {
                            complianceResult.warnings.forEach(warning => {
                                allWarnings.push({
                                    employee_id: employeeId,
                                    employee_name: employee.name,
                                    date: warning.date,
                                    message: warning.message
                                });
                            });
                        }

                        // Automatically process auto-leaves immediately (don't wait for employee login)
                        if (complianceResult.autoLeaveRequired && complianceResult.autoLeaveRequired.length > 0) {
                            for (const autoLeave of complianceResult.autoLeaveRequired) {
                                try {
                                    // Create the auto-leave immediately
                                    const createdLeave = await timesheetComplianceApi.createAutoLeaveForMissingTimesheet(employeeId, autoLeave.date);
                                    processedLeaves.push({
                                        employee_id: employeeId,
                                        employee_name: employee.name,
                                        date: autoLeave.date,
                                        status: 'deducted',
                                        message: `Leave deducted for ${autoLeave.date}`
                                    });
                                    console.log(`✅ Auto-leave processed for ${employee.name} on ${autoLeave.date}`);
                                } catch (leaveError) {
                                    // If leave already exists, just add to display list
                                    allAutoLeaves.push({
                                        employee_id: employeeId,
                                        employee_name: employee.name,
                                        date: autoLeave.date,
                                        message: autoLeave.message,
                                        status: 'already_processed'
                                    });
                                }
                            }
                        }
                    } catch (complianceError) {
                        console.error(`⚠️ Error checking compliance for employee ${employee.name}:`, complianceError);
                    }
                }

                setTimesheetCompliance({
                    warnings: allWarnings,
                    autoLeaves: [...allAutoLeaves, ...processedLeaves]
                });

                console.log('📋 Timesheet compliance loaded:', {
                    warnings: allWarnings.length,
                    autoLeaves: allAutoLeaves.length,
                    processedLeaves: processedLeaves.length
                });
            } catch (complianceError) {
                console.error('❌ Error loading timesheet compliance:', complianceError);
            }

            setDashboardStats({
                totalEmployees: {
                    count: stats.totalEmployees,
                    change: `+${stats.newEmployeesThisMonth} this month`
                },
                activeToday: {
                    count: stats.activeEmployeesToday,
                    rate: stats.totalEmployees > 0 ?
                        `${Math.round((stats.activeEmployeesToday / stats.totalEmployees) * 100)}% attendance` :
                        '0% attendance'
                },
                onLeave: {
                    count: stats.employeesOnLeave,
                    details: stats.employeesOnLeave > 0 ?
                        `${stats.employeesOnLeave} currently on leave` :
                        'No one on leave today'
                },
                pendingApprovals: {
                    count: stats.pendingRequests + stats.pendingTimesheets,
                    details: stats.pendingRequests > 0 || stats.pendingTimesheets > 0 ?
                        `${stats.pendingRequests} leave requests + ${stats.pendingTimesheets} timesheets` :
                        'All items processed'
                }
            });

            //console.log('🎯 Setting recent activity:', activity);
            setRecentActivity(activity || []);

            // Check and update employee statuses after leave ends
            try {
                //console.log('🔄 Checking employee statuses after leave periods...');
                const today = new Date().toISOString().slice(0, 10);

                // Get all employees who might need status updates
                const employeesToCheck = allStaff.filter(emp =>
                    emp.status && (emp.status.toLowerCase().includes('leave') || emp.status.toLowerCase() === 'on-leave')
                );

                //console.log('👥 Found employees with leave status to check:', employeesToCheck.length);

                for (const employee of employeesToCheck) {
                    try {
                        await adminApi.updateEmployeeStatusAfterLeave(employee.employee_id || employee.id);
                    } catch (statusError) {
                        console.warn('⚠️ Could not update status for employee:', employee.id, statusError.message);
                    }
                }

                if (employeesToCheck.length > 0) {
                    //console.log('✅ Completed employee status checks');
                }
            } catch (statusCheckError) {
                console.warn('⚠️ Error during employee status check:', statusCheckError.message);
            }

            if (activity && activity.length > 0) {
                //console.log('✅ Successfully loaded real data from Supabase');
            } else {
                ////console.log('⚠️ No activity data found - this might be expected if no leave requests exist');
                setError('No leave requests found in database.');
            }

        } catch (error) {
            console.error('❌ Critical error loading dashboard data:', error);
            setError(`Failed to load data: ${error.message}`);

            // Set fallback empty stats to prevent undefined errors
            setDashboardStats({
                totalEmployees: { count: 0, change: 'Database connection error' },
                activeToday: { count: 0, rate: 'Unable to calculate' },
                onLeave: { count: 0, details: 'Data unavailable' },
                pendingApprovals: { count: 0, details: 'Cannot load requests' }
            });

            setRecentActivity([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const [actionLoading, setActionLoading] = useState(null); // Track which action is loading
    const [actionStatus, setActionStatus] = useState({}); // Track action status messages

    const handleStatusChange = async (id, type, action, reason = '') => {
        const isTimesheet = type === 'timesheet';
        const actionType = action === 'approve' ? 'approving' : 'rejecting';
        const actionPast = action === 'approve' ? 'approved' : 'rejected';
        const itemType = isTimesheet ? 'timesheet' : 'leave request';

        if (!id) {
            console.error(`No ${itemType} ID provided`);
            return;
        }

        try {
            setActionLoading(id);
            setActionStatus(prev => ({ ...prev, [id]: actionType }));

            if (isTimesheet) {
                const { supabase } = await import('../../utils/supabase');
                const updateData = {
                    status: actionPast
                };
                const { error } = await supabase
                    .from('timesheets')
                    .update(updateData)
                    .eq('id', id);
                if (error) throw error;
            } else {
                // Handle leave requests
                const { supabase } = await import('../../utils/supabase');
                const updateData = {
                    status: actionPast
                };
                const { error } = await supabase
                    .from('leave_requests')
                    .update(updateData)
                    .eq('id', id);
                if (error) throw error;
            }

            // Update status and show message
            setActionStatus(prev => ({ ...prev, [id]: actionPast }));
            setError(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} ${actionPast} successfully!`);

            // Clean up status after delay
            const cleanupDelay = setTimeout(() => {
                setActionStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[id];
                    return newStatus;
                });
                setError(null);
            }, 3000);

            // Refresh data after a short delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            await loadDashboardData();

            return () => clearTimeout(cleanupDelay);
        } catch (error) {
            console.error(`Failed to ${action} ${itemType}:`, error);
            setActionStatus(prev => ({ ...prev, [id]: 'error' }));
            setError(`Failed to ${action} ${itemType}: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    // Simplified handler functions that use the common handleStatusChange
    const handleApproveRequest = async (requestId) => {
        if (!requestId) {
            console.error('No leave request ID provided');
            return;
        }

        try {
            setActionLoading(requestId);
            setActionStatus(prev => ({ ...prev, [requestId]: 'approving' }));

            // Use adminApi.approveLeaveRequest which includes employee status update
            const result = await adminApi.approveLeaveRequest(requestId);

            // Update status and show message
            setActionStatus(prev => ({ ...prev, [requestId]: 'approved' }));
            setError('Leave request approved successfully! Employee status updated.');

            // Refresh data to show updated status
            setTimeout(() => {
                loadDashboardData();
            }, 1000);

            // Clean up status after delay
            setTimeout(() => {
                setActionStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[requestId];
                    return newStatus;
                });
                setError(null);
            }, 3000);

        } catch (error) {
            console.error('Error approving leave request:', error);
            setActionStatus(prev => ({ ...prev, [requestId]: 'error' }));
            setError(`Error approving leave request: ${error.message}`);

            setTimeout(() => {
                setActionStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[requestId];
                    return newStatus;
                });
            }, 3000);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (requestId, reason = 'Rejected by admin') => {
        if (!requestId) {
            console.error('No leave request ID provided');
            return;
        }

        try {
            setActionLoading(requestId);
            setActionStatus(prev => ({ ...prev, [requestId]: 'rejecting' }));

            // Use adminApi.rejectLeaveRequest which includes employee status update
            const result = await adminApi.rejectLeaveRequest(requestId, reason);

            // Update status and show message
            setActionStatus(prev => ({ ...prev, [requestId]: 'rejected' }));
            setError('Leave request rejected successfully! Employee status updated.');

            // Refresh data to show updated status
            setTimeout(() => {
                loadDashboardData();
            }, 1000);

            // Clean up status after delay
            setTimeout(() => {
                setActionStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[requestId];
                    return newStatus;
                });
                setError(null);
            }, 3000);

        } catch (error) {
            console.error('Error rejecting leave request:', error);
            setActionStatus(prev => ({ ...prev, [requestId]: 'error' }));
            setError(`Error rejecting leave request: ${error.message}`);

            setTimeout(() => {
                setActionStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[requestId];
                    return newStatus;
                });
            }, 3000);
        } finally {
            setActionLoading(null);
        }
    };
    const handleApproveTimesheet = (timesheetId) => handleStatusChange(timesheetId, 'timesheet', 'approve');
    const handleRejectTimesheet = (timesheetId, reason) => handleStatusChange(timesheetId, 'timesheet', 'reject', reason);

    // Reimbursement and Inventory handlers
    const loadReimbursementData = async () => {
        try {
            const requests = await reimbursementApi.getAllRequests();
            setReimbursementRequests(requests);

            // Calculate stats
            const stats = {
                pending: 0,
                approved: 0,
                rejected: 0
            };
            requests.forEach(req => {
                if (stats[req.status] !== undefined) {
                    stats[req.status] += parseFloat(req.amount);
                }
            });
            setReimbursementStats(stats);
        } catch (err) {
            console.error('❌ Error loading reimbursement data:', err);
        }
    };

    const loadInventoryData = async () => {
        try {
            const items = await inventoryApi.getAllItems();
            setInventoryItems(items);

            // Calculate stats
            const stats = {
                total: items.length,
                laptops: items.filter(i => i.category?.toLowerCase() === 'laptop').length,
                monitors: items.filter(i => i.category?.toLowerCase() === 'monitor').length,
                others: items.filter(i => !['laptop', 'monitor'].includes(i.category?.toLowerCase())).length
            };
            setInventoryStats(stats);
        } catch (err) {
            console.error('❌ Error loading inventory data:', err);
        }
    };

    const handleApproveReimbursement = async (requestId) => {
        setProcessingReimbursementIds(prev => new Set([...prev, requestId]));

        try {
            await reimbursementApi.updateStatus(requestId, 'approved');
            await loadReimbursementData();
        } catch (err) {
            console.error('❌ Error approving reimbursement:', err);
        } finally {
            setProcessingReimbursementIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
            });
        }
    };

    const handleRejectReimbursement = async (requestId) => {
        setProcessingReimbursementIds(prev => new Set([...prev, requestId]));

        try {
            await reimbursementApi.updateStatus(requestId, 'rejected');
            await loadReimbursementData();
        } catch (err) {
            console.error('❌ Error rejecting reimbursement:', err);
        } finally {
            setProcessingReimbursementIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
            });
        }
    };

    const handleDeleteInventoryItem = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item?')) {
            return;
        }

        try {
            await inventoryApi.deleteItem(itemId);
            await loadInventoryData();
        } catch (err) {
            console.error('❌ Error deleting inventory item:', err);
        }
    };

    // Handle image preview for inventory items
    const handleInventoryImagePreview = (item) => {
        if (item.item_image_url || item.invoice_image_url || item.item_image_path || item.invoice_image_path) {
            setSelectedInventoryItem(item);
            setImagePreviewOpen(true);
        }
    };

    // Close image preview modal
    const closeInventoryImagePreview = () => {
        setImagePreviewOpen(false);
        setSelectedInventoryItem(null);
    };

    // Helper function to get image URL from Supabase storage
    const getInventoryImageUrl = (item, type) => {
        // If we have a direct URL, use it
        if (type === 'item' && item.item_image_url) {
            return item.item_image_url;
        }
        if (type === 'invoice' && item.invoice_image_url) {
            return item.invoice_image_url;
        }

        // Otherwise, generate URL from path
        const path = type === 'item' ? item.item_image_path : item.invoice_image_path;
        if (!path) return null;

        const { data } = supabase.storage
            .from('EMS_bucket')
            .getPublicUrl(path);

        return data?.publicUrl || null;
    };

    // Handle receipt preview click
    const handleReceiptPreview = (request) => {
        if (request.receipt_url || request.receipt_path || request.receipt_name) {
            setSelectedReimbursement(request);
            setReceiptPreviewOpen(true);
        }
    };

    // Close receipt preview
    const closeReceiptPreview = () => {
        setReceiptPreviewOpen(false);
        setSelectedReimbursement(null);
    };

    // Handle edit reimbursement click
    const handleEditReimbursement = (request) => {
        if (request.status === 'pending') {
            setReimbursementToEdit(request);
            setEditReimbursementOpen(true);
        }
    };

    // Close edit reimbursement modal
    const closeEditReimbursement = () => {
        setEditReimbursementOpen(false);
        setReimbursementToEdit(null);
    };

    // Handle successful reimbursement update
    const handleReimbursementUpdateSuccess = (updatedRequest) => {
        setReimbursementRequests(prev =>
            prev.map(req => req.id === updatedRequest.id ? {
                ...updatedRequest,
                amount: parseFloat(updatedRequest.amount)
            } : req)
        );
        closeEditReimbursement();
    };

    // Handle successful new reimbursement creation
    const handleReimbursementSuccess = (newRequest) => {
        setReimbursementRequests(prev => [{
            ...newRequest,
            amount: parseFloat(newRequest.amount),
            employees: { name: user?.name || 'Admin' }
        }, ...prev]);

        // Update stats
        setReimbursementStats(prev => ({
            ...prev,
            pending: prev.pending + 1
        }));

        setNewReimbursementOpen(false);
    };

    // Handle successful inventory request creation
    const handleInventorySuccess = (newItem) => {
        // The newItem from API already includes the correct employees join data
        // No need to override it with admin's name
        setInventoryItems(prev => [newItem, ...prev]);

        // Update stats
        setInventoryStats(prev => ({
            ...prev,
            total: prev.total + 1
        }));

        setInventoryDialogOpen(false);
    };

    // Handle delete reimbursement request
    const handleDeleteReimbursement = async (requestId) => {
        if (!window.confirm('Are you sure you want to delete this reimbursement request? This action cannot be undone.')) {
            return;
        }

        try {
            setProcessingReimbursementIds(prev => new Set(prev).add(requestId));
            await reimbursementApi.deleteRequest(requestId);

            // Remove from local state
            setReimbursementRequests(prev => prev.filter(req => req.id !== requestId));

            // Update stats
            setReimbursementStats(prev => ({
                ...prev,
                pending: prev.pending - 1
            }));
        } catch (error) {
            console.error('Error deleting reimbursement request:', error);
            alert('Failed to delete reimbursement request. Please try again.');
        } finally {
            setProcessingReimbursementIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
            });
        }
    };

    // Handle update payment status for approved reimbursement requests
    const handleUpdatePaymentStatus = async (requestId, paymentStatus) => {
        // Find the current request to check if already paid
        const currentRequest = reimbursementRequests.find(req => req.id === requestId);
        if (currentRequest?.Money_paid === 'Paid') {
            console.error('❌ Payment status is finalized and cannot be changed');
            alert('Payment has already been made. This status cannot be changed.');
            return;
        }
        
        // Prevent changing from Paid to any other status
        if (currentRequest?.Money_paid === 'Paid' && paymentStatus !== 'Paid') {
            console.error('❌ Cannot change payment status from Paid to', paymentStatus);
            alert('Cannot change payment status once it has been marked as Paid.');
            return;
        }
        
        setProcessingReimbursementIds(prev => new Set(prev).add(requestId));
        
        try {
            console.log('💰 Updating payment status:', requestId, paymentStatus);
            
            const { data, error } = await supabase
                .from('reimbursement_requests')
                .update({ 
                    Money_paid: paymentStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .select();
            
            if (error) {
                console.error('❌ Error updating payment status:', error);
                throw error;
            }
            
            // Update local state
            setReimbursementRequests(prev => 
                prev.map(req => 
                    req.id === requestId 
                        ? { ...req, Money_paid: paymentStatus }
                        : req
                )
            );
            
            console.log('✅ Payment status updated successfully:', data);
        } catch (err) {
            console.error('❌ Failed to update payment status:', err);
            alert('Failed to update payment status. Please try again.');
        } finally {
            setProcessingReimbursementIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
            });
        }
    };

    // Helper function to get receipt image URL from Supabase storage
    const getReceiptImageUrl = (request) => {
        // If we have a direct URL, use it
        if (request.receipt_url) {
            return request.receipt_url;
        }

        // Otherwise, generate URL from path
        if (!request.receipt_path) return null;

        const { data } = supabase.storage
            .from('EMS_bucket')
            .getPublicUrl(request.receipt_path);

        return data?.publicUrl || null;
    };

    // Helper function to check if file is PDF
    const isPdfFile = (filename) => {
        if (!filename) return false;
        return filename.toLowerCase().endsWith('.pdf');
    };

    // Helper function to get file type from filename
    const getFileType = (filename) => {
        if (!filename) return 'unknown';
        const lower = filename.toLowerCase();
        if (lower.endsWith('.pdf')) return 'pdf';
        if (lower.endsWith('.png')) return 'png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpeg';
        return 'unknown';
    };

    // Helper function to download file from Supabase storage
    const downloadFile = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error downloading file:', error);
            window.open(url, '_blank');
        }
    };

    // Load data when tab changes
    useEffect(() => {
        if (activeTab === 'reimbursements') {
            loadReimbursementData();
        } else if (activeTab === 'inventory') {
            loadInventoryData();
        }
    }, [activeTab]);

    // Format pending requests for display (show all if no status field)
    const pendingRequests = recentActivity
        .filter(req => !req.status || req.status === 'pending' || req.status === null || req.status === '')
        .slice(0, 5)
        .map(req => {
            // Handle different employee name formats
            let employeeName = 'Unknown Employee';
            if (req.employees) {
                if (req.employees.name) {
                    employeeName = req.employees.name;
                } else if (req.employees.first_name && req.employees.last_name) {
                    employeeName = `${req.employees.first_name} ${req.employees.last_name}`;
                } else if (req.employees.first_name) {
                    employeeName = req.employees.first_name;
                }
            }

            // Calculate days if not provided
            let days = req.days;
            if (!days && req.start_date && req.end_date) {
                const start = new Date(req.start_date);
                const end = new Date(req.end_date);
                days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            }

            return {
                id: req.id,
                name: employeeName,
                type: req.leave_type?.charAt(0).toUpperCase() + req.leave_type?.slice(1) + ' Leave' || 'Leave',
                date: req.start_date && req.end_date
                    ? `${new Date(req.start_date).toLocaleDateString()} - ${new Date(req.end_date).toLocaleDateString()}`
                    : 'Date not available',
                duration: `${days || 1} day${(days || 1) > 1 ? 's' : ''}`,
                rawData: req
            };
        });

    // Debug function - available in browser console as window.debugEmployeeData()
    React.useEffect(() => {
        window.debugEmployeeData = async () => {
            //console.log('🔍 Starting employee data debug...');

            try {
                // Test direct queries
                //console.log('📊 Testing direct database queries...');
                await adminApi.debugDatabase();

                // Test employee name function
                //console.log('👤 Testing employee name function...');
                if (recentActivity && recentActivity.length > 0) {
                    const firstRequest = recentActivity[0];
                    if (firstRequest.rawData?.user_id) {
                        const employeeName = await adminApi.getEmployeeName(firstRequest.rawData.user_id);
                        //console.log('✅ Employee name result:', employeeName);
                    }
                }

                //console.log('📋 Current recentActivity state:', recentActivity);
                //console.log('📋 Current pendingRequests:', pendingRequests);

            } catch (error) {
                console.error('❌ Debug function error:', error);
            }
        };

        return () => {
            delete window.debugEmployeeData;
        };
    }, [recentActivity, pendingRequests]);

    // Format currency helper
    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
    };

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Render functions for tabs - Same pattern as employee dashboard
    const renderReimbursementsTab = () => (
        <div className="section-container">
            {/* Header */}
            <div className="section-header">
                <div>
                    <h2 className="bodyMediumText2 section-title">Reimbursements</h2>
                    <p className="bodyRegularText4 section-subtitle">Manage employee reimbursement requests</p>
                </div>
                <div className="btn_log_leave_section">

                    <Dialog.Root open={newReimbursementOpen} onOpenChange={setNewReimbursementOpen}>
                        <Dialog.Trigger asChild>
                            <button className="quick-action-btn primary bodyMediumText3">
                                <Plus className="w-4 h-4" />
                                New Request
                            </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="dialog-overlay" />
                            <Dialog.Content className="dialog-content">
                                <ReimbursementRequestForm
                                    onClose={() => setNewReimbursementOpen(false)}
                                    onSuccess={handleReimbursementSuccess}
                                />
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                </div>
            </div>

            {/* Stats Row - Same 3-column grid as employee dashboard */}
            <div className="stats-grid-3 mb-2">
                <div className="stats-card">
                    <div className="stats-card_container">
                        <div className="stats-card_header">
                            <div className="stats-card_header_right" style={{ backgroundColor: '#f5f5f5' }}>
                                <Clock size={20} style={{ color: '#f59e0b' }} />
                            </div>
                            <div>
                                <span className="stats_title bodyRegularText4">Pending</span>
                                <div className="stats_hrs bodyMediumText2">{formatCurrency(reimbursementStats.pending)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="stats-card">
                    <div className="stats-card_container">
                        <div className="stats-card_header">
                            <div className="stats-card_header_right" style={{ backgroundColor: '#f5f5f5' }}>
                                <CheckCircle size={20} style={{ color: '#10b981' }} />
                            </div>
                            <div>
                                <span className="stats_title bodyRegularText4">Approved</span>
                                <div className="stats_hrs bodyMediumText2">{formatCurrency(reimbursementStats.approved)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="stats-card">
                    <div className="stats-card_container">
                        <div className="stats-card_header">
                            <div className="stats-card_header_right" style={{ backgroundColor: '#f5f5f5' }}>
                                <XCircle size={20} style={{ color: '#ef4444' }} />
                            </div>
                            <div>
                                <span className="stats_title bodyRegularText4">Rejected</span>
                                <div className="stats_hrs bodyMediumText2">{formatCurrency(reimbursementStats.rejected)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reimbursements Table - Same styling as employee dashboard */}
            <div className="stats-card w-full">
                <div className="section-table-container">
                    <h3 className="bodyRegularText3" style={{ fontWeight: '700', fontSize: '18px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        All Reimbursement Requests
                    </h3>
                    <div className="reimbursement-table-wrapper">
                        <table className="reimbursement-table">
                            <thead>
                                <tr>
                                    <th className="bodyMediumText3" style={{ color: '#6b7280' }}>Employee</th>
                                    <th className="bodyMediumText3" style={{ color: '#6b7280' }}>Category</th>
                                    <th className="bodyMediumText3" style={{ color: '#6b7280' }}>Description</th>
                                    <th className="bodyMediumText3" style={{ color: '#6b7280' }}>Amount</th>
                                    <th className="bodyMediumText3" style={{ color: '#6b7280' }}>Date</th>
                                    <th className="bodyMediumText3" style={{ color: '#6b7280' }}>Receipt</th>
                                    <th className="bodyMediumText3" style={{ color: '#6b7280' }}>Status</th>
                                    <th className="bodyMediumText3" style={{ color: '#6b7280' }}>Payment Status</th>
                                    <th className="bodyMediumText3" style={{ color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reimbursementRequests.map(request => (
                                    <tr key={request.id} className={processingReimbursementIds.has(request.id) ? 'processing-row' : ''}>
                                        <td className="bodyRegularText4">{request.employees?.name || 'Unknown'}</td>
                                        <td className="bodyRegularText4">
                                            <span className="inventory-category-badge">{request.category}</span>
                                        </td>
                                        <td className="bodyRegularText4" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {request.description}
                                        </td>
                                        <td className="bodyRegularText4">{formatCurrency(request.amount)}</td>
                                        <td className="bodyRegularText4">{formatDate(request.date)}</td>
                                        <td>
                                            <div
                                                onClick={() => handleReceiptPreview(request)}
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#f3f4f6',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: (request.receipt_name || request.receipt_url || request.receipt_path) ? 'pointer' : 'default',
                                                    border: (request.receipt_name || request.receipt_url || request.receipt_path) ? '2px solid #3b82f6' : '2px dashed #d1d5db',
                                                    transition: 'all 150ms ease'
                                                }}
                                                title={request.receipt_name ? `Receipt: ${request.receipt_name}` : 'No receipt uploaded'}
                                            >
                                                <FileText size={24} style={{
                                                    color: (request.receipt_name || request.receipt_url || request.receipt_path) ? '#3b82f6' : '#9ca3af'
                                                }} />
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge-pill ${request.status}`}>
                                                {request.status === 'approved' && <CheckCircle size={14} style={{ marginRight: '4px' }} />}
                                                {request.status === 'pending' && <Clock size={14} style={{ marginRight: '4px' }} />}
                                                {request.status === 'rejected' && <XCircle size={14} style={{ marginRight: '4px' }} />}
                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <span 
                                                className={`payment-status-badge ${request.Money_paid === 'Paid' ? 'paid' : 'unpaid'}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    backgroundColor: request.Money_paid === 'Paid' ? '#dcfce7' : '#fee2e2',
                                                    color: request.Money_paid === 'Paid' ? '#166534' : '#991b1b',
                                                    border: `1px solid ${request.Money_paid === 'Paid' ? '#86efac' : '#fca5a5'}`
                                                }}
                                            >
                                                {request.Money_paid === 'Paid' ? (
                                                    <>
                                                        <CheckCircle size={12} style={{ marginRight: '4px' }} />
                                                        Paid
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock size={12} style={{ marginRight: '4px' }} />
                                                        Unpaid
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            {request.status === 'pending' ? (
                                                <div className="action-buttons" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <button
                                                        className="action-btn approve"
                                                        onClick={() => handleApproveReimbursement(request.id)}
                                                        disabled={processingReimbursementIds.has(request.id)}
                                                        title="Approve request"
                                                    >
                                                        {processingReimbursementIds.has(request.id) ? (
                                                            <RefreshCw size={14} className="animate-spin" />
                                                        ) : (
                                                            <CheckCircle size={14} />
                                                        )}
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="action-btn reject"
                                                        onClick={() => handleRejectReimbursement(request.id)}
                                                        disabled={processingReimbursementIds.has(request.id)}
                                                        title="Reject request"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditReimbursement(request)}
                                                        disabled={processingReimbursementIds.has(request.id)}
                                                        title="Edit request"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            backgroundColor: '#f3f4f6',
                                                            cursor: processingReimbursementIds.has(request.id) ? 'not-allowed' : 'pointer',
                                                            transition: 'all 150ms ease',
                                                            opacity: processingReimbursementIds.has(request.id) ? 0.6 : 1
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!processingReimbursementIds.has(request.id)) {
                                                                e.currentTarget.style.backgroundColor = '#e5e7eb';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                                    >
                                                        <Pencil size={16} style={{ color: '#3b82f6' }} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteReimbursement(request.id)}
                                                        disabled={processingReimbursementIds.has(request.id)}
                                                        title="Delete request"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '6px',
                                                            border: 'none',
                                                            backgroundColor: '#fef2f2',
                                                            cursor: processingReimbursementIds.has(request.id) ? 'not-allowed' : 'pointer',
                                                            transition: 'all 150ms ease',
                                                            opacity: processingReimbursementIds.has(request.id) ? 0.6 : 1
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!processingReimbursementIds.has(request.id)) {
                                                                e.currentTarget.style.backgroundColor = '#fecaca';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                    >
                                                        <Trash2 size={16} style={{ color: '#ef4444' }} />
                                                    </button>
                                                </div>
                                            ) : request.status === 'approved' && request.Money_paid !== 'Paid' ? (
                                                <select
                                                    value={request.Money_paid || 'Unpaid'}
                                                    onChange={(e) => handleUpdatePaymentStatus(request.id, e.target.value)}
                                                    disabled={processingReimbursementIds.has(request.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: '#ffffff',
                                                        fontSize: '14px',
                                                        cursor: processingReimbursementIds.has(request.id) ? 'not-allowed' : 'pointer',
                                                        minWidth: '100px',
                                                        opacity: processingReimbursementIds.has(request.id) ? 0.6 : 1
                                                    }}
                                                    title="Update payment status"
                                                >
                                                    <option value="Unpaid">Unpaid</option>
                                                    <option value="Paid">Paid</option>
                                                </select>
                                            ) : request.status === 'approved' && request.Money_paid === 'Paid' ? (
                                                <span 
                                                    className="bodyRegularText5"
                                                    style={{ 
                                                        color: '#166534',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    <CheckCircle size={14} />
                                                    Payment Done
                                                </span>
                                            ) : (
                                                <span className="no-action">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {reimbursementRequests.length === 0 && (
                            <div className="empty-state bodyRegularText4" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                No reimbursement requests found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderInventoryTab = () => {
        // Filter inventory items based on selected employee
        const filteredInventoryItems = inventoryEmployeeFilter === 'all'
            ? inventoryItems
            : inventoryItems.filter(item => item.employees?.name === inventoryEmployeeFilter);

        // Get unique employee names for the filter dropdown
        const employeeNames = Array.from(new Set(inventoryItems.map(item => item.employees?.name).filter(Boolean))).sort();

        return (
            <div className="section-container">
                {/* Header */}
                <div className="section-header">
                    <div>
                        <h2 className="bodyMediumText2 section-title">Inventory</h2>
                        <p className="bodyRegularText4 section-subtitle">Manage company assets assigned to employees</p>
                    </div>
                    <div className="btn_log_leave_section">

                        <Dialog.Root open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
                            <Dialog.Trigger asChild>
                                <button className="quick-action-btn primary bodyMediumText3">
                                    <Plus className="w-4 h-4" />
                                    Add Item
                                </button>
                            </Dialog.Trigger>
                            <Dialog.Portal>
                                <Dialog.Overlay className="dialog-overlay" />
                                <Dialog.Content className="dialog-content">
                                    <InventoryRequestForm
                                        onClose={() => setInventoryDialogOpen(false)}
                                        onSuccess={handleInventorySuccess}
                                    />
                                </Dialog.Content>
                            </Dialog.Portal>
                        </Dialog.Root>
                    </div>
                </div>


                {/* Inventory Table - Same styling as employee dashboard */}
                <div className="stats-card w-full">
                    <div className="section-table-container">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', width: '100%' }}>
                            <h3 className="bodyRegularText3" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                                <Package size={20} style={{ color: '#3b82f6' }} />
                                {inventoryEmployeeFilter === 'all' ? 'All Inventory Items' : `Items for ${inventoryEmployeeFilter}`}
                            </h3>
                            <div>

                                <Select
                                    value={inventoryEmployeeFilter}
                                    onValueChange={(value) => setInventoryEmployeeFilter(value)}
                                >
                                    <SelectTrigger
                                        className="bodyMediumText4"
                                        style={{ minWidth: '200px' }}
                                    >
                                        <SelectValue placeholder="All Employees" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        {employeeNames.map(employeeName => (
                                            <SelectItem key={employeeName} value={employeeName}>
                                                {employeeName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="inventory-table-wrapper">
                            <table className="inventory-table">
                                <thead>
                                    <tr>
                                        <th className="bodyMediumText3" style={{ color: '#6b7280', fontWeight: '500' }}>Employee</th>
                                        <th className="bodyMediumText3" style={{ color: '#6b7280', fontWeight: '500' }}>Item</th>
                                        <th className="bodyMediumText3" style={{ color: '#6b7280', fontWeight: '500' }}>Category</th>
                                        <th className="bodyMediumText3" style={{ color: '#6b7280', fontWeight: '500' }}>Serial No.</th>
                                        <th className="bodyMediumText3" style={{ color: '#6b7280', fontWeight: '500' }}>Invoice</th>
                                        <th className="bodyMediumText3" style={{ color: '#6b7280', fontWeight: '500' }}>Assigned</th>
                                        <th className="bodyMediumText3" style={{ color: '#6b7280', fontWeight: '500' }}>Added By</th>
                                        <th className="bodyMediumText3" style={{ color: '#6b7280', fontWeight: '500' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventoryItems.map(item => (
                                        <tr key={item.id}>
                                            <td className="bodyRegularText4" style={{ color: '#374151' }}>{item.employees?.name || 'Unknown'}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div className="bodyRegularText4" style={{ fontWeight: '600', color: '#111827' }}>{item.item_name}</div>
                                                        {item.item_details && (
                                                            <div className="bodyRegularText5" style={{ color: '#6b7280', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }} title={item.item_details}>
                                                                {item.item_details}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="inventory-category-badge">{item.category}</span>
                                            </td>
                                            <td className="bodyRegularText4" style={{ color: '#374151' }}>{item.serial_number || '—'}</td>
                                            <td>
                                                <div
                                                    onClick={() => handleInventoryImagePreview(item)}
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#f3f4f6',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: (item.item_image_url || item.invoice_image_url || item.item_image_path || item.invoice_image_path) ? 'pointer' : 'default',
                                                        border: (item.item_image_url || item.invoice_image_url || item.item_image_path || item.invoice_image_path) ? '2px solid #3b82f6' : '2px dashed #d1d5db',
                                                        transition: 'all 150ms ease'
                                                    }}
                                                    title={(item.item_image_url || item.invoice_image_url || item.item_image_path || item.invoice_image_path)
                                                        ? `Click to view images`
                                                        : 'No images uploaded'}
                                                >
                                                    <Image size={20} style={{
                                                        color: (item.item_image_url || item.invoice_image_url || item.item_image_path || item.invoice_image_path) ? '#3b82f6' : '#9ca3af'
                                                    }} />
                                                </div>
                                            </td>
                                            <td className="bodyRegularText4" style={{ color: '#374151' }}>{formatDate(item.assigned_date)}</td>
                                            <td >
                                                <span style={{ backgroundColor: 'grey' }} className="inventory-category-badge">{item.added_by}</span>
                                            </td>
                                            <td>
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => handleDeleteInventoryItem(item.id)}
                                                    title="Delete item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredInventoryItems.length === 0 && (
                                <div className="empty-state bodyRegularText4" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    {inventoryEmployeeFilter === 'all'
                                        ? 'No inventory items found'
                                        : `No inventory items found for ${inventoryEmployeeFilter}`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="admin-dashboard">

            {/* Tab Navigation - Same pattern as employee dashboard */}
            <div className="dashboard-tabs-container" style={{ marginBottom: '1.5rem' }}>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="dashboard-tabs-list">
                        <TabsTrigger value="overview" className="dashboard-tab-trigger">Overview</TabsTrigger>
                        <TabsTrigger value="reimbursements" className="dashboard-tab-trigger">Reimbursements</TabsTrigger>
                        <TabsTrigger value="inventory" className="dashboard-tab-trigger">Inventory</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>


                    {/* Header */}
                    <div className="admin-header">
                        <div>
                            <h1 className="admin-title bodyMediumText2">Admin Dashboard</h1>
                            <p className="admin-subtitle bodyRegularText4">
                                Welcome back, {user?.name || 'Admin'}! Manage your team and monitor performance
                            </p>
                        </div>
                        <div className="admin-actions">
                            <button
                                className="admin-button secondary"
                                onClick={loadDashboardData}
                                disabled={loading}
                                title="Refresh Data"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button className="admin-button primary bodyRegularText4" onClick={() => setEmployeeDialogOpen(true)}>
                                <UserPlus size={20} />
                                Add Employee
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="admin-stats-grid">
                        <div className="admin-stat-card">
                            <div className="stat-icon employee">
                                <Users size={15} />
                            </div>
                            <div className="stat-info">
                                <h3 className='bodyMediumText3 '>Total Employees</h3>
                                <div className="stat-number bodyMediumText1">{dashboardStats.totalEmployees.count}</div>
                                <div className="stat-change bodyRegularText5" style={{ fontSize: '0.75rem' }}>{dashboardStats.totalEmployees.change}</div>
                            </div>
                        </div>

                        <div className="admin-stat-card">
                            <div className="stat-icon active">
                                <Users size={15} />
                            </div>
                            <div className="stat-info">
                                <h3 className='bodyMediumText3 '>Active Today</h3>
                                <div className="stat-number bodyMediumText1">{dashboardStats.activeToday.count}</div>
                                <div className="stat-change bodyRegularText5">{dashboardStats.activeToday.rate}</div>
                            </div>
                        </div>

                        <div className="admin-stat-card">
                            <div className="stat-icon leave">
                                <Calendar size={15} />
                            </div>
                            <div className="stat-info">
                                <h3 className='bodyMediumText3 '>Leave</h3>
                                <div className="stat-number bodyMediumText1">{dashboardStats.onLeave.count}</div>
                                <div className="stat-change bodyRegularText5">{dashboardStats.onLeave.details}</div>
                            </div>
                        </div>

                        <div className="admin-stat-card">
                            <div className="stat-icon pending">
                                <AlertTriangle size={15} />
                            </div>
                            <div className="stat-info">
                                <h3 className='bodyMediumText3 '>Pending Approvals</h3>
                                <div className="stat-number bodyMediumText1">{dashboardStats.pendingApprovals.count}</div>
                                <div className="stat-change bodyRegularText5">{dashboardStats.pendingApprovals.details}</div>
                            </div>
                        </div>
                    </div>

                    {/* Pending Leave Requests */}
                    <div className="admin-section">
                        <h2 className="section-title bodyRegularText3">Pending Leave Requests</h2>
                        <div className="leave-requests">
                            {loading ? (
                                <div className="loading-state bodyRegularText4" style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#6b7280'
                                }}>
                                    Loading requests...
                                </div>
                            ) : pendingRequests.length === 0 ? (
                                <div className="empty-state bodyRegularText4" style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#6b7280'
                                }}>
                                    No pending requests at the moment
                                </div>
                            ) : (
                                pendingRequests.map(request => (
                                    <div key={request.id} className="leave-request-card">
                                        <div className="request-info">
                                            <div className="employee-name bodyMediumText3">
                                                {request.employees?.name || request.name || `Employee ${request.user_id?.slice(-4) || 'Unknown'}`}
                                            </div>
                                            <div className="leave-details " style={{ alignItems: 'center', gap: '0.5rem' }}>
                                                <span className="leave-type ">{request.type}</span>
                                                <span className="leave-date bodyRegularText5 ">{request.date} ({request.duration})</span>
                                            </div>
                                            {request.rawData?.reason && (
                                                <div className="leave-reason bodyRegularText4" style={{
                                                    fontSize: '0.875rem',
                                                    color: '#6b7280',
                                                    marginTop: '0.25rem'
                                                }}>
                                                    Reason: {request.rawData.reason}
                                                </div>
                                            )}
                                            {request.rawData?.has_documentation && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    marginTop: '0.5rem',
                                                    padding: '0.5rem',
                                                    backgroundColor: '#f0f9ff',
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid #bfdbfe'
                                                }}>
                                                    <FileText size={16} style={{ color: '#3b82f6' }} />
                                                    <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                                                        <strong>Document attached:</strong> {request.rawData.document_name || 'Supporting document'}
                                                    </div>
                                                    {request.rawData.document_url && (
                                                        <button
                                                            onClick={() => window.open(request.rawData.document_url, '_blank')}
                                                            style={{
                                                                padding: '0.25rem 0.5rem',
                                                                fontSize: '0.75rem',
                                                                backgroundColor: '#3b82f6',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '0.25rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            View Document
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="request-actions">
                                            <button
                                                className={`approve-btn bodyMediumText5 ${actionStatus[request.id] === 'approved' ? 'success' :
                                                        actionStatus[request.id] === 'approving' ? 'processing' : ''
                                                    }`}
                                                onClick={() => handleApproveRequest(request.id)}
                                                disabled={loading || actionLoading === request.id ||
                                                    ['approved', 'rejected'].includes(actionStatus[request.id])}
                                            >
                                                {actionStatus[request.id] === 'approving' ? 'Approving...' :
                                                    actionStatus[request.id] === 'approved' ? 'Approved ✓' : 'Approve'}
                                            </button>
                                            <button
                                                className={`reject-btn bodyMediumText5 ${actionStatus[request.id] === 'rejected' ? 'success' :
                                                        actionStatus[request.id] === 'rejecting' ? 'processing' : ''
                                                    }`}
                                                onClick={() => handleRejectRequest(request.id, 'Rejected by admin')}
                                                disabled={loading || actionLoading === request.id ||
                                                    ['approved', 'rejected'].includes(actionStatus[request.id])}
                                            >
                                                {actionStatus[request.id] === 'rejecting' ? 'Rejecting...' :
                                                    actionStatus[request.id] === 'rejected' ? 'Rejected ✗' : 'Reject'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>



                    {/* Pending Timesheets */}
                    <div className="admin-section">
                        <h2 className="section-title bodyRegularText3">Pending Timesheets</h2>
                        <div className="leave-requests">
                            {loading ? (
                                <div className="loading-state bodyRegularText4" style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#6b7280'
                                }}>
                                    Loading timesheets...
                                </div>
                            ) : pendingTimesheets.length === 0 ? (
                                <div className="empty-state bodyRegularText4" style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: '#6b7280'
                                }}>
                                    No pending timesheets at the moment
                                </div>
                            ) : (
                                pendingTimesheets.map(timesheet => (
                                    <div key={timesheet.id} className="leave-request-card">
                                        <div className="request-info">
                                            <div className="employee-name bodyMediumText3">
                                                {timesheet.employee_name || `Employee ${timesheet.employee_id || 'Unknown'}`}
                                            </div>
                                            <div className="leave-details">
                                                <span className="leave-type">{timesheet.hours}h - {new Date(timesheet.date).toLocaleDateString()}</span>
                                                <span className="leave-date bodyRegularText4"> Status: {timesheet.status ? timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1).toLowerCase() : 'Pending'}
                                                </span>

                                            </div>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                color: '#6b7280',
                                                marginTop: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}>
                                                <div className='bodyRegularText4' style={{ marginBottom: '0.25rem', fontWeight: '500' }}>Tasks:</div>
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '0.5rem',
                                                    marginTop: '0.25rem'
                                                }}>
                                                    {(() => {
                                                        try {
                                                            let tasks = [];

                                                            if (!timesheet.tasks || timesheet.tasks === '') {
                                                                return (
                                                                    <div className="task_bubble" style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        padding: '0.25rem 0.5rem',
                                                                        backgroundColor: '#f3f4f6',
                                                                        borderRadius: '0.375rem',
                                                                        border: '1px solid #e5e7eb',
                                                                        fontSize: '0.75rem',
                                                                        minWidth: '120px'
                                                                    }}>
                                                                        <span className="task_text" style={{ color: '#6b7280' }}>
                                                                            No tasks specified
                                                                        </span>
                                                                    </div>
                                                                );
                                                            }

                                                            if (Array.isArray(timesheet.tasks)) {
                                                                tasks = timesheet.tasks;
                                                            } else if (typeof timesheet.tasks === 'string') {
                                                                tasks = JSON.parse(timesheet.tasks);
                                                            }

                                                            if (!Array.isArray(tasks) || tasks.length === 0) {
                                                                return (
                                                                    <div className="task_bubble" style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        padding: '0.25rem 0.5rem',
                                                                        backgroundColor: '#f3f4f6',
                                                                        borderRadius: '0.375rem',
                                                                        border: '1px solid #e5e7eb',
                                                                        fontSize: '0.75rem',
                                                                        minWidth: '120px'
                                                                    }}>
                                                                        <span className="task_text" style={{ color: '#6b7280' }}>
                                                                            No tasks specified
                                                                        </span>
                                                                    </div>
                                                                );
                                                            }

                                                            return tasks.map((task, index) => {
                                                                const hasDescription = task.description && task.description.trim() !== '';
                                                                return (
                                                                    <div key={task.id || index} className="task_bubble" style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        padding: '0.25rem 0.5rem',
                                                                        backgroundColor: '#eff6ff',
                                                                        borderRadius: '0.375rem',
                                                                        border: '1px solid #bfdbfe',
                                                                        fontSize: '0.75rem',
                                                                        minWidth: '120px',
                                                                        gap: '0.5rem'
                                                                    }}>
                                                                        <span className="task_text" style={{
                                                                            color: '#1e40af',
                                                                            flex: 1,
                                                                            minWidth: 0,
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap'
                                                                        }}>
                                                                            {task.taskTitle || task.task || 'No title'}
                                                                        </span>
                                                                        <span className="task_duration" style={{
                                                                            color: '#1d4ed8',
                                                                            fontWeight: '500',
                                                                            flexShrink: 0
                                                                        }}>
                                                                            {task.timeSpent || (task.hours ? `${task.hours}h` : (task.minutes ? `${task.minutes}min` : '0min'))}
                                                                        </span>
                                                                        {hasDescription && (
                                                                            <Tooltip
                                                                                title={task.description}
                                                                                arrow
                                                                                placement="top"
                                                                                slotProps={{
                                                                                    tooltip: {
                                                                                        sx: {
                                                                                            bgcolor: '#1f2937',
                                                                                            fontSize: '12px',
                                                                                            maxWidth: '250px',
                                                                                            padding: '8px 12px',
                                                                                            '& .MuiTooltip-arrow': {
                                                                                                color: '#1f2937',
                                                                                            },
                                                                                        },
                                                                                    },
                                                                                }}
                                                                            >
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    cursor: 'pointer',
                                                                                    marginLeft: '4px'
                                                                                }}>
                                                                                    <Info size={12} style={{ color: '#3b82f6' }} />
                                                                                </div>
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                );
                                                            });
                                                        } catch (error) {
                                                            console.warn('Error parsing tasks for timesheet:', timesheet.id, error);
                                                            return (
                                                                <div className="task_bubble" style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    padding: '0.25rem 0.5rem',
                                                                    backgroundColor: '#fef2f2',
                                                                    borderRadius: '0.375rem',
                                                                    border: '1px solid #fecaca',
                                                                    fontSize: '0.75rem',
                                                                    color: '#dc2626'
                                                                }}>
                                                                    <span className="task_text">
                                                                        {typeof timesheet.tasks === 'string' ? timesheet.tasks : 'Tasks format error'}
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                    })()}
                                                </div>
                                            </div>
                                            {timesheet.note && timesheet.note !== 'No notes' && (
                                                <div className="leave-reason" style={{
                                                    fontSize: '0.875rem',
                                                    color: '#6b7280',
                                                    marginTop: '0.25rem',
                                                    fontStyle: 'italic'
                                                }}>
                                                    Note: {timesheet.note}
                                                </div>
                                            )}
                                        </div>
                                        <div className="request-actions">
                                            <button
                                                className={`approve-btn ${actionStatus[timesheet.id] === 'approved' ? 'success' :
                                                        actionStatus[timesheet.id] === 'approving' ? 'processing' : ''
                                                    }`}
                                                onClick={() => handleApproveTimesheet(timesheet.id)}
                                                disabled={loading || actionLoading === timesheet.id ||
                                                    ['approved', 'rejected'].includes(actionStatus[timesheet.id])}
                                            >
                                                {actionStatus[timesheet.id] === 'approving' ? 'Approving...' :
                                                    actionStatus[timesheet.id] === 'approved' ? 'Approved ✓' : 'Approve'}
                                            </button>
                                            <button
                                                className={`reject-btn ${actionStatus[timesheet.id] === 'rejected' ? 'success' :
                                                        actionStatus[timesheet.id] === 'rejecting' ? 'processing' : ''
                                                    }`}
                                                onClick={() => handleRejectTimesheet(timesheet.id, 'Rejected by admin')}
                                                disabled={loading || actionLoading === timesheet.id ||
                                                    ['approved', 'rejected'].includes(actionStatus[timesheet.id])}
                                            >
                                                {actionStatus[timesheet.id] === 'rejecting' ? 'Rejecting...' :
                                                    actionStatus[timesheet.id] === 'rejected' ? 'Rejected ✗' : 'Reject'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Timesheet  Alerts */}
                    {(timesheetCompliance.warnings.filter(w => !dismissedAlerts.warnings.includes(`${w.employee_id}-${w.date}`)).length > 0 ||
                        timesheetCompliance.autoLeaves.filter(a => !dismissedAlerts.autoLeaves.includes(`${a.employee_id}-${a.date}`)).length > 0) && (
                            <div className="admin-section">
                                <h2 className="section-title bodyRegularText3">Timesheet  Alerts</h2>
                                <div className="leave-requests">
                                    {/* Warnings - Day +1 */}
                                    {timesheetCompliance.warnings.filter(w => !dismissedAlerts.warnings.includes(`${w.employee_id}-${w.date}`)).map((warning, idx) => (
                                        <div key={`warning-${idx}`} className="leave-request-card" style={{
                                            backgroundColor: '#fffbeb',
                                            borderLeft: '4px solid #f59e0b',
                                            position: 'relative'
                                        }}>
                                            <button
                                                onClick={() => setDismissedAlerts(prev => ({
                                                    ...prev,
                                                    warnings: [...prev.warnings, `${warning.employee_id}-${warning.date}`]
                                                }))}
                                                style={{
                                                    position: 'absolute',
                                                    top: '0.5rem',
                                                    right: '0.5rem',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '0.25rem',
                                                    borderRadius: '0.25rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef3c7'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                title="Dismiss alert"
                                            >
                                                <X size={16} style={{ color: '#92400e' }} />
                                            </button>
                                            <div className="request-info">
                                                <div className="employee-name bodyMediumText3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                                                    {warning.employee_name}
                                                </div>
                                                <div className="leave-details">
                                                    {/* <span className="leave-type" style={{ color: '#92400e', backgroundColor: '#fef3c7' }}></span> */}
                                                    <span className="leave-date bodyRegularText5">
                                                        Missing timesheet for {new Date(warning.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                {/* <div className="leave-reason bodyRegularText4" style={{
                                        fontSize: '0.875rem',
                                        color: '#78350f',
                                        marginTop: '0.25rem'
                                    }}>
                                        {warning.message}
                                    </div> */}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Auto-Leave Deductions - Day +2 */}
                                    {timesheetCompliance.autoLeaves.filter(a => !dismissedAlerts.autoLeaves.includes(`${a.employee_id}-${a.date}`)).map((autoLeave, idx) => (
                                        <div key={`auto-leave-${idx}`} className="leave-request-card" style={{
                                            backgroundColor: '#fef2f2',
                                            borderLeft: '4px solid #ef4444',
                                            position: 'relative'
                                        }}>
                                            <button
                                                onClick={() => setDismissedAlerts(prev => ({
                                                    ...prev,
                                                    autoLeaves: [...prev.autoLeaves, `${autoLeave.employee_id}-${autoLeave.date}`]
                                                }))}
                                                style={{
                                                    position: 'absolute',
                                                    top: '0.5rem',
                                                    right: '0.5rem',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '0.25rem',
                                                    borderRadius: '0.25rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                title="Dismiss alert"
                                            >
                                                <X size={16} style={{ color: '#991b1b' }} />
                                            </button>
                                            <div className="request-info">
                                                <div className="employee-name bodyMediumText3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                                                    {autoLeave.employee_name}
                                                </div>
                                                <div className="leave-details">
                                                    <span className="leave-type" style={{ color: '#991b1b', backgroundColor: '#fecaca' }}></span>
                                                    <span className="leave-date bodyRegularText5">
                                                        Missing timesheet for {new Date(autoLeave.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="leave-reason bodyRegularText4" style={{
                                                    fontSize: '0.875rem',
                                                    color: '#7f1d1d',
                                                    marginTop: '0.25rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {autoLeave.status === 'deducted'
                                                        ? `Leave has been deducted for ${autoLeave.date}.`
                                                        : autoLeave.status === 'already_processed'
                                                            ? `Leave already deducted for ${autoLeave.date}.`
                                                            : `${autoLeave.message} - Leave has been deducted.`
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                </>
            )}

            {activeTab === 'reimbursements' && renderReimbursementsTab()}
            {activeTab === 'inventory' && renderInventoryTab()}

            {/* Add Employee Dialog */}
            <Dialog.Root open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content add_dialog-content">
                        <AddEmployeeForm
                            onClose={() => setEmployeeDialogOpen(false)}
                            onSuccess={(message) => {
                                setError(message);
                                setTimeout(() => setError(null), 3000);
                                loadDashboardData(); // Refresh stats after adding employee
                            }}
                            onError={(message) => {
                                setError(message);
                                setTimeout(() => setError(null), 5000);
                            }}
                        />
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Image Preview Modal for Inventory Items */}
            {imagePreviewOpen && selectedInventoryItem && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }} onClick={closeInventoryImagePreview}>
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            maxWidth: '900px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 className="bodyMediumText2" style={{ margin: 0 }}>
                                {selectedInventoryItem.item_name} - Images
                            </h3>
                            <button
                                onClick={closeInventoryImagePreview}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={24} style={{ color: '#6b7280' }} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{ padding: '1.5rem' }}>
                            {/* Item Image */}
                            {getInventoryImageUrl(selectedInventoryItem, 'item') && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '1rem'
                                    }}>
                                        <h4 className="bodyMediumText4" style={{
                                            margin: 0,
                                            color: '#374151',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <Image size={20} style={{ color: '#3b82f6' }} />
                                            Item Image
                                        </h4>
                                        <button
                                            onClick={() => downloadFile(
                                                getInventoryImageUrl(selectedInventoryItem, 'item'),
                                                selectedInventoryItem.item_image_name || 'item-image'
                                            )}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            <Download size={16} />
                                            Download
                                        </button>
                                    </div>
                                    {isPdfFile(selectedInventoryItem.item_image_name) ? (
                                        <div style={{
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '8px',
                                            padding: '2rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '300px'
                                        }}>
                                            <FileText size={80} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                                            <p className="bodyRegularText4" style={{ color: '#374151', marginBottom: '0.5rem' }}>
                                                PDF Document
                                            </p>
                                            <p className="bodyRegularText5" style={{ color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>
                                                {selectedInventoryItem.item_image_name}
                                            </p>
                                            <button
                                                onClick={() => window.open(getInventoryImageUrl(selectedInventoryItem, 'item'), '_blank')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '10px 20px',
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <FileText size={18} />
                                                View PDF
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '300px'
                                        }}>
                                            <img
                                                src={getInventoryImageUrl(selectedInventoryItem, 'item')}
                                                alt={selectedInventoryItem.item_image_name || 'Item Image'}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '500px',
                                                    objectFit: 'contain',
                                                    borderRadius: '8px'
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                            <div style={{
                                                display: 'none',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                textAlign: 'center'
                                            }}>
                                                <Image size={64} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
                                                <p className="bodyRegularText4" style={{ color: '#6b7280' }}>
                                                    {selectedInventoryItem.item_image_name}
                                                </p>
                                                <p className="bodyRegularText5" style={{ color: '#9ca3af', marginTop: '0.5rem' }}>
                                                    (Image failed to load)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <p className="bodyRegularText5" style={{
                                        color: '#6b7280',
                                        marginTop: '0.5rem',
                                        textAlign: 'center'
                                    }}>
                                        {selectedInventoryItem.item_image_name}
                                    </p>
                                </div>
                            )}

                            {/* Invoice Image */}
                            {getInventoryImageUrl(selectedInventoryItem, 'invoice') && (
                                <div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '1rem'
                                    }}>
                                        <h4 className="bodyMediumText4" style={{
                                            margin: 0,
                                            color: '#374151',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <FileText size={20} style={{ color: '#10b981' }} />
                                            Invoice Image
                                        </h4>
                                        <button
                                            onClick={() => downloadFile(
                                                getInventoryImageUrl(selectedInventoryItem, 'invoice'),
                                                selectedInventoryItem.invoice_image_name || 'invoice-image'
                                            )}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            <Download size={16} />
                                            Download
                                        </button>
                                    </div>
                                    {isPdfFile(selectedInventoryItem.invoice_image_name) ? (
                                        <div style={{
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '8px',
                                            padding: '2rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '300px'
                                        }}>
                                            <FileText size={80} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                                            <p className="bodyRegularText4" style={{ color: '#374151', marginBottom: '0.5rem' }}>
                                                PDF Document
                                            </p>
                                            <p className="bodyRegularText5" style={{ color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>
                                                {selectedInventoryItem.invoice_image_name}
                                            </p>
                                            <button
                                                onClick={() => window.open(getInventoryImageUrl(selectedInventoryItem, 'invoice'), '_blank')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '10px 20px',
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <FileText size={18} />
                                                View PDF
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '300px'
                                        }}>
                                            <img
                                                src={getInventoryImageUrl(selectedInventoryItem, 'invoice')}
                                                alt={selectedInventoryItem.invoice_image_name || 'Invoice Image'}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '500px',
                                                    objectFit: 'contain',
                                                    borderRadius: '8px'
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                            <div style={{
                                                display: 'none',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                textAlign: 'center'
                                            }}>
                                                <FileText size={64} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
                                                <p className="bodyRegularText4" style={{ color: '#6b7280' }}>
                                                    {selectedInventoryItem.invoice_image_name}
                                                </p>
                                                <p className="bodyRegularText5" style={{ color: '#9ca3af', marginTop: '0.5rem' }}>
                                                    (Image failed to load)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <p className="bodyRegularText5" style={{
                                        color: '#6b7280',
                                        marginTop: '0.5rem',
                                        textAlign: 'center'
                                    }}>
                                        {selectedInventoryItem.invoice_image_name}
                                    </p>
                                </div>
                            )}

                            {/* No Images Message */}
                            {!getInventoryImageUrl(selectedInventoryItem, 'item') && !getInventoryImageUrl(selectedInventoryItem, 'invoice') && (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                    <Image size={64} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
                                    <p className="bodyRegularText4" style={{ color: '#6b7280' }}>
                                        No images available for this item
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Reimbursement Modal */}
            {editReimbursementOpen && reimbursementToEdit && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }} onClick={closeEditReimbursement}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ReimbursementRequestForm
                            onClose={closeEditReimbursement}
                            onSuccess={handleReimbursementUpdateSuccess}
                            editRequest={reimbursementToEdit}
                        />
                    </div>
                </div>
            )}

            {/* Receipt Preview Modal */}
            {receiptPreviewOpen && selectedReimbursement && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }} onClick={closeReceiptPreview}>
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            maxWidth: '900px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid #e5e7eb'
                        }}>
                            <h3 className="bodyMediumText2" style={{ margin: 0 }}>
                                Receipt - {selectedReimbursement.category}
                            </h3>
                            <button
                                onClick={closeReceiptPreview}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={24} style={{ color: '#6b7280' }} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{ padding: '1.5rem' }}>
                            {getReceiptImageUrl(selectedReimbursement) ? (
                                <div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '1rem'
                                    }}>
                                        <h4 className="bodyMediumText4" style={{
                                            margin: 0,
                                            color: '#374151',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <FileText size={20} style={{ color: '#3b82f6' }} />
                                            {isPdfFile(selectedReimbursement.receipt_name) ? 'Receipt PDF' : 'Receipt Image'}
                                        </h4>
                                        <button
                                            onClick={() => downloadFile(
                                                getReceiptImageUrl(selectedReimbursement),
                                                selectedReimbursement.receipt_name || 'receipt'
                                            )}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                backgroundColor: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            <Download size={16} />
                                            Download
                                        </button>
                                    </div>
                                    {isPdfFile(selectedReimbursement.receipt_name) ? (
                                        <div style={{
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '8px',
                                            padding: '2rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '400px'
                                        }}>
                                            <FileText size={80} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                                            <p className="bodyRegularText4" style={{ color: '#374151', marginBottom: '0.5rem' }}>
                                                PDF Document
                                            </p>
                                            <p className="bodyRegularText5" style={{ color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>
                                                {selectedReimbursement.receipt_name}
                                            </p>
                                            <button
                                                onClick={() => window.open(getReceiptImageUrl(selectedReimbursement), '_blank')}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '10px 20px',
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <FileText size={18} />
                                                View PDF
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '400px'
                                        }}>
                                            <img
                                                src={getReceiptImageUrl(selectedReimbursement)}
                                                alt={selectedReimbursement.receipt_name || 'Receipt'}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '600px',
                                                    objectFit: 'contain',
                                                    borderRadius: '8px'
                                                }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                            <div style={{
                                                display: 'none',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                textAlign: 'center'
                                            }}>
                                                <FileText size={64} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
                                                <p className="bodyRegularText4" style={{ color: '#6b7280' }}>
                                                    {selectedReimbursement.receipt_name}
                                                </p>
                                                <p className="bodyRegularText5" style={{ color: '#9ca3af', marginTop: '0.5rem' }}>
                                                    (Receipt failed to load)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <p className="bodyRegularText5" style={{
                                        color: '#6b7280',
                                        marginTop: '0.5rem',
                                        textAlign: 'center'
                                    }}>
                                        {selectedReimbursement.receipt_name}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                    <FileText size={64} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
                                    <p className="bodyRegularText4" style={{ color: '#6b7280' }}>
                                        No receipt available for this request
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;