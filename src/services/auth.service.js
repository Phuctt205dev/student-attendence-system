import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Register new user
export const registerUser = async (email, password, fullName, role, additionalData = {}) => {
  try {
    // Create authentication account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: fullName
    });

    // Create user profile in Firestore
    const userProfile = {
      uid: user.uid,
      email: email,
      fullName: fullName,
      role: role, // 'student', 'teacher', 'admin'
      avatar: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    // Add role-specific fields
    if (role === 'student') {
      userProfile.studentId = additionalData.studentId || '';
      userProfile.department = additionalData.department || '';
    } else if (role === 'teacher') {
      userProfile.department = additionalData.department || '';
      userProfile.title = additionalData.title || '';
    }

    await setDoc(doc(db, 'users', user.uid), userProfile);

    // Nếu là teacher, tạo thêm document trong teachers collection (tương thích với app mobile)
    if (role === 'teacher') {
      await setDoc(doc(db, 'teachers', user.uid), {
        name: fullName,
        email: email,
        department: additionalData.department || '',
        title: additionalData.title || '',
        createdAt: serverTimestamp()
      });
    }

    return { success: true, user: userProfile };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error: error.message };
  }
};

// Login user
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Nếu là teacher, đảm bảo có document trong teachers collection (tương thích với app mobile)
      if (userData.role === 'teacher') {
        const teacherDoc = await getDoc(doc(db, 'teachers', user.uid));

        if (!teacherDoc.exists()) {
          // Tạo teacher document nếu chưa có
          await setDoc(doc(db, 'teachers', user.uid), {
            name: userData.fullName,
            email: userData.email,
            department: userData.department || '',
            title: userData.title || '',
            createdAt: serverTimestamp()
          });
        }
      }

      return {
        success: true,
        user: {
          uid: user.uid,
          ...userData
        }
      };
    } else {
      return { success: false, error: 'User profile not found' };
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Password reset email sent' };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message };
  }
};

// Get current user profile
export const getCurrentUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, user: { uid, ...userDoc.data() } };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

// Update user profile
export const updateUserProfile = async (uid, updates) => {
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        ...updates,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
