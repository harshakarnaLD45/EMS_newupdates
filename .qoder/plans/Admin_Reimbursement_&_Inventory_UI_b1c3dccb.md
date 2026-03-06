# Admin Reimbursement & Inventory UI Implementation Plan

## Overview
Add admin dashboard sections for managing employee reimbursement requests and inventory items with approval/rejection functionality, animation effects, and consistent styling.

## Implementation Steps

### 1. Update Supabase API (supabase.js)
**File:** `src/utils/supabase.js`

Add admin-level API functions:
- `reimbursementApi.getAllRequests()` - Fetch all reimbursement requests with employee details
- `reimbursementApi.updateStatus()` - Update request status (approve/reject)
- `inventoryApi.getAllItems()` - Fetch all inventory items with employee details
- `inventoryApi.deleteItem()` - Delete inventory item

### 2. Update AdminDashboard.js
**File:** `src/pages/admin/AdminDashboard.js`

Add state management:
- `activeTab` state for tab navigation (overview, reimbursements, inventory)
- `reimbursementRequests` state for all requests
- `inventoryItems` state for all items
- `processingIds` state for tracking approval/rejection animations
- `stats` for admin-level reimbursement and inventory statistics

Add helper functions:
- `handleApproveRequest()` - Approve with animation delay
- `handleRejectRequest()` - Reject with animation delay
- `handleDeleteInventoryItem()` - Delete inventory item
- `loadReimbursementData()` - Load all reimbursement requests
- `loadInventoryData()` - Load all inventory items

### 3. Create Admin Reimbursement Section
**In AdminDashboard.js**

Components to add:
- Stats cards (Pending, Approved, Rejected amounts)
- Filter tabs or dropdown
- Table with columns: Employee, Category, Description, Amount, Date, Status, Actions
- Approve/Reject buttons with loading states
- Animated status transitions

Animation effects:
- 500ms delay when processing approval/rejection
- Fade-out effect for row being updated
- Status badge color transition

### 4. Create Admin Inventory Section
**In AdminDashboard.js**

Components to add:
- Stats cards (Total Items, Laptops, Monitors, etc.)
- Filter by employee dropdown
- Table with columns: Employee, Item, Category, Serial No., Condition, Assigned, Added By, Actions
- Delete button with confirmation
- Visual condition badges

### 5. Update AdminDashboard.css
**File:** `src/pages/admin/AdminDashboard.css`

Add styles for:
- Tab navigation styling
- Stats cards grid
- Action buttons (Approve/Reject/Delete)
- Animation classes for status transitions
- Loading spinner for processing states
- Status badge variations

### 6. Tab Navigation Integration
Add tab buttons in the admin header:
- Overview (existing)
- Reimbursements (new)
- Inventory (new)

## UI Design Specifications

### Reimbursement Admin UI
```
Header: Reimbursements | Manage employee reimbursement requests
Stats Row: Pending ₹X | Approved ₹X | Rejected ₹X
Table:
- Employee name
- Category (badge)
- Description (truncated)
- Amount (₹X,XXX)
- Date
- Status (Pending/Approved/Rejected badge)
- Actions: [Approve] [Reject] or dash for processed
```

### Inventory Admin UI
```
Header: Inventory | Manage items assigned to employees
Stats Row: Total Items X | Laptops X | Monitors X | etc.
Filter: [All Employees v]
Table:
- Employee name
- Item name + description
- Category (badge)
- Serial No.
- Condition (New/Good/Fair/Poor badge)
- Assigned Date
- Added By
- Actions: [Delete icon]
```

## Animation Specifications

### Approval/Rejection Animation
1. Button clicked → Show loading spinner
2. 500ms delay with "Processing..." text
3. Row fades out (300ms)
4. Status updates in background
5. Row fades back in with new status color
6. Success toast notification

### Status Badge Colors
- Pending: Yellow (#f59e0b) background
- Approved: Green (#10b981) background  
- Rejected: Red (#ef4444) background

## Files to Modify
1. `src/utils/supabase.js` - Add admin API functions
2. `src/pages/admin/AdminDashboard.js` - Add sections and logic
3. `src/pages/admin/AdminDashboard.css` - Add styles

## Testing Checklist
- [ ] All reimbursement requests load with employee names
- [ ] Approve button works with animation
- [ ] Reject button works with animation
- [ ] Status updates reflect in UI immediately
- [ ] All inventory items load with employee names
- [ ] Delete button removes item with confirmation
- [ ] Stats calculate correctly
- [ ] Responsive design works on all screen sizes