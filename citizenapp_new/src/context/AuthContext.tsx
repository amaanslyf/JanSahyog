// AuthContext.tsx - FIXED INFINITE INITIALIZATION
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
    Timestamp,
    orderBy,
    limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/notificationService';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    userProfile: UserProfile | null;
    updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
    isOnline: boolean;
    pendingUploads: number;
    notificationService: NotificationService | null;
    notifications: Notification[];
    unreadNotifications: number;
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
    pushToken?: string;
    notificationsEnabled?: boolean;
    notificationPreferences?: {
        issueUpdates: boolean;
        generalNews: boolean;
        emergencyAlerts: boolean;
        departmentUpdates: boolean;
    };
    preferences: {
        language: string;
        notifications: boolean;
        emailUpdates: boolean;
    };
    source: 'mobile_app' | 'web_portal';
}

interface Notification {
    id: string;
    title: string;
    body: string;
    data?: any;
    read: boolean;
    createdAt: Timestamp;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    userProfile: null,
    updateUserProfile: async () => { },
    isOnline: true,
    pendingUploads: 0,
    notificationService: null,
    notifications: [],
    unreadNotifications: 0,
});

// Enhanced sync function for admin portal compatibility
const syncPendingUploads = async (db: any, storage: any) => {
    console.log("🔄 Checking for pending uploads...");

    try {
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

                    const response = await fetch(data.localImageUri);
                    const blob = await response.blob();
                    const fileName = `${data.reportedById || data.userId || 'anonymous'}/${Date.now()}`;
                    const storageRef = ref(storage, `issues/${fileName}`);
                    await uploadBytes(storageRef, blob);
                    const downloadURL = await getDownloadURL(storageRef);

                    const docRef = doc(db, collectionName, docId);
                    const updateData = {
                        imageUri: downloadURL,
                        imageUrl: downloadURL,
                        status: 'Open',
                        localImageUri: null,
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

        await syncOfflineComplaints(db, storage);

    } catch (error) {
        console.error("🚨 Error in sync process:", error);
    }
};

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

                const complaintData = {
                    ...complaint,
                    imageUri: imageUrl,
                    imageUrl: imageUrl,
                    status: 'Open',
                    submittedAt: serverTimestamp(),
                    reportedAt: serverTimestamp(),
                    lastUpdated: serverTimestamp(),
                    updatedBy: 'mobile_sync',
                    source: 'mobile_app',
                    publicVisible: true,
                };

                delete complaintData.localImageUri;
                delete complaintData.pointsToAdd;

                await setDoc(doc(collection(db, "civicIssues")), complaintData);

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
    const [notificationService, setNotificationService] = useState<NotificationService | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    // ✅ FIX: Use refs to prevent re-initialization
    const notificationServiceRef = useRef<NotificationService | null>(null);
    const isInitializingRef = useRef(false);
    const notificationUnsubscribeRef = useRef<(() => void) | null>(null);
    const profileUnsubscribeRef = useRef<(() => void) | null>(null);

    // ✅ FIX: Memoized load user notifications (no dependencies)
    const loadUserNotifications = useCallback((userId: string) => {
        if (notificationUnsubscribeRef.current) {
            notificationUnsubscribeRef.current();
        }

        const notificationsRef = collection(db, `users/${userId}/notifications`);
        const notificationsQuery = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const userNotifications: Notification[] = [];
            let unreadCount = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                const notification = {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt || Timestamp.now()
                } as Notification;

                userNotifications.push(notification);
                if (!notification.read) {
                    unreadCount++;
                }
            });

            setNotifications(userNotifications);
            setUnreadNotifications(unreadCount);
        });

        notificationUnsubscribeRef.current = unsubscribe;
        return unsubscribe;
    }, []); // ✅ FIX: Empty dependency array

    // ✅ FIX: Memoized initialization function (no dependencies)
    const initializeNotifications = useCallback(async (userId: string) => {
        // Prevent multiple initializations
        if (isInitializingRef.current || notificationServiceRef.current) {
            console.log('🔄 NotificationService already initializing or initialized, skipping...');
            return;
        }

        try {
            isInitializingRef.current = true;
            console.log('🚀 Initializing NotificationService for user:', userId);

            const notService = new NotificationService(db, auth);
            await notService.initialize();

            notificationServiceRef.current = notService;
            setNotificationService(notService);

            // Load user notifications
            loadUserNotifications(userId);

            console.log('✅ NotificationService initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing notifications:', error);
        } finally {
            isInitializingRef.current = false;
        }
    }, []); // ✅ FIX: Empty dependency array

    // ✅ FIX: Memoized cleanup function (no dependencies)
    const cleanupNotifications = useCallback(() => {
        if (notificationServiceRef.current) {
            console.log('🧹 Cleaning up NotificationService...');
            notificationServiceRef.current.cleanup();
            notificationServiceRef.current = null;
            setNotificationService(null);
        }

        if (notificationUnsubscribeRef.current) {
            notificationUnsubscribeRef.current();
            notificationUnsubscribeRef.current = null;
        }

        setNotifications([]);
        setUnreadNotifications(0);
        isInitializingRef.current = false;
    }, []); // ✅ FIX: Empty dependency array

    // ✅ FIX: Memoized load user profile (no dependencies except db)
    const loadUserProfile = useCallback((uid: string) => {
        if (profileUnsubscribeRef.current) {
            profileUnsubscribeRef.current();
        }

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

        profileUnsubscribeRef.current = unsubscribe;
        return unsubscribe;
    }, []); // ✅ FIX: Empty dependency array

    // ✅ FIX: Monitor authentication state with proper cleanup (no dependencies)
    useEffect(() => {
        console.log('🔐 Setting up auth state listener...');

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log('👤 Auth state changed:', user ? `User: ${user.uid}` : 'No user');

            setUser(user);

            if (user) {
                // Only initialize if not already done
                if (!notificationServiceRef.current && !isInitializingRef.current) {
                    loadUserProfile(user.uid);
                    await initializeNotifications(user.uid);
                }
            } else {
                setUserProfile(null);
                cleanupNotifications();
            }

            setIsLoading(false);
        });

        return () => {
            console.log('🧹 Cleaning up auth listener...');
            unsubscribe();
            cleanupNotifications();
        };
    }, []); // ✅ FIX: Empty dependency array

    // ✅ FIX: Update user profile with memoization
    const updateUserProfile = useCallback(async (data: Partial<UserProfile>) => {
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
    }, [user, db]);

    // Monitor network connectivity
    useEffect(() => {
        let wasOffline = false;

        const unsubscribe = NetInfo.addEventListener(state => {
            const currentlyOnline = state.isConnected || false;
            setIsOnline(currentlyOnline);

            if (currentlyOnline && wasOffline) {
                console.log("🌐 Connection restored. Starting sync...");
                syncPendingUploads(db, storage);
            }
            wasOffline = !currentlyOnline;
        });

        return () => unsubscribe();
    }, [db, storage]);

    // Monitor pending uploads count
    useEffect(() => {
        if (!user) return;

        // Track counts from each source separately
        let firestorePendingCount = 0;
        let offlinePendingCount = 0;

        const updateTotal = () => {
            setPendingUploads(firestorePendingCount + offlinePendingCount);
        };

        const queries = [
            query(collection(db, "complaints"), where("status", "==", "Pending Upload")),
            query(collection(db, "civicIssues"), where("status", "==", "Pending Upload"))
        ];

        const unsubscribes = queries.map(q =>
            onSnapshot(q, (snapshot) => {
                firestorePendingCount = snapshot.size;
                updateTotal();
            })
        );

        const checkOfflineComplaints = async () => {
            try {
                const offlineData = await AsyncStorage.getItem('offline_complaints');
                if (offlineData) {
                    const complaints = JSON.parse(offlineData);
                    offlinePendingCount = complaints.length;
                } else {
                    offlinePendingCount = 0;
                }
                updateTotal();
            } catch (error) {
                console.error('Error checking offline complaints:', error);
            }
        };

        checkOfflineComplaints();

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [user, db]);

    // Update user activity
    useEffect(() => {
        if (user && userProfile) {
            const updateActivity = async () => {
                try {
                    await updateUserProfile({ lastActive: serverTimestamp() as any });
                } catch (error) {
                    console.error('Error updating user activity:', error);
                }
            };

            const interval = setInterval(updateActivity, 5 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [user, userProfile, updateUserProfile]);

    // Initial sync on app start
    useEffect(() => {
        if (user && isOnline) {
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
        notificationService,
        notifications,
        unreadNotifications,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
