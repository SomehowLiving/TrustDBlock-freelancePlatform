import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, File, Loader2, Check } from 'lucide-react';
import { useIPFS } from '@/hooks/useIPFS';

interface FileUploadProps {
  accept?: string;
  label: string;
  onUpload: (hash: string, url: string) => void;
  maxFiles?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = "*/*",
  label,
  onUpload,
  maxFiles = 1
}) => {
  const { uploadToIPFS, isUploading } = useIPFS();
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; hash: string; url: string }>>([]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i];
      const result = await uploadToIPFS(file);
      
      if (result) {
        const newFile = {
          name: file.name,
          hash: result.hash,
          url: result.url
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
        onUpload(result.hash, result.url);
      }
    }
    
    // Clear the input
    event.target.value = '';
  }, [uploadToIPFS, onUpload, maxFiles]);

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
          multiple={maxFiles > 1}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={isUploading}
          onClick={() => {
            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            input?.click();
          }}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Uploaded Files:</Label>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <File className="h-4 w-4" />
              <span className="text-sm flex-1">{file.name}</span>
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                IPFS
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};