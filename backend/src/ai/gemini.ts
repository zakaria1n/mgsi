import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../config/env';
import { AI_TOOLS_DECLARATIONS, AIToolExecutor } from './tools';

export class GeminiAIService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (ENV.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
    }
  }

  public async chat(
    userId: string,
    message: string,
    conversationHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
  ): Promise<{
    reply: string;
    toolExecutions: { tool: string; args: any; result: any }[];
  }> {
    const toolExecutions: { tool: string; args: any; result: any }[] = [];

    // If no API key is provided, use an intelligent local rule-based assistant
    if (!this.genAI || !ENV.GEMINI_API_KEY) {
      return this.fallbackRuleBasedChat(userId, message);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: `Tu es Antigravity MGSI, le copilote académique intelligent des étudiants en ingénierie MGSI (Management et Gouvernance des Systèmes d'Information) à l'ENSIA-SD Taroudant.
Tes caractéristiques clés :
1. Tu n'es PAS un simple chatbot passif : tu as accès direct à la base de données via tes outils (read_calendar, read_tasks, create_task, organize_schedule, mark_task_completed, etc.).
2. Quand l'étudiant te demande d'ajouter un devoir, d'organiser sa semaine, ou de reprogrammer une séance, TU DOIS APPELER LES OUTILS APPROPRIÉS pour modifier réellement son emploi du temps et sa liste de devoirs.
3. Tu connais les cours du Semestre 3 de MGSI : M231_1 (Français), M231_2 (Anglais), M232 (Génie Logiciel), M233 (BD Avancées), M234 (ERP), M235 (Audit SI), M236 (Systèmes Distribués), M237_1 (Transformation Digitale).
4. Tu parles en français avec bienveillance, clarté, concision et rigueur d'ingénieur.`,
        tools: [
          {
            functionDeclarations: AI_TOOLS_DECLARATIONS as any,
          },
        ],
      });

      const chatSession = model.startChat({
        history: conversationHistory,
      });

      let response = await chatSession.sendMessage(message);
      let functionCalls = response.response.functionCalls();

      // Tool-calling loop (up to 4 steps)
      let iterations = 0;
      while (functionCalls && functionCalls.length > 0 && iterations < 4) {
        iterations++;
        const functionResponses = [];

        for (const call of functionCalls) {
          try {
            const toolResult = await AIToolExecutor.execute(call.name, call.args, { userId });
            toolExecutions.push({ tool: call.name, args: call.args, result: toolResult });
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { result: toolResult },
              },
            });
          } catch (err: any) {
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { error: err.message },
              },
            });
          }
        }

        response = await chatSession.sendMessage(functionResponses as any);
        functionCalls = response.response.functionCalls();
      }

      return {
        reply: response.response.text(),
        toolExecutions,
      };
    } catch (err: any) {
      console.error('Gemini API call failed, falling back to intelligent rule engine:', err.message);
      return this.fallbackRuleBasedChat(userId, message);
    }
  }

  /**
   * High-capability fallback when API key is not configured or network quota exhausted.
   * Directly executes the appropriate tools based on user intents.
   */
  private async fallbackRuleBasedChat(userId: string, message: string) {
    const lower = message.toLowerCase();
    const toolExecutions: { tool: string; args: any; result: any }[] = [];
    let reply = '';

    if (lower.includes('organise') || lower.includes('planifie') || lower.includes('schedule') || lower.includes('semaine')) {
      const res = await AIToolExecutor.execute('organize_schedule', { daysAhead: 7 }, { userId });
      toolExecutions.push({ tool: 'organize_schedule', args: { daysAhead: 7 }, result: res });
      reply = `J'ai analysé l'ensemble de vos devoirs, projets et contraintes d'emploi du temps. J'ai généré ${res.scheduledSessionsCount} séances d'études réparties intelligemment sur les 7 prochains jours sans empiéter sur votre sommeil ou vos repas.`;
    } else if (lower.includes('devoir') || lower.includes('tâche') || lower.includes('task') || lower.includes('ajoute')) {
      const deadline = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      const res = await AIToolExecutor.execute(
        'create_task',
        {
          title: message.replace(/ajoute|crée|ajouter|un devoir|une tâche/gi, '').trim() || 'Devoir MGSI',
          subjectCode: 'M232',
          taskType: 'devoir',
          deadline,
          estimatedDurationMinutes: 60,
          priority: 'high',
        },
        { userId }
      );
      toolExecutions.push({ tool: 'create_task', args: { title: res.createdTask.title }, result: res });
      reply = `J'ai créé avec succès la tâche "${res.createdTask.title}" avec une durée estimée de 60 minutes et une échéance dans 3 jours.`;
    } else if (lower.includes('fini') || lower.includes('terminé') || lower.includes('complete')) {
      const tasksRes = await AIToolExecutor.execute('read_tasks', { status: 'todo' }, { userId });
      if (tasksRes.tasks && tasksRes.tasks.length > 0) {
        const first = tasksRes.tasks[0];
        const res = await AIToolExecutor.execute('mark_task_completed', { taskId: first.id }, { userId });
        toolExecutions.push({ tool: 'mark_task_completed', args: { taskId: first.id }, result: res });
        reply = `Félicitations ! J'ai marqué la tâche "${first.title}" comme terminée dans votre suivi académique.`;
      } else {
        reply = `Aucune tâche en attente n'a été trouvée à marquer comme terminée.`;
      }
    } else if (lower.includes('reprogramme') || lower.includes('pas pu finir') || lower.includes('manqué')) {
      const tasksRes = await AIToolExecutor.execute('read_tasks', { status: 'todo' }, { userId });
      if (tasksRes.tasks && tasksRes.tasks.length > 0) {
        const first = tasksRes.tasks[0];
        const res = await AIToolExecutor.execute(
          'reschedule_incomplete_session',
          { taskId: first.id, remainingMinutes: 30 },
          { userId }
        );
        toolExecutions.push({ tool: 'reschedule_incomplete_session', args: { taskId: first.id, remainingMinutes: 30 }, result: res });
        reply = res.message || `J'ai reprogrammé les 30 minutes restantes pour demain.`;
      } else {
        reply = `Pas de session incomplète identifiée. Votre emploi du temps est à jour !`;
      }
    } else {
      // General briefing query
      const cal = await AIToolExecutor.execute(
        'read_calendar',
        { startDate: new Date().toISOString(), endDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString() },
        { userId }
      );
      const tasks = await AIToolExecutor.execute('read_tasks', { status: 'todo' }, { userId });
      reply = `Bonjour ! Vous avez actuellement ${cal.events.length} cours/séances prévues dans les prochaines 48h et ${tasks.tasks.length} devoirs en cours. Vous pouvez me demander par exemple : "Organise ma semaine", "Ajoute un devoir ERP pour vendredi", ou "Reprogramme ma séance d'hier".`;
    }

    return { reply, toolExecutions };
  }
}

export const geminiService = new GeminiAIService();
