import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Scopes requested and authorized for Case 4344/2023 Google Drive Vault
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts'
];

// Flag to track ongoing sign-in popup
let isSigningIn = false;
// In-memory token cache (NEVER in localStorage / sessionStorage)
let cachedAccessToken: string | null = null;
// Active sign-in in-flight promise to prevent concurrent popup calls
let activeSignInPromise: Promise<{ user: User; accessToken: string } | null> | null = null;

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token must be acquired via interactive sign-in popup for Google Workspace APIs
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Perform Google Sign-In with interactive popup.
 * Guarded against double-clicks and concurrent popups to prevent
 * 'auth/cancelled-popup-request' and 'Pending promise was never set' assertion errors.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  // If a popup operation is already in flight, return the existing promise
  if (activeSignInPromise) {
    return activeSignInPromise;
  }

  activeSignInPromise = (async () => {
    isSigningIn = true;
    try {
      const provider = new GoogleAuthProvider();
      // Core drive scope providing full file and metadata synchronization
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Could not obtain Google Drive OAuth access token from authorization credentials.');
      }

      cachedAccessToken = credential.accessToken;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';

      // Gracefully handle popup cancelled or closed without throwing uncaught assertion failure
      if (
        errorCode === 'auth/cancelled-popup-request' ||
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/popup-blocked' ||
        errorMessage.includes('cancelled-popup-request') ||
        errorMessage.includes('popup-closed-by-user') ||
        errorMessage.includes('Pending promise was never set')
      ) {
        console.warn('Google Drive sign-in was cancelled or popup was closed by user.');
        return null;
      }

      console.error('Google Drive sign-in error:', error);
      throw error;
    } finally {
      isSigningIn = false;
      activeSignInPromise = null;
    }
  })();

  return activeSignInPromise;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};
