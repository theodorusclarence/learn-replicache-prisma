import { ProjectService } from '@/lib/server/services/project.service';

import { ProjectMutators } from '@/models/mutator/project.model';

export const serverProjectMutator: ProjectMutators<'server'> = {
  async projectCreate(tx, args, version, spaceId) {
    const projectService = new ProjectService(tx);
    await projectService.create(args, version, spaceId);
  },
  async projectDelete(tx, args, version, _spaceId) {
    const projectService = new ProjectService(tx);
    await projectService.delete(args, version);
  },
  async projectUpdate(tx, args, version, _spaceId) {
    const projectService = new ProjectService(tx);
    await projectService.update(args, version);
  },
};
