/**
 * CSV Exporter Module
 * Handles exporting results to CSV format
 */

export class CSVExporter {
    /**
     * Export results to CSV file
     */
    static exportToCSV(results, filename = 'cpe_results.csv') {
        const headers = [
            'Name',
            'Email',
            'Duration (minutes)',
            'Questions Answered',
            'Credits Earned',
            'Status'
        ];

        const rows = results.map(result => {
            const email = result.email || '';
            return [
                this.escapeCsvValue(result.name),
                this.escapeCsvValue(email.replace(' ?', '')),
                result.duration,
                result.questionsAnswered,
                result.credits.toFixed(1),
                this.escapeCsvValue(result.status)
            ].join(',');
        });

        const csvContent = headers.join(',') + '\n' + rows.join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, filename);
        } else {
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }
    }

    static escapeCsvValue(value) {
        if (value == null) {
            return '';
        }

        const stringValue = String(value);
        const needsEscaping = stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n');

        return needsEscaping ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
    }

    static generateFilename(prefix = 'cpe_results') {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        return `${prefix}_${timestamp}.csv`;
    }
}

