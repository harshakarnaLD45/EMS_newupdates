import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { employeeApi } from "../../utils/supabase";
import ProfileHeader from "./components/profile-header";
import ProfileContent from "./components/profile-content";

export default function ProfilePage() {
  const { user, isAdmin, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch profile on mount - handles both employees and admins
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.employee_id && !user?.id) {
        console.log('⚠️ No user ID found, skipping profile fetch');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Check if user is an admin
        const userIsAdmin = user?.isAdmin || user?.role === 'admin' || user?.role === 'super_admin' || isAdmin();
        console.log('🔍 User admin check:', { 
          userIsAdmin, 
          userRole: user?.role, 
          isAdmin: user?.isAdmin,
          userId: user?.id,
          userEmployeeId: user?.employee_id
        });
        
        let data;
        if (userIsAdmin) {
          // Fetch admin profile using user.id
          const adminId = user.id;
          console.log('🔍 Fetching admin profile for adminId:', adminId);
          
          if (!adminId) {
            throw new Error('Admin ID is missing from user object');
          }
          
          // Check if getAdminProfile exists
          if (!employeeApi.getAdminProfile) {
            console.error('❌ getAdminProfile function not found in employeeApi');
            throw new Error('Admin profile function not available');
          }
          
          data = await employeeApi.getAdminProfile(adminId);
          console.log('✅ Admin profile fetched successfully:', data);
        } else {
          // Fetch employee profile
          const employeeId = user.employee_id || user.id;
          console.log('🔍 Fetching employee profile for employeeId:', employeeId);
          data = await employeeApi.getEmployeeProfile(employeeId);
        }
        
        setProfile(data);
        setError(null);
      } catch (err) {
        console.error("❌ Error fetching profile:", err);
        console.error("❌ Error details:", err.message);
        console.error("❌ Error stack:", err.stack);
        setError(err.message);
        
        // Fallback to user data from auth context
        const userIsAdmin = user?.isAdmin || user?.role === 'admin' || user?.role === 'super_admin';
        console.log('🔄 Using fallback profile data. IsAdmin:', userIsAdmin);
        
        setProfile({
          id: user.id,
          employee_id: user.employee_id || user.id,
          admin_id: user.admin_id || user.id,
          name: user.name,
          first_name: user.first_name || user.name?.split(' ')[0] || '',
          last_name: user.last_name || user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone: user.phone || '',
          department: user.department || (userIsAdmin ? 'Administration' : ''),
          position: user.position || (userIsAdmin ? (user.is_super_admin ? 'Super Administrator' : 'Administrator') : ''),
          role: user.role || 'employee',
          status: user.status || (user.is_active !== false ? 'active' : 'terminated'),
          is_active: user.is_active !== false,
          is_super_admin: user.is_super_admin,
          join_date: user.join_date || user.created_at || null,
          isAdmin: userIsAdmin
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, isAdmin]);

  // Handle profile update - works for both employees and admins
  const handleUpdateProfile = async (updates) => {
    if (!profile?.employee_id && !profile?.id) return;

    try {
      setSaving(true);
      
      let updatedProfile;
      if (profile.isAdmin || profile.role === 'admin' || profile.role === 'super_admin') {
        // Update admin profile
        await employeeApi.updateAdminProfile(profile.id, updates);
        // Fetch fresh data after update
        updatedProfile = await employeeApi.getAdminProfile(profile.id);
      } else {
        // Update employee profile
        updatedProfile = await employeeApi.updateEmployeeProfile(
          profile.employee_id,
          updates
        );
      }
      
      setProfile(updatedProfile);
      
      // Update AuthContext user data to reflect name changes in sidebar
      // Build full name from first_name and last_name
      const updatedFirstName = updates.first_name || updatedProfile.first_name || '';
      const updatedLastName = updates.last_name || updatedProfile.last_name || '';
      const updatedFullName = `${updatedFirstName} ${updatedLastName}`.trim() || updatedProfile.name || user.name;
      
      updateUser({
        name: updatedFullName,
        first_name: updatedFirstName,
        last_name: updatedLastName,
        phone: updates.phone || updatedProfile.phone || user.phone
      });
      
      setIsEditing(false);
      return { success: true };
    } catch (err) {
      console.error("Error updating profile:", err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 ">
      <ProfileHeader 
        profile={profile}
        isEditing={isEditing}
        onEditToggle={() => setIsEditing(!isEditing)}
      />
      <ProfileContent 
        profile={profile}
        isEditing={isEditing}
        saving={saving}
        onUpdateProfile={handleUpdateProfile}
        onCancelEdit={() => setIsEditing(false)}
      />
    </div>
  );
}
