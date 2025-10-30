export class CPECalculator {
    static calculateCredits(duration, roundingIncrement) {
        if (duration < 50) {
            return 0;
        }

        const baseCredits = Math.floor(duration / 50 * 5) / 5;

        if (roundingIncrement === 1.0) {
            return Math.floor(baseCredits);
        }
        if (roundingIncrement === 0.5) {
            return Math.floor(baseCredits * 2) / 2;
        }
        return baseCredits;
    }

    static calculateRequiredQuestions(credits) {
        if (credits === 0) {
            return 0;
        }

        const fullCredits = Math.floor(credits);
        const decimal = Math.round((credits - fullCredits) * 10) / 10;

        let required = fullCredits * 3;

        if (decimal >= 0.8) {
            required += 2;
        } else if (decimal >= 0.4) {
            required += 1;
        }

        return required;
    }

    static calculateActualCredits(duration, questionsAnswered, roundingIncrement) {
        if (duration < 50) {
            return 0;
        }

        const maxCreditsFromDuration = this.calculateCredits(duration, roundingIncrement);

        let actualCredits = maxCreditsFromDuration;

        while (actualCredits > 0) {
            const requiredQuestions = this.calculateRequiredQuestions(actualCredits);

            if (questionsAnswered >= requiredQuestions) {
                break;
            } else {
                actualCredits -= roundingIncrement;
                actualCredits = Math.round(actualCredits / roundingIncrement) * roundingIncrement;
            }
        }

        if (actualCredits < 1.0) {
            return 0;
        }

        return actualCredits;
    }

    static determineEligibility(duration, actualCredits, questionsAnswered) {
        if (actualCredits === 0) {
            const reason = duration < 50 ? 'Duration < 50 minutes' : 'Did not earn minimum 1.0 credits';
            return {
                eligible: false,
                status: 'Not Qualified',
                reason
            };
        }

        return {
            eligible: true,
            status: 'Qualified',
            reason: ''
        };
    }

    static processParticipants(participants, pollResponses, registrants, roundingIncrement, nameMatcher) {
        const results = [];

        const pollMap = new Map();
        for (const response of pollResponses) {
            pollMap.set(response.name, response.pollsAnswered);
        }

        for (const participant of participants) {
            const duration = participant.totalDuration;
            const questionsAnswered = pollMap.get(participant.name) || 0;
            
            const potentialCredits = this.calculateCredits(duration, roundingIncrement);
            const actualCredits = this.calculateActualCredits(duration, questionsAnswered, roundingIncrement);

            let email = participant.email;
            let emailStatus = 'direct';
            let emailMatches = [];

            if (!email && registrants && registrants.length > 0) {
                const matchResult = nameMatcher.findEmail(participant.name, registrants);
                email = matchResult.email;
                emailStatus = matchResult.isAmbiguous ? 'ambiguous' : matchResult.wasMatched ? 'matched' : 'not_found';
                emailMatches = matchResult.matches;
            }

            const eligibility = this.determineEligibility(duration, actualCredits, questionsAnswered);

            results.push({
                name: participant.originalName,
                normalizedName: participant.name,
                email: email || '',
                emailStatus,
                emailMatches,
                duration,
                credits: actualCredits,
                potentialCredits,
                questionsAnswered,
                requiredQuestions: this.calculateRequiredQuestions(actualCredits),
                requiredQuestionsForPotential: this.calculateRequiredQuestions(potentialCredits),
                eligible: eligibility.eligible,
                status: eligibility.status
            });
        }

        return results;
    }

    static calculateSummary(results) {
        const total = results.length;
        let qualified = 0;
        let totalCredits = 0;

        for (const r of results) {
            if (r.eligible) {
                qualified++;
                totalCredits += r.credits;
            }
        }

        const notQualified = total - qualified;
        const qualifiedPercent = total > 0 ? ((qualified / total) * 100).toFixed(2) : '0.00';
        const notQualifiedPercent = total > 0 ? ((notQualified / total) * 100).toFixed(2) : '0.00';

        return {
            total,
            qualified,
            notQualified,
            qualifiedPercent,
            notQualifiedPercent,
            totalCredits: totalCredits.toFixed(1)
        };
    }
}
