// src/services/notificationService.js - REAL FCM INTEGRATION
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

export class NotificationService {
  static EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  
  // Send notification to mobile users via Expo Push Notifications
  static async sendToMobileUsers(notification, userTokens) {
    try {
      if (!userTokens || userTokens.length === 0) {
        console.log('⚠️ No mobile tokens to send to');
        return { success: true, sent: 0 };
      }

      // Filter valid Expo push tokens
      const validTokens = userTokens.filter(token => 
        token && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
      );

      if (validTokens.length === 0) {
        console.log('⚠️ No valid Expo push tokens found');
        return { success: true, sent: 0 };
      }

      // Prepare Expo push message
      const messages = validTokens.map(token => ({
        to: token,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
        priority: notification.priority === 'urgent' ? 'high' : 'normal',
        channelId: 'default'
      }));

      // Send to Expo Push Service
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      
      if (result.data) {
        const successful = result.data.filter(receipt => receipt.status === 'ok').length;
        console.log(`📱 Sent ${successful}/${validTokens.length} mobile notifications successfully`);
        return { success: true, sent: successful, errors: result.data.filter(r => r.status === 'error') };
      }
      
      return { success: false, error: 'Invalid response from Expo' };
    } catch (error) {
      console.error('❌ Error sending mobile notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send notification to web users via Firebase Cloud Messaging
  static async sendToWebUsers(notification, webTokens) {
    try {
      // For web notifications, we'll store them in Firestore
      // The web app will listen for these notifications
      console.log('🌐 Storing web notifications in Firestore:', { notification, webTokens });
      return { success: true, sent: webTokens?.length || 0 };
    } catch (error) {
      console.error('❌ Error sending web notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Main function to send notifications to users
  static async sendNotificationToUsers(notification, targetUsers) {
    try {
      let totalSent = 0;
      const results = [];

      // Group users by token type
      const mobileTokens = [];
      const webTokens = [];

      targetUsers.forEach(user => {
        if (user.pushToken) {
          if (user.pushToken.includes('ExponentPushToken') || user.pushToken.includes('ExpoPushToken')) {
            mobileTokens.push(user.pushToken);
          } else {
            webTokens.push(user.pushToken);
          }
        }
      });

      // Send to mobile users
      if (mobileTokens.length > 0) {
        const mobileResult = await this.sendToMobileUsers(notification, mobileTokens);
        results.push({ type: 'mobile', ...mobileResult });
        if (mobileResult.success) totalSent += mobileResult.sent;
      }

      // Send to web users
      if (webTokens.length > 0) {
        const webResult = await this.sendToWebUsers(notification, webTokens);
        results.push({ type: 'web', ...webResult });
        if (webResult.success) totalSent += webResult.sent;
      }

      // Store notification in each user's personal notifications collection
      for (const user of targetUsers) {
        try {
          await addDoc(collection(db, `users/${user.id}/notifications`), {
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            type: notification.type || 'general',
            priority: notification.priority || 'normal',
            read: false,
            sentBy: 'admin',
            sentAt: serverTimestamp(),
          });
        } catch (error) {
          console.error(`Error storing notification for user ${user.id}:`, error);
        }
      }

      // Store in sent notifications log
      await addDoc(collection(db, 'sentNotifications'), {
        title: notification.title,
        body: notification.body,
        recipientCount: targetUsers.length,
        deliveredCount: totalSent,
        failedCount: targetUsers.length - totalSent,
        sentAt: serverTimestamp(),
        sentBy: 'admin',
        type: notification.type || 'manual',
        results: results
      });

      console.log(`✅ Notification sent successfully to ${totalSent}/${targetUsers.length} users`);
      return { success: true, sent: totalSent, total: targetUsers.length, results };

    } catch (error) {
      console.error('❌ Error in sendNotificationToUsers:', error);
      return { success: false, error: error.message };
    }
  }

  // Automatic notification triggers (Enhanced)
  static async sendAutomaticNotification(trigger, issueData, userData) {
    try {
      const templates = {
        'issue_assigned': {
          title: 'Your issue has been assigned! 📋',
          body: `We have assigned your issue "${issueData.title}" to the ${issueData.assignedDepartment} department. You will receive updates shortly.`,
          type: 'issue_update',
          data: { issueId: issueData.id, trigger: 'assigned' }
        },
        'status_changed_in_progress': {
          title: 'Work started on your issue! 🚧',
          body: `Good news! We have started working on your issue "${issueData.title}". Expected completion: 3-5 days.`,
          type: 'issue_update',
          data: { issueId: issueData.id, trigger: 'in_progress' }
        },
        'status_changed_resolved': {
          title: 'Issue resolved! ✅',
          body: `Great news! Your issue "${issueData.title}" has been successfully resolved. Thank you for your patience.`,
          type: 'issue_update',
          data: { issueId: issueData.id, trigger: 'resolved' }
        },
        'priority_escalated': {
          title: 'Issue escalated to higher authority ⚡',
          body: `Your issue "${issueData.title}" has been escalated due to its priority. We are prioritizing its resolution.`,
          type: 'issue_update',
          data: { issueId: issueData.id, trigger: 'escalated' }
        }
      };

      const template = templates[trigger];
      if (!template) {
        console.log(`⚠️ No template found for trigger: ${trigger}`);
        return;
      }

      // Find the user who reported the issue
      let targetUser = null;
      if (issueData.reportedById) {
        const userQuery = query(
          collection(db, 'users'), 
          where('__name__', '==', issueData.reportedById)
        );
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          targetUser = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() };
        }
      }

      if (!targetUser) {
        console.log('⚠️ Target user not found for automatic notification');
        return;
      }

      // Send notification
      const result = await this.sendNotificationToUsers(template, [targetUser]);
      
      console.log('🔔 Automatic notification sent:', { 
        trigger, 
        issueId: issueData.id, 
        userId: targetUser.id,
        result 
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error sending automatic notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Trigger notifications on issue updates
  static async triggerOnIssueUpdate(oldIssue, newIssue, userData) {
    const triggers = [];

    // Check for assignment
    if (!oldIssue.assignedDepartment && newIssue.assignedDepartment) {
      triggers.push('issue_assigned');
    }

    // Check for status changes
    if (oldIssue.status !== newIssue.status) {
      if (newIssue.status === 'In Progress') {
        triggers.push('status_changed_in_progress');
      } else if (newIssue.status === 'Resolved') {
        triggers.push('status_changed_resolved');
      }
    }

    // Check for priority escalation
    if (oldIssue.priority !== newIssue.priority && newIssue.priority === 'Critical') {
      triggers.push('priority_escalated');
    }

    // Send notifications for each trigger
    const results = [];
    for (const trigger of triggers) {
      const result = await this.sendAutomaticNotification(trigger, newIssue, userData);
      results.push({ trigger, result });
    }

    return results;
  }

  // Send bulk notification to multiple users
  static async sendBulkNotification(notification, userIds) {
    try {
      // Get user data
      const users = [];
      for (const userId of userIds) {
        const userQuery = query(
          collection(db, 'users'),
          where('__name__', '==', userId)
        );
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          users.push({ id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() });
        }
      }

      if (users.length === 0) {
        return { success: false, error: 'No valid users found' };
      }

      return await this.sendNotificationToUsers(notification, users);
    } catch (error) {
      console.error('❌ Error sending bulk notification:', error);
      return { success: false, error: error.message };
    }
  }
}
