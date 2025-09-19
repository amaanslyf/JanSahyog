// src/services/notificationService.js - AUTOMATIC NOTIFICATION TRIGGERS
export class NotificationService {
  static async sendAutomaticNotification(trigger, issueData, userData) {
    try {
      const templates = {
        'issue_assigned': {
          title: 'Your issue has been assigned! 📋',
          body: `We have assigned your issue "${issueData.title}" to the ${issueData.assignedDepartment} department. You will receive updates shortly.`
        },
        'status_changed_in_progress': {
          title: 'Work started on your issue! 🚧',
          body: `Good news! We have started working on your issue "${issueData.title}". Expected completion: 3-5 days.`
        },
        'status_changed_resolved': {
          title: 'Issue resolved! ✅',
          body: `Great news! Your issue "${issueData.title}" has been successfully resolved. Thank you for your patience.`
        },
        'priority_escalated': {
          title: 'Issue escalated to higher authority ⚡',
          body: `Your issue "${issueData.title}" has been escalated due to its priority. We are prioritizing its resolution.`
        }
      };

      const template = templates[trigger];
      if (!template) return;

      const notification = {
        title: template.title,
        body: template.body,
        data: {
          issueId: issueData.id,
          trigger: trigger,
          timestamp: new Date().toISOString()
        }
      };

      // Send to mobile users via FCM
      await this.sendToMobile(notification, userData.fcmTokens);
      
      // Send to web users via Web Push
      await this.sendToWeb(notification, userData.webTokens);

      console.log('Automatic notification sent:', { trigger, issueData, notification });
      
      return { success: true, notification };
    } catch (error) {
      console.error('Error sending automatic notification:', error);
      return { success: false, error };
    }
  }

  static async sendToMobile(notification, fcmTokens) {
    // Replace with actual FCM implementation
    console.log('Sending to mobile:', { notification, fcmTokens });
    
    // Mock FCM API call
    // const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `key=${process.env.REACT_APP_FCM_SERVER_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     registration_ids: fcmTokens,
    //     notification: notification,
    //     data: notification.data
    //   })
    // });
  }

  static async sendToWeb(notification, webTokens) {
    // Replace with actual Web Push implementation
    console.log('Sending to web:', { notification, webTokens });
    
    // Mock Web Push API call
  }

  // Call this function when issues are updated
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
    for (const trigger of triggers) {
      await this.sendAutomaticNotification(trigger, newIssue, userData);
    }
  }
}
