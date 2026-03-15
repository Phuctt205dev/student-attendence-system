import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChange, getCurrentUserProfile } from '../services/auth.service';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to authentication state changes
    const unsubscribe = onAuthStateChange(async (user) => {
      try {
        if (user) {
          // User is signed in, get their profile from Firestore
          const result = await getCurrentUserProfile(user.uid);

          if (result.success) {
            setCurrentUser(user);
            setUserProfile(result.user);
          } else {
            setError('Failed to load user profile');
            setCurrentUser(null);
            setUserProfile(null);
          }
        } else {
          // User is signed out
          setCurrentUser(null);
          setUserProfile(null);
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Update user profile in context
  const updateUser = (updates) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return userProfile?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(userProfile?.role);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    updateUser,
    hasRole,
    hasAnyRole,
    isAuthenticated: !!currentUser,
    isAdmin: userProfile?.role === 'admin',
    isTeacher: userProfile?.role === 'teacher',
    isStudent: userProfile?.role === 'student'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
