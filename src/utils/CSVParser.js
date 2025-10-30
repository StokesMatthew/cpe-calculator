import Papa from 'papaparse';

/**
 * CSV Parser Utility
 * Handles parsing of various CSV formats with flexible column detection
 */

export class CSVParser {
    /**
     * Parse participants CSV
     * Expected columns: Name, Email, Join Time, Leave Time, Duration
     */
    static parseParticipants(csvText) {
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        const participants = [];
                        for (let index = 0; index < results.data.length; index++) {
                            const row = results.data[index];
                            const name = this.findColumnValue(row, ['name', 'user name', 'name (original name)', 'participant']);
                            
                            if (!name) {
                                console.warn(`Row ${index + 2} missing name, skipping`);
                                continue;
                            }

                            participants.push({
                                name: this.normalizeName(name),
                                originalName: name,
                                email: this.findColumnValue(row, ['email', 'email address', 'user email']) || '',
                                joinTime: this.findColumnValue(row, ['join time', 'join', 'time joined']) || '',
                                leaveTime: this.findColumnValue(row, ['leave time', 'leave', 'time left']) || '',
                                duration: this.parseDuration(this.findColumnValue(row, ['duration', 'duration (minutes)', 'duration(minutes)', 'time in session'])),
                                rowNumber: index + 2
                            });
                        }

                        resolve(participants);
                    } catch (error) {
                        reject(new Error(`Error parsing participants: ${error.message}`));
                    }
                },
                error: (error) => {
                    reject(new Error(`CSV parsing error: ${error.message}`));
                }
            });
        });
    }

    /**
     * Parse poll responses CSV (complex Zoom/Webex format)
     * Detects poll sections and counts participant responses
     */
    static parsePollResponses(csvText) {
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                skipEmptyLines: false,
                complete: (results) => {
                    try {
                        const pollData = this.extractPollSections(results.data);
                        resolve(pollData);
                    } catch (error) {
                        reject(new Error(`Error parsing polls: ${error.message}`));
                    }
                },
                error: (error) => {
                    reject(new Error(`CSV parsing error: ${error.message}`));
                }
            });
        });
    }

    /**
     * Extract poll sections from raw CSV data
     */
    static extractPollSections(data) {
        const pollSections = [];
        const participantResponses = new Map();

        let currentPollName = null;
        let inPollSection = false;
        let pollHeaderRow = -1;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            if (row[0] === 'Launched Polls') {
                continue;
            }

            if (row[0] && row[0].trim() && 
                !row[0].startsWith('#') && 
                row[0] !== 'Overview' &&
                row[0] !== 'Launched Polls' &&
                !this.isNumeric(row[0]) &&
                row.length > 1 && 
                !row[1]) {
                
                if (i + 1 < data.length && data[i + 1][0] === '#') {
                    currentPollName = row[0].trim();
                    pollSections.push(currentPollName);
                    inPollSection = true;
                    pollHeaderRow = i + 1;
                    continue;
                }
            }

            if (inPollSection && i > pollHeaderRow && row.length > 1) {
                if (this.isNumeric(row[0])) {
                    const nameCol = this.findColumnValue(row, ['user name', 'name'], 1);
                    if (nameCol) {
                        const normalizedName = this.normalizeName(nameCol);
                        if (!participantResponses.has(normalizedName)) {
                            participantResponses.set(normalizedName, new Set());
                        }
                        participantResponses.get(normalizedName).add(currentPollName);
                    }
                } else if (!row[0] || row[0].trim() === '') {
                    inPollSection = false;
                    currentPollName = null;
                }
            }
        }

        const result = {
            pollCount: pollSections.length,
            pollNames: pollSections,
            participantResponses: Array.from(participantResponses.entries()).map(([name, polls]) => ({
                name,
                pollsAnswered: polls.size,
                polls: Array.from(polls)
            }))
        };

        return result;
    }

    /**
     * Parse registrants CSV
     * Expected columns: Email, First Name, Last Name
     */
    static parseRegistrants(csvText) {
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        const registrants = [];
                        for (const row of results.data) {
                            const email = this.findColumnValue(row, ['email', 'email address']);
                            if (!email) continue;

                            const firstName = this.findColumnValue(row, ['first name', 'firstname', 'first', 'name']);
                            const lastName = this.findColumnValue(row, ['last name', 'lastname', 'last', 'surname']);
                            const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';

                            registrants.push({
                                email: email.trim().toLowerCase(),
                                firstName: firstName || '',
                                lastName: lastName || '',
                                fullName: this.normalizeName(fullName),
                                originalFullName: fullName
                            });
                        }

                        resolve(registrants);
                    } catch (error) {
                        reject(new Error(`Error parsing registrants: ${error.message}`));
                    }
                },
                error: (error) => {
                    reject(new Error(`CSV parsing error: ${error.message}`));
                }
            });
        });
    }

    static findColumnValue(row, possibleNames, directIndex = null) {
        if (directIndex !== null && row[directIndex]) {
            return row[directIndex].trim();
        }

        for (const key in row) {
            const normalizedKey = key.toLowerCase().trim();
            for (const name of possibleNames) {
                if (normalizedKey.includes(name.toLowerCase())) {
                    const value = row[key];
                    return value ? value.trim() : '';
                }
            }
        }

        return '';
    }

    static parseDuration(durationStr) {
        if (!durationStr) return 0;

        const str = String(durationStr).trim();
        
        if (this.isNumeric(str)) {
            return parseInt(str, 10);
        }

        const match = str.match(/(\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }

        return 0;
    }

    static normalizeName(name) {
        if (!name) return '';

        return name.trim()
            .replace(/\b(Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Prof\.?|CMA|CPA|MBA|PhD|CGBA|PGP-DSBA|CFM|EA|CB|CISA|CISM|CSCA)\b/gi, '')
            .replace(/\b(iPhone|iPad|Android|Mobile|Desktop|PC)\b/gi, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    static isNumeric(str) {
        return /^\d+$/.test(String(str).trim());
    }
}

