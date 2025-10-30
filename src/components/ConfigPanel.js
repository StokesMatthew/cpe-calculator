import React from 'react';

function ConfigPanel({
  sessionStart,
  sessionEnd,
  roundingIncrement,
  onSessionStartChange,
  onSessionEndChange,
  onRoundingChange
}) {
  return (
    <section className="config-section">
      <h2>Configuration</h2>
      <div className="config-grid">
        <div className="config-item">
          <label htmlFor="session-start">Session Start Time:</label>
          <input
            type="time"
            id="session-start"
            value={sessionStart}
            onChange={(e) => onSessionStartChange(e.target.value)}
            required
          />
        </div>
        <div className="config-item">
          <label htmlFor="session-end">Session End Time:</label>
          <input
            type="time"
            id="session-end"
            value={sessionEnd}
            onChange={(e) => onSessionEndChange(e.target.value)}
            required
          />
        </div>
        <div className="config-item">
          <label htmlFor="rounding-increment">Credit Rounding:</label>
          <select
            id="rounding-increment"
            value={roundingIncrement}
            onChange={(e) => onRoundingChange(parseFloat(e.target.value))}
          >
            <option value="1.0">1.0</option>
            <option value="0.5">0.5</option>
            <option value="0.2">0.2</option>
          </select>
        </div>
      </div>
    </section>
  );
}

export default ConfigPanel;

