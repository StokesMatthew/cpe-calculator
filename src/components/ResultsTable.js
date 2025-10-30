import React, { useState, useMemo } from 'react';
import { CPECalculator } from '../utils/Calculator';

function ResultsTable({ results, emailSelections, onEmailSelect, onExport }) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const summary = useMemo(() => {
    return CPECalculator.calculateSummary(results);
  }, [results]);

  const sortedAndFilteredResults = useMemo(() => {
    let filtered = [...results];

    if (sortColumn) {
      filtered.sort((a, b) => {
        let valA, valB;

        switch (sortColumn) {
          case 'name':
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            break;
          case 'email':
            valA = a.email.toLowerCase();
            valB = b.email.toLowerCase();
            break;
          case 'duration':
            valA = a.duration;
            valB = b.duration;
            break;
          case 'credits':
            valA = a.eligible ? a.credits : 0;
            valB = b.eligible ? b.credits : 0;
            break;
          case 'questions':
            valA = a.questionsAnswered;
            valB = b.questionsAnswered;
            break;
          case 'required':
            valA = a.requiredQuestions;
            valB = b.requiredQuestions;
            break;
          case 'status':
            valA = a.status.toLowerCase();
            valB = b.status.toLowerCase();
            break;
          default:
            return 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [results, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Qualified':
        return 'status-qualified';
      case 'Email Ambiguous':
        return 'status-ambiguous';
      default:
        return 'status-not-qualified';
    }
  };

  return (
    <section className="results-section">
      <div className="results-header">
        <h2>Results</h2>
        <div className="results-actions">
          <button className="btn-secondary" onClick={onExport}>
            Export to CSV
          </button>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-value">{summary.total}</div>
          <div className="stat-label">Total Participants</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-value">{summary.qualified} ({summary.qualifiedPercent}%)</div>
          <div className="stat-label">Qualified</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-value">{summary.notQualified} ({summary.notQualifiedPercent}%)</div>
          <div className="stat-label">Not Qualified</div>
        </div>
        <div className="stat-card stat-info">
          <div className="stat-value">{summary.totalCredits}</div>
          <div className="stat-label">Total Credits Awarded</div>
        </div>
      </div>

      <div className="table-container">
        <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>
                  Name <span className="sort-icon">{sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th onClick={() => handleSort('email')}>
                  Email <span className="sort-icon">{sortColumn === 'email' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th onClick={() => handleSort('duration')}>
                  Duration (min) <span className="sort-icon">{sortColumn === 'duration' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th onClick={() => handleSort('questions')}>
                  Questions<span className="sort-icon">{sortColumn === 'questions' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th onClick={() => handleSort('credits')}>
                  Credits <span className="sort-icon">{sortColumn === 'credits' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th onClick={() => handleSort('status')}>
                  Status <span className="sort-icon">{sortColumn === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
              </tr>
            </thead>
          <tbody>
            {sortedAndFilteredResults.map((result, index) => (
              <tr key={index}>
                <td>{result.name}</td>
                <td>
                  {result.emailStatus === 'ambiguous' ? (
                    <div className="email-ambiguous-select">
                      <select
                        className="email-dropdown"
                        value={emailSelections[result.name] || ''}
                        onChange={(e) => onEmailSelect(result.name, e.target.value)}
                      >
                        <option value="">Select email...</option>
                        {result.emailMatches.map((match, i) => (
                          <option key={i} value={match.email}>
                            {match.email} ({match.confidence}% match)
                          </option>
                        ))}
                      </select>
                      <span className="email-help">Multiple matches found</span>
                    </div>
                  ) : result.emailStatus === 'matched' && result.email ? (
                    <span>
                      {result.email} <span className="email-guessed" data-tooltip={`Matched to: ${result.emailMatches && result.emailMatches[0] ? result.emailMatches[0].name : ''} (${result.emailMatches && result.emailMatches[0] ? result.emailMatches[0].confidence : ''}% match)`}>?</span>
                    </span>
                  ) : result.email ? (
                    result.email
                  ) : (
                    <span className="email-not-found">No Email Found</span>
                  )}
                </td>
                <td className={result.duration < 50 ? 'text-danger' : ''}>
                  {result.duration}
                </td>
                <td className={result.questionsAnswered < result.requiredQuestionsForPotential ? 'text-danger' : ''}>
                  {result.questionsAnswered} / {Math.max(3, result.requiredQuestionsForPotential)}
                </td>
                <td>
                  <span>
                    {result.credits.toFixed(1)}
                    {result.credits !== result.potentialCredits && result.potentialCredits >= 1 ? (
                      <span className="credits-potential">[{result.potentialCredits.toFixed(1)}]</span>
                    ) : ''}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(result.status)}`}>
                    {result.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ResultsTable;

