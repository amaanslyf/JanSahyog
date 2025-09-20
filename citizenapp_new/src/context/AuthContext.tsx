import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useFirebase } from '../hooks/useFirebase';
import NetInfo from '@react-native-community/netinfo';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
    setDoc, 
    serverTimestamp,
    onSnapshot,
    Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    userProfile: UserProfile | null;
    updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
    isOnline: boolean;
    pendingUploads: number;
}

interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    points: number;
    issuesReported: number;
    issuesResolved: number;
    lastActive: Timestamp;
    createdAt: Timestamp;
    role: 'citizen' | 'admin';
    preferences: {
        language: string;
        notifications: boolean;
        emailUpdates: boolean;
    };
    source: 'mobile_app' | 'web_portal';
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    isLoading: true, 
    userProfile: null,
    updateUserProfile: async () => {},
    isOnline: true,
    pendingUploads: 0,
});

// Enhanced sync function for admin portal compatibility
const syncPendingUploads = async (db: any, storage: any) => {
    console.log("🔄 Checking for pending uploads...");

    try {
        // UPDATED: Check both old complaints collection and new civicIssues collection
        const queries = [
            query(collection(db, "complaints"), where("status", "==", "Pending Upload")),
            query(collection(db, "civicIssues"), where("status", "==", "Pending Upload"))
        ];

        for (const q of queries) {
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) continue;

            console.log(`📤 Found ${snapshot.docs.length} items to sync.`);

            for (const document of snapshot.docs) {
                const data = document.data();
                const docId = document.id;
                const collectionName = document.ref.parent.id;

                if (!data.localImageUri) continue;

                try {
                    console.log(`🖼️ Uploading image for ${docId}...`);
                    
                    // Upload image
                    const response = await fetch(data.localImageUri);
                    const blob = await response.blob();
                    const fileName = `${data.reportedById || data.userId || 'anonymous'}/${Date.now()}`;
                    const storageRef = ref(storage, `issues/${fileName}`);
                    await uploadBytes(storageRef, blob);
                    const downloadURL = await getDownloadURL(storageRef);

                    // Update document with admin portal compatible fields
                    const docRef = doc(db, collectionName, docId);
                    const updateData = {
                        imageUri: downloadURL, // Admin portal expects imageUri
                        imageUrl: downloadURL, // Keep old field for backward compatibility
                        status: 'Open', // Change to Open (admin portal status)
                        localImageUri: null, // Clear local path
                        lastUpdated: serverTimestamp(),
                        updatedBy: 'mobile_sync',
                        syncedAt: serverTimestamp(),
                    };

                    await updateDoc(docRef, updateData);
                    console.log(`✅ Successfully synced ${docId}`);
                } catch (error) {
                    console.error(`❌ Failed to sync ${docId}:`, error);
                }
            }
        }

        // Sync offline complaints from AsyncStorage
        await syncOfflineComplaints(db, storage);

    } catch (error) {
        console.error("🚨 Error in sync process:", error);
    }
};

