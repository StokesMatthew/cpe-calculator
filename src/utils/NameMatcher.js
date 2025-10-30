/**
 * Fuzzy Name Matcher Module
 * Handles name matching between participants and registrants using Levenshtein distance
 */

export class NameMatcher {
    /**
     * Find email for participant by matching name against registrants
     */
    static findEmail(participantName, registrants, threshold = 0.65) {
        if (!participantName || registrants.length === 0) {
            return { email: '', isAmbiguous: false, matches: [], wasMatched: false };
        }

        const normalizedParticipant = this.normalizeString(participantName);

        const scoredMatches = registrants.map(registrant => {
            const normalizedFullName = this.normalizeString(registrant.fullName);
            const normalizedReversed = this.normalizeString(this.reverseName(registrant.fullName));
            const normalizedFirstLast = this.normalizeString(`${registrant.firstName} ${registrant.lastName}`);

            const fullNameScore = this.calculateSimilarity(normalizedParticipant, normalizedFullName);
            const reversedScore = this.calculateSimilarity(normalizedParticipant, normalizedReversed);
            const firstLastScore = this.calculateSimilarity(normalizedParticipant, normalizedFirstLast);

            const tokenScore = this.tokenBasedSimilarity(normalizedParticipant, normalizedFullName);

            const maxScore = Math.max(fullNameScore, reversedScore, firstLastScore, tokenScore);

            return {
                email: registrant.email,
                name: registrant.originalFullName,
                score: maxScore,
                confidence: this.scoreToConfidence(maxScore)
            };
        }).filter(match => match.score >= threshold);

        scoredMatches.sort((a, b) => b.score - a.score);

        if (scoredMatches.length === 0) {
            return { email: '', isAmbiguous: false, matches: [], wasMatched: false };
        }

        const topMatch = scoredMatches[0];
        const secondMatch = scoredMatches[1];

        if (!secondMatch || (topMatch.score - secondMatch.score) >= 0.2) {
            return {
                email: topMatch.email,
                isAmbiguous: false,
                matches: [topMatch],
                wasMatched: true
            };
        }

        return {
            email: topMatch.email,
            isAmbiguous: true,
            matches: scoredMatches.slice(0, 3),
            wasMatched: true
        };
    }

