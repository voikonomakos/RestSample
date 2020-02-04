'use strict';
const admin = require('firebase-admin');
const _ = require('lodash');
const Utils = require('../common/utils');
const DbService = require('./dbService');

class MessagingService {

    static async sendMessage(userId, notificationType, spot, sendToUserId, sendToUsername) {

        let me = await DbService.findById(Utils.Collections.Users, userId, { profileImage: 1, username: 1, name: 1, coverImage: 1, uploadedSpotsCount: 1, savedSpotsCount: 1 });
        me.id = me._id.toString();
        delete me._id;


        let sendToUser;
        let projectionFields = { settings: 1 };
        if (sendToUserId) {
            sendToUser = await DbService.findById(Utils.Collections.Users, sendToUserId, projectionFields);
        } else if (sendToUsername) {
            sendToUser = await DbService.findOne(Utils.Collections.Users, { username: sendToUsername }, projectionFields);
        }

        if (!sendToUser) {
            return;
        }

        await DbService.insertOne(Utils.Collections.Notifications,
            {
                userId: sendToUser._id.toString(),
                user: me,
                spot: spot,
                timestamp: Utils.getCurrentDate(),
                type: notificationType
            });

        MessagingService.send(sendToUser.settings, me, notificationType, spot ? spot.id : null)
    }

    static async send(settings, user, notificationType, spotId) {
        if (settings && settings.isPushNotificationsEnabled && settings.notificationTokens) {
            let title = '';
            let body = '';
            if (notificationType === Utils.NotificationType.SAVE) {// save post
                title = 'Your spot was saved!';
                body = user.username + ' saved your spot.'
            } else if (notificationType === Utils.NotificationType.FOLLOW) { // followed
                title = 'You have a new follower!';
                body = user.username + ' follows you.'
            } else if (notificationType === Utils.NotificationType.COMMENT) { // mentions 
                title = 'Someone mentioned about!';
                body = user.username + ' mentioned something about you.'
            } else if (notificationType == Utils.NotificationType.FOLLOW_REQUEST) { // follow request 
                title = 'Someone send you a follow request!';
                body = user.username + ' wants to follow you.'
            }

            if (title) {
                const payload = {
                    notification: {
                        title: title,
                        body: body
                    },
                    data: {
                        username: user.username,
                        name: user.name,
                        profileImage: user.profileImage ? user.profileImage.url : '',
                        timestamp: Utils.getCurrentDate().toString(),
                        spotId: spotId
                    }
                };

                try {
                    const response = await admin.messaging().sendToDevice(settings.notificationTokens, payload);
                    console.log('Successfully sent message:', response);
                } catch (error) {
                    console.log('Error sending message:', error);
                }
            }
        }
    }

    static async sendTestMessage(token) {
        //Utils.initializeFirebaseAdmin();

        const payload = {
            notification: {
                title: 'Test title',
                body: 'Test body'
            },
            data: {
                username: 'user username',
                profileImage: "",
                timestamp: Utils.getCurrentDate().toString(),
            }
        };

        try {
            const response = await admin.messaging().sendToDevice(token, payload);
            Utils.log(response, 'Successfully sent message:');
            return { message: response };
        } catch (error) {
            Utils.log(error, 'Error sending message:');
            return { message: error.toString() };
        }
    }
}

module.exports = MessagingService;