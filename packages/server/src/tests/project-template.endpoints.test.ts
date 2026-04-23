import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { validate } from '../middleware/validate.js';
import { projectCreateSchema, type Project, type ProjectTemplate } from '@code-editor/shared';
import * as projectController from '../controllers/project.controller.js';
import * as templateController from '../controllers/template.controller.js';
import { projectService } from '../services/project.service.js';
import { templateService } from '../services/template.service.js';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  req.authPayload = { userId: 'user-1', email: 'user@example.com' };
  next();
});
app.get('/api/projects', projectController.getDashboard);
app.post('/api/projects', validate(projectCreateSchema), projectController.createProject);
app.get('/api/templates', templateController.listTemplates);

const originalListDashboard = projectService.listDashboard;
const originalCreateProject = projectService.create;
const originalListTemplates = templateService.listTemplates;

describe('Project and Template Endpoints', () => {
  beforeEach(() => {
    projectService.listDashboard = async () => ({ owned: [], shared: [] });
    projectService.create = async () => {
      throw new Error('not mocked');
    };
    templateService.listTemplates = async () => {
      const templates: ProjectTemplate[] = [
        {
          id: 'tpl-1',
          name: 'Starter JS',
          description: 'Starter template',
          language: 'javascript',
          tags: ['starter'],
          files: [
            {
              path: 'index.js',
              language: 'javascript',
              content: "console.log('hello')",
            },
          ],
        },
      ];
      return templates;
    };
  });

  afterEach(() => {
    projectService.listDashboard = originalListDashboard;
    projectService.create = originalCreateProject;
    templateService.listTemplates = originalListTemplates;
  });

  it('GET /api/projects returns dashboard data', async () => {
    const owned: Project[] = [
      {
        id: 'p1',
        ownerId: 'user-1',
        name: 'Owned Project',
        language: 'javascript',
        isPublic: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    projectService.listDashboard = async () => ({ owned, shared: [] });

    const res = await request(app).get('/api/projects');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { owned, shared: [] });
  });

  it('POST /api/projects rejects invalid payload', async () => {
    const res = await request(app).post('/api/projects').send({
      name: '',
      language: '',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body?.error?.message, 'Validation failed');
  });

  it('POST /api/projects creates project for authenticated user', async () => {
    const created: Project = {
      id: 'p2',
      ownerId: 'user-1',
      name: 'New Project',
      language: 'javascript',
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    projectService.create = async (userId, input) => {
      assert.equal(userId, 'user-1');
      assert.equal(input.name, 'New Project');
      return created;
    };

    const res = await request(app).post('/api/projects').send({
      name: 'New Project',
      language: 'javascript',
    });

    assert.equal(res.status, 201);
    assert.deepEqual(res.body, { project: created });
  });

  it('GET /api/templates returns templates', async () => {
    const res = await request(app).get('/api/templates');
    assert.equal(res.status, 200);
    assert.equal(Array.isArray(res.body.templates), true);
    assert.equal(res.body.templates.length > 0, true);
  });
});
