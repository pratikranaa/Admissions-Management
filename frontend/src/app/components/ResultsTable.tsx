
// components/ResultsTable.tsx
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface VerificationResult {
  student: string;
  result: string;
}

interface ResultsTableProps {
  results: VerificationResult[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Student
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Result
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {results.map((result, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap">{result.student}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {result.result === 'Verified' ? (
                  <CheckCircle className="text-green-500 inline-block mr-2" />
                ) : (
                  <XCircle className="text-red-500 inline-block mr-2" />
                )}
                {result.result}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;