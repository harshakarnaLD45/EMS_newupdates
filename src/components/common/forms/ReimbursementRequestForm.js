import React, { useState, useEffect } from 'react';
import { X, DollarSign, FileText, CheckCircle, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { reimbursementApi } from '../../../utils/supabase';
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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
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

// Helper component for the Error Modal
const ErrorModal = ({ message, onClose }) => {
  return (
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
      zIndex: 9999,
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
        <AlertCircle style={{ width: '3rem', height: '3rem', color: '#ef4444', margin: '0 auto 1rem' }} />
        <h3 className="bodyMediumText2" style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Error</h3>
        <p className="bodyRegularText4" style={{ color: '#4b5563', marginBottom: '1.5rem' }}>{message}</p>
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#ef4444',
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
  },
  amountInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  amountPrefix: {
    position: 'absolute',
    left: '0.75rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  amountInput: {
    width: '100%',
    padding: '0.5rem 0.5rem 0.5rem 2rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    outline: 'none'
  }
};

// Categories array defined outside component for use in initialization
const categories = [
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' }
];

// Parse category value from edit request
const getCategoryValue = (categoryLabel) => {
  if (!categoryLabel) return '';
  
  console.log('🔍 Looking for category:', categoryLabel);
  
  // Try exact match first
  let category = categories.find(c => c.label === categoryLabel || c.value === categoryLabel);
  
  // Try case-insensitive match
  if (!category) {
    category = categories.find(c => 
      c.label.toLowerCase() === categoryLabel.toLowerCase() || 
      c.value.toLowerCase() === categoryLabel.toLowerCase()
    );
  }
  
  // Try partial match (e.g., "Software" matches "software")
  if (!category) {
    category = categories.find(c => 
      categoryLabel.toLowerCase().includes(c.value.toLowerCase()) ||
      c.label.toLowerCase().includes(categoryLabel.toLowerCase())
    );
  }
  
  console.log('✅ Found category:', category);
  return category ? category.value : '';
};

const ReimbursementRequestForm = ({ onClose, onSuccess, editRequest = null }) => {
  const { user } = useAuth();

  const isEditing = !!editRequest;
  
  // Get initial form data based on mode (new or edit)
  const getInitialFormData = () => ({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [formData, setFormData] = useState(getInitialFormData());
  const [initialFormData, setInitialFormData] = useState(getInitialFormData());
  const [isDirty, setIsDirty] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [initialReceiptFile, setInitialReceiptFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [errors, setErrors] = useState({});

  // Initialize form data when editRequest changes
  useEffect(() => {
    if (isEditing && editRequest) {
      const categoryValue = getCategoryValue(editRequest.category);
      console.log('🔄 Edit mode - Initializing form data:', {
        category: editRequest.category,
        categoryValue: categoryValue,
        description: editRequest.description,
        amount: editRequest.amount,
        date: editRequest.date
      });
      const initialData = {
        category: categoryValue,
        description: editRequest.description || '',
        amount: editRequest.amount?.toString() || '',
        date: editRequest.date || new Date().toISOString().split('T')[0]
      };
      setFormData(initialData);
      setInitialFormData(initialData);
      setIsDirty(false);
    } else {
      // Reset for new request
      const initialData = getInitialFormData();
      setFormData(initialData);
      setInitialFormData(initialData);
      setIsDirty(false);
    }
  }, [isEditing, editRequest]);

  // Check if form is dirty whenever formData changes
  useEffect(() => {
    const formDataChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    const receiptChanged = receiptFile !== initialReceiptFile;
    setIsDirty(formDataChanged || receiptChanged);
  }, [formData, initialFormData, receiptFile, initialReceiptFile]);

  // Debug: Log formData changes
  useEffect(() => {
    console.log('📊 Current formData:', formData);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name, value) => {
    console.log(`📝 Select changed - ${name}:`, value);
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user selects
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Please enter a description';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }
    // Only require receipt file for new requests, not for edits
    if (!isEditing && !receiptFile) {
      newErrors.receipt = 'Please upload a receipt';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError('');
    
    if (!file) {
      setReceiptFile(null);
      return;
    }

    const maxSize = 1 * 1024 * 1024; // 2MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (file.size > maxSize) {
      setFileError('File size must be less than 1MB.');
      e.target.value = '';
      setReceiptFile(null);
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setFileError('Please upload a PDF, JPG, or PNG file');
      e.target.value = '';
      setReceiptFile(null);
      return;
    }

    setReceiptFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create reimbursement request object for database
      const reimbursementRequest = {
        employee_id: user?.employee_id || user?.id,
        category: categories.find(c => c.value === formData.category)?.label || formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        // Include existing receipt data for updates
        receipt_url: editRequest?.receipt_url,
        receipt_path: editRequest?.receipt_path,
        receipt_name: editRequest?.receipt_name,
        receipt_type: editRequest?.receipt_type,
        receipt_size: editRequest?.receipt_size
      };

      console.log('📤 Submitting reimbursement request:', reimbursementRequest);
      console.log('📎 Receipt file:', receiptFile);
      
      let savedRequest;
      
      if (isEditing) {
        // Update existing request
        savedRequest = await reimbursementApi.updateRequest(editRequest.id, reimbursementRequest, receiptFile);
        
        // Show success modal - onClose will handle calling onSuccess
        setSuccessMessage('Your reimbursement request has been updated successfully.');
      } else {
        // Create new request
        savedRequest = await reimbursementApi.createRequest(reimbursementRequest, receiptFile);
        
        // Show success modal - onClose will handle calling onSuccess
        setSuccessMessage('Your reimbursement request has been submitted for approval.');
      }
      
      // Store saved request for later use in onClose
      window._lastSavedReimbursementRequest = savedRequest;
    } catch (err) {
      console.error('Error submitting reimbursement request:', err);
      const errorMsg = err.message || 'Failed to submit request. Please try again.';
      setFileError(errorMsg);
      setErrorMessage(errorMsg);
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
          <div style={styles.headerTitle}>
            {/* <DollarSign style={styles.headerIcon} /> */}
            <h2 className="bodyRegularText3" style={styles.title}>
              {isEditing ? 'Edit Reimbursement Request' : 'New Reimbursement Request'}
            </h2>
          </div>
          <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting}>
            <X style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Category */}
          <div style={styles.formGroup}>
            <label className="bodyMediumText5" style={styles.label}>
              Category <span style={styles.required}>*</span>
            </label>
            <Select
              key={`category-select-${formData.category}`}
              value={formData.category}
              onValueChange={(value) => handleSelectChange('category', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger 
                className="bodyMediumText5" 
                style={{ 
                  width: '100%', 
                  height: '40px',
                  borderColor: errors.category ? '#ef4444' : undefined,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent 
                className="select-content-high-zindex"
                position="popper"
                sideOffset={4}
                style={{ zIndex: 9999 }}
              >
                {categories.map((cat) => (
                  <SelectItem 
                    key={cat.value} 
                    value={cat.value} 
                    className="bodyMediumText5"
                    style={{ cursor: 'pointer' }}
                  >
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.category}
              </span>
            )}
          </div>

          {/* Description */}
          <div style={styles.formGroup}>
            <label className="bodyMediumText5" style={styles.label}>
              Description <span style={styles.required}>*</span>
            </label>
            <textarea
              className="bodyMediumText5"
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the expense (e.g., Purchased keyboard and mouse for workstation)"
              style={{
                ...styles.textarea,
                borderColor: errors.description ? '#ef4444' : undefined
              }}
              disabled={isSubmitting}
            />
            {errors.description && (
              <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.description}
              </span>
            )}
          </div>

          {/* Amount and Date Row */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Amount */}
            <div style={{ ...styles.formGroup, flex: 1, minWidth: '200px' }}>
              <label className="bodyMediumText5" style={styles.label}>
                Amount <span style={styles.required}>*</span>
              </label>
              <div style={styles.amountInputWrapper}>
                <span style={styles.amountPrefix}>₹</span>
                <input
                  className="bodyMediumText5"
                  type="number"
                  name="amount"
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  style={{
                    ...styles.amountInput,
                    borderColor: errors.amount ? '#ef4444' : undefined
                  }}
                  disabled={isSubmitting}
                />
              </div>
              {errors.amount && (
                <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {errors.amount}
                </span>
              )}
            </div>

            {/* Date */}
            <div style={{ ...styles.formGroup, flex: 1, minWidth: '200px' }}>
              <label className="bodyMediumText5" style={styles.label}>
                Date <span style={styles.required}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="bodyMediumText5"
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    ...styles.input,
                    borderColor: errors.date ? '#ef4444' : undefined
                  }}
                  disabled={isSubmitting}
                />
              </div>
              {errors.date && (
                <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                  {errors.date}
                </span>
              )}
            </div>
          </div>

          {/* Receipt Upload */}
          <div style={styles.formGroup}>
            <label className="bodyMediumText5" style={styles.label}>
              Receipt {isEditing ? '(Optional - upload to replace existing)' : <span style={styles.required}>*</span>}
            </label>
            <div style={{
              ...styles.fileInputWrapper,
              borderColor: errors.receipt ? '#ef4444' : undefined,
              backgroundColor: errors.receipt ? '#fef2f2' : '#f9fafb'
            }}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={styles.fileInput}
                disabled={isSubmitting}
              />
              <label style={styles.fileInputLabel}>
                <FileText style={{ width: '1.5rem', height: '1.5rem' }} />
                <span>Click to upload receipt</span>
                <span style={styles.fileInfo}>PDF, JPG, PNG up to 1MB</span>
              </label>
              {receiptFile ? (
                <div style={{
                  ...styles.fileName,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <div style={{ fontWeight: '600', color: '#059669' }}>
                    ✓ {receiptFile.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ) : isEditing && editRequest?.receipt_name && (
                <div style={{
                  ...styles.fileName,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <div style={{ fontWeight: '600', color: '#3b82f6' }}>
                    📎 Current: {editRequest.receipt_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Upload a new file to replace
                  </div>
                </div>
              )}
            </div>

            {errors.receipt && !fileError && (
              <span className="bodyRegularText5" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>
                {errors.receipt}
              </span>
            )}
            {fileError && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                color: '#dc2626',
                fontSize: '0.875rem'
              }}>
                {fileError}
              </div>
            )}
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
                backgroundColor: isSubmitting || !isDirty ? '#9ca3af' : '#3b82f6',
                cursor: isSubmitting || !isDirty ? 'not-allowed' : 'pointer'
              }}
              disabled={isSubmitting || !isDirty}
              title={!isDirty ? 'Make changes to enable submit' : ''}
            >
              {isSubmitting ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Request' : 'Submit Request')}
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
            // Call onSuccess with the saved request data before closing
            if (onSuccess && window._lastSavedReimbursementRequest) {
              onSuccess(window._lastSavedReimbursementRequest);
              window._lastSavedReimbursementRequest = null;
            }
            onClose();
          }}
        />
      )}
      
      {/* Error Modal Overlay */}
      {errorMessage && (
        <ErrorModal
          message={errorMessage}
          onClose={() => {
            setErrorMessage(null);
          }}
        />
      )}
    </>
  );
};

export default ReimbursementRequestForm;
