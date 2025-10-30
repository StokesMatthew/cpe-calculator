import React, { useState } from 'react';
import './App.css';
import { CSVParser } from './utils/CSVParser';
import { NameMatcher } from './utils/NameMatcher';
import { CPECalculator } from './utils/Calculator';
import { CSVExporter } from './utils/CSVExporter';
import FileUpload from './components/FileUpload';
import ConfigPanel from './components/ConfigPanel';
import ResultsTable from './components/ResultsTable';

function App() {
  const [state, setState] = useState({
    participantsFiles: [],
    pollsFiles: [],
    lookupFiles: [],
    sessionStart: '',
    sessionEnd: '',
    roundingIncrement: 0.5,
    results: null,
    progressMessage: '',
    progressStatus: '',
    emailSelections: {}
  });

  const handleFileUpload = async (file, type) => {
    if (!file) return;

    console.log(`Processing ${type} file: ${file.name}`);

    try {
      const text = await readFileAsText(file);

      let data;
      const fileInfo = { fileName: file.name, data: null };
      
      switch (type) {
        case 'participants':
          data = await CSVParser.parseParticipants(text);
          fileInfo.data = data;
          setState(prev => ({
            ...prev,
            participantsFiles: [fileInfo]
          }));
          console.log(`Parsed ${data.length} participants from ${file.name}`);
          return { success: true, message: `✓ ${data.length} participants` };

        case 'polls':
          data = await CSVParser.parsePollResponses(text);
          fileInfo.data = data;
          setState(prev => ({
            ...prev,
            pollsFiles: [...prev.pollsFiles, fileInfo]
          }));
          console.log(`Parsed ${data.pollCount} polls from ${file.name}`);
          return { success: true, message: `✓ ${data.pollCount} polls, ${data.participantResponses.length} responses` };

        case 'lookup':
          data = await CSVParser.parseRegistrants(text);
          fileInfo.data = data;
          setState(prev => ({
            ...prev,
            lookupFiles: [fileInfo]
          }));
          console.log(`Parsed ${data.length} entries from ${file.name}`);
          return { success: true, message: `✓ ${data.length} entries` };

        default:
          throw new Error('Invalid file type');
      }
    } catch (error) {
      console.error(`Error processing ${type} file:`, error);
      return { success: false, message: `✗ Error: ${error.message}` };
    }
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleCalculate = async () => {
    const currentRoundingIncrement = state.roundingIncrement;
    const currentParticipantsFiles = state.participantsFiles;
    const currentPollsFiles = state.pollsFiles;
    const currentLookupFiles = state.lookupFiles;
    const currentSessionStart = state.sessionStart;
    const currentSessionEnd = state.sessionEnd;

    setState(prev => ({
      ...prev,
      results: null,
      progressMessage: 'Processing data...',
      progressStatus: 'processing'
    }));

    try {
      let allParticipants = [];
      for (const file of currentParticipantsFiles) {
        allParticipants = allParticipants.concat(file.data);
      }
      console.log(`Merged ${allParticipants.length} total participants from ${currentParticipantsFiles.length} file(s)`);

      let aggregated = NameMatcher.aggregateParticipants(allParticipants);
      console.log(`Aggregated to ${aggregated.length} unique participants`);

      aggregated = NameMatcher.clampToSession(
        aggregated,
        currentSessionStart,
        currentSessionEnd
      );

      const pollResponseMap = new Map();
      
      for (const file of currentPollsFiles) {
        for (const response of file.data.participantResponses) {
          if (!pollResponseMap.has(response.name)) {
            pollResponseMap.set(response.name, new Set());
          }
          for (const pollName of response.polls || []) {
            pollResponseMap.get(response.name).add(pollName);
          }
        }
      }

      const allPollResponses = Array.from(pollResponseMap.entries()).map(([name, pollNamesSet]) => ({
        name: name,
        pollsAnswered: pollNamesSet.size,
        polls: Array.from(pollNamesSet)
      }));

      console.log(`Merged poll responses for ${allPollResponses.length} unique participants from ${currentPollsFiles.length} file(s)`);

      let allLookupData = [];
      for (const file of currentLookupFiles) {
        allLookupData = allLookupData.concat(file.data);
      }
      console.log(`Merged ${allLookupData.length} total lookup entries from ${currentLookupFiles.length} file(s)`);

      const results = CPECalculator.processParticipants(
        aggregated,
        allPollResponses,
        allLookupData.length > 0 ? allLookupData : null,
        currentRoundingIncrement,
        NameMatcher
      );

      setState(prev => ({
        ...prev,
        results,
        progressMessage: 'Calculations complete!',
        progressStatus: 'success'
      }));

      console.log('Calculation complete:', results);
    } catch (error) {
      setState(prev => ({
        ...prev,
        progressMessage: `Error: ${error.message}`,
        progressStatus: 'error'
      }));
      console.error('Calculation error:', error);
    }
  };

  const handleEmailSelect = (participantName, selectedEmail) => {
    setState(prev => ({
      ...prev,
      emailSelections: {
        ...prev.emailSelections,
        [participantName]: selectedEmail
      }
    }));
  };

  const handleFileRemove = (type, fileName) => {
    setState(prev => ({
      ...prev,
      [`${type}Files`]: prev[`${type}Files`].filter(file => file.fileName !== fileName),
      results: null,
      progressMessage: '',
      progressStatus: ''
    }));
  };

  const handleExport = () => {
    if (!state.results || state.results.length === 0) {
      alert('No results to export');
      return;
    }

    const resultsWithSelections = state.results.map(result => {
      if (result.emailStatus === 'ambiguous') {
        const selectedEmail = state.emailSelections[result.name];
        return {
          ...result,
          email: selectedEmail || '',
          emailStatus: selectedEmail ? 'selected' : 'not_found'
        };
      }
      return result;
    });

    const filename = CSVExporter.generateFilename('cpe_results');
    CSVExporter.exportToCSV(resultsWithSelections, filename);
  };

  const canCalculate = state.participantsFiles.length > 0 && state.pollsFiles.length > 0 && state.sessionStart && state.sessionEnd;

  return (
    <div className="container">
      <header>
        <h1>CPE Calculator</h1>
        <p className="subtitle">Calculate Continuing Professional Education (CPE) credits and determine certificate eligibility</p>
      </header>

      <main>
        <ConfigPanel
          sessionStart={state.sessionStart}
          sessionEnd={state.sessionEnd}
          roundingIncrement={state.roundingIncrement}
          onSessionStartChange={(value) => setState(prev => ({ ...prev, sessionStart: value }))}
          onSessionEndChange={(value) => setState(prev => ({ ...prev, sessionEnd: value }))}
          onRoundingChange={(value) => setState(prev => ({ ...prev, roundingIncrement: value }))}
        />

        <section className="upload-section">
          <h2>Upload Files</h2>
          <div className="upload-grid">
            <FileUpload
              id="participants"
              title="Participants CSV"
              description="Name, Email, Join/Leave Times, Duration"
              icon="📄"
              files={state.participantsFiles}
              onFileSelect={(file) => handleFileUpload(file, 'participants')}
              onFileRemove={(fileName) => handleFileRemove('participants', fileName)}
              allowMultiple={false}
            />
            <FileUpload
              id="polls"
              title="Poll Responses CSV"
              description="Zoom/Webex poll export"
              icon="📊"
              files={state.pollsFiles}
              onFileSelect={(file) => handleFileUpload(file, 'polls')}
              onFileRemove={(fileName) => handleFileRemove('polls', fileName)}
              allowMultiple={true}
            />
            <FileUpload
              id="lookup"
              title="Email Lookup CSV"
              description="Optional: For email lookup"
              icon="👥"
              files={state.lookupFiles}
              onFileSelect={(file) => handleFileUpload(file, 'lookup')}
              onFileRemove={(fileName) => handleFileRemove('lookup', fileName)}
              allowMultiple={false}
            />
          </div>
        </section>

        <section className="action-section">
          <button
            className="btn-primary"
            onClick={handleCalculate}
            disabled={!canCalculate}
          >
            Calculate CPE Credits
          </button>
          <div className={`progress-message ${state.progressStatus}`}>
            {state.progressMessage}
          </div>
        </section>

        {state.results && (
          <ResultsTable
            results={state.results}
            emailSelections={state.emailSelections}
            onEmailSelect={handleEmailSelect}
            onExport={handleExport}
          />
        )}
      </main>

      <footer>
        <p>CPE Calculator - Client-side processing, no data uploaded to servers</p>
        <p className="disclaimer">This tool is not endorsed by NASBA or any other professional organization.</p>
      </footer>
    </div>
  );
}

export default App;
