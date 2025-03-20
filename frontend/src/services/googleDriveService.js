// This service handles Google Drive API interactions

class GoogleDriveService {
    constructor() {
        this.API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
        this.CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
        this.SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
        this.tokenClient = null;
        this.isApiLoaded = false;
    }

    // Initialize the Google API client
    async initClient() {
        if (!this.isApiLoaded) {
            return new Promise((resolve, reject) => {
                // Load the Google API script dynamically
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    window.gapi.load('client:auth2', () => {
                        window.gapi.client.init({
                            apiKey: this.API_KEY,
                            clientId: this.CLIENT_ID,
                            scope: this.SCOPES,
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                        }).then(() => {
                            this.isApiLoaded = true;
                            resolve();
                        }).catch(error => {
                            reject(error);
                        });
                    });
                };
                script.onerror = (error) => reject(error);
                document.body.appendChild(script);
            });
        }
    }

    // Check if user is already authenticated
    async checkAuthStatus() {
        try {
            await this.initClient();
            const authInstance = window.gapi.auth2.getAuthInstance();
            return {
                isAuthenticated: authInstance.isSignedIn.get(),
                user: authInstance.isSignedIn.get() ? authInstance.currentUser.get() : null
            };
        } catch (error) {
            console.error('Error checking auth status:', error);
            return { isAuthenticated: false, user: null };
        }
    }

    // Authenticate user with Google
    async authenticate() {
        try {
            await this.initClient();
            const authInstance = window.gapi.auth2.getAuthInstance();
            
            if (authInstance.isSignedIn.get()) {
                return { success: true };
            }
            
            // Trigger Google sign-in popup
            const user = await authInstance.signIn();
            return { 
                success: true, 
                user: user 
            };
        } catch (error) {
            console.error('Google authentication error:', error);
            return { 
                success: false, 
                error: error.message || 'Authentication failed' 
            };
        }
    }

    // Sign out
    async signOut() {
        try {
            await this.initClient();
            const authInstance = window.gapi.auth2.getAuthInstance();
            await authInstance.signOut();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    // List files from Google Drive, default to videos
    async listFiles(options = { q: "mimeType contains 'video/'" }) {
        try {
            await this.initClient();
            
            // Make sure user is authenticated
            const authStatus = await this.checkAuthStatus();
            if (!authStatus.isAuthenticated) {
                throw new Error('User not authenticated with Google Drive');
            }
            
            const response = await window.gapi.client.drive.files.list({
                pageSize: 100,
                fields: 'files(id, name, mimeType, size, thumbnailLink, webContentLink)',
                ...options
            });
            
            return response.result.files || [];
        } catch (error) {
            console.error('Error listing files:', error);
            throw error;
        }
    }

    // Get file metadata
    async getFile(fileId) {
        try {
            await this.initClient();
            const response = await window.gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id, name, mimeType, size, thumbnailLink, webContentLink'
            });
            
            return response.result;
        } catch (error) {
            console.error('Error getting file details:', error);
            throw error;
        }
    }
}

export const googleDriveService = new GoogleDriveService();
