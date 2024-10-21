# Standard Operating Procedure (SOP): Web Application Usage 

## Project Overview 

This web application automates the process of verifying student transcripts and admission forms. The system uses OCR technology to extract data from both documents and compares the student's transcript marks with the admission form entries. The final output classifies the documents into three categories: 

- Verified – Marks in both the transcript and form match. 
- Not Verified – Marks do not match. 
- Manual Check Needed – Errors or ambiguities detected during OCR. 

This SOP will guide the admissions team through each step of the process, from uploading documents to exporting results. Each step includes screenshots and instructions to ensure a smooth user experience. 


### 1. Accessing the Web Application 

#### Step 1: Open the Web Application 

- URL: Access the web application by navigating to https://proofie.vercel.app/ in your preferred browser. 

### 2. Uploading Documents 

#### Step 2: Upload Folders 

The system requires you to upload two folders: one containing transcripts and the other containing admission forms. 

Before uploading, ensure your files are organized as follows: 

Create two folders on your local machine:  

- "Transcript"   (no ‘s’ here) 
- "Forms" 

Name the files in each folder according to this convention:  

- In the "Transcript" folder: studentname.pdf 
- In the "Forms" folder: studentname_form.pdf 

#### Procedure: 

 - Click the “Upload Transcripts Folder” button and select the folder containing the student transcripts. 
- Click the “Upload Forms Folder” button and select the folder containing the admission forms. 

After uploading both folders, you can see the names of files and ensure you have uploaded correct files. 
 

3. OCR Process & Progress Bar 

Step 3: Starting the OCR Process 

Once both folders are uploaded, the OCR process begins automatically. 

A progress bar will appear on the screen, indicating the current status of the process.  

The application processes the students’ documents one by one, extracting information and comparing transcript marks to admission form data. 

 

 

 

Step 4: Real-Time Results Display 

As each student’s documents are processed, results will be displayed on the screen, starting with the first student. 

Results are classified into: 

Verified: Marks match between the transcript and the admission form. 

Not Verified: Marks do not match. 

Manual Check Needed: Some issues or errors need to be manually checked. 

Each student’s status will update automatically after their documents are processed. 

 

 

4. Reviewing the Results 

Step 5: Individual Results Breakdown 

The admissions team can view results for each student on the same page after the verification process is over: 

 

5. Exporting Results 

Step 6: Export Processed Results 

Once all students' documents have been processed, an “Export CSV” option will become available at the bottom of the results page. 

Click on “Export CSV” to download a file containing the verification status of all students. 

The CSV file will include the following columns: 

Student Name 

Verification Status (Verified/Not Verified/Manual Check Needed) 

 

 

6. Handling Errors and Manual Checks 

Step 7: Manual Check Alerts 

For students flagged as “Manual Check Needed”, The admissions team will need to review these cases manually. 

7. Troubleshooting & Support 

Step 8: Error Handling and System Support 

If any issues occur during the process, the system will notify the user with an error message.  

Refresh the page and try the process again in case of any error. 

Common error causes include: 

Incorrect File Naming: Make sure the file names follow the specified naming convention. 

Corrupted File Upload: Ensure the files are not corrupted and are in PDF format. 

For any unresolved issues, contact the support team at [Insert Contact Information]. 

Conclusion 

This web application streamlines the process of verifying transcripts and admission forms for the admissions team. By following this SOP, the team can ensure accurate document processing and results export, helping in the efficient handling of student data during the admissions cycle. 

For any questions or additional support, feel free to reach out to [Insert Support Email/Phone]. 

Last Updated: [Insert Date] 

 
