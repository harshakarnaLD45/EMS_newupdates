import React, { useState, useEffect } from 'react';
import { X, Package, CheckCircle, Plus, Image, FileImage } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { inventoryApi, employeeApi } from '../../../utils/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

// Helper component for the Success Modal
const SuccessModal = ({ message, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      // backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '2rem',
        maxWidth: '350px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}>
        <CheckCircle style={{ width: '3rem', height: '3rem', color: '#10b981', margin: '0 auto 1rem' }} />
        <h3 className="bodyMediumText2" style={{ color: '#10b981', marginBottom: '0.5rem' }}>Success!</h3>
        <p className="bodyRegularText4" style={{ color: '#4b5563', marginBottom: '1.5rem' }}>{message}</p>
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 150ms ease'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    maxWidth: '42rem',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb'
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  headerIcon: {
    width: '1.25rem',
    height: '1.25rem',
    color: '#3b82f6'
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827'
  },
  closeButton: {
    padding: '0.5rem',
    borderRadius: '9999px',
    transition: 'background-color 150ms ease',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent'
  },
  form: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.25rem'
  },
  required: {
    color: '#ef4444',
  },
  selectWrapper: {
    position: 'relative'
  },
  select: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    appearance: 'none',
    outline: 'none',
    backgroundColor: 'white'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    outline: 'none'
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    resize: 'vertical',
    minHeight: '6rem',
    maxHeight: '15rem',
    outline: 'none'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    transition: 'background-color 150ms ease',
    cursor: 'pointer',
    backgroundColor: 'white'
  },
  submitButton: {
    padding: '0.5rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '0.5rem',
    transition: 'background-color 150ms ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: 'none'
  },
  fileInputWrapper: {
    position: 'relative',
    border: '1px dashed #d1d5db',
    borderRadius: '0.5rem',
    padding: '1rem',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    transition: 'all 150ms ease'
  },
  fileInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    opacity: 0,
    cursor: 'pointer'
  },
  fileInputLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  fileName: {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#374151',
    fontWeight: '500'
  },
  fileInfo: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: '0.25rem'
  }
};

