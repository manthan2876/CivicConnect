import OpenAI from 'openai';
import { sequelize } from '../config/db.js';
import { QueryTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

let _groq: OpenAI | null = null;

function getGroqClient(): OpenAI | null {
    const apiKey = process.env.OPEN_SOURCE_LLM_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
        return null;
    }
    if (!_groq) {
        try {
            _groq = new OpenAI({
                apiKey: apiKey.trim(),
                baseURL: process.env.OPEN_SOURCE_LLM_URL || 'https://api.groq.com/openai/v1'
            });
        } catch (err: any) {
            console.warn('[RAG] Failed to initialize OpenAI/Groq client:', err.message);
            _groq = null;
        }
    }
    return _groq;
}

export class RAGService {
    /**
     * Uses Groq to extract optimized search keywords from a natural language query.
     */
    static async extractKeywords(query: string): Promise<string> {
        const client = getGroqClient();
        if (!client) {
            return query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
        }

        try {
            const prompt = `
                Extract 3-5 core search keywords from this civic query: "${query}"
                Return only the keywords separated by spaces.
                Example: "Why is there garbage in Ward 5?" -> "garbage waste ward_5"
            `;
            const response = await client.chat.completions.create({
                model: process.env.LLM_MODEL || 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 20
            });
            return response.choices?.[0]?.message?.content?.trim() || query;
        } catch (error) {
            return query;
        }
    }

    /**
     * Performs an intelligent Full-Text Search across civic issues.
     */
    static async semanticSearch(query: string, limit = 5): Promise<any[]> {
        try {
            const keywords = await this.extractKeywords(query);
            // Format for Postgres tsquery: "word1 & word2 & word3", stripping special chars
            const cleanWords = keywords
                .replace(/[^a-zA-Z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 2);

            const tsquery = cleanWords.length > 0 ? cleanWords.join(' & ') : '';

            if (!tsquery) {
                // Fallback to ILIKE search if no valid tsquery tokens
                const results = await sequelize.query(`
                    SELECT 
                        id, 
                        category, 
                        description, 
                        status, 
                        priority_score,
                        0.5 as similarity
                    FROM issues
                    WHERE category ILIKE :likeQuery OR coalesce(description, '') ILIKE :likeQuery
                    ORDER BY "createdAt" DESC
                    LIMIT :limit
                `, {
                    replacements: { likeQuery: `%${query.slice(0, 50).trim()}%`, limit },
                    type: QueryTypes.SELECT
                });
                return results;
            }

            const results = await sequelize.query(`
                SELECT 
                    id, 
                    category, 
                    description, 
                    status, 
                    priority_score,
                    ts_rank_cd(to_tsvector('english', category || ' ' || coalesce(description, '')), to_tsquery('english', :tsquery)) as similarity
                FROM issues
                WHERE to_tsvector('english', category || ' ' || coalesce(description, '')) @@ to_tsquery('english', :tsquery)
                ORDER BY similarity DESC
                LIMIT :limit
            `, {
                replacements: { tsquery, limit },
                type: QueryTypes.SELECT
            });

            return results;
        } catch (error) {
            console.error('[RAG] Smart FTS search failed:', error);
            return [];
        }
    }

    /**
     * Generates an executive conversational summary based on context.
     */
    static async generateExecutiveSummary(query: string): Promise<string> {
        try {
            const context = await this.semanticSearch(query, 10);
            
            if (context.length === 0) {
                return "I couldn't find any relevant civic issues in the database using the keywords extracted from your query.";
            }

            const client = getGroqClient();
            if (!client) {
                const summaryList = context.map((c: any) => 
                    `• [Issue ${c.id.slice(0, 8)}] Category: ${c.category} | Status: ${c.status} | Priority: ${c.priority_score} | Description: ${c.description || 'N/A'}`
                ).join('\n');
                return `### Real-Time Incident Report\n\nFound **${context.length}** matching issues for "${query}":\n\n${summaryList}\n\n*(Note: Set OPEN_SOURCE_LLM_KEY in environment for generative AI analysis).*`;
            }

            const contextStr = context.map((c: any) => 
                `- [Issue ${c.id.slice(0,8)}] Category: ${c.category}, Status: ${c.status}, Priority: ${c.priority_score}, Description: ${c.description}`
            ).join('\n');

            const systemPrompt = `You are the Chief AI Analytics Officer for the Smart City Command Center.
Your task is to analyze the user's civic issue query based strictly on the provided real-time database context.
Tasks:
1. Provide a concise executive summary answering the query.
2. Identify trends or clusters if any.
3. Cite specific issue IDs using bracketed notation like [Issue abc12345].
4. Keep the tone professional, objective, and action-oriented.`;

            const userContent = `A city official has asked: "${query}"

Below is the real-time context from the civic issues database:
${contextStr}`;

            const response = await client.chat.completions.create({
                model: process.env.LLM_MODEL || 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent },
                ],
            });

            return response.choices?.[0]?.message?.content || "Failed to generate summary.";
        } catch (error) {
            console.error('[RAG] Executive summary failed:', error);
            return "An error occurred while generating the executive analysis.";
        }
    }

    /**
     * No-op for Groq-only mode (No embeddings needed for FTS).
     */
    static async updateIssueEmbedding(_issueId: string) {
        // Full Text Search handles this automatically in the DB
        return;
    }
}
