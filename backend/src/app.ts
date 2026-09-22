import express, { type Request, type Response, type NextFunction } from 'express';
import { buildNote, sortNotes, ValidationError } from './notes.js';
import { NoteStore } from './store.js';

// main application factory, used by both the CLI and the tests. The CLI
// creates the store and passes it in, the tests can pass in a mock store.
export function createApp(store: NoteStore, corsOrigin = '*') {
  const app = express();
  app.use(express.json());

  // The browser calls this API from a different origin (5173 in dev, 8080 in
  // a container), so the API has to say who is allowed in.
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', corsOrigin);
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Used by HEALTHCHECK in the Dockerfile and by depends_on in Compose.
  // It answers only when the app can actually reach its storage.
  app.get('/health', async (_req, res) => {
    try {
      await store.all();
      res.json({ status: 'ok', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'unhealthy' });
    }
  });
  
  // notes api returns all notes created.
  app.get('/api/notes', async (_req, res, next) => {
    try {
      res.json(sortNotes(await store.all()));
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/notes/:id', async (req, res, next) => {
    try {
      const note = await store.find(req.params.id);
      if (!note) return res.status(404).json({ error: 'note not found' });
      res.json(note);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/notes', async (req, res, next) => {
    try {
      res.status(201).json(await store.add(buildNote(req.body ?? {})));
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
      next(err);
    }
  });

  app.delete('/api/notes/:id', async (req, res, next) => {
    try {
      const removed = await store.remove(req.params.id);
      if (!removed) return res.status(404).json({ error: 'note not found' });
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}
