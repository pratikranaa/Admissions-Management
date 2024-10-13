import React, { useEffect, ChangeEvent } from 'react';
import { Upload, Trash2 } from 'lucide-react';

interface FileUploadProps {
  onFolderUpload: (files: File[]) => void;
  label: string;
  files: File[];
  clearFiles: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFolderUpload, label, files, clearFiles, inputRef }) => {
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setAttribute('webkitdirectory', 'true');
      inputRef.current.setAttribute('directory', 'true');
    }
  }, [inputRef]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    onFolderUpload(selectedFiles);
  };

  const handleClearFiles = () => {
    clearFiles();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    window.location.reload(); // Refresh the page
  };
  
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors duration-200 w-full">
      {files.length === 0 ? (
        <>
          <input
            type="file"
            ref={inputRef}
            multiple
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${label}`}
          />
          <label htmlFor={`file-upload-${label}`} className="cursor-pointer">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-1">Drop {label} folder here or click to upload</p>
          </label>
        </>
      ) : (
        <div className="text-left">
          <p className="font-bold">{label} ({files.length} files)</p>
          <div className="max-h-32 overflow-y-auto">
            <ul className="list-disc list-inside">
              {files.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
          <button
            onClick={handleClearFiles}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded transition-colors duration-200 flex items-center"
          >
            <Trash2 className="mr-1" />
            Clear {label}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;