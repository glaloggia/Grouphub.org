
"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  type User as FirebaseUser,
  type Auth,
} from "firebase/auth";
import { getFirebaseAuth, initializeAnalytics } from "@/lib/firebase";
import { S_updateUserInAllUsersList, S_deleteUserAndData } from '@/actions/user-profile-actions';
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, pass: string, name?: string) => Promise<FirebaseUser | null>;
  login: (email: string, pass: string) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
  updateCurrentUserProfile: (updates: { displayName?: string; photoURL?: string | null }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  authInstance: Auth | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [authInstance, setAuthInstance] = useState<Auth | null>(null);

  // Effect for setting up the primary auth state listener
  useEffect(() => {
    const auth = getFirebaseAuth();
    initializeAnalytics(); // Initialize Firebase Analytics
    setAuthInstance(auth);

    const unsubscribe = onAuthStateChanged(auth, 
      async (user) => { // Make async
        if (user) {
          // This is a good place to sync the user's public profile data
          try {
            await S_updateUserInAllUsersList(user.uid, user.displayName, user.photoURL, user.email);
            dispatchStorageUpdatedEvent(); // Notify components about potential updates
          } catch (syncError) {
            console.error("AuthProvider: Failed to sync user profile to Firestore on auth state change.", syncError);
            // This is a background sync, so we don't want to show a breaking error to the user.
          }
        }
        setCurrentUser(user);
        setLoading(false);
        setError(null); 
      }, 
      (err) => { 
        console.error("Firebase onAuthStateChanged error:", err);
        setError(err.message || "Failed to initialize authentication.");
        setCurrentUser(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signup = async (email: string, pass: string, name?: string) => {
    if (!authInstance) {
      setError("Authentication service not initialized.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, pass);
      if (userCredential.user && name) {
        await updateProfile(userCredential.user, { displayName: name });
        setCurrentUser(authInstance.currentUser); 
      }
      setLoading(false);
      return authInstance.currentUser;
    } catch (e: any) {
      console.error("Signup error:", e);
      let errorMessage = "An unexpected error occurred during signup. Please try again.";
      switch (e.code) {
        case 'auth/email-already-in-use':
          errorMessage = "This email address is already registered. Please try logging in.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/weak-password':
          errorMessage = "The password is too weak. Please choose a stronger password.";
          break;
        case 'auth/network-request-failed':
           errorMessage = "Could not create account. This email may already be in use, or there's a network issue.";
           break;
        default:
          break;
      }
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  const login = async (email: string, pass: string) => {
    if (!authInstance) {
      setError("Authentication service not initialized.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, pass);
      setLoading(false);
      return userCredential.user;
    } catch (e: any) {
      console.error("Login error:", e);
      let errorMessage = "An unexpected error occurred during login. Please try again.";
      switch (e.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/network-request-failed': // Treat network error as a potential credential error
          errorMessage = "Invalid email or password. Please try again.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This user account has been disabled.";
          break;
        default:
           break;
      }
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  const logout = async () => {
    if (!authInstance) {
      setError("Authentication service not initialized.");
      return;
    }
    setError(null);
    try {
      await signOut(authInstance);
    } catch (e: any) {
      console.error("Logout error:", e);
      setError(e.message || "Logout failed.");
    }
  };

  const updateCurrentUserProfile = async (updates: { displayName?: string; photoURL?: string | null }) => {
    if (!authInstance || !currentUser) {
      throw new Error("User not authenticated or auth service not initialized.");
    }
    try {
      await updateProfile(currentUser, updates);
      if (authInstance.currentUser) {
        setCurrentUser({...authInstance.currentUser});
      }
    } catch (e: any) {
      console.error("Error updating profile:", e);
      throw e; 
    }
  };

  const deleteAccount = async () => {
    if (!authInstance || !currentUser) {
      throw new Error("User not authenticated or auth service not initialized.");
    }
    try {
      // Force token refresh for security
      const idToken = await currentUser.getIdToken(true); 
      const result = await S_deleteUserAndData(idToken);
      if (!result.success) {
        throw new Error(result.message || "Failed to delete account.");
      }
      // onAuthStateChanged will handle the user state change by setting currentUser to null, 
      // which will trigger redirects. No need to call logout() explicitly as the user no longer exists.
    } catch (error: any) {
      console.error("Error deleting account:", error);
      // The server action will return a user-friendly message.
      // Firebase Auth might throw its own errors client-side if it token refresh fails.
      if (error.code === 'auth/requires-recent-login') {
        throw new Error("This action requires you to have recently signed in. Please log out and log back in to continue.");
      }
      throw error;
    }
  };
  

  const value = {
    currentUser,
    loading,
    error,
    signup,
    login,
    logout,
    updateCurrentUserProfile,
    deleteAccount,
    authInstance,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
