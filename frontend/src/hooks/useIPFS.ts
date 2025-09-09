import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface IPFSUploadResult {
  hash: string;
  url: string;
}

export const useIPFS = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadToIPFS = useCallback(async (file: File): Promise<IPFSUploadResult | null> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isJSON', 'false');

      const { data, error } = await mongodb.functions.invoke('pinata-upload', {
        body: formData,
      });

      if (error) throw error;
      
      return {
        hash: data.hash,
        url: data.url
      };
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file to IPFS",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const uploadJSONToIPFS = useCallback(async (data: any): Promise<IPFSUploadResult | null> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data));
      formData.append('isJSON', 'true');

      const { data: result, error } = await mongodb.functions.invoke('pinata-upload', {
        body: formData,
      });

      if (error) throw error;
      
      return {
        hash: result.hash,
        url: result.url
      };
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload JSON to IPFS",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  return {
    uploadToIPFS,
    uploadJSONToIPFS,
    isUploading
  };
};