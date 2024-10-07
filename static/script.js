document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = new FormData();
    const transcripts = document.getElementById('transcripts').files;
    const forms = document.getElementById('forms').files;

    for (let i = 0; i < transcripts.length; i++) {
        formData.append('transcripts', transcripts[i]);
    }

    for (let i = 0; i < forms.length; i++) {
        formData.append('forms', forms[i]);
    }

    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');
    const resultsDiv = document.getElementById('results');
    const exportButton = document.getElementById('exportCSV');
    const submitButton = document.querySelector('button[type="submit"]');
    
    progressContainer.style.display = 'block';
    resultsDiv.innerHTML = '';
    exportButton.style.display = 'none';
    submitButton.disabled = true; // Disable the submit button
    submitButton.textContent = 'Verifying...'; // Change button text to "Verifying..."

    let verificationResults = [];
    let totalFiles = transcripts.length;
    let processedFiles = 0;

    fetch('/verify', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        const reader = response.body.getReader();
        return new ReadableStream({
            start(controller) {
                function push() {
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            controller.close();
                            submitButton.disabled = false; // Re-enable the submit button
                            submitButton.textContent = 'Verify'; // Revert button text to "Verify"
                            return;
                        }
                        const text = new TextDecoder().decode(value);
                        const lines = text.split('\n').filter(line => line.trim() !== '');
                        lines.forEach(line => {
                            const data = JSON.parse(line);
                            handleServerResponse(data);
                        });
                        controller.enqueue(value);
                        push();
                    });
                }
                push();
            }
        });
    })
    .catch(error => {
        console.error('Error:', error);
        submitButton.disabled = false; // Re-enable the submit button in case of error
        submitButton.textContent = 'Verify'; // Revert button text to "Verify" in case of error
    });

    function handleServerResponse(data) {
        switch (data.status) {
            case 'Processing':
                updateProgressText(data.message);
                break;
            case 'Result':
                addResult(data);
                processedFiles++;
                updateProgress();
                break;
            case 'Completed':
                updateProgressText(data.message);
                showExportButton();
                break;
        }
    }

    function updateProgressText(message) {
        progressText.textContent = message;
    }

    function updateProgress() {
        const progress = (processedFiles / totalFiles) * 100;
        progressBarFill.style.width = `${progress}%`;
        progressText.textContent = `Processed ${processedFiles} of ${totalFiles} files`;
    }

    function addResult(data) {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const icon = document.createElement('span');
        icon.className = 'icon';
        const resultText = data.result.trim(); // Trim any extra whitespace
        icon.textContent = resultText === 'Verified' ? '✅' : '❌';
        icon.classList.add(resultText === 'Verified' ? 'green-check' : 'red-cross');
        
        const text = document.createElement('span');
        text.textContent = `${data.student} - ${resultText}`;

        resultItem.appendChild(icon);
        resultItem.appendChild(text);
        resultsDiv.appendChild(resultItem);

        verificationResults.push(data);
    }

    function showExportButton() {
        exportButton.style.display = 'block';
    }
});

document.getElementById('exportCSV').addEventListener('click', function() {
    fetch('/export-csv', {
        method: 'GET'
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'verification_results.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => console.error('Error:', error));
});
