import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChange, getCurrentUserProfile, syncEmailToFirestore } from '../services/auth.service';

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
            const firestoreProfile = result.user;

            // CHECK: If Firebase Auth email differs from Firestore email
            // This happens after user verifies new email via link
            if (user.email && firestoreProfile.email && user.email !== firestoreProfile.email) {
              console.log('Email mismatch detected - syncing to Firestore...');
              console.log('Auth email:', user.email);
              console.log('Firestore email:', firestoreProfile.email);

              // Sync the new email to Firestore
              const syncResult = await syncEmailToFirestore(user.uid, user.email);

              if (syncResult.success) {
                console.log('Email synced successfully to Firestore');
                // Refresh profile to get updated data
                const refreshed = await getCurrentUserProfile(user.uid);
                if (refreshed.success) {
                  setCurrentUser(user);
                  setUserProfile(refreshed.user);
                }
              } else {
                console.error('Failed to sync email:', syncResult.error);
                // Still update with current profile
                setCurrentUser(user);
                setUserProfile(firestoreProfile);
              }
            } else {
              // No email change - just set profile normally
              setCurrentUser(user);
              setUserProfile(firestoreProfile);
            }
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
