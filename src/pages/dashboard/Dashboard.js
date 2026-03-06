import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Calendar, Clock, TrendingUp, LineChart, Clock4, Users, FileText, AlertTriangle, X, DollarSign, Package, Wallet, CheckCircle, Clock3, XCircle, FileImage, Image, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi, employeeApi, timesheetApi, leaveApi, timesheetComplianceApi, reimbursementApi, inventoryApi, supabase } from '../../utils/supabase';
import './Dashboard.css';
import { TimesheetForm, LeaveRequestForm, ReimbursementRequestForm, InventoryRequestForm } from '../../components';
import '../../components/common/calender/CustomCalendar.css';
import CustomCalendar from '../../components/common/calender/CustomCalendar';
import { StatusIndicator } from '../../components/common/StatusIndicator/Status_Indicator';
import { useLeave } from '../../contexts/LeaveContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';



const Dashboard = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [timesheetDialogOpen, setTimesheetDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [reimbursementDialogOpen, setReimbursementDialogOpen] = useState(false);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stats, setStats] = useState({});
  const [recentTimesheets, setRecentTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAdmin } = useAuth();
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false); // NEW: Track if submitted today
  const [filters, setFilters] = useState({
    filterMode: 'all', // 'all', 'week', 'month', or 'custom'
    startDate: '',
    endDate: ''
  });
  const { leaveSummary, refreshLeaveData } = useLeave();

  // Timesheet compliance state - warnings and auto-leave
  const [timesheetWarnings, setTimesheetWarnings] = useState([]);
  const [autoLeaveNotices, setAutoLeaveNotices] = useState([]);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'reimbursements' | 'inventory'

  // Reimbursement and Inventory data from database
  const [reimbursementRequests, setReimbursementRequests] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Receipt preview state
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState(null);

  const remainingSick = leaveSummary?.remaining_sick ?? 0;
  const remainingCasual = leaveSummary?.remaining_casual ?? 0;
  const totalLeaveBalance = remainingSick + remainingCasual;

  console.log('Fresh Leave Summary:', leaveSummary);

  // Calculate reimbursement stats
  const reimbursementStats = {
    pending: reimbursementRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0),
    approved: reimbursementRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0),
    rejected: reimbursementRequests.filter(r => r.status === 'rejected').reduce((sum, r) => sum + r.amount, 0)
  };

  // Calculate inventory stats
  const inventoryStats = {
    assigned: inventoryItems.filter(i => i.status === 'assigned').length,
    pending: inventoryItems.filter(i => i.status === 'pending').length,
    available: 12 // Mock available items count
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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

  // Helper function to get inventory image URL from Supabase storage
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

  // Helper function to check if file is PDF
  const isPdfFile = (filename) => {
    if (!filename) return false;
    return filename.toLowerCase().endsWith('.pdf');
  };

  // Helper function to get file type from filename
  const getFileType = (filename) => {
    if (!filename) return 'unknown';
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return 'image';
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
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  // Handle new reimbursement submission
  const handleReimbursementSuccess = (newRequest) => {
    // Map database fields to frontend format
    const mappedRequest = {
      id: newRequest.id,
      category: newRequest.category,
      description: newRequest.description,
      amount: parseFloat(newRequest.amount),
      date: newRequest.date,
      status: newRequest.status,
      receipt_name: newRequest.receipt_name,
      receipt_url: newRequest.receipt_url,
      receipt_path: newRequest.receipt_path
    };
    setReimbursementRequests(prev => [mappedRequest, ...prev]);
  };

  // Handle new inventory request submission
  const handleInventorySuccess = (newItem) => {
    // Map database fields to frontend format
    const mappedItem = {
      id: newItem.id,
      itemName: newItem.item_name,
      itemDetails: newItem.item_details,
      category: newItem.category,
      serialNumber: newItem.serial_number,
      condition: newItem.condition,
      assignedDate: newItem.assigned_date,
      addedBy: newItem.added_by,
      itemImageName: newItem.item_image_name,
      invoiceImageName: newItem.invoice_image_name,
      item_image_url: newItem.item_image_url,
      item_image_path: newItem.item_image_path,
      invoice_image_url: newItem.invoice_image_url,
      invoice_image_path: newItem.invoice_image_path
    };
    setInventoryItems(prev => [mappedItem, ...prev]);
  };

  // Handle image preview click
  const handleImagePreview = (item) => {
    if (item.itemImageName || item.invoiceImageName || item.item_image_url || item.item_image_path || item.invoice_image_url || item.invoice_image_path) {
      setSelectedItem(item);
      setImagePreviewOpen(true);
    }
  };

  // Close image preview
  const closeImagePreview = () => {
    setImagePreviewOpen(false);
    setSelectedItem(null);
  };
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Load dashboard data from database
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isAdmin()) {
        // Load admin dashboard data
        //console.log('📊 Loading admin dashboard data...');
        const dashboardStats = await adminApi.getDashboardStats();

        setStats({
          totalEmployees: dashboardStats.totalEmployees || 0,
          pendingRequests: dashboardStats.pendingRequests || 0,
          approvedLeaves: dashboardStats.approvedLeaves || 0,
          totalHoursThisMonth: `${dashboardStats.totalHoursThisMonth || 0}h`,
          employeesOnLeave: dashboardStats.employeesOnLeave || 0,
          activeEmployeesToday: dashboardStats.activeEmployeesToday || 0
        });

        // Load recent activity for admin
        const recentActivity = await adminApi.getRecentActivity();
        const formattedTimesheets = recentActivity.slice(0, 3).map((activity, index) => ({
          id: activity.id || index,
          date: new Date(activity.created_at || activity.start_date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          hours: `${activity.days || 1} day${(activity.days || 1) > 1 ? 's' : ''}`,
          status: activity.status || 'pending'
        }));
        setRecentTimesheets(formattedTimesheets);

      } else {
        // Load employee dashboard data
        //console.log('👤 Loading employee dashboard data...');

        // Get employee timesheets using employee_id (since we only have employee auth now)
        // Get all employee timesheets
        const timesheets = await timesheetApi.getTimesheetsByEmployeeId(user.employee_id || user.id);

        // ✅ Apply filters before displaying
        let filteredTimesheets = [...timesheets];

        // Week filter
        if (filters.filterMode === 'week') {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);

          filteredTimesheets = timesheets.filter(t => {
            const d = new Date(t.date || t.workDate);
            return d >= weekStart;
          });
        }

        // Month filter
        if (filters.filterMode === 'month') {
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);

          filteredTimesheets = timesheets.filter(t => {
            const d = new Date(t.date || t.workDate);
            return d >= monthStart;
          });
        }

        // Custom date range filter
        if (filters.filterMode === 'custom' && filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate);
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);

          filteredTimesheets = timesheets.filter(t => {
            const d = new Date(t.date || t.workDate);
            return d >= start && d <= end;
          });
        }

        // Set recent timesheets (show only first 3)
        const recentTimesheetData = filteredTimesheets.slice(0, 3).map(timesheet => ({
          id: timesheet.id,
          date: new Date(timesheet.date || timesheet.workDate).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          hours: `${timesheet.hours || timesheet.hoursWorked || 0} hours`,
          status: timesheet.status || 'pending'
        }));
        setRecentTimesheets(recentTimesheetData);

        // Leave balance is handled by LeaveContext

        // FIX 1: Check if employee has submitted today and calculate today's hours
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day

        const todayTimesheets = timesheets.filter(t => {
          const timesheetDate = new Date(t.workDate || t.date);
          timesheetDate.setHours(0, 0, 0, 0); // Reset to start of day
          return timesheetDate.getTime() === today.getTime();
        });

        // Set the flag if there are any timesheets for today
        setHasSubmittedToday(todayTimesheets.length > 0);

        // Calculate today's total hours (sum all entries for today)
        const todayApprovedTimesheets = todayTimesheets.filter(t => t.status === 'approved');
        const todayPendingTimesheets = todayTimesheets.filter(t => t.status !== 'approved');

        // Show total hours for today - use the correct field name
        const todayTotalHours = todayTimesheets.reduce((sum, t) => {
          const hours = parseFloat(t.hoursWorked || t.hours || 0);
          console.log('Today timesheet:', { date: t.workDate || t.date, hours, status: t.status });
          return sum + hours;
        }, 0);

        console.log('Today total hours:', todayTotalHours, 'from', todayTimesheets.length, 'timesheets');


        // Check if there are pending timesheets today to show status
        const todayStatus =
          todayPendingTimesheets.length > 0
            ? todayPendingTimesheets[0].status
            : todayApprovedTimesheets.length > 0
              ? 'approved'
              : null;

        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        thisWeekStart.setHours(0, 0, 0, 0);

        const weeklyHours = timesheets
          .filter(t => {
            const timesheetDate = new Date(t.date || t.workDate);
            return timesheetDate >= thisWeekStart;
          })
          .reduce((sum, t) => sum + parseFloat(t.hoursWorked || t.hours || 0), 0);

        // MONTHLY HOURS (include all statuses)
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const monthlyHours = timesheets
          .filter(t => {
            const timesheetDate = new Date(t.date || t.workDate);
            return timesheetDate >= thisMonthStart;
          })
          .reduce((sum, t) => sum + parseFloat(t.hoursWorked || t.hours || 0), 0);

        // ✅ Update the dashboard stats
        setStats({
          todayHours: Number(todayTotalHours.toFixed(1)),
          todayStatus: todayStatus,
          weeklyProgress: `${weeklyHours.toFixed(1)}h`,
          monthlyHours: `${monthlyHours.toFixed(1)}h`
        });

        // 📋 Check for missing timesheets - Warning & Auto Leave system
        try {
          const complianceResult = await timesheetComplianceApi.processAutoLeaves(user.employee_id || user.id);
          
          // Set warnings (Day+1 missing timesheets)
          if (complianceResult.warnings && complianceResult.warnings.length > 0) {
            setTimesheetWarnings(complianceResult.warnings);
          } else {
            setTimesheetWarnings([]);
          }
          
          // Set auto-leave notices (Day+2+ missing timesheets that were just processed)
          const newAutoLeaves = complianceResult.processed?.filter(p => p.success) || [];
          if (newAutoLeaves.length > 0) {
            setAutoLeaveNotices(newAutoLeaves);
            // Refresh leave data to show updated balance
            if (refreshLeaveData) {
              await refreshLeaveData();
            }
          }
          
          console.log('📋 Timesheet compliance check completed:', {
            warnings: complianceResult.warnings?.length || 0,
            autoLeaves: newAutoLeaves.length
          });
        } catch (complianceError) {
          console.error('⚠️ Error checking timesheet compliance:', complianceError);
        
        }

        try {
          const [reimbursements, inventory] = await Promise.all([
            reimbursementApi.getRequestsByEmployee(user.employee_id || user.id),
            inventoryApi.getItemsByEmployee(user.employee_id || user.id)
          ]);
          
          const mappedReimbursements = reimbursements.map(req => ({
            id: req.id,
            category: req.category,
            description: req.description,
            amount: parseFloat(req.amount),
            date: req.date,
            status: req.status,
            receipt_name: req.receipt_name,
            receipt_url: req.receipt_url,
            receipt_path: req.receipt_path
          }));
          
          
          const mappedInventory = inventory.map(item => ({
            id: item.id,
            itemName: item.item_name,
            itemDetails: item.item_details,
            category: item.category,
            serialNumber: item.serial_number,
            condition: item.condition,
            assignedDate: item.assigned_date,
            addedBy: item.added_by,
            itemImageName: item.item_image_name,
            invoiceImageName: item.invoice_image_name,
            item_image_url: item.item_image_url,
            item_image_path: item.item_image_path,
            invoice_image_url: item.invoice_image_url,
            invoice_image_path: item.invoice_image_path
          }));
          
          setReimbursementRequests(mappedReimbursements);
          setInventoryItems(mappedInventory);
          
          console.log('✅ Reimbursement and inventory data loaded');
        } catch (dataError) {
          console.error('⚠️ Error loading reimbursement/inventory data:', dataError);
          
        }
      }

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(`Failed to load dashboard data: ${error.message}`);

      // Set fallback data
      if (isAdmin()) {
        setStats({
          totalEmployees: 0,
          pendingRequests: 0,
          approvedLeaves: 0,
          totalHoursThisMonth: "0h"
        });
      } else {
        setStats({
          todayHours: 0,
          todayStatus: null,
          weeklyProgress: "0h",
          monthlyHours: "0h"
        });
        setHasSubmittedToday(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, isAdmin, filters]);


  if (loading) {
    return (
      <div className="main_container">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-text-secondary">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Render Dashboard Tab Content
  const renderDashboardTab = () => (
    <>
     {/* Header Section */}
      <div className="good_greeting_container">
        <div className="good_greeting_section">
          <div>
            <h1 className="good_greeting bodyMediumText2">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-text-secondary bodyRegularText4">
              Here's your activity summary for today
            </p>
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#ef4444',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                marginTop: '8px'
              }}>
                {error}
              </div>
            )}
          </div>
          <div className="btn_log_leave_section">
            {!isAdmin() && (
              <Dialog.Root open={timesheetDialogOpen} onOpenChange={setTimesheetDialogOpen}>
                <Dialog.Trigger asChild>
                  <button
                    className="quick-action-btn primary bodyMediumText3"
                    disabled={hasSubmittedToday}
                    style={{
                      opacity: hasSubmittedToday ? 0.5 : 1,
                      cursor: hasSubmittedToday ? 'not-allowed' : 'pointer'
                    }}
                    title={hasSubmittedToday ? 'You have already logged work hours for today' : 'Log Work Hours'}
                  >
                    <Plus className="w-4 h-4" />
                    {hasSubmittedToday ? 'Work Hours Logged' : 'Log Work Hours'}
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="dialog-overlay" />
                  <Dialog.Content className="dialog-content">
                    <TimesheetForm
                      onClose={() => setTimesheetDialogOpen(false)}
                      onSubmit={(newTimesheet) => {
                        setTimesheetDialogOpen(false);
                        loadDashboardData();
                      }}
                    />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            )}

            {!isAdmin() && (
              <Dialog.Root open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                <Dialog.Trigger asChild>
                  <button className="quick-action-btn secondary bodyMediumText3">
                    <Calendar className="w-4 h-4" />
                    Request Leave
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="dialog-overlay" />
                  <Dialog.Content className="dialog-content">
                    <LeaveRequestForm
                      onClose={() => setLeaveDialogOpen(false)}
                      onSuccess={() => { loadDashboardData(); }}
                    />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            )}
          </div>
        </div>
      </div>
      {/* Stats Grid */}
      <div className="stats-grid mb-2">
        <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              <span className="stats_title bodyMediumText3">Today's Hours</span>
              <Clock className="progress_icons Clock" />
            </div>
            <div className="stats_hrs bodyMediumText1">
              {stats.todayHours ? `${Number(stats.todayHours).toFixed(1)}h` : '0h'}
              {stats.todayStatus && (
                <span
                  className="ml-2"
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  <span
                    style={{
                      backgroundColor:
                        stats.todayStatus === "approved" ? "#093c1dff" : "#db712fff",
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      display: 'inline-flex',
                      marginRight: '4px',
                    }}
                  />
                  {stats.todayStatus ? stats.todayStatus.charAt(0).toUpperCase() + stats.todayStatus.slice(1).toLowerCase() : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              <span className="stats_title bodyMediumText3">Weekly Progress</span>
              <TrendingUp className="progress_icons TrendingUp" />
            </div>
            <div className="stats_hrs bodyMediumText1">{stats.weeklyProgress}</div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              <span className="stats_title bodyMediumText3">This Month</span>
              <LineChart className="progress_icons LineChart" />
            </div>
            <div className="stats_hrs bodyMediumText1">{stats.monthlyHours}</div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              <span className="stats_title bodyMediumText3">Leave Balance</span>
              <Calendar className="progress_icons Calendar" />
            </div>
            {leaveSummary?.isAvailable === false ? (
              <div className="stats_hrs bodyMediumText1" style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                No balance record
              </div>
            ) : (
              <>
                <div className="stats_hrs bodyMediumText1">{totalLeaveBalance} days</div>
                <div className="sick_casual_leave_sec">
                  <span className="sick_casual_bubble">Sick: {remainingSick}</span>
                  <span className="sick_casual_bubble">Casual: {remainingCasual}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Timesheets */}
      <div className="content-grid gap-6 w-full max-w-full">
        <div className="recent-timesheets stats-card w-full">
          <div className="recent-timesheets-card w-full">
            {/* Timesheet Warning Banner */}
            {!isAdmin() && timesheetWarnings.length > 0 && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <AlertTriangle style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} size={20} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>
                    Timesheet Not Submitted
                  </h3>
                  {timesheetWarnings.map((warning, idx) => (
                    <p key={idx} style={{ margin: 0, fontSize: '13px', color: '#78350f', lineHeight: '1.4' }}>
                      {warning.message}
                    </p>
                  ))}
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#92400e', fontStyle: 'italic' }}>
                    If not submitted by tomorrow, leave will be deducted automatically.
                  </p>
                </div>
                <button 
                  onClick={() => setWarningDismissed(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#92400e' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{display:'flex',justifyContent:"space-between",alignContent:"center",marginBottom: '1.5rem' }}>
              <h2 className="bodyMediumText2">Recent Timesheets</h2>
              <div className="filter_section">
                <div className="filter_group">
                  <button
                    className={`bodyMediumText4 filter_btn ${filters.filterMode === 'week' ? 'active' : ''}`}
                    onClick={() => { handleFilterChange('filterMode', 'week'); handleFilterChange('startDate', ''); handleFilterChange('endDate', ''); setCalendarVisible(false); }}
                  >Week</button>
                  <button
                    className={`bodyMediumText4 filter_btn ${filters.filterMode === 'month' ? 'active' : ''}`}
                    onClick={() => { handleFilterChange('filterMode', 'month'); handleFilterChange('startDate', ''); handleFilterChange('endDate', ''); setCalendarVisible(false); }}
                  >Month</button>
                  <button
                    className={`bodyMediumText4 filter_btn ${filters.filterMode === 'all' ? 'active' : ''}`}
                    onClick={() => { handleFilterChange('filterMode', 'all'); handleFilterChange('startDate', ''); handleFilterChange('endDate', ''); setCalendarVisible(false); }}
                  >All</button>
                  <button
                    className={`calendar-trigger-btn ${calendarVisible ? 'active' : ''}`}
                    onClick={() => setCalendarVisible(!calendarVisible)}
                    title="Custom Date Range"
                  >
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </button>
                  {calendarVisible && (
                    <CustomCalendar
                      selectedRange={{ from: filters.startDate ? new Date(filters.startDate) : null, to: filters.endDate ? new Date(filters.endDate) : null }}
                      onDateRangeSelect={(range) => {
                        if (range?.from && range?.to) {
                          handleFilterChange('startDate', range.from.toISOString().split('T')[0]);
                          handleFilterChange('endDate', range.to.toISOString().split('T')[0]);
                          handleFilterChange('filterMode', 'custom');
                        } else if (!range?.from && !range?.to) {
                          handleFilterChange('startDate', '');
                          handleFilterChange('endDate', '');
                          handleFilterChange('filterMode', 'all');
                        }
                      }}
                      onClose={() => setCalendarVisible(false)}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="timesheets_lists">
              {recentTimesheets.map((timesheet) => (
                <div key={timesheet.id} className="timesheets_list_day">
                  <div>
                    <div className="bodyMediumText3">{timesheet.date}</div>
                    <div className="bodyRegularText5">{timesheet.hours}</div>
                  </div>
                  <span className={`bodyMediumText4 status-badge ${timesheet.status}`}>
                    <span style={{ backgroundColor: timesheet.status === "approved" ? "#093c1dff" : "#db712fff", width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', marginRight: '6px' }} />
                    {timesheet.status ? timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1).toLowerCase() : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Render Reimbursements Tab Content
  const renderReimbursementsTab = () => (
    <div className="section-container">
      {/* Header */}
      <div className="section-header">
        <div sx={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: '300px' }}>
          <h2 className="bodyMediumText2 section-title" sx={{ margin:'0px !important'}}>Reimbursements</h2>
          <p className="bodyRegularText4 section-subtitle">Submit and track your reimbursement claims</p>
        </div>
        <div className="btn_log_leave_section">
        {!isAdmin() && (
          <Dialog.Root open={reimbursementDialogOpen} onOpenChange={setReimbursementDialogOpen}>
            <Dialog.Trigger asChild >
              <button className="quick-action-btn primary bodyMediumText3">
                <Plus className="w-4 h-4" />
                New Request
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="dialog-content">
                <ReimbursementRequestForm
                  onClose={() => setReimbursementDialogOpen(false)}
                  onSuccess={handleReimbursementSuccess}
                />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}

      </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid-3 mb-2">
        <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              
              <div className="stats-card_header_right bg-warning" style={{ backgroundColor: '#f5f5f5' }}>
                <Clock3 className="progress_icons" style={{ color: '#f59e0b' }} />
              </div>
            <div>
              <span className="stats_title bodyRegularText4">Pending</span>
            <div className="stats_hrs bodyMediumText2" >{formatCurrency(reimbursementStats.pending)}</div>
            </div>
            </div>
          </div>
        </div>


         <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              
              <div className="stats-card_header_right bg-success" style={{ backgroundColor: '#f5f5f5' }}>
                <CheckCircle className="progress_icons" style={{ color: '#10b981' }} />
              </div>
            <div>
              <span className="stats_title bodyRegularText4">Approved</span>
              <div className="stats_hrs bodyMediumText2">{formatCurrency(reimbursementStats.approved )}</div>
            </div>
            </div>
          </div>
        </div>


       


        <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              
              <div className="stats-card_header_right bg-success" style={{ backgroundColor: '#f5f5f5' }}>
                <XCircle className="progress_icons" style={{ color: '#ef4444' }} />
              </div>
            <div>
              <span className="stats_title bodyRegularText4">Rejected</span>
              <div className="stats_hrs bodyMediumText2" >{formatCurrency(reimbursementStats.rejected)}</div>
            </div>
            </div>
          </div>
        </div>


        
      </div>

      {/* Reimbursement Requests Table */}
      <div className="stats-card w-full">
        <div className="section-table-container">
          <h3 className="bodyRegularText3" style={{ fontWeight:'700', fontSize:'18px !important', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            
            My Reimbursement Requests
          </h3>
          <div className="reimbursement-table-wrapper">
            <table className="reimbursement-table">
              <thead>
                <tr>
                  <th className="bodyMediumText3" style={{ color: '#215 13.8% 50.6%' }}>Category</th>
                  <th className="bodyMediumText3" style={{ color: '#215 13.8% 50.6%' }}>Description</th>
                  <th className="bodyMediumText3" style={{ color: '#215 13.8% 50.6%' }}>Amount</th>
                  <th className="bodyMediumText3" style={{ color: '#215 13.8% 50.6%' }}>Date</th>
                  <th className="bodyMediumText3" style={{ color: '#215 13.8% 50.6%' }}>Receipt</th>
                  <th className="bodyMediumText3" style={{ color: '#215 13.8% 50.6%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reimbursementRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="bodyMediumText3">
                      <span className="inventory-category-badge">{request.category}</span>
                    </td>
                    <td className="bodyRegularText4">{request.description}</td>
                    <td className="bodyMediumText3">{formatCurrency(request.amount)}</td>
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
                        {request.status === 'pending' && <Clock3 size={14} style={{ marginRight: '4px' }} />}
                        {request.status === 'rejected' && <XCircle size={14} style={{ marginRight: '4px' }} />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Inventory Tab Content
  const renderInventoryTab = () => (
    <div className="section-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="bodyMediumText2 section-title">Inventory</h2>
          <p className="bodyRegularText4 section-subtitle">View and request company assets</p>
        </div>
           <div className="btn_log_leave_section">
        {!isAdmin() && (
          <Dialog.Root open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
            <Dialog.Trigger asChild>
              <button className="quick-action-btn primary bodyMediumText3">
                <Plus className="w-4 h-4" />
                Request Item
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
        )}
        </div>
      </div>

      {/* Stats Summary */}
      {/* <div className="stats-grid-3 mb-2">
        <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              <span className="stats_title bodyMediumText3">Assigned Items</span>
              <Package className="progress_icons" style={{ color: '#3b82f6' }} />
            </div>
            <div className="stats_hrs bodyMediumText1" style={{ color: '#3b82f6' }}>{inventoryStats.assigned}</div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              <span className="stats_title bodyMediumText3">Pending Requests</span>
              <Clock3 className="progress_icons" style={{ color: '#f59e0b' }} />
            </div>
            <div className="stats_hrs bodyMediumText1" style={{ color: '#f59e0b' }}>{inventoryStats.pending}</div>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card_container">
            <div className="stats-card_header">
              <span className="stats_title bodyMediumText3">Available Items</span>
              <Wallet className="progress_icons" style={{ color: '#10b981' }} />
            </div>
            <div className="stats_hrs bodyMediumText1" style={{ color: '#10b981' }}>{inventoryStats.available}</div>
          </div>
        </div>
      </div> */}

      {/* Inventory Items Table */}
      <div className="stats-card w-full">
        <div className="section-table-container">
          <h3 className="bodyRegularText3" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
            <Package size={20} style={{ color: '#3b82f6' }} />
            My Inventory
          </h3>
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th className="bodyRegularText4" style={{ color: '#6b7280', fontWeight: '500' }}>Item</th>
                  <th className="bodyRegularText4" style={{ color: '#6b7280', fontWeight: '500' }}>Category</th>
                  <th className="bodyRegularText4" style={{ color: '#6b7280', fontWeight: '500' }}>Serial No.</th>
                  <th className="bodyRegularText4" style={{ color: '#6b7280', fontWeight: '500' }}>Assigned</th>
                  <th className="bodyRegularText4" style={{ color: '#6b7280', fontWeight: '500' }}>Invoice</th>
                  <th className="bodyRegularText4" style={{ color: '#6b7280', fontWeight: '500' }}>Added By</th>
                </tr>
              </thead>
              <tbody>
                {inventoryItems.map((item) => (
                  <tr key={item.id}>
                   
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="bodyMediumText3" style={{ fontWeight: '600', color: '#111827' }}>{item.itemName}</div>
                          {item.itemDetails && (
                            <div 
                              className="bodyRegularText5" 
                              style={{ 
                                color: '#6b7280', 
                                marginTop: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '250px'
                              }}
                              title={item.itemDetails}
                            >
                              {item.itemDetails}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="inventory-category-badge">{item.category}</span>
                    </td>
                    <td className="bodyRegularText4" style={{ color: '#374151' }}>{item.serialNumber}</td>
                       <td className="bodyRegularText4" style={{ color: '#374151' }}>{formatDate(item.assignedDate)}</td>
                     <td className="bodyRegularText4" style={{ display: 'flex', alignItems: 'center',  gap: '8px' }}>
                      <div 
                          onClick={() => handleImagePreview(item)}
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '8px', 
                            backgroundColor: '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            alignSelf: 'center',
                            flexShrink: 0,
                            cursor: (item.itemImageName || item.invoiceImageName || item.item_image_url || item.item_image_path || item.invoice_image_url || item.invoice_image_path) ? 'pointer' : 'default',
                            border: (item.itemImageName || item.invoiceImageName || item.item_image_url || item.item_image_path || item.invoice_image_url || item.invoice_image_path) ? '2px solid #3b82f6' : '2px solid transparent',
                            transition: 'all 150ms ease'
                          }}
                          title={(item.itemImageName || item.invoiceImageName || item.item_image_url || item.item_image_path || item.invoice_image_url || item.invoice_image_path) ? 'Click to view images' : 'No images available'}
                        >
                          <Package size={20} style={{ 
                            color: (item.itemImageName || item.invoiceImageName || item.item_image_url || item.item_image_path || item.invoice_image_url || item.invoice_image_path) ? '#3b82f6' : '#6b7280' 
                          }} />
                        </div>
                    </td>
                    <td className="bodyRegularText4" style={{ color: '#374151' }}>{item.addedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="main_container">
     

      {/* Tabs Navigation - Only show for employees */}
      {!isAdmin() && (
        <div className="dashboard-tabs-container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="dashboard-tabs-list">
              <TabsTrigger value="dashboard" className="dashboard-tab-trigger">Dashboard</TabsTrigger>
              <TabsTrigger value="reimbursements" className="dashboard-tab-trigger">Reimbursements</TabsTrigger>
              <TabsTrigger value="inventory" className="dashboard-tab-trigger">Inventory</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Tab Content */}
      {isAdmin() ? (
        renderDashboardTab()
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboardTab()}
          {activeTab === 'reimbursements' && renderReimbursementsTab()}
          {activeTab === 'inventory' && renderInventoryTab()}
        </>
      )}

      {/* Image Preview Modal */}
      {imagePreviewOpen && selectedItem && (
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
        }} onClick={closeImagePreview}>
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
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
                {selectedItem.itemName} - Images
              </h3>
              <button
                onClick={closeImagePreview}
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
              {getInventoryImageUrl(selectedItem, 'item') && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <h4 className="bodyMediumText4" style={{ 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: 0
                    }}>
                      <Image size={20} style={{ color: '#3b82f6' }} />
                      {isPdfFile(selectedItem.itemImageName) ? 'Item PDF' : 'Item Image'}
                    </h4>
                    <button
                      onClick={() => downloadFile(getInventoryImageUrl(selectedItem, 'item'), selectedItem.itemImageName)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                  
                  {isPdfFile(selectedItem.itemImageName) ? (
                    // PDF Viewer
                    <div style={{
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '300px'
                    }}>
                      <FileText size={80} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                      <p className="bodyRegularText4" style={{ color: '#374151', marginBottom: '0.5rem' }}>
                        {selectedItem.itemImageName}
                      </p>
                      <p className="bodyRegularText5" style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                        PDF Document
                      </p>
                      <button
                        onClick={() => downloadFile(getInventoryImageUrl(selectedItem, 'item'), selectedItem.itemImageName)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        <Download size={18} />
                        Download PDF
                      </button>
                    </div>
                  ) : (
                    // Image Viewer
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
                        src={getInventoryImageUrl(selectedItem, 'item')} 
                        alt={selectedItem.itemImageName || 'Item Image'}
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
                          {selectedItem.itemImageName}
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
                    {selectedItem.itemImageName}
                  </p>
                </div>
              )}

              {/* Invoice Image/PDF */}
              {getInventoryImageUrl(selectedItem, 'invoice') && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <h4 className="bodyMediumText4" style={{ 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: 0
                    }}>
                      <FileText size={20} style={{ color: '#10b981' }} />
                      {isPdfFile(selectedItem.invoiceImageName) ? 'Invoice PDF' : 'Invoice Image'}
                    </h4>
                    <button
                      onClick={() => downloadFile(getInventoryImageUrl(selectedItem, 'invoice'), selectedItem.invoiceImageName)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                  
                  {isPdfFile(selectedItem.invoiceImageName) ? (
                    // PDF Viewer
                    <div style={{
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '300px'
                    }}>
                      <FileText size={80} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                      <p className="bodyRegularText4" style={{ color: '#374151', marginBottom: '0.5rem' }}>
                        {selectedItem.invoiceImageName}
                      </p>
                      <p className="bodyRegularText5" style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                        PDF Document
                      </p>
                      <button
                        onClick={() => downloadFile(getInventoryImageUrl(selectedItem, 'invoice'), selectedItem.invoiceImageName)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        <Download size={18} />
                        Download PDF
                      </button>
                    </div>
                  ) : (
                    // Image Viewer
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
                        src={getInventoryImageUrl(selectedItem, 'invoice')} 
                        alt={selectedItem.invoiceImageName || 'Invoice Image'}
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
                          {selectedItem.invoiceImageName}
                        </p>
                        <p className="bodyRegularText5" style={{ color: '#9ca3af', marginTop: '0.5rem' }}>
                          (Invoice failed to load)
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <p className="bodyRegularText5" style={{ 
                    color: '#6b7280', 
                    marginTop: '0.5rem',
                    textAlign: 'center'
                  }}>
                    {selectedItem.invoiceImageName}
                  </p>
                </div>
              )}

              {/* No Images Message */}
              {!getInventoryImageUrl(selectedItem, 'item') && !getInventoryImageUrl(selectedItem, 'invoice') && (
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
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: 0
                    }}>
                      <FileText size={20} style={{ color: '#3b82f6' }} />
                      {isPdfFile(selectedReimbursement.receipt_name) ? 'Receipt PDF' : 'Receipt Image'}
                    </h4>
                    <button
                      onClick={() => downloadFile(getReceiptImageUrl(selectedReimbursement), selectedReimbursement.receipt_name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                  
                  {isPdfFile(selectedReimbursement.receipt_name) ? (
                    // PDF Viewer
                    <div style={{
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '400px'
                    }}>
                      <FileText size={80} style={{ color: '#ef4444', marginBottom: '1rem' }} />
                      <p className="bodyRegularText4" style={{ color: '#374151', marginBottom: '0.5rem' }}>
                        {selectedReimbursement.receipt_name}
                      </p>
                      <p className="bodyRegularText5" style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                        PDF Document
                      </p>
                      <button
                        onClick={() => downloadFile(getReceiptImageUrl(selectedReimbursement), selectedReimbursement.receipt_name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                      >
                        <Download size={18} />
                        Download PDF
                      </button>
                    </div>
                  ) : (
                    // Image Viewer
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

export default Dashboard;