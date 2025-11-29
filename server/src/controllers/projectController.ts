import type { Request, Response } from 'express'
import * as projectService from '../services/projectService.js'

export const handleGetUserProjects = async (req: Request, res: Response) => {
    try {
        const user = req.user as { userId?: number; brandId?: number } | undefined;
        const userId = user?.userId;
        if (!userId) {
            return res.status(401).json({ message: '유저 id를 찾을 수 없습니다.'});
        }
        const projects = await projectService.getUserProjects(userId);
        res.status(200).json(projects);
    } catch(error) {
        res.status(500).json({error});
    }
};

export const handleCreateProject = async (req: Request, res: Response) => {
    try {
        const user = req.user as { userId?: number; brandId?: number } | undefined;
        const userId = user?.userId;
        if (!userId) {
            return res.status(401).json({ message: '유저 id를 찾을 수 없습니다.'});
        }

        const { projectName, videoPath, productIds } = req.body;

        if (!projectName || !videoPath || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: '프로젝트 이름, 동영상 경로, 에셋 ID 목록이 필요합니다.'});
        }

        const project = await projectService.createProject(userId, projectName, videoPath, productIds);
        res.status(201).json({ data: project });
    } catch(error) {
        console.error('프로젝트 생성 에러:', error);
        res.status(500).json({ message: (error as Error).message || '프로젝트 생성에 실패했습니다.'});
    }
};

export const handleGetProjectById = async (req: Request, res: Response) => {
    try {
        const user = req.user as { userId?: number; brandId?: number } | undefined;
        const userId = user?.userId;
        if (!userId) {
            return res.status(401).json({ message: '유저 id를 찾을 수 없습니다.'});
        }

        const projectId = parseInt(req.params.id as string);
        if (isNaN(projectId)) {
            return res.status(400).json({ message: 'Invalid project ID.' });
        }

        const project = await projectService.getProjectById(projectId, userId);
        res.status(200).json({ data: project });
    } catch(error) {
        const message = (error as Error).message;
        if (message.includes('Project not found')) {
            return res.status(404).json({ message });
        }
        console.error('프로젝트 조회 에러:', error);
        res.status(500).json({ message: (error as Error).message || '프로젝트 조회에 실패했습니다.'});
    }
};