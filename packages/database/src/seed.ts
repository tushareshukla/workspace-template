/**
 * Database seed script
 * Creates default agents and example tasks
 */
import { createDatabase, agents, tasks, activities } from './index';
import { ids } from '@workspace/utils/id';
import { DateTime } from '@workspace/utils/date';

const db = createDatabase(process.env.DATABASE_PATH || './data/workspace.db');

console.log('Seeding database...');

const now = DateTime.now().toJSDate();

// Seed default agents
const defaultAgents = [
  {
    id: ids.agent(),
    name: 'Main Agent',
    description: 'Primary agent for general tasks',
    status: 'idle' as const,
    openclawAgentId: 'main',
    maxConcurrentTasks: 5,
    createdAt: now,
  },
  {
    id: ids.agent(),
    name: 'Research Agent',
    description: 'Specialized in research and information gathering',
    status: 'idle' as const,
    openclawAgentId: 'research',
    maxConcurrentTasks: 3,
    createdAt: now,
  },
  {
    id: ids.agent(),
    name: 'Writer Agent',
    description: 'Specialized in content creation and writing',
    status: 'idle' as const,
    openclawAgentId: 'writer',
    maxConcurrentTasks: 3,
    createdAt: now,
  },
];

for (const agent of defaultAgents) {
  try {
    db.insert(agents).values(agent).onConflictDoNothing().run();
    console.log(`Created agent: ${agent.name}`);
  } catch (err) {
    console.log(`Agent ${agent.name} already exists`);
  }
}

// Seed some example tasks
const exampleTasks = [
  {
    id: ids.task(),
    title: 'Research competitor pricing',
    description: 'Analyze pricing strategies of top 5 competitors',
    status: 'inbox' as const,
    priority: 'high' as const,
    sourceChannel: 'ui' as const,
    createdAt: now,
  },
  {
    id: ids.task(),
    title: 'Write product documentation',
    description: 'Create comprehensive docs for the new API',
    status: 'inbox' as const,
    priority: 'normal' as const,
    sourceChannel: 'ui' as const,
    createdAt: now,
  },
];

for (const task of exampleTasks) {
  try {
    db.insert(tasks).values(task).onConflictDoNothing().run();

    // Add activity
    db.insert(activities).values({
      id: ids.activity(),
      taskId: task.id,
      action: 'task_created',
      details: { title: task.title },
      createdAt: now,
    }).run();

    console.log(`Created task: ${task.title}`);
  } catch (err) {
    console.log(`Task ${task.title} already exists`);
  }
}

console.log('Seeding completed!');
process.exit(0);
