import { dashboardModel } from '../models/dashboard.model';

export const dashboardService = {
  async getDashboardSummary() {
    const metrics = await dashboardModel.getMetrics();
    return {
      metrics,
      timestamp: new Date().toISOString(),
    };
  },
};
