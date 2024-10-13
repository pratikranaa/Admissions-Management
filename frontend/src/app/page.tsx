// pages/index.tsx
"use client";
import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { FileText, Upload, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import TopLoadingBar from './components/TopLoadingBar';
import Navbar from './components/Navbar'; // Import the Navbar component

const FileUpload = ({ onFolderUpload, label, files, clearFiles }) => {
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    onFolderUpload(selectedFiles);
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors duration-200 w-full">
      {files.length === 0 ? (
        <>
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
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
            onClick={clearFiles}
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

const ProgressBar = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
    <motion.div
      className="bg-blue-600 h-2.5 rounded-full"
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.5 }}
    />
  </div>
);

const ResultItem = ({ student, result }) => (
  <div className="flex items-center space-x-2 py-2">
    {result === 'Verified' ? (
      <CheckCircle className="text-green-500" />
    ) : (
      <XCircle className="text-red-500" />
    )}
    <span>{student} - {result}</span>
  </div>
);

const Home = () => {
  const [transcripts, setTranscripts] = useState([]);
  const [forms, setForms] = useState([]);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [progressText, setProgressText] = useState('');
  const abortControllerRef = useRef(null);

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
      const response = await fetch('http://10.1.45.66:5500/verify', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let processedFiles = 0;
      const totalFiles = transcripts.length;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          const data = JSON.parse(line);
          switch (data.status) {
            case 'Processing':
              setProgressText(data.message);
              break;
            case 'Result':
              setResults(prev => [...prev, { student: data.student, result: data.result }]);
              processedFiles++;
              setProgress(data.progress);  // Update progress based on server response
              setProgressText(`Processed ${processedFiles} of ${totalFiles} files`);
              break;
            case 'Completed':
              setProgressText(data.message);
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
      if (error.name === 'AbortError') {
        console.log('Request canceled:', error.message);
      } else {
        console.error('Error:', error);
        toast.error('An error occurred during verification.');
      }
      setProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('http://10.1.45.66:5500/export-csv');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'verification_results.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error exporting CSV file.');
    }
  };

  const cancelVerification = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setProcessing(false);
      setProgressText('Verification cancelled');
    }

    try {
      await fetch('http://10.1.45.66:5500/cancel', { method: 'POST' });
      console.log('Cancellation request sent to server');
    } catch (error) {
      console.error('Error sending cancellation request:', error);
    }

    // Reset the frontend state
    setTranscripts([]);
    setForms([]);
    setProgress(0);
    setResults([]);
    setShowResults(false);
    setProgressText('');
  };

  const clearTranscripts = () => {
    setTranscripts([]);
  };

  const clearForms = () => {
    setForms([]);
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
            <FileUpload onFolderUpload={setTranscripts} label="transcripts" files={transcripts} clearFiles={clearTranscripts} />
            <FileUpload onFolderUpload={setForms} label="forms" files={forms} clearFiles={clearForms} />
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
                <p className="mt-2 text-center">{progressText}</p>
                <div className="mt-4 max-h-60 overflow-y-auto">
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
                <p className="text-sm text-gray-400">Upload the required files and click "Verify" to start the verification process.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;