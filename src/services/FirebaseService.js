import { db } from '../config/firebase.js';
import logger from '../config/logger.js';

class FirebaseService {
  constructor() {
    this.summariesCollection = db.collection('summaries');
    this.channelsCollection = db.collection('channels');
    this.emailsCollection = db.collection('summaryEmails');
  }

  async saveSummary(videoId, summaryData) {
    try {
      const docRef = await this.summariesCollection.add({
        videoId,
        title: summaryData.title,
        channelId: summaryData.channelId,
        channelName: summaryData.channelName,
        videoTitle: summaryData.videoTitle,
        publishedAt: summaryData.publishedAt,
        createdAt: new Date(),
        summary: summaryData,
      });

      logger.info(`Summary saved to Firestore with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      logger.error('Error saving summary to Firestore:', error);
      throw error;
    }
  }

  async getSummaryByVideoId(videoId) {
    try {
      const snapshot = await this.summariesCollection
        .where('videoId', '==', videoId)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      logger.error('Error getting summary from Firestore:', error);
      throw error;
    }
  }

  async updateChannel(channelData) {
    try {
      await this.channelsCollection.doc(channelData.id).set(
        {
          ...channelData,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      logger.info(`Channel ${channelData.displayName} updated in Firestore`);
    } catch (error) {
      logger.error('Error updating channel in Firestore:', error);
      throw error;
    }
  }

  async getSummaryEmailSubscribers() {
    try {
      const snapshot = await this.emailsCollection.get();
      logger.info('Fetching email subscribers...');
      const subscribers = [];

      for (const doc of snapshot.docs) {
        const email = doc.data().email;
        if (email) {
          subscribers.push(email);
          logger.info(`Found subscriber: ${email}`);
        }
      }

      logger.info(`Total subscribers found: ${subscribers.length}`);
      return subscribers;
    } catch (error) {
      logger.error('Error fetching summary email subscribers:', error);
      throw error;
    }
  }

  async addEmailSubscriber(email) {
    try {
      // Check if email already exists
      const snapshot = await this.emailsCollection
        .where('email', '==', email)
        .get();

      if (!snapshot.empty) {
        throw new Error('Email already subscribed');
      }

      // Add new subscriber
      const docRef = await this.emailsCollection.add({
        email,
        subscribedAt: new Date(),
      });

      logger.info(`New email subscriber added: ${email}`);
      return {
        id: docRef.id,
        email,
      };
    } catch (error) {
      logger.error('Error adding email subscriber:', error);
      throw error;
    }
  }
}

export default FirebaseService;
