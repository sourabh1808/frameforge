import { validationResult } from 'express-validator';
import Project from '../models/Project.js';
import { generateManimCode } from '../services/aiService.js';
import { addRenderJob } from '../services/queueService.js';

export const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { prompt, title } = req.body;

    const project = await Project.create({
      user: req.user._id,
      prompt,
      title: title || 'Untitled Animation',
      status: 'pending',
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-manimCode');

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { title, prompt } = req.body;

    if (title) project.title = title;
    if (prompt) project.prompt = prompt;

    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await project.deleteOne();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const generateCode = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.status = 'generating-code';
    await project.save();

    try {
      const manimCode = await generateManimCode(project.prompt);

      project.manimCode = manimCode;
      project.status = 'code-ready';
      await project.save();

      await addRenderJob(project._id.toString(), manimCode, project.renderSettings);

      project.status = 'rendering';
      await project.save();

      res.json(project);
    } catch (aiError) {
      project.status = 'failed';
      project.errorMessage = aiError.message;
      await project.save();

      throw aiError;
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate code', error: error.message });
  }
};

export const updateCode = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const { manimCode } = req.body;

    project.manimCode = manimCode;
    project.status = 'code-ready';
    await project.save();

    await addRenderJob(project._id.toString(), manimCode, project.renderSettings);

    project.status = 'rendering';
    await project.save();

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update code', error: error.message });
  }
};
