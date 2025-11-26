import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export const useProfilePicture = () => {
  const [uploading, setUploading] = useState(false);

  const pickImage = async (): Promise<string | null> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to upload profile pictures.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  };

  const uploadImage = async (imageUri: string, userId: string): Promise<string | null> => {
    try {
      setUploading(true);

      // Check file size (500MB limit)
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      if (blob.size > 500 * 1024 * 1024) {
        Alert.alert('File too large', 'Please select an image smaller than 500MB');
        return null;
      }

      // Generate unique file name
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, blob, {
          upsert: true,
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Update user record in database
      const { error: updateError } = await supabase
        .from('students')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', 'Failed to upload profile picture');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (userId: string): Promise<boolean> => {
    try {
      setUploading(true);

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('profile-pictures')
        .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.jpeg`]);

      if (deleteError && deleteError.message !== 'No such file found') {
        console.error('Delete error:', deleteError);
      }

      // Update user record
      const { error: updateError } = await supabase
        .from('students')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      Alert.alert('Delete Error', 'Failed to delete profile picture');
      return false;
    } finally {
      setUploading(false);
    }
  };

  return {
    pickImage,
    uploadImage,
    deleteImage,
    uploading,
  };
};