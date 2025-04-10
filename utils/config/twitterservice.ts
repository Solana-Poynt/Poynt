// twitterService.ts - Handles Twitter task verification and API interactions

import AsyncStorage from '@react-native-async-storage/async-storage';

// Twitter API endpoints
const TWITTER_API_BASE = 'https://api.twitter.com/2';

/**
 * Twitter service for verifying tasks and interacting with Twitter API
 */
export default class TwitterService {
  // Access token from OAuth process
  private accessToken: string | null = null;
  
  constructor() {
    this.loadToken();
  }
  
  /**
   * Load saved access token from storage
   */
  private async loadToken() {
    try {
      const twitterAccountData = await AsyncStorage.getItem('twitter_account');
      if (twitterAccountData) {
        const parsedData = JSON.parse(twitterAccountData);
        this.accessToken = parsedData.accessToken || null;
      }
    } catch (error) {
      console.error('Failed to load Twitter token:', error);
    }
  }
  
  /**
   * Check if user has connected their Twitter account
   */
  public async isConnected(): Promise<boolean> {
    const twitterAccountData = await AsyncStorage.getItem('twitter_account');
    return !!twitterAccountData;
  }
  
  /**
   * Get user ID of connected Twitter account
   */
  public async getTwitterUserId(): Promise<string | null> {
    try {
      const twitterAccountData = await AsyncStorage.getItem('twitter_account');
      if (twitterAccountData) {
        const parsedData = JSON.parse(twitterAccountData);
        return parsedData.userId || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get Twitter user ID:', error);
      return null;
    }
  }
  
  /**
   * Make an authenticated request to Twitter API
   */
  private async apiRequest(endpoint: string, method = 'GET'): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Twitter access token not available. User may not be connected.');
    }
    
    try {
      const response = await fetch(`${TWITTER_API_BASE}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Twitter API request failed:', error);
      throw error;
    }
  }
  
  /**
   * Verify if user is following a specific account
   * @param targetUserId Twitter ID of the account to check
   */
  public async verifyFollowing(targetUserId: string): Promise<boolean> {
    try {
      const userId = await this.getTwitterUserId();
      if (!userId) return false;
      
      const response = await this.apiRequest(`/users/${userId}/following?target_user_id=${targetUserId}`);
      return !!response.data?.following;
    } catch (error) {
      console.error('Failed to verify following status:', error);
      return false;
    }
  }
  
  /**
   * Verify if user has liked a specific tweet
   * @param tweetId ID of the tweet to check
   */
  public async verifyLiked(tweetId: string): Promise<boolean> {
    try {
      const userId = await this.getTwitterUserId();
      if (!userId) return false;
      
      const response = await this.apiRequest(`/users/${userId}/liked_tweets?tweet.fields=id&tweet_id=${tweetId}`);
      return response.data?.some((tweet: any) => tweet.id === tweetId) || false;
    } catch (error) {
      console.error('Failed to verify like status:', error);
      return false;
    }
  }
  
  /**
   * Verify if user has retweeted a specific tweet
   * @param tweetId ID of the tweet to check
   */
  public async verifyRetweeted(tweetId: string): Promise<boolean> {
    try {
      const userId = await this.getTwitterUserId();
      if (!userId) return false;
      
      const response = await this.apiRequest(`/users/${userId}/retweets?tweet.fields=id&tweet_id=${tweetId}`);
      return response.data?.some((tweet: any) => tweet.id === tweetId) || false;
    } catch (error) {
      console.error('Failed to verify retweet status:', error);
      return false;
    }
  }
  
  /**
   * Verify if user has posted a tweet with specific content
   * @param searchQuery Content to search for (hashtag, text, etc.)
   * @param timeframeMins How far back in minutes to check
   */
  public async verifyPostedContent(searchQuery: string, timeframeMins = 60): Promise<boolean> {
    try {
      const userId = await this.getTwitterUserId();
      if (!userId) return false;
      
      // Calculate time window
      const now = new Date();
      const startTime = new Date(now.getTime() - (timeframeMins * 60 * 1000));
      const startTimeStr = startTime.toISOString();
      
      const response = await this.apiRequest(
        `/users/${userId}/tweets?tweet.fields=created_at,text&start_time=${startTimeStr}`
      );
      
      // Check if any tweets match the search query
      return response.data?.some((tweet: any) => {
        const tweetText = tweet.text.toLowerCase();
        return tweetText.includes(searchQuery.toLowerCase());
      }) || false;
    } catch (error) {
      console.error('Failed to verify posted content:', error);
      return false;
    }
  }
  
  /**
   * Get direct link to perform a Twitter action
   * @param actionType Type of action to perform
   * @param parameters Additional parameters for the action
   */
  public getActionLink(
    actionType: 'follow' | 'like' | 'retweet' | 'tweet', 
    parameters: { username?: string, tweetId?: string, text?: string }
  ): string {
    switch (actionType) {
      case 'follow':
        if (!parameters.username) throw new Error('Username required for follow action');
        return `https://twitter.com/intent/follow?screen_name=${encodeURIComponent(parameters.username)}`;
        
      case 'like':
        if (!parameters.tweetId) throw new Error('Tweet ID required for like action');
        return `https://twitter.com/intent/like?tweet_id=${parameters.tweetId}`;
        
      case 'retweet':
        if (!parameters.tweetId) throw new Error('Tweet ID required for retweet action');
        return `https://twitter.com/intent/retweet?tweet_id=${parameters.tweetId}`;
        
      case 'tweet':
        let tweetUrl = 'https://twitter.com/intent/tweet?';
        if (parameters.text) {
          tweetUrl += `text=${encodeURIComponent(parameters.text)}`;
        }
        return tweetUrl;
        
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }
}