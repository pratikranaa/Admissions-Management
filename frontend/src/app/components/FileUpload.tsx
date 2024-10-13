// components/FileUpload.tsx
import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFolderUpload: (files: File[]) => void;
  label: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFolderUpload, label }) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      const files = acceptedFiles.filter(file => file.type === 'application/pdf');
      onFolderUpload(files);
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors duration-200"
    >
      <input {...getInputProps()} webkitdirectory="true" directory="true" />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-1">Drop {label} folder here or click to upload</p>
    </div>
  );
};

export default FileUpload;