import type { Request, Response} from 'express'
import * as projectService from '../services/projectService.js'

export const handleGetUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: '유저 id를 찾을 수 없습니다.'});
        }
        const projects = await projectService.getUserProjects(userId);
        res.status(200).json(projects);
    } catch(error) {
        res.status(500).json({error});
    }
};