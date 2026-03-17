import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { auth, db, secondaryAuth } from './firebase';

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
    // Action code settings for password reset
    const actionCodeSettings = {
      // URL to redirect after password reset
      url: window.location.origin + '/#/login',
      handleCodeInApp: false, // Let Firebase handle the password reset
    };

    await sendPasswordResetEmail(auth, email, actionCodeSettings);
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

// Reauthenticate user with password before sensitive operations
export const reauthenticateUser = async (currentPassword) => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { success: false, error: 'No user is currently signed in' };
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    return { success: true };
  } catch (error) {
    console.error('Error reauthenticating user:', error);

    if (error.code === 'auth/wrong-password') {
      return { success: false, error: 'Mật khẩu hiện tại không đúng' };
    } else if (error.code === 'auth/too-many-requests') {
      return { success: false, error: 'Quá nhiều lần thử. Vui lòng thử lại sau' };
    }

    return { success: false, error: error.message };
  }
};

// Send email verification for email change (requires recent authentication)
export const sendEmailChangeVerification = async (newEmail, currentPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user is currently signed in' };
    }

    // Step 1: Reauthenticate user
    const reauthResult = await reauthenticateUser(currentPassword);
    if (!reauthResult.success) {
      return reauthResult;
    }

    // Step 2: Configure action code settings (same as password reset)
    const actionCodeSettings = {
      url: window.location.origin + '/#/login',
      handleCodeInApp: false, // Firebase handles the verification
    };

    // Step 3: Send verification email to new email address
    await verifyBeforeUpdateEmail(user, newEmail, actionCodeSettings);

    return {
      success: true,
      message: 'Email xác thực đã được gửi đến ' + newEmail,
      pendingEmail: newEmail
    };
  } catch (error) {
    console.error('Error sending email verification:', error);

    if (error.code === 'auth/email-already-in-use') {
      return { success: false, error: 'Email này đã được sử dụng bởi tài khoản khác' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Định dạng email không hợp lệ' };
    } else if (error.code === 'auth/requires-recent-login') {
      return { success: false, error: 'Vui lòng đăng nhập lại để thực hiện thao tác này' };
    }

    return { success: false, error: error.message };
  }
};

// Sync email from Firebase Auth to Firestore (called after email is verified)
export const syncEmailToFirestore = async (uid, newEmail) => {
  try {
    // Get user role
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return { success: false, error: 'User profile not found' };
    }

    const userData = userDoc.data();
    const isTeacher = userData.role === 'teacher';

    // Update email in Firestore users collection
    await setDoc(
      doc(db, 'users', uid),
      {
        email: newEmail,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // If teacher, also update teachers collection
    if (isTeacher) {
      await setDoc(
        doc(db, 'teachers', uid),
        {
          email: newEmail,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing email to Firestore:', error);
    return { success: false, error: error.message };
  }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Create student account (for teachers to add students)
// Uses secondary auth instance to avoid logging out the current user
export const createStudentAccount = async (studentId, fullName) => {
  try {
    // Generate email from student ID
    const studentEmail = `${studentId}@gm.uit.edu.vn`;
    const defaultPassword = '11111111';

    // Create authentication account using secondary auth
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      studentEmail,
      defaultPassword
    );
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: fullName
    });

    // Create user profile in Firestore
    const userProfile = {
      uid: user.uid,
      email: studentEmail,
      fullName: fullName,
      role: 'student',
      avatar: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      studentId: studentId,
      department: ''
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    // Sign out from secondary auth to clean up
    await signOut(secondaryAuth);

    return {
      success: true,
      student: userProfile,
      message: 'Tạo tài khoản sinh viên thành công'
    };
  } catch (error) {
    console.error('Error creating student account:', error);

    // Sign out from secondary auth in case of error
    try {
      await signOut(secondaryAuth);
    } catch (signOutError) {
      console.error('Error signing out secondary auth:', signOutError);
    }

    return { success: false, error: error.message };
  }
};

// Helper function to find user by email
const findUserByEmail = async (email) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email),
      limit(1)
    );
    const usersSnapshot = await getDocs(q);
    if (usersSnapshot.empty) {
      return { success: false, error: 'User not found' };
    }
    const userDoc = usersSnapshot.docs[0];
    return {
      success: true,
      user: {
        uid: userDoc.id,
        ...userDoc.data()
      }
    };
  } catch (error) {
    console.error('Error finding user by email:', error);
    return { success: false, error: error.message };
  }
};

// Batch create student accounts from Excel import
export const batchCreateStudents = async (studentsData, onProgress) => {
  const results = {
    success: [],
    failed: [],
    alreadyExists: []
  };

  for (let i = 0; i < studentsData.length; i++) {
    const { studentId, fullName } = studentsData[i];

    // Update progress
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: studentsData.length,
        currentStudent: `${studentId} - ${fullName}`
      });
    }

    try {
      const result = await createStudentAccount(studentId, fullName);

      if (result.success) {
        results.success.push({
          studentId,
          fullName,
          student: result.student
        });
      } else {
        if (result.error.includes('email-already-in-use') || result.error.includes('auth/email-already-in-use')) {
          // Student already has an account, fetch their profile
          const studentEmail = `${studentId}@gm.uit.edu.vn`;
          const userResult = await findUserByEmail(studentEmail);
          if (userResult.success) {
            results.alreadyExists.push({
              studentId,
              fullName,
              student: userResult.user
            });
          } else {
            results.failed.push({
              studentId,
              fullName,
              error: 'Tài khoản đã tồn tại nhưng không tìm thấy trong hệ thống'
            });
          }
        } else {
          results.failed.push({
            studentId,
            fullName,
            error: result.error
          });
        }
      }
    } catch (error) {
      results.failed.push({
        studentId,
        fullName,
        error: error.message
      });
    }
  }

  return results;
};
