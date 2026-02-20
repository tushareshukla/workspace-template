import { EventEmitter } from 'events';
import type { AgentEventPayload, ChatEventPayload, OpenClawEvent } from './types';

export type OpenClawEventType =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'agent'
  | 'chat'
  | 'session'
  | 'heartbeat'
  | 'lifecycle:start'
  | 'lifecycle:end'
  | 'lifecycle:error'
  | 'tool:call'
  | 'assistant:delta'
  | 'assistant:final';

export interface OpenClawEventMap {
  connected: [];
  disconnected: [reason: string];
  error: [error: Error];
  agent: [event: AgentEventPayload];
  chat: [event: ChatEventPayload];
  session: [event: unknown];
  heartbeat: [event: unknown];
  'lifecycle:start': [runId: string, sessionKey: string, data: Record<string, unknown>];
  'lifecycle:end': [runId: string, sessionKey: string, data: Record<string, unknown>];
  'lifecycle:error': [runId: string, sessionKey: string, error: string];
  'tool:call': [runId: string, toolName: string, args: unknown];
  'assistant:delta': [runId: string, text: string];
  'assistant:final': [runId: string, text: string];
}

export class OpenClawEventEmitter extends EventEmitter {
  emit<K extends keyof OpenClawEventMap>(
    event: K,
    ...args: OpenClawEventMap[K]
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof OpenClawEventMap>(
    event: K,
    listener: (...args: OpenClawEventMap[K]) => void
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  once<K extends keyof OpenClawEventMap>(
    event: K,
    listener: (...args: OpenClawEventMap[K]) => void
  ): this {
    return super.once(event, listener as (...args: unknown[]) => void);
  }

  off<K extends keyof OpenClawEventMap>(
    event: K,
    listener: (...args: OpenClawEventMap[K]) => void
  ): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }

  processRawEvent(event: OpenClawEvent): void {
    this.emit(event.type as keyof OpenClawEventMap, event.payload as never);

    // Process agent events into more specific events
    if (event.type === 'agent') {
      const payload = event.payload as AgentEventPayload;
      this.processAgentEvent(payload);
    }

    // Process chat events
    if (event.type === 'chat') {
      const payload = event.payload as ChatEventPayload;
      this.processChatEvent(payload);
    }
  }

  private processAgentEvent(payload: AgentEventPayload): void {
    const { runId, sessionKey = '', stream, data } = payload;

    switch (stream) {
      case 'lifecycle':
        const phase = data.phase as string;
        if (phase === 'start') {
          this.emit('lifecycle:start', runId, sessionKey, data);
        } else if (phase === 'end') {
          this.emit('lifecycle:end', runId, sessionKey, data);
        } else if (phase === 'error') {
          this.emit('lifecycle:error', runId, sessionKey, data.error as string);
        }
        break;

      case 'tool':
        this.emit('tool:call', runId, data.toolName as string, data.args);
        break;

      case 'assistant':
        this.emit('assistant:delta', runId, data.text as string);
        break;
    }
  }

  private processChatEvent(payload: ChatEventPayload): void {
    const { runId, state, message } = payload;
    const text = message?.content?.[0]?.text || '';

    if (state === 'delta') {
      this.emit('assistant:delta', runId, text);
    } else if (state === 'final') {
      this.emit('assistant:final', runId, text);
    }
  }
}
