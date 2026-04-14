package uz.logicalcontrol.backend.payload;

import java.util.List;
import java.util.UUID;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record MetricCard(
        String key,
        String label,
        long value,
        String hint
    ) {
    }

    public record TrendPoint(
        String label,
        long daily,
        long monthly,
        long yearly
    ) {
    }

    public record RecentActivity(
        UUID controlId,
        String controlCode,
        String controlName,
        String result,
        String whenLabel
    ) {
    }

    public record DashboardResponse(
        List<MetricCard> metrics,
        List<TrendPoint> trend,
        List<RecentActivity> recentActivities
    ) {
    }
}

