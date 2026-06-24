import OpenAI from 'openai';
import { sequelize } from '../config/db.js';
import { QueryTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Use Groq (via OpenAI-compatible client)
const groq = new OpenAI({
    apiKey: process.env.OPEN_SOURCE_LLM_KEY || '',
    baseURL: process.env.OPEN_SOURCE_LLM_URL || 'https://api.groq.com/openai/v1'
});

export class RAGService {
    /**
     * Uses Groq to extract optimized search keywords from a natural language query.
     */
    static async extractKeywords(query: string): Promise<string> {
        try {
            const prompt = `
                Extract 3-5 core search keywords from this civic query: "${query}"
                Return only the keywords separated by spaces.
                Example: "Why is there garbage in Ward 5?" -> "garbage waste ward_5"
            `;
            const response = await groq.chat.completions.create({
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
            // Format for Postgres tsquery: "word1 & word2 & word3"
            const tsquery = keywords.split(' ').filter(w => w.length > 2).join(' & ');

            const results = await sequelize.query(`
                SELECT 
                    id, 
                    category, 
                    description, 
                    status, 
                    priority_score,
                    ts_rank_cd(to_tsvector('english', category || ' ' || description), to_tsquery('english', :tsquery)) as similarity
                FROM issues
                WHERE to_tsvector('english', category || ' ' || description) @@ to_tsquery('english', :tsquery)
                ORDER BY similarity DESC
                LIMIT :limit
            `, {
                replacements: { tsquery: tsquery || query, limit },
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

            const contextStr = context.map(c => 
                `- [Issue ${c.id.slice(0,8)}] Category: ${c.category}, Status: ${c.status}, Priority: ${c.priority_score}, Description: ${c.description}`
            ).join('\n');

            const prompt = `
                You are the Chief AI Analytics Officer for the Smart City Command Center.
                A city official has asked: "${query}"
                
                Below is the real-time context from the civic issues database (retrieved via Groq-enhanced keyword search):
                ${contextStr}
                
                Tasks:
                1. Provide a concise executive summary answering the query.
                2. Identify trends or clusters if any.
                3. Cite specific issue IDs using bracketed notation like [Issue abc12345].
                4. Keep the tone professional, objective, and action-oriented.
            `;

            const response = await groq.chat.completions.create({
                model: process.env.LLM_MODEL || 'llama-3.1-8b-instant',
                messages: [{ role: 'system', content: prompt }],
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
