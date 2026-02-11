import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export const ImageService = {
  /**
   * Uploads a base64 image or blob to Firebase Storage
   * @param {string|Blob} filedata - Base64 string or Blob object
   * @param {string} path - Storage path (e.g., 'drawings/userId/timestamp.png')
   * @returns {Promise<string>} - Download URL
   */
  uploadImage: async (filedata, path) => {
    try {
      const storageRef = ref(storage, path);
      let blob;

      if (typeof filedata === 'string' && filedata.startsWith('data:')) {
        // Convert Base64 to Blob
        const response = await fetch(filedata);
        blob = await response.blob();
      } else {
        blob = filedata;
      }

      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
};