const InventoryRequestForm = ({ onClose, onSuccess }) => {
  const { user, isAdmin } = useAuth();
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  // Check admin status on mount
  useEffect(() => {
    if (isAdmin && typeof isAdmin === 'function') {
      const adminStatus = isAdmin();
      console.log('🔍 Admin status check:', adminStatus);
      setIsUserAdmin(adminStatus);
    }
  }, [isAdmin]);
  
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    condition: 'new',
    serialNumber: '',
    description: '',
    employeeId: ''
  });
  const [itemImage, setItemImage] = useState(null);
  const [invoiceImage, setInvoiceImage] = useState(null);
  const [imageErrors, setImageErrors] = useState({ itemImage: '', invoiceImage: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const categories = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'accessories', label: 'Accessories' }
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' }
  ];

  // Fetch employees for admin dropdown when admin status is confirmed
  useEffect(() => {
    console.log('🔍 isUserAdmin changed:', isUserAdmin);
    if (isUserAdmin) {
      fetchEmployees();
    }
  }, [isUserAdmin]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      console.log('🔍 Fetching employees for admin dropdown...');
      const employeeList = await employeeApi.getEmployees();
      console.log('📋 Raw employee list:', employeeList);
      console.log('📋 Employee count:', employeeList?.length || 0);
      
      // Filter only active employees - check various status field possibilities
      const activeEmployees = employeeList.filter(emp => {
        // Check if status field exists and is 'active' or if no status field exists (assume active)
        const isActive = !emp.status || emp.status === 'active' || emp.status === 'Active';
        console.log(`Employee ${emp.id} / ${emp.employee_id} - status: ${emp.status}, isActive: ${isActive}`);
        return isActive;
      });
      
      console.log('✅ Active employees:', activeEmployees.length);
      setEmployees(activeEmployees);
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user selects
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Please enter an item name';
    }
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    if (isUserAdmin && !formData.employeeId) {
      newErrors.employeeId = 'Please select an employee';
    }
    if (!itemImage) {
      newErrors.itemImage = 'Please upload an item image';
    }
    if (!invoiceImage) {
      newErrors.invoiceImage = 'Please upload an invoice image';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    const setFile = type === 'itemImage' ? setItemImage : setInvoiceImage;
    const setError = (error) => setImageErrors(prev => ({ ...prev, [type]: error }));
    
    setError('');
    
    if (!file) {
      setFile(null);
      return;
    }

    const maxSize = 1 * 1024 * 1024; // 1MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (file.size > maxSize) {
      setError('File size must be less than 1MB.');
      e.target.value = '';
      setFile(null);
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, JPEG, or PNG file');
      e.target.value = '';
      setFile(null);
      return;
    }

    setFile(file);
    // Clear validation error when file is uploaded
    if (errors[type]) {
      setErrors(prev => ({ ...prev, [type]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const conditionLabel = conditions.find(c => c.value === formData.condition)?.label;
      
      // Create inventory item object for database
      const inventoryItem = {
        employee_id: isUserAdmin ? formData.employeeId : (user?.employee_id || user?.id),
        item_name: formData.itemName,
        item_details: formData.description,
        category: formData.category,
        serial_number: formData.serialNumber,
        condition: conditionLabel?.toLowerCase() || 'new',
        added_by: isUserAdmin ? 'Admin' : 'Employee'
      };

      console.log('📤 Adding inventory item:', inventoryItem);
      console.log('📎 Item image:', itemImage);
      console.log('📎 Invoice image:', invoiceImage);
      
      // Save to database with image uploads
      const savedItem = await inventoryApi.createItem(inventoryItem, itemImage, invoiceImage);
      
      // Show success message
      setSuccessMessage('Item has been added successfully to the inventory.');
      
      if (onSuccess) {
        onSuccess(savedItem);
      }
    } catch (err) {
      console.error('Error adding inventory item:', err);
      setImageErrors(prev => ({ ...prev, submit: err.message || 'Failed to add item' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Main Form Modal */}
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h2 className="bodyMediumText2" style={styles.title}>Add Item</h2>
          <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting}>
            <X style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Item Name */}
          <div style={styles.formGroup}>
            <label className="bodyMediumText5" style={styles.label}>
              Item Name <span style={styles.required}>*</span>
            </label>
            <input
              className="bodyMediumText5"
              type="text"
              name="itemName"
              required
              value={formData.itemName}
              onChange={handleChange}
              placeholder='e.g. MacBook Pro 14"'
              style={{
                ...styles.input,
                borderColor: errors.itemName ? '#ef4444' : undefined
              }}
              disabled={isSubmitting}
            />
            {errors.itemName && (
              <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.itemName}
              </span>
            )}
          </div>

          {/* Employee Dropdown - Only for Admin */}
          {isUserAdmin && (
            <div style={styles.formGroup}>
              <label className="bodyMediumText5" style={styles.label}>
                Assign to Employee <span style={styles.required}>*</span>
              </label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => handleSelectChange('employeeId', value)}
                disabled={isSubmitting || loadingEmployees}
              >
                <SelectTrigger
                  className="bodyMediumText5"
                  style={{
                    width: '100%',
                    height: '40px',
                    borderColor: errors.employeeId ? '#ef4444' : undefined
                  }}
                >
                  <SelectValue placeholder={loadingEmployees ? 'Loading employees...' : (employees.length === 0 ? 'No employees found' : 'Select employee')} />
                </SelectTrigger>
                <SelectContent className="select-content-high-zindex">
                  {employees.map((emp) => (
                    <SelectItem key={emp.employee_id || emp.id} value={emp.employee_id || emp.id} className="bodyMediumText5">
                      {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Unknown'} 
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employeeId && (
                <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {errors.employeeId}
                </span>
              )}
            </div>
          )}

          {/* Category and Condition Row */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Category */}
            <div style={{ ...styles.formGroup, flex: 1, minWidth: '200px' }}>
              <label className="bodyMediumText5" style={styles.label}>
                Category <span style={styles.required}>*</span>
              </label>
              <input
                className="bodyMediumText5"
                type="text"
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g. Electronics, Furniture, etc."
                style={{
                  ...styles.input,
                  borderColor: errors.category ? '#ef4444' : undefined
                }}
                disabled={isSubmitting}
              />
              {errors.category && (
                <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {errors.category}
                </span>
              )}
            </div>

           
          </div>

          {/* Serial Number */}
          <div style={styles.formGroup}>
            <label className="bodyMediumText5" style={styles.label}>
              Serial Number <span style={{ color: '#6b7280', fontWeight: '400' }}>(optional)</span>
            </label>
            <input
              className="bodyMediumText5"
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="e.g. MBP-2024-0042"
              style={styles.input}
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div style={styles.formGroup}>
            <label className="bodyMediumText5" style={styles.label}>
              Description <span style={{ color: '#6b7280', fontWeight: '400' }}>(optional)</span>
            </label>
            <textarea
              className="bodyMediumText5"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Specs or notes"
              style={styles.textarea}
              disabled={isSubmitting}
            />
          </div>

          {/* Image Upload Row */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Item Image Upload */}
            <div style={{ ...styles.formGroup, flex: 1, minWidth: '200px' }}>
              <label className="bodyMediumText5" style={styles.label}>
                Item Image <span style={styles.required}>*</span>
              </label>
              <div style={{
                ...styles.fileInputWrapper,
                borderColor: errors.itemImage ? '#ef4444' : undefined,
                backgroundColor: errors.itemImage ? '#fef2f2' : '#f9fafb'
              }}>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleImageChange(e, 'itemImage')}
                  style={styles.fileInput}
                  disabled={isSubmitting}
                />
                <label style={styles.fileInputLabel}>
                  <Image style={{ width: '1.5rem', height: '1.5rem' }} />
                  <span>Click to upload item image</span>
                  <span style={styles.fileInfo}>JPG, JPEG, PNG up to 1MB</span>
                </label>
                {itemImage && (
                  <div style={{
                    ...styles.fileName,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <div style={{ fontWeight: '600', color: '#059669' }}>
                      ✓ {itemImage.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {(itemImage.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                )}
              </div>
              {errors.itemImage && !imageErrors.itemImage && (
                <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {errors.itemImage}
                </span>
              )}
              {imageErrors.itemImage && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  color: '#dc2626',
                  fontSize: '0.875rem'
                }}>
                  {imageErrors.itemImage}
                </div>
              )}
            </div>

            {/* Invoice Image Upload */}
            <div style={{ ...styles.formGroup, flex: 1, minWidth: '200px' }}>
              <label className="bodyMediumText5" style={styles.label}>
                Item Invoice Image <span style={styles.required}>*</span>
              </label>
              <div style={{
                ...styles.fileInputWrapper,
                borderColor: errors.invoiceImage ? '#ef4444' : undefined,
                backgroundColor: errors.invoiceImage ? '#fef2f2' : '#f9fafb'
              }}>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleImageChange(e, 'invoiceImage')}
                  style={styles.fileInput}
                  disabled={isSubmitting}
                />
                <label style={styles.fileInputLabel}>
                  <FileImage style={{ width: '1.5rem', height: '1.5rem' }} />
                  <span>Click to upload invoice</span>
                  <span style={styles.fileInfo}>JPG, JPEG, PNG up to 1MB</span>
                </label>
                {invoiceImage && (
                  <div style={{
                    ...styles.fileName,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <div style={{ fontWeight: '600', color: '#059669' }}>
                      ✓ {invoiceImage.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {(invoiceImage.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                )}
              </div>
              {errors.invoiceImage && !imageErrors.invoiceImage && (
                <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {errors.invoiceImage}
                </span>
              )}
              {imageErrors.invoiceImage && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  color: '#dc2626',
                  fontSize: '0.875rem'
                }}>
                  {imageErrors.invoiceImage}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div style={styles.actions}>
            <button
              className="bodyMediumText5"
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="bodyMediumText5"
              type="submit"
              style={{
                ...styles.submitButton,
                backgroundColor: isSubmitting ? '#9ca3af' : '#3b82f6',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Success Modal Overlay */}
      {successMessage && (
        <SuccessModal
          message={successMessage}
          onClose={() => {
            setSuccessMessage(null);
            onClose();
          }}
        />
      )}
    </>
  );
};

export default InventoryRequestForm;
