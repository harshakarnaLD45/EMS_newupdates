import React, { useState } from 'react';
import { Eye, EyeOff, Wand2, Shield } from 'lucide-react';
import { useEmployees } from '../../../contexts/EmployeeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/card';


const AddEmployeeForm = ({ mode = 'add', employeeData = null, onClose, onSuccess, onError }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        role: 'Employee',
        joinDate: '',
        password: '',
        isActive: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { addEmployee, addAdmin, updateEmployee, updateAdmin, getPositionOptions } = useEmployees();
    const { user } = useAuth();
    
    // Check if current user is Super Admin (using boolean field with backward compatibility)
    const isCurrentUserSuperAdmin = user?.is_super_admin === true || user?.role === 'super_admin';
    
    // Check if editing an admin
    const isEditingAdmin = mode === 'edit' && (employeeData?.role === 'admin' || employeeData?.role === 'super_admin' || employeeData?.isAdmin === true || employeeData?.is_super_admin === true);
    
    // Check if editing the Super Admin account
    const isEditingSuperAdmin = mode === 'edit' && (employeeData?.is_super_admin === true || employeeData?.role === 'super_admin');
    
    // Check if current user can edit this account
    // Super Admin can edit themselves, but regular admins cannot edit Super Admin
    const canEditAccount = !isEditingSuperAdmin || isCurrentUserSuperAdmin;

    const departments = ['Administration', 'Development', 'Design', 'Interns'];

    // Load employee/admin data when in edit mode
    React.useEffect(() => {
        if (mode === 'edit' && employeeData) {
            // Determine if this is an admin or employee
            const isAdmin = employeeData.role === 'admin' || employeeData.isAdmin === true;
            
            setFormData({
                firstName: employeeData.first_name || employeeData.name?.split(' ')[0] || '',
                lastName: employeeData.last_name || employeeData.name?.split(' ').slice(1).join(' ') || '',
                email: employeeData.email || '',
                phone: employeeData.phone || '',
                department: employeeData.department || (isAdmin ? 'Administration' : ''),
                position: employeeData.position || (isAdmin ? 'Administrator' : ''),
                role: isAdmin ? 'Admin' : (employeeData.role || 'Employee'),
                joinDate: employeeData.join_date ? employeeData.join_date.split('T')[0] : 
                         (employeeData.created_at ? employeeData.created_at.split('T')[0] : ''),
                password: '', // Don't show existing password
                isActive: employeeData.is_active !== false // Default to true if not specified
            });
        }
    }, [mode, employeeData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (mode === 'edit') {
                // Check if editing admin or employee
                if (isEditingAdmin) {
                    // Update existing admin
                    // Preserve the original role and is_super_admin flag
                    const updates = {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        name: `${formData.firstName} ${formData.lastName}`.trim(),
                        email: formData.email,
                        phone: formData.phone,
                        department: formData.department || 'Administration',
                        position: formData.position || 'Administrator',
                        role: employeeData.role || 'Admin',
                        is_super_admin: employeeData.is_super_admin === true,
                        join_date: formData.joinDate,
                        is_active: formData.isActive,
                        status: formData.isActive ? 'Active' : 'Terminated'
                    };

                    // Only update password if a new one was entered
                    if (formData.password) {
                        updates.password = formData.password;
                    }

                    await updateAdmin(employeeData.id, updates);
                    onClose();
                    
                    if (onSuccess) {
                        onSuccess(`Admin ${formData.firstName} ${formData.lastName} has been updated successfully!`);
                    }
                } else {
                    // Update existing employee
                    const updates = {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        name: `${formData.firstName} ${formData.lastName}`.trim(),
                        email: formData.email,
                        phone: formData.phone,
                        department: formData.department,
                        position: formData.position,
                        role: formData.role,
                        join_date: formData.joinDate,
                    };

                    // Only update password if a new one was entered
                    if (formData.password) {
                        updates.password = formData.password;
                    }

                    await updateEmployee(employeeData.employee_id, updates);
                    onClose();
                    
                    if (onSuccess) {
                        onSuccess(`Employee ${formData.firstName} ${formData.lastName} has been updated successfully!`);
                    }
                }
            } else {
                // Check if adding Admin or Employee
                if (formData.role === 'Admin') {
                    // Add new admin with all fields
                    const newAdmin = {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        name: `${formData.firstName} ${formData.lastName}`.trim(),
                        email: formData.email,
                        phone: formData.phone,
                        password: formData.password,
                        role: 'Admin',
                        department: formData.department || 'Administration',
                        position: formData.position || 'Administrator',
                        join_date: formData.joinDate,
                        is_active: true,
                        status: 'Active'
                    };

                    await addAdmin(newAdmin);
                    
                    if (onSuccess) {
                        onSuccess(`Admin ${formData.firstName} ${formData.lastName} has been added successfully!`);
                    }
                } else {
                    // Add new employee
                    const newEmployee = {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        name: `${formData.firstName} ${formData.lastName}`.trim(),
                        email: formData.email,
                        phone: formData.phone,
                        department: formData.department,
                        position: formData.position,
                        role: formData.role,
                        status: 'Active',
                        join_date: formData.joinDate,
                        password: formData.password
                    };

                    await addEmployee(newEmployee);
                    
                    if (onSuccess) {
                        onSuccess(`Employee ${formData.firstName} ${formData.lastName} has been added successfully!`);
                    }
                }
                onClose();

                // Reset form
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    department: '',
                    position: '',
                    role: 'Employee',
                    joinDate: '',
                    password: '',
                    isActive: true
                });
            }
        } catch (error) {
            console.error(`Error ${mode === 'edit' ? 'updating' : 'adding'} employee:`, error);
            if (onError) {
                onError(`Failed to ${mode === 'edit' ? 'update' : 'add'} employee: ${error.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const newData = {
                ...prev,
                [field]: value
            };
            
            // Reset position when department changes
            if (field === 'department') {
                newData.position = '';
            }
            
            return newData;
        });
    };

    const generatePassword = () => {
        // Generate a random 8-character password with letters and numbers
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        handleInputChange('password', password);
    };

    // Check if current user is a regular admin (not super admin)
    const isRegularAdmin = user?.role === 'admin' && !isCurrentUserSuperAdmin;
    
    // Check if admin is editing their own account
    const isEditingSelf = mode === 'edit' && user?.id === employeeData?.id;
    
    // If regular admin is trying to edit another admin account (not their own), show access denied
    if (mode === 'edit' && isEditingAdmin && isRegularAdmin && !isEditingSelf) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-amber-500" />
                        <CardTitle>Access Denied</CardTitle>
                    </div>
                    <CardDescription>
                        You don't have access to edit these accounts.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-amber-800 text-sm">
                            As a regular admin, you can only edit your own account or employee accounts. 
                            Other admin accounts can only be edited by the Super Admin.
                            Please contact the Super Admin if you need to make changes to this account.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Account Details (Read-Only)</Label>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Name:</span>
                                <p className="font-medium">{employeeData?.name}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Email:</span>
                                <p className="font-medium">{employeeData?.email}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Role:</span>
                                <p className="font-medium text-amber-600">
                                    {employeeData?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Status:</span>
                                <p className="font-medium">{employeeData?.status || 'Active'}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // If Super Admin is editing their own account, show special badge
    if (isEditingSuperAdmin && isCurrentUserSuperAdmin) {
        // Continue to show the form with Super Admin badge
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>
                        {mode === 'edit' ? 'Edit Employee' : 'Add New Employee'}
                    </CardTitle>
                    {isEditingSuperAdmin && isCurrentUserSuperAdmin && (
                        <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">
                            <Shield className="h-4 w-4" />
                            <span>Super Admin</span>
                        </div>
                    )}
                </div>
                <CardDescription>
                    {mode === 'edit' 
                        ? 'Update the employee details below.' 
                        : 'Enter the employee details below. All fields are required.'}
                </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input
                                id="firstName"
                                type="text"
                                placeholder="Enter first name"
                                value={formData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input
                                id="lastName"
                                type="text"
                                placeholder="Enter last name"
                                value={formData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter email address"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="Enter phone number"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <div className="relative">
                                <select
                                    id="role"
                                    value={formData.role}
                                    onChange={(e) => handleInputChange('role', e.target.value)}
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                                >
                                    <option value="Employee">Employee</option>
                                    <option value="Admin">Admin</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department">Department {formData.role === 'Employee' ? '*' : ''}</Label>
                            <div className="relative">
                                <select
                                    id="department"
                                    value={formData.department}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        //console.log('Department selected:', value);
                                        setFormData(prev => ({
                                            ...prev,
                                            department: value,
                                            position: '' // Reset position when department changes
                                        }));
                                    }}
                                    required={formData.role === 'Employee'}
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>{formData.role === 'Employee' ? 'Select department' : 'N/A for Admin'}</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="position">Position {formData.role === 'Employee' ? '*' : ''}</Label>
                            <div className="relative">
                                <select
                                    id="position"
                                    value={formData.position}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        //console.log('Position selected:', value);
                                        setFormData(prev => ({
                                            ...prev,
                                            position: value
                                        }));
                                    }}
                                    disabled={!formData.department || formData.role === 'Admin'}
                                    required={formData.role === 'Employee'}
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>
                                        {formData.role === 'Admin' ? 'N/A for Admin' : (formData.department ? 'Select position' : 'Select department first')}
                                    </option>
                                    {getPositionOptions(formData.department).map(position => (
                                        <option key={position} value={position}>{position}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {!formData.department && (
                                <p className="text-sm text-muted-foreground">
                                    Please select a department first
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="joinDate">Join Date {formData.role === 'Employee' ? '*' : ''}</Label>
                        <div className="relative">
                            <Input
                                id="joinDate"
                                type="date"
                                value={formData.joinDate}
                                onChange={(e) => handleInputChange('joinDate', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                onFocus={(e) => {
                                    if (e.currentTarget?.showPicker) {
                                        // Some browsers allow showPicker on focus when initiated by user
                                        try { e.currentTarget.showPicker(); } catch (_) {}
                                    }
                                }}
                                onMouseDown={(e) => {
                                    // Guarantee a user gesture and open native picker
                                    if (e.currentTarget?.showPicker) {
                                        e.preventDefault();
                                        try { e.currentTarget.showPicker(); } catch (_) {}
                                    }
                                }}
                                required={formData.role === 'Employee'}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 
                                py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm 
                                file:font-medium placeholder:text-muted-foreground focus-visible:outline-none 
                                focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
                                disabled:cursor-not-allowed disabled:opacity-50 pr-10 
                                [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden 
                                [&::-webkit-clear-button]:hidden"
                                style={{
                                    colorScheme: 'light',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'textfield'
                                }}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password {mode === 'add' ? '*' : ''}</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={mode === 'edit' ? 'Leave blank to keep current password' : 'Enter temporary password'}
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                minLength={8}
                                maxLength={15}
                                required={mode === 'add'}
                                className="pr-24"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={generatePassword}
                                    className="h-8 px-2"
                                >
                                    <Wand2 className="h-3 w-3 mr-1" />
                                    Gen
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Status toggle for admins in edit mode */}
                    {/* {isEditingAdmin && (
                        <div className="space-y-2">
                            <Label htmlFor="status">Account Status</Label>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="statusActive"
                                        name="status"
                                        checked={formData.isActive}
                                        onChange={() => handleInputChange('isActive', true)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label htmlFor="statusActive" className="text-sm font-normal cursor-pointer">
                                        Active
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="statusTerminated"
                                        name="status"
                                        checked={!formData.isActive}
                                        onChange={() => handleInputChange('isActive', false)}
                                        className="h-4 w-4 text-red-600 focus:ring-red-500"
                                    />
                                    <Label htmlFor="statusTerminated" className="text-sm font-normal cursor-pointer text-red-600">
                                        Terminated
                                    </Label>
                                </div>
                            </div>
                            {!formData.isActive && (
                                <p className="text-sm text-red-500">
                                    Warning: This admin account will be terminated and the user will no longer be able to log in.
                                </p>
                            )}
                        </div>
                    )} */}

                </CardContent>
                
                <CardFooter className="flex justify-end space-x-2 pt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting 
                            ? (mode === 'edit' ? 'Updating Employee...' : 'Adding Employee...') 
                            : (mode === 'edit' ? 'Update Employee' : 'Add Employee')}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default AddEmployeeForm;