    /**
     * Normalize string by removing accents, special characters, and extra whitespace
     */
    static normalizeString(str) {
        if (!str) return '';

        return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\b(dr|mr|mrs|ms|prof|cpa|cma|jr|sr|ii|iii|iv|iphone|ipad|android)\b\.?/gi, '') // removing common suffixes to make matching accurater
            .replace(/[^a-z\s]/g, '')
            .trim()
            .replace(/\s+/g, ' ');
    }

    /**
     * Token-based similarity (compare individual name tokens)
     */
    static tokenBasedSimilarity(str1, str2) {
        const tokens1 = str1.split(' ').filter(t => t.length > 1);
        const tokens2 = str2.split(' ').filter(t => t.length > 1);
        
        if (tokens1.length === 0 || tokens2.length === 0) return 0;
        
        let matchScore = 0;
        for (const token1 of tokens1) {
            let bestMatch = 0;
            for (const token2 of tokens2) {
                let score = 0;
                if (token1 === token2) {
                    score = 1.0;
                } else if (token1.length >= 3 && token2.length >= 3) {
                    if (token1.startsWith(token2) || token2.startsWith(token1)) {
                        const minLen = Math.min(token1.length, token2.length);
                        const maxLen = Math.max(token1.length, token2.length);
                        score = minLen / maxLen;
                    } else {
                        const similarity = this.calculateSimilarity(token1, token2);
                        if (similarity > 0.85) {
                            score = similarity;
                        }
                    }
                }
                bestMatch = Math.max(bestMatch, score);
            }
            matchScore += bestMatch;
        }
        
        return matchScore / Math.max(tokens1.length, tokens2.length);
    }

    /**
     * Calculate similarity between two strings using Levenshtein distance
     */
    static calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (!str1 || !str2) return 0.0;

        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        
        return 1 - (distance / maxLength);
    }

    /**
     * Levenshtein distance algorithm
     */
    static levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;

        if (m === 0) return n;
        if (n === 0) return m;

        let prevRow = Array(n + 1);
        let currRow = Array(n + 1);

        for (let j = 0; j <= n; j++) {
            prevRow[j] = j;
        }

        for (let i = 1; i <= m; i++) {
            currRow[0] = i;
            
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    currRow[j] = prevRow[j - 1];
                } else {
                    currRow[j] = Math.min(
                        prevRow[j] + 1,
                        currRow[j - 1] + 1,
                        prevRow[j - 1] + 1
                    );
                }
            }

            [prevRow, currRow] = [currRow, prevRow];
        }

        return prevRow[n];
    }

    static reverseName(name) {
        const parts = name.split(' ').filter(p => p);
        if (parts.length < 2) return name;
        
        const surname = parts.pop();
        return `${surname} ${parts.join(' ')}`;
    }

    static scoreToConfidence(score) {
        return Math.round(score * 100);
    }

    /**
     * Aggregate participants by name and sum durations
     */
    static aggregateParticipants(participants) {
        const aggregated = new Map();

        for (const participant of participants) {
            const key = participant.name;
            
            if (!aggregated.has(key)) {
                aggregated.set(key, {
                    name: participant.name,
                    originalName: participant.originalName,
                    email: participant.email,
                    totalDuration: 0,
                    entries: []
                });
            }

            const entry = aggregated.get(key);
            entry.totalDuration += participant.duration;
            entry.entries.push({
                joinTime: participant.joinTime,
                leaveTime: participant.leaveTime,
                duration: participant.duration
            });

            if (!entry.email && participant.email) {
                entry.email = participant.email;
            }
        }

        return Array.from(aggregated.values());
    }

    /**
     * Apply session time clamping to participant durations
     * sessionStart and sessionEnd are time strings in HH:MM format
     */
    static clampToSession(participants, sessionStart, sessionEnd) {
        if (!sessionStart || !sessionEnd) {
            return participants;
        }

        const [startHour, startMin] = sessionStart.split(':').map(Number);
        const [endHour, endMin] = sessionEnd.split(':').map(Number);
        const sessionStartMinutes = startHour * 60 + startMin;
        const sessionEndMinutes = endHour * 60 + endMin;

        return participants.map(participant => {
            let clampedDuration = 0;

            for (const entry of participant.entries) {
                const joinTime = this.parseDateTime(entry.joinTime);
                const leaveTime = this.parseDateTime(entry.leaveTime);

                if (!joinTime || !leaveTime) {
                    clampedDuration += entry.duration;
                    continue;
                }

                const joinMinutes = joinTime.getHours() * 60 + joinTime.getMinutes();
                const leaveMinutes = leaveTime.getHours() * 60 + leaveTime.getMinutes();

                const clampedJoinMinutes = Math.max(joinMinutes, sessionStartMinutes);
                const clampedLeaveMinutes = Math.min(leaveMinutes, sessionEndMinutes);

                const duration = Math.max(0, clampedLeaveMinutes - clampedJoinMinutes);
                clampedDuration += duration;
            }

            return {
                ...participant,
                totalDuration: clampedDuration
            };
        });
    }

    static parseDateTime(dateTimeStr) {
        if (!dateTimeStr) return null;

        try {
            const date = new Date(dateTimeStr);
            if (!isNaN(date.getTime())) {
                return date;
            }

            const match = dateTimeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
            if (match) {
                const [, month, day, year, hour, minute] = match;
                return new Date(year, month - 1, day, hour, minute);
            }

            return null;
        } catch (error) {
            return null;
        }
    }
}