// Sync offline complaints with admin portal compatibility
const syncOfflineComplaints = async (db: any, storage: any) => {
    try {
        const savedComplaintsJSON = await AsyncStorage.getItem('offline_complaints');
        if (!savedComplaintsJSON) return;

        const complaintsToSync = JSON.parse(savedComplaintsJSON);
        if (complaintsToSync.length === 0) return;

        console.log(`📱 Syncing ${complaintsToSync.length} offline complaints...`);

        for (const complaint of complaintsToSync) {
            try {
                let imageUrl = '';
                if (complaint.localImageUri) {
                    const response = await fetch(complaint.localImageUri);
                    const blob = await response.blob();
                    const fileName = `${complaint.reportedById}/${Date.now()}`;
                    const storageRef = ref(storage, `issues/${fileName}`);
                    await uploadBytes(storageRef, blob);
                    imageUrl = await getDownloadURL(storageRef);
                }

                // Admin portal compatible data structure
                const complaintData = {
                    ...complaint,
                    imageUri: imageUrl, // Admin portal field
                    imageUrl: imageUrl, // Legacy field
                    status: 'Open',
                    submittedAt: serverTimestamp(), // Legacy field
                    reportedAt: serverTimestamp(), // Admin portal field
                    lastUpdated: serverTimestamp(),
                    updatedBy: 'mobile_sync',
                    source: 'mobile_app',
                    publicVisible: true,
                };

                // Remove offline-specific fields
                delete complaintData.localImageUri;
                delete complaintData.pointsToAdd;

                // Use civicIssues collection (admin portal compatibility)
                await setDoc(doc(collection(db, "civicIssues")), complaintData);

                // Update user points
                if (complaint.pointsToAdd && complaint.reportedById) {
                    const userRef = doc(db, "users", complaint.reportedById);
                    await updateDoc(userRef, {
                        points: complaint.pointsToAdd,
                        issuesReported: 1,
                        lastActive: serverTimestamp(),
                    });
                }

                console.log(`✅ Synced offline complaint`);
            } catch (error) {
                console.error(`❌ Failed to sync offline complaint:`, error);
            }
        }

        // Clear synced complaints
        await AsyncStorage.removeItem('offline_complaints');
        console.log(`🧹 Cleared synced offline complaints`);
    } catch (error) {
        console.error('🚨 Error syncing offline complaints:', error);
    }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { auth, db, storage } = useFirebase();
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [pendingUploads, setPendingUploads] = useState(0);

    // Monitor authentication state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            
            if (user) {
                // Load user profile from Firestore
                loadUserProfile(user.uid);
            } else {
                setUserProfile(null);
            }
            
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, [auth]);

    // Load user profile with real-time updates
    const loadUserProfile = (uid: string) => {
        const userRef = doc(db, 'users', uid);
        
        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                setUserProfile({ uid, ...doc.data() } as UserProfile);
            } else {
                console.log('User profile not found');
                setUserProfile(null);
            }
        }, (error) => {
            console.error('Error loading user profile:', error);
        });

        return unsubscribe;
    };

    // Update user profile
    const updateUserProfile = async (data: Partial<UserProfile>) => {
        if (!user) return;
        
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                ...data,
                lastUpdated: serverTimestamp(),
            });
            console.log('✅ User profile updated');
        } catch (error) {
            console.error('❌ Error updating user profile:', error);
        }
    };

    // Monitor network connectivity
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const wasOffline = !isOnline;
            setIsOnline(state.isConnected || false);
            
            if (state.isConnected && wasOffline) {
                console.log("🌐 Connection restored. Starting sync...");
                syncPendingUploads(db, storage);
            }
        });

        return () => unsubscribe();
    }, [db, storage, isOnline]);

    // Monitor pending uploads count
    useEffect(() => {
        if (!user) return;

        const queries = [
            query(collection(db, "complaints"), where("status", "==", "Pending Upload")),
            query(collection(db, "civicIssues"), where("status", "==", "Pending Upload"))
        ];

        const unsubscribes = queries.map(q => 
            onSnapshot(q, (snapshot) => {
                setPendingUploads(prev => prev + snapshot.size);
            })
        );

        // Also check offline complaints
        const checkOfflineComplaints = async () => {
            try {
                const offlineData = await AsyncStorage.getItem('offline_complaints');
                if (offlineData) {
                    const complaints = JSON.parse(offlineData);
                    setPendingUploads(prev => prev + complaints.length);
                }
            } catch (error) {
                console.error('Error checking offline complaints:', error);
            }
        };

        checkOfflineComplaints();

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user, db]);

    // Update user activity on app state changes
    useEffect(() => {
        if (user && userProfile) {
            const updateActivity = async () => {
                try {
                    await updateUserProfile({ lastActive: serverTimestamp() as any });
                } catch (error) {
                    console.error('Error updating user activity:', error);
                }
            };

            // Update activity every 5 minutes while app is active
            const interval = setInterval(updateActivity, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [user, userProfile]);

    // Initial sync on app start
    useEffect(() => {
        if (user && isOnline) {
            // Delay initial sync to let everything load
            const timer = setTimeout(() => {
                syncPendingUploads(db, storage);
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [user, isOnline, db, storage]);

    const contextValue: AuthContextType = {
        user,
        isLoading,
        userProfile,
        updateUserProfile,
        isOnline,
        pendingUploads,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Enhanced hook with additional user data
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
