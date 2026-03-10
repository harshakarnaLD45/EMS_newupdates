import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format a user's full name from first_name and last_name fields
 * Falls back to the name field if available, or returns a default
 * @param {Object} user - User object with first_name, last_name, and/or name fields
 * @param {string} defaultName - Default name to return if no name is found
 * @returns {string} Formatted full name
 */
export function formatFullName(user, defaultName = 'User') {
  if (!user) return defaultName;
  
  // Priority 1: Use first_name + last_name if both exist
  const firstName = user.first_name || user.firstName || '';
  const lastName = user.last_name || user.lastName || '';
  
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  
  // Priority 2: Use the combined name field
  if (user.name && typeof user.name === 'string' && user.name.trim()) {
    return user.name.trim();
  }
  
  // Priority 3: Try to extract from email or return default
  if (user.email) {
    const emailName = user.email.split('@')[0];
    // Convert email username to title case (e.g., "john.doe" -> "John Doe")
    return emailName
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  
  return defaultName;
}

/**
 * Format a user's name with title case (capitalize first letter of each word)
 * @param {string} name - Name to format
 * @returns {string} Title-cased name
 */
export function toTitleCase(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get initials from a user's name (for avatar display)
 * @param {Object} user - User object with name fields
 * @returns {string} Initials (1-2 characters)
 */
export function getInitials(user) {
  if (!user) return 'U';
  
  const fullName = formatFullName(user, '');
  if (!fullName) return 'U';
  
  const words = fullName.split(' ').filter(w => w.length > 0);
  
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}