"use client"

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { FileText, Upload, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import TopLoadingBar from './components/TopLoadingBar';
import Navbar from './components/Navbar'; // Import the Navbar component

const API_URL = 'https://10.1.45.66:5500'; // Define the API URL variable

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
          <div className="max-h-28 overflow-y-auto">
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

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
    <motion.div
      className="bg-blue-600 h-2.5 rounded-full"
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.5 }}
    />
  </div>
);

interface ResultItemProps {
  student: string;
  result: string;
}

const ResultItem: React.FC<ResultItemProps> = ({ student, result }) => (
  <div className="flex items-center space-x-2 py-2">
    {result === 'Verified' ? (
      <CheckCircle className="text-green-500" />
    ) : (
      <XCircle className="text-red-500" />
    )}
    <span>{student} - {result}</span>
  </div>
);

interface Result {
  student: string;
  result: string;
}

const Home: React.FC = () => {
  const [transcripts, setTranscripts] = useState<File[]>([]);
  const [forms, setForms] = useState<File[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<Result[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const transcriptInputRef = useRef<HTMLInputElement>(null);
  const formInputRef = useRef<HTMLInputElement>(null);

  const handleVerify = async () => {
    if (transcripts.length === 0 || forms.length === 0) {
      toast.error('Please upload both transcripts and forms folders.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResults([]);
    setShowResults(true);
    setProgressText('Starting verification process...');

    const formData = new FormData();
    transcripts.forEach((file) => formData.append('transcripts', file));
    forms.forEach((file) => formData.append('forms', file));

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let processedFiles = 0;
      const totalFiles = transcripts.length;

      while (true) {
        const { done, value } = await reader?.read() || { done: true, value: undefined };
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          const data = JSON.parse(line);
          switch (data.status) {
            case 'Processing':
              setProgressText(data.message);
              if (data.message.includes('OCR processing completed')) {
                setProgress(prev => prev + (50 / totalFiles));
              }
              break;
            case 'Result':
              setResults(prev => [...prev, { student: data.student, result: data.result }]);
              processedFiles++;
              setProgress((processedFiles / totalFiles) * 100);  // Update progress based on server response
              setProgressText(`Processed ${processedFiles} of ${totalFiles} files`);
              break;
            case 'Completed':
              setProgressText(data.message);
              setProgress(100);
              setProcessing(false);
              break;
            case 'Cancelled':
              setProgressText(data.message);
              setProcessing(false);
              break;
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Request canceled:', error.message);
        } else {
          console.error('Error:', error);
          toast.error('An error occurred during verification.');
        }
      } else {
        console.error('Unknown error:', error);
        toast.error('An unknown error occurred during verification.');
      }
      setProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/export-csv`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'verification_results.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error exporting CSV:', error);
        toast.error('Error exporting CSV file.');
      } else {
        console.error('Unknown error:', error);
        toast.error('An unknown error occurred while exporting CSV.');
      }
    }
  };

  const cancelVerification = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setProcessing(false);
      setProgressText('Verification cancelled');
    }

    try {
      await fetch(`${API_URL}/cancel`, { method: 'POST' });
      console.log('Cancellation request sent to server');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error sending cancellation request:', error);
      } else {
        console.error('Unknown error:', error);
      }
    }

    // Reset the frontend state
    setTranscripts([]);
    setForms([]);
    setProgress(0);
    setResults([]);
    setShowResults(false);
    setProgressText('');
    if (transcriptInputRef.current) {
      transcriptInputRef.current.value = '';
    }
    if (formInputRef.current) {
      formInputRef.current.value = '';
    }
    window.location.reload(); // Refresh the page
  };

  const clearTranscripts = () => {
    setTranscripts([]);
    if (transcriptInputRef.current) {
      transcriptInputRef.current.value = '';
    }
    window.location.reload(); // Refresh the page
  };

  const clearForms = () => {
    setForms([]);
    if (formInputRef.current) {
      formInputRef.current.value = '';
    }
    window.location.reload(); // Refresh the page
  };

  return (
    <div className="min-h-screen bg-gray-800 text-white">
      <Toaster position="top-right" />
      <Navbar /> {/* Use the Navbar component */}
      <TopLoadingBar progress={progress} />
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4 flex flex-col items-center w-full">
            <h2 className="text-xl font-bold mb-2">Upload Files</h2>
            <p className="text-sm text-gray-400 mb-4 text-center">Please upload the transcripts and forms folders to start the verification process.</p>
            <FileUpload onFolderUpload={setTranscripts} label="transcripts" files={transcripts} clearFiles={clearTranscripts} inputRef={transcriptInputRef} />
            <FileUpload onFolderUpload={setForms} label="forms" files={forms} clearFiles={clearForms} inputRef={formInputRef} />
            <button
              onClick={handleVerify}
              disabled={processing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50"
            >
              {processing ? 'Verifying...' : 'Verify'}
            </button>
            {processing && (
              <button
                onClick={cancelVerification}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
              >
                Cancel Verification
              </button>
            )}
          </div>
          <div className="space-y-4 flex flex-col items-center w-full">
            {showResults ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="bg-gray-900 rounded-lg p-4 overflow-hidden w-full"
              >
                <h2 className="text-xl font-bold mb-4">Verification Progress</h2>
                <ProgressBar progress={progress} />
                <div className="mt-2 text-center flex flex-col items-center justify-center relative">
                  <p>{progressText}</p>
                </div>
                <div className="mt-4 max-h-50 overflow-y-auto">
                  {results.map((result, index) => (
                    <ResultItem key={index} student={result.student} result={result.result} />
                  ))}
                </div>
                {!processing && results.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 flex items-center"
                  >
                    <FileText className="mr-2" />
                    Export CSV
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-4 text-center w-full">
                <h2 className="text-xl font-bold mb-2">Verification Status</h2>
                <p className="text-sm text-gray-400">Upload the required files and click &quot;Verify&quot; to start the verification process.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;