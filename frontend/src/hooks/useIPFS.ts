import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

export interface IPFSUploadResult {
  hash: string;
  url: string;
}

export const useIPFS = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Store your Pinata JWT in .env
  const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;

  const uploadToIPFS = useCallback(
    async (file: File): Promise<IPFSUploadResult | null> => {
      setIsUploading(true);
      try {
        if (!PINATA_JWT) throw new Error("Missing Pinata JWT token");

        const formData = new FormData();
        formData.append("file", file);

        const res = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          formData,
          {
            maxBodyLength: Infinity,
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${PINATA_JWT}`,
            },
          }
        );

        const cid = res.data.IpfsHash;
        return { hash: cid, url: `https://gateway.pinata.cloud/ipfs/${cid}` };
      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload file to IPFS (Pinata)",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [toast]
  );

  const uploadJSONToIPFS = useCallback(
    async (data: any): Promise<IPFSUploadResult | null> => {
      setIsUploading(true);
      try {
        if (!PINATA_JWT) throw new Error("Missing Pinata JWT token");

        const res = await axios.post(
          "https://api.pinata.cloud/pinning/pinJSONToIPFS",
          data,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${PINATA_JWT}`,
            },
          }
        );

        const cid = res.data.IpfsHash;
        return { hash: cid, url: `https://gateway.pinata.cloud/ipfs/${cid}` };
      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload JSON to IPFS (Pinata)",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [toast]
  );

  return {
    uploadToIPFS,
    uploadJSONToIPFS,
    isUploading,
  };
};
